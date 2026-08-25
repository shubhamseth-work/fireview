import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export const ImportModal = ({ collectionPath, onClose, onImport }) => {
    const [format, setFormat] = useState('json');
    const [mode, setMode] = useState('upsert');
    const [inputPath, setInputPath] = useState('');
    const [idField, setIdField] = useState('id');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [preview, setPreview] = useState(null);
    const handlePreview = async () => {
        if (!inputPath) {
            setError('Input path is required');
            return;
        }
        // In a real implementation, this would call the backend for preview
        setPreview({ total: 100, newDocuments: 80, existingDocuments: 20, conflicts: 5 });
    };
    const handleImport = async () => {
        if (!inputPath) {
            setError('Input path is required');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await onImport(collectionPath, format, mode, inputPath);
            onClose();
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { className: "modal-overlay", onClick: onClose, children: _jsxs("div", { className: "modal", onClick: e => e.stopPropagation(), style: { maxWidth: 500 }, children: [_jsxs("div", { className: "modal-header", children: [_jsx("h3", { className: "modal-title", children: "Import Collection" }), _jsx("button", { className: "modal-close", onClick: onClose, children: "\u00D7" })] }), _jsx("div", { style: { marginBottom: 16 }, children: _jsx("strong", { children: collectionPath }) }), _jsxs("div", { style: { marginBottom: 16 }, children: [_jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }, children: [_jsx("input", { type: "radio", name: "format", value: "json", checked: format === 'json', onChange: () => setFormat('json') }), _jsx("span", { children: "JSON" })] }), _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("input", { type: "radio", name: "format", value: "csv", checked: format === 'csv', onChange: () => setFormat('csv') }), _jsx("span", { children: "CSV" })] })] }), _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("label", { style: { display: 'block', marginBottom: 4 }, children: "Import Mode" }), _jsxs("select", { value: mode, onChange: e => setMode(e.target.value), style: { width: '100%' }, children: [_jsx("option", { value: "create", children: "Create Only (fail if exists)" }), _jsx("option", { value: "update", children: "Update Existing (fail if new)" }), _jsx("option", { value: "upsert", children: "Upsert (create or update)" })] })] }), _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("label", { style: { display: 'block', marginBottom: 4 }, children: "Document ID Field" }), _jsx("input", { type: "text", value: idField, onChange: e => setIdField(e.target.value), placeholder: "id", style: { width: '100%' } })] }), _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("label", { style: { display: 'block', marginBottom: 4 }, children: "Input File Path" }), _jsx("input", { type: "text", value: inputPath, onChange: e => setInputPath(e.target.value), placeholder: "/path/to/import.json", style: { width: '100%' } })] }), _jsx("button", { className: "secondary", onClick: handlePreview, disabled: loading || !inputPath, style: { marginBottom: 16, width: '100%' }, children: "Preview Import" }), preview && (_jsxs("div", { style: { marginBottom: 16, padding: 12, backgroundColor: 'var(--vscode-input-bg)', borderRadius: 4 }, children: [_jsx("strong", { children: "Import Preview:" }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 8 }, children: [_jsxs("div", { children: [_jsx("strong", { children: "Total:" }), " ", preview.total] }), _jsxs("div", { children: [_jsx("strong", { children: "New:" }), " ", preview.newDocuments] }), _jsxs("div", { children: [_jsx("strong", { children: "Existing:" }), " ", preview.existingDocuments] }), _jsxs("div", { children: [_jsx("strong", { children: "Conflicts:" }), " ", preview.conflicts] })] })] })), error && (_jsx("div", { style: { color: 'var(--vscode-error)', marginBottom: 16, padding: 8, backgroundColor: 'rgba(244, 71, 71, 0.1)', borderRadius: 4 }, children: error })), _jsxs("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: 8 }, children: [_jsx("button", { className: "secondary", onClick: onClose, disabled: loading, children: "Cancel" }), _jsx("button", { onClick: handleImport, disabled: loading || !inputPath, children: loading ? 'Importing...' : 'Import' })] })] }) }));
};
//# sourceMappingURL=ImportModal.js.map