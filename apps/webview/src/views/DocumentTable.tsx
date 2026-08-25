import React from 'react';
import { FirestoreDocument, FirestoreQuery, QueryFilter, QueryOperator, OrderByClause } from '@vistiq/core';
import { Connection } from '@vistiq/core';

interface DocumentTableProps {
  documents: FirestoreDocument[];
  loading: boolean;
  error: string | null;
  pagination: { page: number; hasMore: boolean; nextToken: string };
  onRowClick: (doc: FirestoreDocument) => void;
  onRunQuery: (query: FirestoreQuery) => void;
}

export const DocumentTable: React.FC<DocumentTableProps> = ({
  documents,
  loading,
  error,
  pagination,
  onRowClick,
  onRunQuery,
}) => {
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
          <div>Loading documents...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 24 }}>
        <div style={{ textAlign: 'center', color: 'var(--vscode-error)' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⚠️</div>
          <div>Error: {error}</div>
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="empty-state" style={{ flex: 1 }}>
        <div className="icon">📄</div>
        <h3>No Documents</h3>
        <p>This collection is empty or no documents match your query.</p>
      </div>
    );
  }

  const getColumns = () => {
    if (documents.length === 0) return ['id'];
    const fields = new Set<string>();
    documents.forEach(doc => {
      Object.keys(doc.data).forEach(key => fields.add(key));
    });
    return ['id', ...Array.from(fields).sort()];
  };

  const columns = getColumns();

  const formatValue = (value: any): string => {
    if (value === null) return 'null';
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
      if (Array.isArray(value)) return `[${value.length} items]`;
      return `{${Object.keys(value).length} fields}`;
    }
    return String(value);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="table-container" style={{ flex: 1, overflow: 'auto' }}>
        <table>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col} style={{ minWidth: 120 }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {documents.map(doc => (
              <tr key={doc.id} onClick={() => onRowClick(doc)} style={{ cursor: 'pointer' }}>
                <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--vscode-descriptionForeground)' }}>
                  {doc.id}
                </td>
                {columns.slice(1).map(col => (
                  <td key={col}>
                    {doc.data[col] !== undefined ? formatValue(doc.data[col]) : '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <span>Page {pagination.page}</span>
        <span style={{ color: 'var(--vscode-descriptionForeground)' }}>
          {documents.length} documents
        </span>
        {pagination.hasMore && (
          <button onClick={() => {}} disabled>Load More</button>
        )}
      </div>
    </div>
  );
};