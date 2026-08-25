import { ProjectComparison } from '@vistiq/core';
import { FirestoreConnection } from '@vistiq/firestore';
export declare class ProjectCompareService {
    private sourceFirestore;
    private destFirestore;
    constructor(sourceFirestore: FirestoreConnection, destFirestore: FirestoreConnection);
    compare(sourceProjectId: string, destinationProjectId: string): Promise<ProjectComparison>;
    private compareCollections;
    private inferStructure;
    private analyzeDocument;
    private analyzeValue;
    private structuresMatch;
    private generateSummary;
}
export declare function createProjectCompareService(sourceFirestore: FirestoreConnection, destFirestore: FirestoreConnection): ProjectCompareService;
//# sourceMappingURL=index.d.ts.map