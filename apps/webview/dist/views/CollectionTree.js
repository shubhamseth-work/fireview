import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const CollectionTree = ({ collections, selectedCollection, onSelect, loading, }) => {
    if (loading) {
        return (_jsx("div", { style: { padding: 16, textAlign: 'center', color: 'var(--vscode-descriptionForeground)' }, children: "Loading collections..." }));
    }
    if (collections.length === 0) {
        return (_jsxs("div", { className: "empty-state", style: { flex: 1, padding: 16 }, children: [_jsx("div", { className: "icon", children: "\uD83D\uDCC1" }), _jsx("h3", { children: "No Collections" }), _jsx("p", { children: "This project has no Firestore collections." })] }));
    }
    return (_jsx("div", { className: "tree-view", style: { flex: 1, overflow: 'auto' }, children: collections.map(col => (_jsxs("div", { className: `tree-item ${selectedCollection === col.path ? 'selected' : ''}`, onClick: () => onSelect(col.path), style: { padding: '8px 12px', display: 'flex', alignItems: 'center' }, children: [_jsx("span", { className: "icon", children: "\uD83D\uDCC1" }), _jsx("span", { style: { flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, children: col.id }), col.documentCount !== undefined && (_jsx("span", { style: { fontSize: 11, color: 'var(--vscode-descriptionForeground)', marginLeft: 8 }, children: col.documentCount }))] }, col.id))) }));
};
//# sourceMappingURL=CollectionTree.js.map