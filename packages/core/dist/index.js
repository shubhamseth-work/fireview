function isTimestampValue(value) {
    return typeof value === 'object' && value !== null && '__type__' in value && value.__type__ === 'timestamp';
}
function isReferenceValue(value) {
    return typeof value === 'object' && value !== null && '__type__' in value && value.__type__ === 'reference';
}
function isGeoPointValue(value) {
    return typeof value === 'object' && value !== null && '__type__' in value && value.__type__ === 'geopoint';
}
function isBytesValue(value) {
    return typeof value === 'object' && value !== null && '__type__' in value && value.__type__ === 'bytes';
}
function isArrayValue(value) {
    return typeof value === 'object' && value !== null && '__type__' in value && value.__type__ === 'array' && Array.isArray(value.value);
}
function isMapValue(value) {
    return typeof value === 'object' && value !== null && '__type__' in value && value.__type__ === 'map' && typeof value.value === 'object';
}
export function isFirestoreValue(value) {
    if (value === null)
        return true;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
        return true;
    if (Array.isArray(value))
        return value.every(isFirestoreValue);
    if (typeof value === 'object' && value !== null) {
        if (isTimestampValue(value) || isReferenceValue(value) || isGeoPointValue(value) || isBytesValue(value)) {
            return true;
        }
        if (isArrayValue(value)) {
            return value.value.every(isFirestoreValue);
        }
        if (isMapValue(value)) {
            return Object.values(value.value).every(isFirestoreValue);
        }
        const obj = value;
        return Object.values(obj).every(isFirestoreValue);
    }
    return false;
}
export function serializeFirestoreValue(value) {
    if (value === null)
        return null;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
        return value;
    if (Array.isArray(value))
        return value.map(serializeFirestoreValue);
    if (typeof value === 'object' && value !== null) {
        if (isTimestampValue(value) || isReferenceValue(value) || isGeoPointValue(value) || isBytesValue(value)) {
            return value;
        }
        if (isArrayValue(value)) {
            return { __type__: 'array', value: value.value.map(serializeFirestoreValue) };
        }
        if (isMapValue(value)) {
            const result = {};
            for (const [k, v] of Object.entries(value.value)) {
                result[k] = serializeFirestoreValue(v);
            }
            return { __type__: 'map', value: result };
        }
        const obj = value;
        const result = {};
        for (const [k, v] of Object.entries(obj)) {
            result[k] = serializeFirestoreValue(v);
        }
        return result;
    }
    return undefined;
}
export function deserializeFirestoreValue(value) {
    if (value === null)
        return null;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
        return value;
    if (Array.isArray(value))
        return { __type__: 'array', value: value.map(deserializeFirestoreValue) };
    if (typeof value === 'object' && value !== null) {
        const obj = value;
        if ('__type__' in obj) {
            const type = obj.__type__;
            if (type === 'timestamp' || type === 'reference' || type === 'geopoint' || type === 'bytes' || type === 'array' || type === 'map') {
                return obj;
            }
            // Unknown __type__, treat as map
            const result = {};
            for (const [k, v] of Object.entries(obj)) {
                if (k !== '__type__') {
                    result[k] = deserializeFirestoreValue(v);
                }
            }
            return { __type__: 'map', value: result };
        }
        const result = {};
        for (const [k, v] of Object.entries(obj)) {
            result[k] = deserializeFirestoreValue(v);
        }
        return { __type__: 'map', value: result };
    }
    return null;
}
//# sourceMappingURL=index.js.map