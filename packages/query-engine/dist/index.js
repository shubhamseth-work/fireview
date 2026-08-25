import { VistiqError, ERROR_CODES } from '@vistiq/shared';
const INCOMPATIBLE_OPERATORS = {
    '==': ['!=', 'in', 'not-in', 'array-contains', 'array-contains-any'],
    '!=': ['==', 'in', 'not-in', 'array-contains', 'array-contains-any'],
    '<': ['<=', '>=', 'in', 'not-in', 'array-contains', 'array-contains-any'],
    '<=': ['<', '>=', 'in', 'not-in', 'array-contains', 'array-contains-any'],
    '>': ['<=', '>=', 'in', 'not-in', 'array-contains', 'array-contains-any'],
    '>=': ['<', '<=', 'in', 'not-in', 'array-contains', 'array-contains-any'],
    'array-contains': ['==', '!=', '<', '<=', '>', '>=', 'in', 'not-in', 'array-contains-any'],
    'array-contains-any': ['==', '!=', '<', '<=', '>', '>=', 'in', 'not-in', 'array-contains'],
    'in': ['==', '!=', '<', '<=', '>', '>=', 'array-contains', 'array-contains-any'],
    'not-in': ['==', '!=', '<', '<=', '>', '>=', 'array-contains', 'array-contains-any'],
};
const RANGE_OPERATORS = ['<', '<=', '>', '>='];
const EQUALITY_OPERATORS = ['==', '!=', 'in', 'not-in'];
const ARRAY_OPERATORS = ['array-contains', 'array-contains-any'];
export class QueryEngine {
    validateQuery(query) {
        const errors = [];
        const warnings = [];
        if (!query.collectionPath) {
            errors.push({ code: 'MISSING_COLLECTION', message: 'Collection path is required' });
        }
        if (query.filters.length === 0 && query.orderBy.length === 0 && !query.limit) {
            warnings.push({ code: 'NO_FILTERS', message: 'Query has no filters, ordering, or limit - may return large results' });
        }
        const fieldOperators = new Map();
        for (const filter of query.filters) {
            if (!fieldOperators.has(filter.field)) {
                fieldOperators.set(filter.field, new Set());
            }
            fieldOperators.get(filter.field).add(filter.operator);
        }
        for (const [field, operators] of fieldOperators) {
            const opArray = Array.from(operators);
            for (let i = 0; i < opArray.length; i++) {
                for (let j = i + 1; j < opArray.length; j++) {
                    const op1 = opArray[i];
                    const op2 = opArray[j];
                    if (INCOMPATIBLE_OPERATORS[op1].includes(op2)) {
                        errors.push({
                            code: 'INCOMPATIBLE_OPERATORS',
                            message: `Incompatible operators on field "${field}": ${op1} and ${op2}`,
                            field,
                            operator: op1,
                        });
                    }
                }
            }
        }
        const rangeFields = new Set();
        for (const filter of query.filters) {
            if (RANGE_OPERATORS.includes(filter.operator)) {
                if (rangeFields.has(filter.field)) {
                    errors.push({
                        code: 'MULTIPLE_RANGE_FILTERS',
                        message: `Multiple range filters on field "${filter.field}" are not allowed`,
                        field: filter.field,
                        operator: filter.operator,
                    });
                }
                rangeFields.add(filter.field);
            }
        }
        for (const filter of query.filters) {
            if (EQUALITY_OPERATORS.includes(filter.operator) && rangeFields.has(filter.field)) {
                errors.push({
                    code: 'EQUALITY_WITH_RANGE',
                    message: `Equality filter (${filter.operator}) on field "${filter.field}" cannot be combined with range filter`,
                    field: filter.field,
                    operator: filter.operator,
                });
            }
        }
        if (query.orderBy.length > 0) {
            const firstOrderBy = query.orderBy[0].field;
            const hasRangeFilter = query.filters.some(f => RANGE_OPERATORS.includes(f.operator));
            if (hasRangeFilter) {
                const rangeField = query.filters.find(f => RANGE_OPERATORS.includes(f.operator))?.field;
                if (rangeField && rangeField !== firstOrderBy) {
                    errors.push({
                        code: 'ORDER_BY_MISMATCH',
                        message: `First orderBy field must match range filter field when range filter is present`,
                        field: firstOrderBy,
                    });
                }
            }
        }
        if (query.limit && query.limit > 1000) {
            warnings.push({
                code: 'LARGE_LIMIT',
                message: `Limit of ${query.limit} exceeds recommended maximum of 1000`,
            });
        }
        if (query.filters.length > 10) {
            warnings.push({
                code: 'MANY_FILTERS',
                message: `Query has ${query.filters.length} filters; consider simplifying`,
            });
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
    buildQuery(collectionPath, filters, orderBy, limit) {
        return {
            collectionPath,
            filters,
            orderBy,
            limit,
        };
    }
    generateCode(query, language) {
        const filtersCode = query.filters.map(f => `.where("${f.field}", "${f.operator}", ${this.serializeValue(f.value, language)})`).join('\n    ');
        const orderByCode = query.orderBy.map(ob => `.orderBy("${ob.field}", "${ob.direction}")`).join('\n    ');
        const limitCode = query.limit ? `.limit(${query.limit})` : '';
        const collectionRef = query.collectionGroup
            ? `db.collectionGroup("${query.collectionPath}")`
            : `db.collection("${query.collectionPath}")`;
        switch (language) {
            case 'typescript':
                return `const snapshot = await ${collectionRef}
    ${filtersCode}
    ${orderByCode}
    ${limitCode}
    .get();`;
            case 'javascript':
                return `const snapshot = await ${collectionRef}
    ${filtersCode}
    ${orderByCode}
    ${limitCode}
    .get();`;
            case 'python':
                const pyFilters = query.filters.map(f => '.where("' + f.field + '", "' + f.operator + '", ' + this.serializeValue(f.value, 'python') + ')').join('\n        ');
                const pyOrderBy = query.orderBy.map(ob => '.order_by("' + ob.field + '", direction=firestore.Query.' + ob.direction.toUpperCase() + ')').join('\n        ');
                const pyLimit = query.limit ? '.limit(' + query.limit + ')' : '';
                return 'query = ' + collectionRef.replace('db.', 'db.') + '\n        ' + pyFilters + '\n        ' + pyOrderBy + '\n        ' + pyLimit + '\nsnapshot = await query.get()';
            default:
                throw new VistiqError(`Unsupported language: ${language}`, ERROR_CODES.VALIDATION_ERROR);
        }
    }
    serializeValue(value, language) {
        if (value === null)
            return language === 'python' ? 'None' : 'null';
        if (typeof value === 'string')
            return `"${value}"`;
        if (typeof value === 'number' || typeof value === 'boolean')
            return String(value);
        if (Array.isArray(value))
            return `[${value.map(v => this.serializeValue(v, language)).join(', ')}]`;
        if (typeof value === 'object' && value !== null) {
            const obj = value;
            if ('__type__' in obj) {
                switch (obj.__type__) {
                    case 'timestamp':
                        return language === 'python'
                            ? `firestore.Timestamp.from_datetime(datetime.fromisoformat("${obj.value}"))`
                            : `Timestamp.fromDate(new Date("${obj.value}"))`;
                    case 'reference':
                        return language === 'python'
                            ? `db.document("${obj.value}")`
                            : `db.doc("${obj.value}")`;
                    case 'geopoint': {
                        const gp = obj.value;
                        return language === 'python'
                            ? `firestore.GeoPoint(${gp.latitude}, ${gp.longitude})`
                            : `new GeoPoint(${gp.latitude}, ${gp.longitude})`;
                    }
                    case 'bytes':
                        return language === 'python'
                            ? `base64.b64decode("${obj.value}")`
                            : `Buffer.from("${obj.value}", "base64")`;
                }
            }
            return JSON.stringify(value);
        }
        return String(value);
    }
}
export function createQueryEngine() {
    return new QueryEngine();
}
//# sourceMappingURL=index.js.map