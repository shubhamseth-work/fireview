import React from 'react';
interface ImportModalProps {
    collectionPath: string;
    onClose: () => void;
    onImport: (collectionPath: string, format: 'json' | 'csv', mode: 'create' | 'update' | 'upsert', inputPath: string) => void;
}
export declare const ImportModal: React.FC<ImportModalProps>;
export {};
//# sourceMappingURL=ImportModal.d.ts.map