import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useNotify } from '../context/NotificationContext';
import { ConfirmationModal } from './ConfirmationModal';
// Logger for DocumentViewer
const log = {
    debug: (msg, meta) => console.debug(`[DocumentViewer] ${msg}`, meta || ''),
    info: (msg, meta) => console.info(`[DocumentViewer] ${msg}`, meta || ''),
    warn: (msg, meta) => console.warn(`[DocumentViewer] ${msg}`, meta || ''),
    error: (msg, meta) => console.error(`[DocumentViewer] ${msg}`, meta || ''),
};
export const DocumentViewer = ({ document, connection, onClose, onUpdate, onCreateDocument, onDelete, }) => {
    const notify = useNotify();
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    log.info('DocumentViewer rendered', {
        docId: document.id,
        docPath: document.path,
        hasData: !!document.data,
        dataKeys: document.data ? Object.keys(document.data) : []
    });
    const [viewMode, setViewMode] = useState('table');
    const [editing, setEditing] = useState(false);
    const [editData, setEditData] = useState('');
    const [isProduction, setIsProduction] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const isProd = connection.environment === 'production';
    const isNewDoc = !document.id;
    React.useEffect(() => {
        log.debug('DocumentViewer: Effect triggered', { docId: document.id, editing });
        setIsProduction(isProd);
        if (editing) {
            setEditData(JSON.stringify(document.data, null, 2));
        }
    }, [document, editing]);
    const handleSave = async () => {
        try {
            const parsed = JSON.parse(editData);
            await onUpdate(document.path, { data: parsed });
            notify('success', 'Document updated successfully');
            setEditing(false);
        }
        catch (err) {
            notify('error', `Invalid JSON: ${err.message}`);
        }
    };
    const handleDelete = async () => {
        const isProd = connection.environment === 'production';
        setDeleteConfirm({ isOpen: true, isProduction: isProd });
    };
    const handleDeleteConfirm = () => {
        if (deleteConfirm) {
            onDelete(document.path);
            notify('success', 'Document deleted successfully');
            onClose();
        }
        setDeleteConfirm(null);
    };
    const handleDeleteCancel = () => {
        setDeleteConfirm(null);
    };
    const handleDuplicate = async () => {
        try {
            const collectionPath = document.path.split('/').slice(0, -1).join('/');
            const newDoc = {
                id: '',
                path: '',
                data: document.data,
            };
            await onCreateDocument(collectionPath, newDoc);
            notify('success', 'Document duplicated successfully');
            onClose();
        }
        catch (err) {
            notify('error', `Failed to duplicate: ${err.message}`);
        }
    };
    const formatValue = (value, indent = 0) => {
        log.debug('formatValue called', { type: typeof value, isArray: Array.isArray(value), isNull: value === null });
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
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%' }, children: [_jsxs("div", { className: "toolbar", style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12 }, children: [_jsx("button", { onClick: onClose, className: "secondary", children: "\u2190 Back" }), _jsx("span", { style: { fontWeight: 500 }, children: document.id || '(new document)' }), isProduction && _jsx("span", { className: "badge production", children: "Production" })] }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("button", { onClick: () => setViewMode('table'), className: viewMode === 'table' ? 'active' : 'secondary', children: "Table" }), _jsx("button", { onClick: () => setViewMode('json'), className: viewMode === 'json' ? 'active' : 'secondary', children: "JSON" }), _jsx("button", { onClick: () => setViewMode('raw'), className: viewMode === 'raw' ? 'active' : 'secondary', children: "Raw" }), editing ? (_jsxs(_Fragment, { children: [_jsx("button", { onClick: handleSave, style: { backgroundColor: 'var(--vscode-success)' }, children: "Save" }), _jsx("button", { onClick: () => setEditing(false), className: "secondary", children: "Cancel" })] })) : (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => setEditing(true), className: "secondary", children: "Edit" }), _jsx("button", { onClick: handleDuplicate, className: "secondary", children: "Duplicate" }), _jsx("button", { onClick: handleDelete, className: "danger", children: "Delete" })] }))] })] }), _jsxs("div", { className: "tabs", children: [_jsx("button", { className: viewMode === 'table' ? 'active' : '', onClick: () => setViewMode('table'), children: "Table" }), _jsx("button", { className: viewMode === 'json' ? 'active' : '', onClick: () => setViewMode('json'), children: "JSON Tree" }), _jsx("button", { className: viewMode === 'raw' ? 'active' : '', onClick: () => setViewMode('raw'), children: "Raw JSON" })] }), editing ? (_jsx("div", { style: { flex: 1, padding: 16, overflow: 'auto' }, children: _jsx("textarea", { value: editData, onChange: e => setEditData(e.target.value), style: {
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
                    }, placeholder: '{"field": "value"}' }) })) : (_jsxs("div", { style: { flex: 1, overflow: 'hidden' }, children: [viewMode === 'table' && renderTableView(), viewMode === 'json' && renderJsonView(), viewMode === 'raw' && renderRawView()] })), deleteConfirm && (_jsx(ConfirmationModal, { isOpen: true, title: deleteConfirm.isProduction ? '⚠️ PRODUCTION: Delete Document' : 'Delete Document', message: deleteConfirm.isProduction
                    ? `This is a PRODUCTION document. Type "DELETE ${document.id}" to confirm deletion.`
                    : `Are you sure you want to delete document "${document.id}"? This action cannot be undone.`, onConfirm: handleDeleteConfirm, onCancel: handleDeleteCancel, variant: "danger", confirmLabel: deleteConfirm.isProduction ? 'Type DELETE to confirm' : 'Delete' }))] }));
};
//# sourceMappingURL=DocumentViewer.js.map