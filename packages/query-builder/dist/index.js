import { createQueryEngine } from '@vistiq/query-engine';
export class QueryBuilder {
    engine;
    state;
    constructor(initialState) {
        this.engine = createQueryEngine();
        this.state = {
            collectionPath: initialState?.collectionPath || '',
            collectionGroup: initialState?.collectionGroup || false,
            filters: initialState?.filters || [],
            orderBy: initialState?.orderBy || [],
            limit: initialState?.limit,
            offset: initialState?.offset,
        };
    }
    getState() {
        return { ...this.state };
    }
    setCollectionPath(path) {
        this.state.collectionPath = path;
    }
    setCollectionGroup(enabled) {
        this.state.collectionGroup = enabled;
    }
    addFilter(field, operator, value) {
        this.state.filters.push({ field, operator, value });
    }
    removeFilter(index) {
        this.state.filters.splice(index, 1);
    }
    updateFilter(index, filter) {
        this.state.filters[index] = { ...this.state.filters[index], ...filter };
    }
    addOrderBy(field, direction) {
        this.state.orderBy.push({ field, direction });
    }
    removeOrderBy(index) {
        this.state.orderBy.splice(index, 1);
    }
    setLimit(limit) {
        this.state.limit = limit;
    }
    setOffset(offset) {
        this.state.offset = offset;
    }
    build() {
        return this.engine.buildQuery(this.state.collectionPath, this.state.filters, this.state.orderBy, this.state.limit);
    }
    validate() {
        return this.engine.validateQuery(this.build());
    }
    generateCode(language) {
        return this.engine.generateCode(this.build(), language);
    }
    reset() {
        this.state = {
            collectionPath: '',
            collectionGroup: false,
            filters: [],
            orderBy: [],
        };
    }
    loadFromQuery(query) {
        this.state.collectionPath = query.collectionPath;
        this.state.collectionGroup = query.collectionGroup || false;
        this.state.filters = [...query.filters];
        this.state.orderBy = [...query.orderBy];
        this.state.limit = query.limit;
        this.state.offset = query.offset;
    }
}
export function createQueryBuilder(initialState) {
    return new QueryBuilder(initialState);
}
//# sourceMappingURL=index.js.map