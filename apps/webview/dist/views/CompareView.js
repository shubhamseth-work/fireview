import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export const CompareView = ({ connection, onRunQuery }) => {
    const [leftDoc, setLeftDoc] = useState(null);
    const [rightDoc, setRightDoc] = useState(null);
    const [leftPath, setLeftPath] = useState('');
    const [rightPath, setRightPath] = useState('');
    const [loading, setLoading] = useState(false);
    const [diff, setDiff] = useState(null);
    const loadDocument = async (path, side) => {
        setLoading(true);
        try {
            // In real implementation, call backend to get document
            console.log('Load document:', path);
        }
        finally {
            setLoading(false);
        }
    };
    const handleCompare = () => {
        if (!leftDoc || !rightDoc)
            return;
        // In real implementation, call diff service
        setDiff({ changes: [] });
    };
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%', padding: 16 }, children: [_jsx("h2", { style: { marginBottom: 16 }, children: "Document Compare" }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }, children: [_jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: 8 }, children: "Left Document" }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("input", { type: "text", value: leftPath, onChange: e => setLeftPath(e.target.value), placeholder: "projects/p/databases/(default)/documents/collection/doc", style: { flex: 1 } }), _jsx("button", { onClick: () => loadDocument(leftPath, 'left'), disabled: loading || !leftPath, children: "Load" })] }), leftDoc && (_jsxs("div", { style: { marginTop: 8, padding: 8, backgroundColor: 'var(--vscode-input-bg)', borderRadius: 4, fontSize: 12 }, children: [_jsx("strong", { children: leftDoc.id }), _jsx("br", {}), leftDoc.path] }))] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: 8 }, children: "Right Document" }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("input", { type: "text", value: rightPath, onChange: e => setRightPath(e.target.value), placeholder: "projects/p/databases/(default)/documents/collection/doc", style: { flex: 1 } }), _jsx("button", { onClick: () => loadDocument(rightPath, 'right'), disabled: loading || !rightPath, children: "Load" })] }), rightDoc && (_jsxs("div", { style: { marginTop: 8, padding: 8, backgroundColor: 'var(--vscode-input-bg)', borderRadius: 4, fontSize: 12 }, children: [_jsx("strong", { children: rightDoc.id }), _jsx("br", {}), rightDoc.path] }))] })] }), _jsx("button", { onClick: handleCompare, disabled: !leftDoc || !rightDoc || loading, style: { width: 'fit-content' }, children: "Compare Documents" }), diff && (_jsxs("div", { style: { marginTop: 16, flex: 1, overflow: 'auto' }, children: [_jsx("h3", { children: "Differences" }), _jsx("pre", { style: { fontSize: 12, whiteSpace: 'pre-wrap' }, children: JSON.stringify(diff, null, 2) })] }))] }));
};
//# sourceMappingURL=CompareView.js.map