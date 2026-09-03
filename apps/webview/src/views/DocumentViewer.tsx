import type { Connection, FirestoreDocument, FirestoreValue } from '@fireview/core';
import React, { useState } from 'react';
import { useNotify } from '../context/NotificationContext';
import { ConfirmationModal } from './ConfirmationModal';
import { JsonTreeView } from './JsonTreeView';

// Logger for DocumentViewer
const log = {
  debug: (msg: string, meta?: Record<string, unknown>) =>
    console.debug(`[DocumentViewer] ${msg}`, meta || ''),
  info: (msg: string, meta?: Record<string, unknown>) =>
    console.info(`[DocumentViewer] ${msg}`, meta || ''),
  warn: (msg: string, meta?: Record<string, unknown>) =>
    console.warn(`[DocumentViewer] ${msg}`, meta || ''),
  error: (msg: string, meta?: Record<string, unknown>) =>
    console.error(`[DocumentViewer] ${msg}`, meta || ''),
};

interface DocumentViewerProps {
  document: FirestoreDocument;
  connection: Connection;
  onClose: () => void;
  onUpdate: (documentPath: string, data: Partial<FirestoreDocument>) => void;
  onCreateDocument: (collectionPath: string, data: FirestoreDocument) => void;
  onDelete: (documentPath: string) => void;
  onOpenDocument?: (documentPath: string) => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document,
  connection,
  onClose,
  onUpdate,
  onCreateDocument,
  onDelete,
  onOpenDocument,
}) => {
  const notify = useNotify();
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    isProduction: boolean;
  } | null>(null);

  const safeData = document.data ?? {}; // eslint-disable-line @typescript-eslint/no-unnecessary-condition
  log.info('DocumentViewer rendered', {
    docId: document.id,
    docPath: document.path,
    hasData: !!document.data,
    dataKeys: Object.keys(safeData),
  });

  const [viewMode, setViewMode] = useState<'table' | 'json' | 'raw'>('table');
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<string>('');
  const [isProduction, setIsProduction] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [docIdInput, setDocIdInput] = useState<string>(document.id || '');

  const isProd = connection.environment === 'production';
  const isNewDoc = !document.id;

  const handleFetchDocById = () => {
    if (!docIdInput.trim() || !onOpenDocument) return;
    // Extract collection path from current document path
    const collectionPath = document.path.split('/').slice(0, -1).join('/');
    const newDocPath = collectionPath ? `${collectionPath}/${docIdInput.trim()}` : docIdInput.trim();
    onOpenDocument(newDocPath);
  };

  // Sync input with current document ID when document changes
  React.useEffect(() => {
    setDocIdInput(document.id || '');
  }, [document.id]);

  React.useEffect(() => {
    log.debug('DocumentViewer: Effect triggered', { docId: document.id, editing });
    setIsProduction(isProd);
    if (editing) {
      setEditData(JSON.stringify(safeData, null, 2));
    }
  }, [document, editing, safeData]);

  const handleSave = async () => {
    try {
      const parsed = JSON.parse(editData);
      await onUpdate(document.path, { data: parsed });
      notify('success', 'Document updated successfully');
      setEditing(false);
    } catch (err) {
      notify('error', `Invalid JSON: ${(err as Error).message}`);
    }
  };

  const handleDelete = async () => {
const isProd = connection?.environment === 'production';
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
      const newDoc: FirestoreDocument = {
        id: '',
        path: '',
        data: safeData,
      };
      await onCreateDocument(collectionPath, newDoc);
      notify('success', 'Document duplicated successfully');
      onClose();
    } catch (err) {
      notify('error', `Failed to duplicate: ${(err as Error).message}`);
    }
  };

  const formatTypedValue = (
    type: string,
    val: unknown,
    indent: number,
    spaces: string
  ): React.ReactNode | null => {
    if (type === 'timestamp') {
      return (
        <span className="json-string">
          {spaces}"{String(val)}"
        </span>
      );
    }
    if (type === 'reference') {
      return (
        <span className="json-string">
          {spaces}"{String(val)}"
        </span>
      );
    }
    if (type === 'geopoint') {
      const gp = val as { latitude: number; longitude: number } | null;
      if (!gp) return <span className="json-null">{spaces}geopoint(null)</span>;
      return (
        <span>
          {spaces}geopoint(latitude: {gp.latitude}, longitude: {gp.longitude})
        </span>
      );
    }
    if (type === 'bytes') {
      return (
        <span className="json-string">
          {spaces}"base64:{String(val)}"
        </span>
      );
    }
    if (type === 'array') {
      if (!val || !Array.isArray(val)) {
        return <span className="json-null">{spaces}[]</span>;
      }
      return (
        <div>
          {spaces}[
          {(val as FirestoreValue[]).map((v, i) => (
            <div key={i}>
              {formatValue(v, indent + 1)}
              {i < (val as FirestoreValue[]).length - 1 ? ',' : ''}
            </div>
          ))}
          {spaces}]
        </div>
      );
    }
    if (type === 'map') {
      if (!val || typeof val !== 'object') {
        return (
          <span className="json-null">
            {spaces}{'{}'}
          </span>
        );
      }
      const entries = Object.entries(val as Record<string, FirestoreValue>);
      return (
        <div>
          {spaces}
          {'{'}{' '}
          {entries.map(([k, v], i) => (
            <div key={k}>
              <span className="json-key">
                {spaces} "{k}":
              </span>
              {formatValue(v, indent + 1)}
              {i < entries.length - 1 ? ',' : ''}
            </div>
          ))}
          {spaces}
          {'}'}{' '}
        </div>
      );
    }
    return null;
  };

  const formatValue = (value: FirestoreValue, indent = 0): React.ReactNode => {
    log.debug('formatValue called', {
      type: typeof value,
      isArray: Array.isArray(value),
      isNull: value === null,
    });
    const spaces = '  '.repeat(indent);
    if (value === null) return <span className="json-null">{spaces}null</span>;
    if (typeof value === 'string')
      return (
        <span className="json-string">
          {spaces}"{value}"
        </span>
      );
    if (typeof value === 'number')
      return (
        <span className="json-number">
          {spaces}
          {value}
        </span>
      );
    if (typeof value === 'boolean')
      return (
        <span className="json-boolean">
          {spaces}
          {String(value)}
        </span>
      );
    if (Array.isArray(value)) {
      return (
        <div>
          {spaces}[
          {value.map((v, i) => (
            <div key={i}>
              {formatValue(v, indent + 1)}
              {i < value.length - 1 ? ',' : ''}
            </div>
          ))}
          {spaces}]
        </div>
      );
    }
    if (typeof value === 'object' && value !== null) {
      const obj = value as unknown as Record<string, unknown>;
      if ('__type__' in obj) {
        const type = obj.__type__ as string;
        const val = obj.value;
        const typedValue = formatTypedValue(type, val, indent, spaces);
        if (typedValue) return typedValue;
      }
      const entries = Object.entries(obj);
      return (
        <div>
          {spaces}
          {'{'}{' '}
          {entries.map(([k, v], i) => (
            <div key={k}>
              <span className="json-key">
                {spaces} "{k}":
              </span>
              {formatValue(v as FirestoreValue, indent + 1)}
              {i < entries.length - 1 ? ',' : ''}
            </div>
          ))}
          {spaces}
          {'}'}{' '}
        </div>
      );
    }
    return (
      <span>
        {spaces}
        {String(value)}
      </span>
    );
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
          {Object.entries(safeData).map(([key, value]) => (
            <tr key={key}>
              <td style={{ fontWeight: 600 }}>{key}</td>
              <td>{formatValue(value) as React.ReactNode}</td>
              <td style={{ color: 'var(--vscode-descriptionForeground)', fontSize: 11 }}>
                {value === null
                  ? 'null'
                  : typeof value === 'object' && value !== null && '__type__' in (value as object)
                    ? ((value as unknown as Record<string, unknown>).__type__ as string)
                    : typeof value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderJsonView = () => (
    <JsonTreeView data={safeData} />
  );

  const renderRawView = () => (
    <pre
      style={{
        flex: 1,
        overflow: 'auto',
        padding: 16,
        margin: 0,
        fontSize: 12,
        whiteSpace: 'pre-wrap',
      }}
    >
      {JSON.stringify(safeData, null, 2)}
    </pre>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div
        className="toolbar"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} className="secondary">
            ← Back
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="text"
              value={docIdInput}
              onChange={e => setDocIdInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleFetchDocById()}
              style={{
                fontWeight: 500,
                fontFamily: 'monospace',
                fontSize: 13,
                padding: '4px 8px',
                backgroundColor: 'var(--vscode-input-bg)',
                color: 'var(--vscode-input-foreground)',
                border: '1px solid var(--vscode-input-border)',
                borderRadius: 4,
                minWidth: 180,
                maxWidth: 300,
              }}
              placeholder="Document ID"
              title="Enter a Document ID and press Enter or click Play to fetch"
            />
            <button
              onClick={handleFetchDocById}
              disabled={!docIdInput.trim() || !onOpenDocument}
              style={{
                padding: '4px 8px',
                backgroundColor: docIdInput.trim() && onOpenDocument ? 'var(--vscode-button-background)' : 'transparent',
                color: docIdInput.trim() && onOpenDocument ? 'var(--vscode-button-foreground)' : 'var(--vscode-descriptionForeground)',
                border: '1px solid var(--vscode-button-border)',
                borderRadius: 4,
                cursor: docIdInput.trim() && onOpenDocument ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 32,
                height: 28,
              }}
              title="Fetch document by ID"
            >
              ▶
            </button>
          </div>
          {isProduction && <span className="badge production">Production</span>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setViewMode('table')}
            className={viewMode === 'table' ? 'active' : 'secondary'}
          >
            Table
          </button>
          <button
            onClick={() => setViewMode('json')}
            className={viewMode === 'json' ? 'active' : 'secondary'}
          >
            JSON
          </button>
          <button
            onClick={() => setViewMode('raw')}
            className={viewMode === 'raw' ? 'active' : 'secondary'}
          >
            Raw
          </button>
          {editing ? (
            <>
              <button onClick={handleSave} style={{ backgroundColor: 'var(--vscode-success)' }}>
                Save
              </button>
              <button onClick={() => setEditing(false)} className="secondary">
                Cancel
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="secondary">
                Edit
              </button>
              <button onClick={handleDuplicate} className="secondary">
                Duplicate
              </button>
              <button onClick={handleDelete} className="danger">
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="tabs">
        <button
          className={viewMode === 'table' ? 'active' : ''}
          onClick={() => setViewMode('table')}
        >
          Table
        </button>
        <button className={viewMode === 'json' ? 'active' : ''} onClick={() => setViewMode('json')}>
          JSON Tree
        </button>
        <button className={viewMode === 'raw' ? 'active' : ''} onClick={() => setViewMode('raw')}>
          Raw JSON
        </button>
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
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          {viewMode === 'table' && renderTableView()}
          {viewMode === 'json' && renderJsonView()}
          {viewMode === 'raw' && renderRawView()}
        </div>
      )}

      {deleteConfirm && (
        <ConfirmationModal
          isOpen={true}
          title={deleteConfirm.isProduction ? '⚠️ PRODUCTION: Delete Document' : 'Delete Document'}
          message={
            deleteConfirm.isProduction
              ? `This is a PRODUCTION document. Type "DELETE ${document.id}" to confirm deletion.`
              : `Are you sure you want to delete document "${document.id}"? This action cannot be undone.`
          }
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          variant="danger"
          confirmLabel={deleteConfirm.isProduction ? 'Type DELETE to confirm' : 'Delete'}
        />
      )}
    </div>
  );
};
