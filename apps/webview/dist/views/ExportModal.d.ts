import React from 'react';
interface ExportModalProps {
    collectionPath: string;
    onClose: () => void;
    onExport: (collectionPath: string, format: 'json' | 'csv', outputPath: string) => void;
}
export declare const ExportModal: React.FC<ExportModalProps>;
export {};
//# sourceMappingURL=ExportModal.d.ts.map