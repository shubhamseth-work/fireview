import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
export const QueryBuilder = ({ collections, onRunQuery, onClose }) => {
    const [selectedCollection, setSelectedCollection] = React.useState('');
    const [collectionGroup, setCollectionGroup] = React.useState(false);
    const [filters, setFilters] = React.useState([{ field: '', operator: '==', value: '' }]);
    const [orderBy, setOrderBy] = React.useState([]);
    const [limit, setLimit] = React.useState(50);
    const [generatedCode, setGeneratedCode] = React.useState('');
    const operators = ['==', '!=', '<', '<=', '>', '>=', 'array-contains', 'array-contains-any', 'in', 'not-in'];
    const addFilter = () => {
        setFilters([...filters, { field: '', operator: '==', value: '' }]);
    };
    const removeFilter = (index) => {
        setFilters(filters.filter((_, i) => i !== index));
    };
    const updateFilter = (index, field, value) => {
        const newFilters = [...filters];
        const filter = { ...newFilters[index] };
        filter[field] = value;
        newFilters[index] = filter;
        setFilters(newFilters);
    };
    const addOrderBy = () => {
        setOrderBy([...orderBy, { field: '', direction: 'asc' }]);
    };
    const removeOrderBy = (index) => {
        setOrderBy(orderBy.filter((_, i) => i !== index));
    };
    const handleRunQuery = () => {
        if (!selectedCollection)
            return;
        const query = {
            collectionPath: selectedCollection,
            collectionGroup,
            filters: filters.filter(f => f.field && f.value !== ''),
            orderBy: orderBy.filter(o => o.field),
            limit,
        };
        onRunQuery(query);
    };
    const handleGenerateCode = (lang) => {
        const query = {
            collectionPath: selectedCollection,
            collectionGroup,
            filters: filters.filter(f => f.field && f.value !== ''),
            orderBy: orderBy.filter(o => o.field),
            limit,
        };
        let code = `const snapshot = await db${query.collectionGroup ? `.collectionGroup("${query.collectionPath}")` : `.collection("${query.collectionPath}")`}`;
        for (const filter of query.filters) {
            code += `\n  .where("${filter.field}", "${filter.operator}", ${JSON.stringify(filter.value)})`;
        }
        for (const ob of query.orderBy) {
            code += `\n  .orderBy("${ob.field}", "${ob.direction}")`;
        }
        if (query.limit) {
            code += `\n  .limit(${query.limit})`;
        }
        code += `\n  .get();`;
        setGeneratedCode(code);
    };
    return (_jsxs("div", { className: "query-builder", style: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto', padding: 16 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }, children: [_jsx("h3", { children: "Query Builder" }), _jsx("button", { onClick: onClose, className: "secondary", children: "Close" })] }), _jsxs("div", { className: "filter-group", children: [_jsx("label", { style: { minWidth: 100 }, children: "Collection:" }), _jsxs("select", { value: selectedCollection, onChange: e => setSelectedCollection(e.target.value), style: { flex: 1 }, children: [_jsx("option", { value: "", children: "Select collection..." }), collections.map(c => _jsx("option", { value: c.path, children: c.id }, c.id))] })] }), _jsxs("div", { className: "filter-group", children: [_jsx("label", { style: { minWidth: 100 }, children: "Collection Group:" }), _jsx("input", { type: "checkbox", checked: collectionGroup, onChange: e => setCollectionGroup(e.target.checked) })] }), _jsxs("div", { style: { marginBottom: 16 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 8 }, children: [_jsx("strong", { children: "Filters" }), _jsx("button", { onClick: addFilter, className: "secondary", style: { padding: '4px 8px', fontSize: 12 }, children: "+ Add Filter" })] }), filters.map((filter, index) => (_jsxs("div", { className: "filter-group", style: { marginBottom: 8 }, children: [_jsx("input", { type: "text", placeholder: "Field", value: filter.field, onChange: e => updateFilter(index, 'field', e.target.value), className: "field-input" }), _jsx("select", { value: filter.operator, onChange: e => updateFilter(index, 'operator', e.target.value), className: "operator-select", children: operators.map(op => _jsx("option", { value: op, children: op }, op)) }), _jsx("input", { type: "text", placeholder: "Value", value: filter.value, onChange: e => updateFilter(index, 'value', e.target.value), className: "value-input" }), _jsx("button", { onClick: () => removeFilter(index), className: "btn-icon", title: "Remove", children: "\u00D7" })] }, index)))] }), _jsxs("div", { style: { marginBottom: 16 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 8 }, children: [_jsx("strong", { children: "Order By" }), _jsx("button", { onClick: addOrderBy, className: "secondary", style: { padding: '4px 8px', fontSize: 12 }, children: "+ Add" })] }), orderBy.map((ob, index) => (_jsxs("div", { className: "filter-group", style: { marginBottom: 8 }, children: [_jsx("input", { type: "text", placeholder: "Field", value: ob.field, onChange: e => setOrderBy(orderBy.map((o, i) => i === index ? { ...o, field: e.target.value } : o)), className: "field-input" }), _jsxs("select", { value: ob.direction, onChange: e => setOrderBy(orderBy.map((o, i) => i === index ? { ...o, direction: e.target.value } : o)), children: [_jsx("option", { value: "asc", children: "Ascending" }), _jsx("option", { value: "desc", children: "Descending" })] }), _jsx("button", { onClick: () => removeOrderBy(index), className: "btn-icon", title: "Remove", children: "\u00D7" })] }, index)))] }), _jsxs("div", { className: "filter-group", children: [_jsx("label", { style: { minWidth: 100 }, children: "Limit:" }), _jsx("input", { type: "number", min: "1", max: "1000", value: limit, onChange: e => setLimit(parseInt(e.target.value) || 50), style: { width: 80 } })] }), _jsxs("div", { style: { marginTop: 16, display: 'flex', gap: 8 }, children: [_jsx("button", { onClick: handleRunQuery, style: { flex: 1 }, children: "Run Query" }), _jsx("button", { onClick: () => handleGenerateCode('typescript'), className: "secondary", style: { flex: 1 }, children: "Generate TS" }), _jsx("button", { onClick: () => handleGenerateCode('javascript'), className: "secondary", style: { flex: 1 }, children: "Generate JS" }), _jsx("button", { onClick: () => handleGenerateCode('python'), className: "secondary", style: { flex: 1 }, children: "Generate Python" })] }), generatedCode && (_jsxs("div", { style: { marginTop: 16 }, children: [_jsx("strong", { children: "Generated Code:" }), _jsx("pre", { style: { background: 'var(--vscode-input-bg)', padding: 12, borderRadius: 4, overflow: 'auto', marginTop: 8 }, children: _jsx("code", { children: generatedCode }) })] }))] }));
};
//# sourceMappingURL=QueryBuilder.js.map