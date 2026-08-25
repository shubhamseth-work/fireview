import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export const ExportModal = ({ collectionPath, onClose, onExport }) => {
    const [format, setFormat] = useState('json');
    const [includeId, setIncludeId] = useState(true);
    const [includeNested, setIncludeNested] = useState(true);
    const [outputPath, setOutputPath] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const handleExport = async () => {
        if (!outputPath) {
            setError('Output path is required');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await onExport(collectionPath, format, outputPath);
            onClose();
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { className: "modal-overlay", onClick: onClose, children: _jsxs("div", { className: "modal", onClick: e => e.stopPropagation(), style: { maxWidth: 500 }, children: [_jsxs("div", { className: "modal-header", children: [_jsx("h3", { className: "modal-title", children: "Export Collection" }), _jsx("button", { className: "modal-close", onClick: onClose, children: "\u00D7" })] }), _jsx("div", { style: { marginBottom: 16 }, children: _jsx("strong", { children: collectionPath }) }), _jsxs("div", { style: { marginBottom: 16 }, children: [_jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }, children: [_jsx("input", { type: "radio", name: "format", value: "json", checked: format === 'json', onChange: () => setFormat('json') }), _jsx("span", { children: "JSON" })] }), _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("input", { type: "radio", name: "format", value: "csv", checked: format === 'csv', onChange: () => setFormat('csv') }), _jsx("span", { children: "CSV" })] })] }), _jsxs("div", { style: { marginBottom: 16 }, children: [_jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }, children: [_jsx("input", { type: "checkbox", checked: includeId, onChange: e => setIncludeId(e.target.checked) }), _jsx("span", { children: "Include Document ID" })] }), _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("input", { type: "checkbox", checked: includeNested, onChange: e => setIncludeNested(e.target.checked) }), _jsx("span", { children: "Include Nested Fields" })] })] }), _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("label", { style: { display: 'block', marginBottom: 4 }, children: "Output Path" }), _jsx("input", { type: "text", value: outputPath, onChange: e => setOutputPath(e.target.value), placeholder: "/path/to/export.json", style: { width: '100%' } })] }), error && (_jsx("div", { style: { color: 'var(--vscode-error)', marginBottom: 16, padding: 8, backgroundColor: 'rgba(244, 71, 71, 0.1)', borderRadius: 4 }, children: error })), _jsxs("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: 8 }, children: [_jsx("button", { className: "secondary", onClick: onClose, disabled: loading, children: "Cancel" }), _jsx("button", { onClick: handleExport, disabled: loading || !outputPath, children: loading ? 'Exporting...' : 'Export' })] })] }) }));
};
//# sourceMappingURL=ExportModal.js.map