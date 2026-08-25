import { DocumentDiff, FirestoreDocument } from '@vistiq/core';
export declare class DiffService {
    diff(left: FirestoreDocument | null, right: FirestoreDocument | null): DocumentDiff;
    private compareObjects;
    private compareArrays;
    private collectAdded;
    private collectRemoved;
    private isObject;
    private getObjectValue;
    private valuesEqual;
    private normalizeForCompare;
}
export declare function createDiffService(): DiffService;
//# sourceMappingURL=index.d.ts.map