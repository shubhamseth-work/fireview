import React from 'react';
import { FirestoreDocument, QueryFilter, QueryOperator, OrderByClause, FirestoreValue } from '@fireview/core';

interface QueryBuilderProps {
  collections: any[];
  onRunQuery: (query: FirestoreQuery) => void;
  onClose: () => void;
}

interface FirestoreQuery {
  collectionPath: string;
  collectionGroup?: boolean;
  filters: QueryFilter[];
  orderBy: OrderByClause[];
  limit?: number;
  offset?: number;
}

export const QueryBuilder: React.FC<QueryBuilderProps> = ({ collections, onRunQuery, onClose }) => {
  const [selectedCollection, setSelectedCollection] = React.useState('');
  const [collectionGroup, setCollectionGroup] = React.useState(false);
  const [filters, setFilters] = React.useState<QueryFilter[]>([{ field: '', operator: '==', value: '' }]);
  const [orderBy, setOrderBy] = React.useState<OrderByClause[]>([]);
  const [limit, setLimit] = React.useState(50);
  const [generatedCode, setGeneratedCode] = React.useState('');

  const operators: QueryOperator[] = ['==', '!=', '<', '<=', '>', '>=', 'array-contains', 'array-contains-any', 'in', 'not-in'];

  const addFilter = () => {
    setFilters([...filters, { field: '', operator: '==', value: '' }]);
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const updateFilter = (index: number, field: string, value: any) => {
    const newFilters = [...filters];
    const currentFilter = newFilters[index];
    if (!currentFilter) return;
    newFilters[index] = {
      field: field === 'field' ? value : currentFilter.field,
      operator: field === 'operator' ? value : currentFilter.operator,
      value: field === 'value' ? value : currentFilter.value,
    };
    setFilters(newFilters);
  };

  const addOrderBy = () => {
    setOrderBy([...orderBy, { field: '', direction: 'asc' }]);
  };

  const removeOrderBy = (index: number) => {
    setOrderBy(orderBy.filter((_, i) => i !== index));
  };

  const handleRunQuery = () => {
    if (!selectedCollection) return;
    const query: FirestoreQuery = {
      collectionPath: selectedCollection,
      collectionGroup,
      filters: filters.filter(f => f.field && f.value !== ''),
      orderBy: orderBy.filter(o => o.field),
      limit,
    };
    onRunQuery(query);
  };

  const handleGenerateCode = (lang: 'typescript' | 'javascript' | 'python') => {
    const query: FirestoreQuery = {
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

  return (
    <div className="query-builder" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3>Query Builder</h3>
        <button onClick={onClose} className="secondary">Close</button>
      </div>

      <div className="filter-group">
        <label style={{ minWidth: 100 }}>Collection:</label>
        <select value={selectedCollection} onChange={e => setSelectedCollection(e.target.value)} style={{ flex: 1 }}>
          <option value="">Select collection...</option>
          {collections.map(c => <option key={c.id} value={c.path}>{c.id}</option>)}
        </select>
      </div>

      <div className="filter-group">
        <label style={{ minWidth: 100 }}>Collection Group:</label>
        <input type="checkbox" checked={collectionGroup} onChange={e => setCollectionGroup(e.target.checked)} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <strong>Filters</strong>
          <button onClick={addFilter} className="secondary" style={{ padding: '4px 8px', fontSize: 12 }}>+ Add Filter</button>
        </div>
        {filters.map((filter, index) => (
          <div key={index} className="filter-group" style={{ marginBottom: 8 }}>
            <input
              type="text"
              placeholder="Field"
              value={filter.field}
              onChange={e => updateFilter(index, 'field', e.target.value)}
              className="field-input"
            />
            <select value={filter.operator} onChange={e => updateFilter(index, 'operator', e.target.value as QueryOperator)} className="operator-select">
              {operators.map(op => <option key={op} value={op}>{op}</option>)}
            </select>
            <input
              type="text"
              placeholder="Value"
              value={String(filter.value ?? '')}
              onChange={e => updateFilter(index, 'value', e.target.value)}
              className="value-input"
            />
            <button onClick={() => removeFilter(index)} className="btn-icon" title="Remove">×</button>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <strong>Order By</strong>
          <button onClick={addOrderBy} className="secondary" style={{ padding: '4px 8px', fontSize: 12 }}>+ Add</button>
        </div>
        {orderBy.map((ob, index) => (
          <div key={index} className="filter-group" style={{ marginBottom: 8 }}>
            <input
              type="text"
              placeholder="Field"
              value={ob.field}
              onChange={e => setOrderBy(orderBy.map((o, i) => i === index ? { ...o, field: e.target.value } : o))}
              className="field-input"
            />
            <select value={ob.direction} onChange={e => setOrderBy(orderBy.map((o, i) => i === index ? { ...o, direction: e.target.value as 'asc' | 'desc' } : o))}>
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
            <button onClick={() => removeOrderBy(index)} className="btn-icon" title="Remove">×</button>
          </div>
        ))}
      </div>

      <div className="filter-group">
        <label style={{ minWidth: 100 }}>Limit:</label>
        <input
          type="number"
          min="1"
          max="1000"
          value={limit}
          onChange={e => setLimit(parseInt(e.target.value) || 50)}
          style={{ width: 80 }}
        />
      </div>

      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <button onClick={handleRunQuery} style={{ flex: 1 }}>Run Query</button>
        <button onClick={() => handleGenerateCode('typescript')} className="secondary" style={{ flex: 1 }}>Generate TS</button>
        <button onClick={() => handleGenerateCode('javascript')} className="secondary" style={{ flex: 1 }}>Generate JS</button>
        <button onClick={() => handleGenerateCode('python')} className="secondary" style={{ flex: 1 }}>Generate Python</button>
      </div>

      {generatedCode && (
        <div style={{ marginTop: 16 }}>
          <strong>Generated Code:</strong>
          <pre style={{ background: 'var(--vscode-input-bg)', padding: 12, borderRadius: 4, overflow: 'auto', marginTop: 8 }}>
            <code>{generatedCode}</code>
          </pre>
        </div>
      )}
    </div>
  );
};