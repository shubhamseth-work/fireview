import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const DocumentTable = ({ documents, loading, error, pagination, onRowClick, onRunQuery, }) => {
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
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%' }, children: [_jsx("div", { className: "table-container", style: { flex: 1, overflow: 'auto' }, children: _jsxs("table", { children: [_jsx("thead", { children: _jsx("tr", { children: columns.map(col => (_jsx("th", { style: { minWidth: 120 }, children: col }, col))) }) }), _jsx("tbody", { children: documents.map(doc => (_jsxs("tr", { onClick: () => onRowClick(doc), style: { cursor: 'pointer' }, children: [_jsx("td", { style: { fontFamily: 'monospace', fontSize: 11, color: 'var(--vscode-descriptionForeground)' }, children: doc.id }), columns.slice(1).map(col => (_jsx("td", { children: doc.data[col] !== undefined ? formatValue(doc.data[col]) : '-' }, col)))] }, doc.id))) })] }) }), _jsxs("div", { className: "pagination", children: [_jsxs("span", { children: ["Page ", pagination.page] }), _jsxs("span", { style: { color: 'var(--vscode-descriptionForeground)' }, children: [documents.length, " documents"] }), pagination.hasMore && (_jsx("button", { onClick: () => { }, disabled: true, children: "Load More" }))] })] }));
};
//# sourceMappingURL=DocumentTable.js.map