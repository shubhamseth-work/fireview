import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState } from 'react';
export const DocumentViewer = ({ document, connection, onClose, onUpdate, onDelete, }) => {
    const [viewMode, setViewMode] = useState('table');
    const [editing, setEditing] = useState(false);
    const [editData, setEditData] = useState('');
    const [isProduction, setIsProduction] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const isProd = connection.environment === 'production';
    const isNewDoc = !document.id;
    React.useEffect(() => {
        setIsProduction(isProd);
        if (editing) {
            setEditData(JSON.stringify(document.data, null, 2));
        }
    }, [document, editing]);
    const handleSave = async () => {
        try {
            const parsed = JSON.parse(editData);
            await onUpdate(document.path, { data: parsed });
            setEditing(false);
        }
        catch (err) {
            alert('Invalid JSON: ' + err.message);
        }
    };
    const handleDelete = async () => {
        if (isProduction && !confirmDelete) {
            setConfirmDelete(true);
            return;
        }
        const confirmed = window.confirm(isProduction
            ? `⚠️ PRODUCTION: Delete document ${document.id}? Type "DELETE ${document.id}" to confirm.`
            : `Delete document ${document.id}?`);
        if (confirmed) {
            await onDelete(document.path);
            onClose();
        }
        setConfirmDelete(false);
    };
    const handleDuplicate = async () => {
        try {
            const newDoc = {
                id: '',
                path: '',
                data: document.data,
            };
            await onUpdate('', { data: newDoc });
            onClose();
        }
        catch (err) {
            alert('Failed to duplicate: ' + err.message);
        }
    };
    const formatValue = (value, indent = 0) => {
        const spaces = '  '.repeat(indent);
        if (value === null)
            return _jsxs("span", { className: "json-null", children: [spaces, "null"] });
        if (typeof value === 'string')
            return _jsxs("span", { className: "json-string", children: [spaces, "\"", value, "\""] });
        if (typeof value === 'number')
            return _jsxs("span", { className: "json-number", children: [spaces, value] });
        if (typeof value === 'boolean')
            return _jsxs("span", { className: "json-boolean", children: [spaces, String(value)] });
        if (Array.isArray(value)) {
            return (_jsxs("div", { children: [spaces, "[", value.map((v, i) => (_jsxs("div", { children: [formatValue(v, indent + 1), i < value.length - 1 ? ',' : ''] }, i))), spaces, "]"] }));
        }
        if (typeof value === 'object' && value !== null) {
            const obj = value;
            if ('__type__' in obj) {
                const type = obj.__type__;
                const val = obj.value;
                switch (type) {
                    case 'timestamp':
                        return _jsxs("span", { className: "json-string", children: [spaces, "\"", String(val), "\""] });
                    case 'reference':
                        return _jsxs("span", { className: "json-string", children: [spaces, "\"", String(val), "\""] });
                    case 'geopoint': {
                        const gp = val;
                        return _jsxs("span", { children: [spaces, "geopoint(latitude: ", gp.latitude, ", longitude: ", gp.longitude, ")"] });
                    }
                    case 'bytes':
                        return _jsxs("span", { className: "json-string", children: [spaces, "\"base64:", String(val), "\""] });
                    case 'array':
                        return (_jsxs("div", { children: [spaces, "[", val.map((v, i) => (_jsxs("div", { children: [formatValue(v, indent + 1), i < val.length - 1 ? ',' : ''] }, i))), spaces, "]"] }));
                    case 'map': {
                        const entries = Object.entries(val);
                        return (_jsxs("div", { children: [spaces, '{', ' ', entries.map(([k, v], i) => (_jsxs("div", { children: [_jsxs("span", { className: "json-key", children: [spaces, "  \"", k, "\":"] }), formatValue(v, indent + 1), i < entries.length - 1 ? ',' : ''] }, k))), spaces, '}', ' '] }));
                    }
                }
            }
            const entries = Object.entries(obj);
            return (_jsxs("div", { children: [spaces, '{', ' ', entries.map(([k, v], i) => (_jsxs("div", { children: [_jsxs("span", { className: "json-key", children: [spaces, "  \"", k, "\":"] }), formatValue(v, indent + 1), i < entries.length - 1 ? ',' : ''] }, k))), spaces, '}', ' '] }));
        }
        return _jsxs("span", { children: [spaces, String(value)] });
    };
    const renderTableView = () => (_jsx("div", { className: "table-container", style: { flex: 1, overflow: 'auto' }, children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: { width: 200 }, children: "Field" }), _jsx("th", { children: "Value" }), _jsx("th", { style: { width: 100 }, children: "Type" })] }) }), _jsxs("tbody", { children: [_jsxs("tr", { children: [_jsx("td", { style: { fontWeight: 600 }, children: "id" }), _jsx("td", { style: { fontFamily: 'monospace' }, children: document.id }), _jsx("td", { children: "string" })] }), _jsxs("tr", { children: [_jsx("td", { style: { fontWeight: 600 }, children: "path" }), _jsx("td", { style: { fontFamily: 'monospace' }, children: document.path }), _jsx("td", { children: "string" })] }), Object.entries(document.data).map(([key, value]) => (_jsxs("tr", { children: [_jsx("td", { style: { fontWeight: 600 }, children: key }), _jsx("td", { children: formatValue(value) }), _jsx("td", { style: { color: 'var(--vscode-descriptionForeground)', fontSize: 11 }, children: value === null ? 'null' : (typeof value === 'object' && value !== null && '__type__' in value) ? value.__type__ : typeof value })] }, key)))] })] }) }));
    const renderJsonView = () => (_jsx("div", { className: "json-viewer", style: { flex: 1, overflow: 'auto', padding: 16, fontFamily: 'monospace', fontSize: 12, lineHeight: 1.5 }, children: formatValue({ __type__: 'map', value: document.data }) }));
    const renderRawView = () => (_jsx("pre", { style: { flex: 1, overflow: 'auto', padding: 16, margin: 0, fontSize: 12, whiteSpace: 'pre-wrap' }, children: JSON.stringify(document.data, null, 2) }));
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%' }, children: [_jsxs("div", { className: "toolbar", style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12 }, children: [_jsx("button", { onClick: onClose, className: "secondary", children: "\u2190 Back" }), _jsx("span", { style: { fontWeight: 500 }, children: document.id || '(new document)' }), isProduction && _jsx("span", { className: "badge production", children: "Production" })] }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("button", { onClick: () => setViewMode('table'), className: viewMode === 'table' ? 'active' : 'secondary', children: "Table" }), _jsx("button", { onClick: () => setViewMode('json'), className: viewMode === 'json' ? 'active' : 'secondary', children: "JSON" }), _jsx("button", { onClick: () => setViewMode('raw'), className: viewMode === 'raw' ? 'active' : 'secondary', children: "Raw" }), editing ? (_jsxs(_Fragment, { children: [_jsx("button", { onClick: handleSave, style: { backgroundColor: 'var(--vscode-success)' }, children: "Save" }), _jsx("button", { onClick: () => setEditing(false), className: "secondary", children: "Cancel" })] })) : (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => setEditing(true), className: "secondary", children: "Edit" }), _jsx("button", { onClick: handleDuplicate, className: "secondary", children: "Duplicate" }), _jsx("button", { onClick: handleDelete, className: "danger", disabled: isProduction && !confirmDelete, children: "Delete" })] }))] })] }), confirmDelete && isProduction && (_jsxs("div", { style: { padding: 16, backgroundColor: 'rgba(244, 71, 71, 0.1)', border: '1px solid var(--vscode-error)', borderRadius: 4, margin: '0 16px 16px' }, children: [_jsx("div", { style: { color: 'var(--vscode-error)', fontWeight: 600, marginBottom: 8 }, children: "\u26A0\uFE0F PRODUCTION DELETION CONFIRMATION REQUIRED" }), _jsxs("div", { style: { marginBottom: 8 }, children: ["Type ", _jsxs("code", { style: { background: 'var(--vscode-input-bg)', padding: '2px 6px', borderRadius: 2 }, children: ["DELETE ", document.id] }), " to confirm deletion"] }), _jsx("input", { type: "text", placeholder: `DELETE ${document.id}`, onChange: e => setConfirmDelete(e.target.value === `DELETE ${document.id}`), style: { width: '100%', marginBottom: 8 } }), _jsx("button", { onClick: handleDelete, className: "danger", disabled: !confirmDelete, children: "Confirm Delete" })] })), _jsxs("div", { className: "tabs", children: [_jsx("button", { className: viewMode === 'table' ? 'active' : '', onClick: () => setViewMode('table'), children: "Table" }), _jsx("button", { className: viewMode === 'json' ? 'active' : '', onClick: () => setViewMode('json'), children: "JSON Tree" }), _jsx("button", { className: viewMode === 'raw' ? 'active' : '', onClick: () => setViewMode('raw'), children: "Raw JSON" })] }), editing ? (_jsx("div", { style: { flex: 1, padding: 16, overflow: 'auto' }, children: _jsx("textarea", { value: editData, onChange: e => setEditData(e.target.value), style: {
                        width: '100%',
                        height: '100%',
                        fontFamily: 'monospace',
                        fontSize: 12,
                        lineHeight: 1.5,
                        backgroundColor: 'var(--vscode-input-bg)',
                        border: '1px solid var(--vscode-input-border)',
                        borderRadius: 4,
                        padding: 8,
                        color: 'var(--vscode-fg)',
                        resize: 'none',
                    }, placeholder: '{"field": "value"}' }) })) : (_jsxs("div", { style: { flex: 1, overflow: 'hidden' }, children: [viewMode === 'table' && renderTableView(), viewMode === 'json' && renderJsonView(), viewMode === 'raw' && renderRawView()] }))] }));
};
//# sourceMappingURL=DocumentViewer.js.map