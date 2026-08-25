import React, { useState, useEffect } from 'react';
import { Connection, AuditEntry, AuditOperation } from '@vistiq/core';

interface AuditViewProps {
  connection: Connection;
}

export const AuditView: React.FC<AuditViewProps> = ({ connection }) => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
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
    } finally {
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

  const getOperationColor = (op: AuditOperation) => {
    if (op.includes('delete')) return 'var(--vscode-error)';
    if (op.includes('create')) return 'var(--vscode-success)';
    if (op.includes('update')) return 'var(--vscode-warning)';
    if (op.includes('export') || op.includes('import')) return 'var(--vscode-accent)';
    return 'var(--vscode-fg)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>Audit History</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleExport} className="secondary">Export</button>
          <button onClick={handleClear} className="danger">Clear</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Search</label>
          <input
            type="text"
            value={filter.search}
            onChange={e => setFilter({ ...filter, search: e.target.value })}
            placeholder="Search entries..."
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ minWidth: 150 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Operation</label>
          <select value={filter.operation} onChange={e => setFilter({ ...filter, operation: e.target.value })} style={{ width: '100%' }}>
            <option value="">All Operations</option>
            {[
              'connect', 'disconnect',
              'create-document', 'update-document', 'delete-document',
              'batch-delete', 'batch-update', 'batch-create',
              'export-collection', 'import-collection',
              'run-query', 'copy-documents', 'migrate',
              'compare-projects', 'diff-documents',
              'emulator-connect', 'emulator-disconnect'
            ].map(op => (
              <option key={op} value={op}>{op}</option>
            ))}
          </select>
        </div>
        <div style={{ minWidth: 150 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Start Date</label>
          <input
            type="date"
            value={filter.startDate}
            onChange={e => setFilter({ ...filter, startDate: e.target.value })}
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ minWidth: 150 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>End Date</label>
          <input
            type="date"
            value={filter.endDate}
            onChange={e => setFilter({ ...filter, endDate: e.target.value })}
            style={{ width: '100%' }}
          />
        </div>
        <button onClick={handleSearch} style={{ alignSelf: 'flex-end' }}>Search</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          Loading audit entries...
        </div>
      ) : entries.length === 0 ? (
        <div className="empty-state" style={{ flex: 1 }}>
          <div className="icon">📋</div>
          <h3>No Audit Entries</h3>
          <p>No activity recorded yet.</p>
        </div>
      ) : (
        <div className="table-container" style={{ flex: 1, overflow: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 160 }}>Timestamp</th>
                <th style={{ width: 140 }}>Operation</th>
                <th style={{ width: 120 }}>Project</th>
                <th>Path</th>
                <th style={{ width: 80 }}>Result</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr key={entry.id}>
                  <td style={{ fontSize: 11, color: 'var(--vscode-descriptionForeground)' }}>
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td>
                    <span style={{ color: getOperationColor(entry.operation), fontWeight: 500 }}>
                      {entry.operation}
                    </span>
                  </td>
                  <td style={{ fontSize: 11 }}>{entry.projectId}</td>
                  <td style={{ fontSize: 11, fontFamily: 'monospace' }}>
                    {entry.collectionPath || ''}
                    {entry.documentPath && ` / ${entry.documentPath}`}
                  </td>
                  <td>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 10,
                      fontSize: 10,
                      fontWeight: 600,
                      backgroundColor: entry.result === 'success' ? 'rgba(78, 201, 176, 0.2)' : entry.result === 'failure' ? 'rgba(244, 71, 71, 0.2)' : 'rgba(220, 220, 170, 0.2)',
                      color: entry.result === 'success' ? 'var(--vscode-success)' : entry.result === 'failure' ? 'var(--vscode-error)' : 'var(--vscode-warning)',
                    }}>
                      {entry.result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="pagination">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</button>
        <span>Page {page} of {totalPages}</span>
        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</button>
      </div>
    </div>
  );
};