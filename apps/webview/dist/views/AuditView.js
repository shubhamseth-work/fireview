import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
export const AuditView = ({ connection }) => {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState({
        projectId: connection.projectId,
        operation: '',
        startDate: '',
        endDate: '',
        search: '',
    });
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    useEffect(() => {
        loadEntries();
    }, [filter, page]);
    const loadEntries = async () => {
        setLoading(true);
        try {
            // In real implementation, call backend
            setEntries([
                { id: '1', timestamp: new Date().toISOString(), operation: 'create-document', projectId: connection.projectId, collectionPath: 'users', documentPath: 'users/123', result: 'success' },
                { id: '2', timestamp: new Date().toISOString(), operation: 'update-document', projectId: connection.projectId, collectionPath: 'users', documentPath: 'users/123', result: 'success' },
                { id: '3', timestamp: new Date().toISOString(), operation: 'export-collection', projectId: connection.projectId, collectionPath: 'users', result: 'success' },
            ]);
            setTotalPages(1);
        }
        finally {
            setLoading(false);
        }
    };
    const handleSearch = () => {
        setPage(1);
    };
    const handleClear = async () => {
        if (window.confirm('Clear all audit history?')) {
            // In real implementation, call backend
            setEntries([]);
        }
    };
    const handleExport = () => {
        const data = JSON.stringify(entries, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-${connection.projectId}-${new Date().toISOString()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };
    const getOperationColor = (op) => {
        if (op.includes('delete'))
            return 'var(--vscode-error)';
        if (op.includes('create'))
            return 'var(--vscode-success)';
        if (op.includes('update'))
            return 'var(--vscode-warning)';
        if (op.includes('export') || op.includes('import'))
            return 'var(--vscode-accent)';
        return 'var(--vscode-fg)';
    };
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%', padding: 16 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }, children: [_jsx("h2", { children: "Audit History" }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("button", { onClick: handleExport, className: "secondary", children: "Export" }), _jsx("button", { onClick: handleClear, className: "danger", children: "Clear" })] })] }), _jsxs("div", { style: { display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }, children: [_jsxs("div", { style: { flex: 1, minWidth: 200 }, children: [_jsx("label", { style: { display: 'block', marginBottom: 4 }, children: "Search" }), _jsx("input", { type: "text", value: filter.search, onChange: e => setFilter({ ...filter, search: e.target.value }), placeholder: "Search entries...", style: { width: '100%' } })] }), _jsxs("div", { style: { minWidth: 150 }, children: [_jsx("label", { style: { display: 'block', marginBottom: 4 }, children: "Operation" }), _jsxs("select", { value: filter.operation, onChange: e => setFilter({ ...filter, operation: e.target.value }), style: { width: '100%' }, children: [_jsx("option", { value: "", children: "All Operations" }), [
                                        'connect', 'disconnect',
                                        'create-document', 'update-document', 'delete-document',
                                        'batch-delete', 'batch-update', 'batch-create',
                                        'export-collection', 'import-collection',
                                        'run-query', 'copy-documents', 'migrate',
                                        'compare-projects', 'diff-documents',
                                        'emulator-connect', 'emulator-disconnect'
                                    ].map(op => (_jsx("option", { value: op, children: op }, op)))] })] }), _jsxs("div", { style: { minWidth: 150 }, children: [_jsx("label", { style: { display: 'block', marginBottom: 4 }, children: "Start Date" }), _jsx("input", { type: "date", value: filter.startDate, onChange: e => setFilter({ ...filter, startDate: e.target.value }), style: { width: '100%' } })] }), _jsxs("div", { style: { minWidth: 150 }, children: [_jsx("label", { style: { display: 'block', marginBottom: 4 }, children: "End Date" }), _jsx("input", { type: "date", value: filter.endDate, onChange: e => setFilter({ ...filter, endDate: e.target.value }), style: { width: '100%' } })] }), _jsx("button", { onClick: handleSearch, style: { alignSelf: 'flex-end' }, children: "Search" })] }), loading ? (_jsx("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }, children: "Loading audit entries..." })) : entries.length === 0 ? (_jsxs("div", { className: "empty-state", style: { flex: 1 }, children: [_jsx("div", { className: "icon", children: "\uD83D\uDCCB" }), _jsx("h3", { children: "No Audit Entries" }), _jsx("p", { children: "No activity recorded yet." })] })) : (_jsx("div", { className: "table-container", style: { flex: 1, overflow: 'auto' }, children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: { width: 160 }, children: "Timestamp" }), _jsx("th", { style: { width: 140 }, children: "Operation" }), _jsx("th", { style: { width: 120 }, children: "Project" }), _jsx("th", { children: "Path" }), _jsx("th", { style: { width: 80 }, children: "Result" })] }) }), _jsx("tbody", { children: entries.map(entry => (_jsxs("tr", { children: [_jsx("td", { style: { fontSize: 11, color: 'var(--vscode-descriptionForeground)' }, children: new Date(entry.timestamp).toLocaleString() }), _jsx("td", { children: _jsx("span", { style: { color: getOperationColor(entry.operation), fontWeight: 500 }, children: entry.operation }) }), _jsx("td", { style: { fontSize: 11 }, children: entry.projectId }), _jsxs("td", { style: { fontSize: 11, fontFamily: 'monospace' }, children: [entry.collectionPath || '', entry.documentPath && ` / ${entry.documentPath}`] }), _jsx("td", { children: _jsx("span", { style: {
                                                padding: '2px 8px',
                                                borderRadius: 10,
                                                fontSize: 10,
                                                fontWeight: 600,
                                                backgroundColor: entry.result === 'success' ? 'rgba(78, 201, 176, 0.2)' : entry.result === 'failure' ? 'rgba(244, 71, 71, 0.2)' : 'rgba(220, 220, 170, 0.2)',
                                                color: entry.result === 'success' ? 'var(--vscode-success)' : entry.result === 'failure' ? 'var(--vscode-error)' : 'var(--vscode-warning)',
                                            }, children: entry.result }) })] }, entry.id))) })] }) })), _jsxs("div", { className: "pagination", children: [_jsx("button", { onClick: () => setPage(p => Math.max(1, p - 1)), disabled: page === 1, children: "Previous" }), _jsxs("span", { children: ["Page ", page, " of ", totalPages] }), _jsx("button", { onClick: () => setPage(p => Math.min(totalPages, p + 1)), disabled: page >= totalPages, children: "Next" })] })] }));
};
//# sourceMappingURL=AuditView.js.map