import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from 'react';
const menuItems = [
    { action: 'editJson', label: 'Edit Document as JSON...', icon: '✏️' },
    { action: 'openNewTab', label: 'Open in new Tab', icon: '🔗', divider: true },
    { action: 'rename', label: 'Rename Document...', icon: '✏️' },
    { action: 'move', label: 'Move Document to...', icon: '📁' },
    { action: 'duplicate', label: 'Duplicate Document...', icon: '📋' },
    { action: 'copyTo', label: 'Copy Document to...', icon: '📄', divider: true },
    { action: 'delete', label: 'Delete Document', icon: '🗑️', divider: true },
    { action: 'showGeopoints', label: 'Show Geopoints on Map', icon: '📍' },
    { action: 'export', label: 'Export Document...', icon: '📤' },
    { action: 'import', label: 'Import...', icon: '📥', divider: true },
    { action: 'copyData', label: 'Copy Data as JSON', icon: '📋' },
    { action: 'revealInConsole', label: 'Reveal in Firebase Console', icon: '🔥' },
];
function cleanData(data) {
    const result = {};
    for (const [key, value] of Object.entries(data)) {
        result[key] = cleanValue(value);
    }
    return result;
}
function cleanValue(value) {
    if (value === null || typeof value !== 'object')
        return value;
    if (Array.isArray(value))
        return value.map(cleanValue);
    if (value.__type__) {
        switch (value.__type__) {
            case 'timestamp':
                return value.value;
            case 'reference':
                return value.value;
            case 'geopoint':
                return { latitude: value.value.latitude, longitude: value.value.longitude };
            case 'bytes':
                return `base64:${value.value}`;
            case 'array':
                return value.value.map(cleanValue);
            case 'map': {
                const mapResult = {};
                for (const [k, v] of Object.entries(value.value)) {
                    mapResult[k] = cleanValue(v);
                }
                return mapResult;
            }
        }
    }
    const objResult = {};
    for (const [k, v] of Object.entries(value)) {
        objResult[k] = cleanValue(v);
    }
    return objResult;
}
export const DocumentTable = ({ documents, loading, error, pagination, onRowClick, onRunQuery, onLoadMore, onPageSizeChange, onCopyDocument, onCopyDocumentTo, onOpenDocument, onDeleteDocument, onDuplicateDocument, onRenameDocument, onMoveDocument, onShowGeopoints, onImportDocument, onExportDocument, onRevealInConsole, }) => {
    const [copiedId, setCopiedId] = useState(null);
    const [menuAnchor, setMenuAnchor] = useState(null);
    const menuRef = useRef(null);
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuAnchor(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    const handleMenuAction = (action) => {
        if (!menuAnchor)
            return;
        const { doc } = menuAnchor;
        switch (action) {
            case 'editJson':
                onOpenDocument(doc);
                break;
            case 'openNewTab':
                onOpenDocument(doc);
                break;
            case 'rename':
                const newId = prompt('Enter new document ID:', doc.id);
                if (newId && newId !== doc.id)
                    onRenameDocument(doc, newId);
                break;
            case 'move':
                const targetCol = prompt('Enter target collection path:', '');
                if (targetCol)
                    onMoveDocument(doc, targetCol);
                break;
            case 'duplicate':
                onDuplicateDocument(doc);
                break;
            case 'copyTo':
                const copyTarget = prompt('Enter target collection path:', '');
                if (copyTarget)
                    onCopyDocumentTo(doc, copyTarget);
                break;
            case 'delete':
                if (confirm(`Delete document ${doc.id}?`))
                    onDeleteDocument(doc.path);
                break;
            case 'showGeopoints':
                onShowGeopoints(doc);
                break;
            case 'export':
                onExportDocument(doc);
                break;
            case 'import':
                onImportDocument(doc);
                break;
            case 'copyData':
                const cleanDocData = cleanData(doc.data);
                const json = JSON.stringify(cleanDocData, null, 2);
                navigator.clipboard.writeText(json);
                setCopiedId(doc.id);
                setTimeout(() => setCopiedId(null), 2000);
                onCopyDocument(doc);
                break;
            case 'revealInConsole':
                onRevealInConsole(doc);
                break;
        }
        setMenuAnchor(null);
    };
    if (loading) {
        return (_jsx("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }, children: _jsxs("div", { style: { textAlign: 'center' }, children: [_jsx("div", { style: { fontSize: 24, marginBottom: 8 }, children: "\u23F3" }), _jsx("div", { children: "Loading documents..." })] }) }));
    }
    if (error) {
        return (_jsx("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 24 }, children: _jsxs("div", { style: { textAlign: 'center', color: 'var(--vscode-error)' }, children: [_jsx("div", { style: { fontSize: 24, marginBottom: 8 }, children: "\u26A0\uFE0F" }), _jsxs("div", { children: ["Error: ", error] })] }) }));
    }
    if (documents.length === 0) {
        return (_jsxs("div", { className: "empty-state", style: { flex: 1 }, children: [_jsx("div", { className: "icon", children: "\uD83D\uDCC4" }), _jsx("h3", { children: "No Documents" }), _jsx("p", { children: "This collection is empty or no documents match your query." })] }));
    }
    const getColumns = () => {
        if (documents.length === 0)
            return ['id'];
        const fields = new Set();
        documents.forEach(doc => {
            Object.keys(doc.data).forEach(key => fields.add(key));
        });
        return ['id', ...Array.from(fields).sort()];
    };
    const columns = getColumns();
    const formatValue = (value) => {
        if (value === null)
            return 'null';
        if (typeof value === 'object') {
            if (value.__type__) {
                switch (value.__type__) {
                    case 'timestamp': return `🕐 ${value.value}`;
                    case 'reference': return `🔗 ${value.value}`;
                    case 'geopoint': return `📍 ${value.value.latitude}, ${value.value.longitude}`;
                    case 'bytes': return `📦 base64:${value.value.substring(0, 20)}...`;
                    case 'array': return `[${value.value.length} items]`;
                    case 'map': return `{${Object.keys(value.value).length} fields}`;
                }
            }
            if (Array.isArray(value))
                return `[${value.length} items]`;
            return `{${Object.keys(value).length} fields}`;
        }
        return String(value);
    };
    const openMenu = (doc, e) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setMenuAnchor({ doc, rect });
    };
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%' }, children: [_jsx("div", { className: "table-container", style: { flex: 1, overflow: 'auto' }, children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: { minWidth: 40, textAlign: 'center' }, children: "Actions" }), columns.map(col => (_jsx("th", { style: { minWidth: 120 }, children: col }, col)))] }) }), _jsx("tbody", { children: documents.map(doc => (_jsxs("tr", { onClick: () => onRowClick(doc), style: { cursor: 'pointer' }, children: [_jsxs("td", { style: { textAlign: 'center', whiteSpace: 'nowrap', position: 'relative' }, children: [_jsx("button", { onClick: e => openMenu(doc, e), title: "More actions", style: {
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    padding: '4px 8px',
                                                    color: 'var(--vscode-icon-foreground)',
                                                    fontSize: 16,
                                                    lineHeight: 1,
                                                }, children: "\u22EE" }), menuAnchor && menuAnchor.doc.id === doc.id && (_jsx("div", { ref: menuRef, style: {
                                                    position: 'fixed',
                                                    top: menuAnchor.rect.bottom + 4,
                                                    left: menuAnchor.rect.left,
                                                    backgroundColor: 'var(--vscode-dropdown-background)',
                                                    border: '1px solid var(--vscode-dropdown-border)',
                                                    borderRadius: 4,
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                                    zIndex: 1000,
                                                    minWidth: 220,
                                                    padding: '4px 0',
                                                }, children: menuItems.map((item, i) => (_jsxs("div", { children: [item.divider && _jsx("div", { style: { borderTop: '1px solid var(--vscode-dropdown-border)', margin: '4px 0' } }), _jsxs("button", { onClick: () => handleMenuAction(item.action), style: {
                                                                width: '100%',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '8px',
                                                                padding: '6px 12px',
                                                                background: 'none',
                                                                border: 'none',
                                                                color: item.action === 'delete' ? 'var(--vscode-errorForeground)' : 'var(--vscode-dropdown-foreground)',
                                                                fontSize: 12,
                                                                textAlign: 'left',
                                                                cursor: 'pointer',
                                                            }, onMouseOver: e => e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)', onMouseOut: e => e.currentTarget.style.backgroundColor = 'transparent', children: [_jsx("span", { children: item.icon }), _jsx("span", { children: item.label })] })] }, item.action))) }))] }), _jsx("td", { style: { fontFamily: 'monospace', fontSize: 11, color: 'var(--vscode-descriptionForeground)' }, children: doc.id }), columns.slice(1).map(col => (_jsx("td", { children: doc.data[col] !== undefined ? formatValue(doc.data[col]) : '-' }, col)))] }, doc.id))) })] }) }), _jsxs("div", { className: "pagination", style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    borderTop: '1px solid var(--vscode-border)',
                    flexWrap: 'wrap',
                    gap: '8px',
                }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' }, children: [_jsxs("span", { style: { fontSize: 12, color: 'var(--vscode-descriptionForeground)' }, children: ["Page ", pagination.page, " \u2022 ", documents.length, " documents"] }), _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: 12 }, children: ["Page size:", _jsxs("select", { value: pagination.pageSize, onChange: e => onPageSizeChange(Number(e.target.value)), style: {
                                            padding: '2px 8px',
                                            fontSize: 11,
                                            backgroundColor: 'var(--vscode-input-bg)',
                                            color: 'var(--vscode-input-foreground)',
                                            border: '1px solid var(--vscode-input-border)',
                                            borderRadius: 2,
                                        }, children: [_jsx("option", { value: 10, children: "10" }), _jsx("option", { value: 25, children: "25" }), _jsx("option", { value: 50, children: "50" }), _jsx("option", { value: 100, children: "100" }), _jsx("option", { value: 200, children: "200" })] })] })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' }, children: [pagination.hasMore && (_jsx("button", { onClick: onLoadMore, disabled: loading, style: {
                                    padding: '6px 12px',
                                    fontSize: 12,
                                    backgroundColor: 'var(--vscode-button-background)',
                                    color: 'var(--vscode-button-foreground)',
                                    border: 'none',
                                    borderRadius: 2,
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    opacity: loading ? 0.6 : 1,
                                }, children: loading ? 'Loading...' : 'Load More' })), !pagination.hasMore && documents.length > 0 && (_jsx("span", { style: { fontSize: 12, color: 'var(--vscode-descriptionForeground)' }, children: "End of results" }))] })] })] }));
};
//# sourceMappingURL=DocumentTable.js.map