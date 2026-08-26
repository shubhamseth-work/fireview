import React from 'react';
interface CollectionTreeProps {
    collections: any[];
    selectedCollection: string;
    onSelect: (collectionPath: string) => void;
    loading: boolean;
    readOnlyCollections: Set<string>;
    onToggleReadOnly: (collectionPath: string) => void;
    onExportCollection: (collectionPath: string) => void;
    onImportCollection: (collectionPath: string) => void;
    onAddDocument: (collectionPath: string, docId: string, data: Record<string, any>) => void;
    connections: Array<{
        projectId: string;
        displayName: string;
    }>;
    activeProjectId: string | null;
}
export declare const CollectionTree: React.FC<CollectionTreeProps>;
export {};
//# sourceMappingURL=CollectionTree.d.ts.map