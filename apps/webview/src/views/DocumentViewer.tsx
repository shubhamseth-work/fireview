import React, { useState } from 'react';
import { FirestoreDocument, FirestoreValue } from '@vistiq/core';
import { Connection } from '@vistiq/core';

// Logger for DocumentViewer
const log = {
  debug: (msg: string, meta?: Record<string, unknown>) => console.debug(`[DocumentViewer] ${msg}`, meta || ''),
  info: (msg: string, meta?: Record<string, unknown>) => console.info(`[DocumentViewer] ${msg}`, meta || ''),
  warn: (msg: string, meta?: Record<string, unknown>) => console.warn(`[DocumentViewer] ${msg}`, meta || ''),
  error: (msg: string, meta?: Record<string, unknown>) => console.error(`[DocumentViewer] ${msg}`, meta || ''),
};

interface DocumentViewerProps {
  document: FirestoreDocument;
  connection: Connection;
  onClose: () => void;
  onUpdate: (documentPath: string, data: Partial<FirestoreDocument>) => void;
  onDelete: (documentPath: string) => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document,
  connection,
  onClose,
  onUpdate,
  onDelete,
}) => {
  log.info('DocumentViewer rendered', { 
    docId: document.id, 
    docPath: document.path,
    hasData: !!document.data,
    dataKeys: document.data ? Object.keys(document.data) : []
  });
  
  const [viewMode, setViewMode] = useState<'table' | 'json' | 'raw'>('table');
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<string>('');
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
      setEditing(false);
    } catch (err) {
      alert('Invalid JSON: ' + (err as Error).message);
    }
  };

  const handleDelete = async () => {
    if (isProduction && !confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    const confirmed = window.confirm(
      isProduction
        ? `⚠️ PRODUCTION: Delete document ${document.id}? Type "DELETE ${document.id}" to confirm.`
        : `Delete document ${document.id}?`
    );
    if (confirmed) {
      await onDelete(document.path);
      onClose();
    }
    setConfirmDelete(false);
  };

  const handleDuplicate = async () => {
    try {
      const newDoc: FirestoreDocument = {
        id: '',
        path: '',
        data: document.data,
      };
      await onUpdate('', { data: newDoc as any });
      onClose();
    } catch (err) {
      alert('Failed to duplicate: ' + (err as Error).message);
    }
  };

  const formatValue = (value: FirestoreValue, indent = 0): React.ReactNode => {
    log.debug('formatValue called', { type: typeof value, isArray: Array.isArray(value), isNull: value === null });
    const spaces = '  '.repeat(indent);
    if (value === null) return <span className="json-null">{spaces}null</span>;
    if (typeof value === 'string') return <span className="json-string">{spaces}"{value}"</span>;
    if (typeof value === 'number') return <span className="json-number">{spaces}{value}</span>;
    if (typeof value === 'boolean') return <span className="json-boolean">{spaces}{String(value)}</span>;
    if (Array.isArray(value)) {
      return (
        <div>
          {spaces}[
          {value.map((v, i) => (
            <div key={i}>{formatValue(v, indent + 1)}{i < value.length - 1 ? ',' : ''}</div>
          ))}
          {spaces}]
        </div>
      );
    }
    if (typeof value === 'object' && value !== null) {
      const obj = value as unknown as Record<string, unknown>;
      if ('__type__' in obj) {
        const type = obj.__type__ as string;
        const val = obj.value as unknown;
        switch (type) {
          case 'timestamp':
            return <span className="json-string">{spaces}"{String(val)}"</span>;
          case 'reference':
            return <span className="json-string">{spaces}"{String(val)}"</span>;
          case 'geopoint': {
            const gp = val as { latitude: number; longitude: number };
            return <span>{spaces}geopoint(latitude: {gp.latitude}, longitude: {gp.longitude})</span>;
          }
          case 'bytes':
            return <span className="json-string">{spaces}"base64:{String(val)}"</span>;
          case 'array':
            return (
              <div>
                {spaces}[
                {(val as FirestoreValue[]).map((v, i) => (
                  <div key={i}>{formatValue(v, indent + 1)}{i < (val as FirestoreValue[]).length - 1 ? ',' : ''}</div>
                ))}
                {spaces}]
              </div>
            );
          case 'map': {
            const entries = Object.entries(val as Record<string, FirestoreValue>);
            return (
              <div>
                {spaces}{'{'}{' '}
                {entries.map(([k, v], i) => (
                  <div key={k}>
                    <span className="json-key">{spaces}  "{k}":</span>
                    {formatValue(v, indent + 1)}
                    {i < entries.length - 1 ? ',' : ''}
                  </div>
                ))}
                {spaces}{'}'}{' '}
              </div>
            );
          }
        }
      }
      const entries = Object.entries(obj);
      return (
        <div>
          {spaces}{'{'}{' '}
          {entries.map(([k, v], i) => (
            <div key={k}>
              <span className="json-key">{spaces}  "{k}":</span>
              {formatValue(v as FirestoreValue, indent + 1)}
              {i < entries.length - 1 ? ',' : ''}
            </div>
          ))}
          {spaces}{'}'}{' '}
        </div>
      );
    }
    return <span>{spaces}{String(value)}</span>;
  };

  const renderTableView = () => (
    <div className="table-container" style={{ flex: 1, overflow: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th style={{ width: 200 }}>Field</th>
            <th>Value</th>
            <th style={{ width: 100 }}>Type</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ fontWeight: 600 }}>id</td>
            <td style={{ fontFamily: 'monospace' }}>{document.id}</td>
            <td>string</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 600 }}>path</td>
            <td style={{ fontFamily: 'monospace' }}>{document.path}</td>
            <td>string</td>
          </tr>
          {Object.entries(document.data).map(([key, value]) => (
            <tr key={key}>
              <td style={{ fontWeight: 600 }}>{key}</td>
              <td>{formatValue(value) as React.ReactNode}</td>
              <td style={{ color: 'var(--vscode-descriptionForeground)', fontSize: 11 }}>
                {value === null ? 'null' : (typeof value === 'object' && value !== null && '__type__' in (value as object)) ? (value as unknown as Record<string, unknown>).__type__ as string : typeof value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderJsonView = () => (
    <div className="json-viewer" style={{ flex: 1, overflow: 'auto', padding: 16, fontFamily: 'monospace', fontSize: 12, lineHeight: 1.5 }}>
      {formatValue({ __type__: 'map', value: document.data } as any)}
    </div>
  );

  const renderRawView = () => (
    <pre style={{ flex: 1, overflow: 'auto', padding: 16, margin: 0, fontSize: 12, whiteSpace: 'pre-wrap' }}>
      {JSON.stringify(document.data, null, 2)}
    </pre>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} className="secondary">← Back</button>
          <span style={{ fontWeight: 500 }}>{document.id || '(new document)'}</span>
          {isProduction && <span className="badge production">Production</span>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setViewMode('table')} className={viewMode === 'table' ? 'active' : 'secondary'}>Table</button>
          <button onClick={() => setViewMode('json')} className={viewMode === 'json' ? 'active' : 'secondary'}>JSON</button>
          <button onClick={() => setViewMode('raw')} className={viewMode === 'raw' ? 'active' : 'secondary'}>Raw</button>
          {editing ? (
            <>
              <button onClick={handleSave} style={{ backgroundColor: 'var(--vscode-success)' }}>Save</button>
              <button onClick={() => setEditing(false)} className="secondary">Cancel</button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="secondary">Edit</button>
              <button onClick={handleDuplicate} className="secondary">Duplicate</button>
              <button onClick={handleDelete} className="danger" disabled={isProduction && !confirmDelete}>Delete</button>
            </>
          )}
        </div>
      </div>

      {confirmDelete && isProduction && (
        <div style={{ padding: 16, backgroundColor: 'rgba(244, 71, 71, 0.1)', border: '1px solid var(--vscode-error)', borderRadius: 4, margin: '0 16px 16px' }}>
          <div style={{ color: 'var(--vscode-error)', fontWeight: 600, marginBottom: 8 }}>
            ⚠️ PRODUCTION DELETION CONFIRMATION REQUIRED
          </div>
          <div style={{ marginBottom: 8 }}>
            Type <code style={{ background: 'var(--vscode-input-bg)', padding: '2px 6px', borderRadius: 2 }}>
              DELETE {document.id}
            </code> to confirm deletion
          </div>
          <input
            type="text"
            placeholder={`DELETE ${document.id}`}
            onChange={e => setConfirmDelete(e.target.value === `DELETE ${document.id}`)}
            style={{ width: '100%', marginBottom: 8 }}
          />
          <button onClick={handleDelete} className="danger" disabled={!confirmDelete}>Confirm Delete</button>
        </div>
      )}

      <div className="tabs">
        <button className={viewMode === 'table' ? 'active' : ''} onClick={() => setViewMode('table')}>Table</button>
        <button className={viewMode === 'json' ? 'active' : ''} onClick={() => setViewMode('json')}>JSON Tree</button>
        <button className={viewMode === 'raw' ? 'active' : ''} onClick={() => setViewMode('raw')}>Raw JSON</button>
      </div>

      {editing ? (
        <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
          <textarea
            value={editData}
            onChange={e => setEditData(e.target.value)}
            style={{
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
            }}
            placeholder='{"field": "value"}'
          />
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {viewMode === 'table' && renderTableView()}
          {viewMode === 'json' && renderJsonView()}
          {viewMode === 'raw' && renderRawView()}
        </div>
      )}
    </div>
  );
};