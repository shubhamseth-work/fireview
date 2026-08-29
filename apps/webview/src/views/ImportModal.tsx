import React, { useState } from 'react';

interface ImportModalProps {
  collectionPath: string;
  onClose: () => void;
  onImport: (
    collectionPath: string,
    format: 'json' | 'csv',
    mode: 'create' | 'update' | 'upsert',
    inputPath: string
  ) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ collectionPath, onClose, onImport }) => {
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [mode, setMode] = useState<'create' | 'update' | 'upsert'>('upsert');
  const [inputPath, setInputPath] = useState('');
  const [idField, setIdField] = useState('id');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<any>(null);

  const handlePreview = async () => {
    if (!inputPath) {
      setError('Input path is required');
      return;
    }
    // In a real implementation, this would call the backend for preview
    setPreview({ total: 100, newDocuments: 80, existingDocuments: 20, conflicts: 5 });
  };

  const handleImport = async () => {
    if (!inputPath) {
      setError('Input path is required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onImport(collectionPath, format, mode, inputPath);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <h3 className="modal-title">Import Collection</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <strong>{collectionPath}</strong>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <input
              type="radio"
              name="format"
              value="json"
              checked={format === 'json'}
              onChange={() => setFormat('json')}
            />
            <span>JSON</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="radio"
              name="format"
              value="csv"
              checked={format === 'csv'}
              onChange={() => setFormat('csv')}
            />
            <span>CSV</span>
          </label>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Import Mode</label>
          <select
            value={mode}
            onChange={e => setMode(e.target.value as any)}
            style={{ width: '100%' }}
          >
            <option value="create">Create Only (fail if exists)</option>
            <option value="update">Update Existing (fail if new)</option>
            <option value="upsert">Upsert (create or update)</option>
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Document ID Field</label>
          <input
            type="text"
            value={idField}
            onChange={e => setIdField(e.target.value)}
            placeholder="id"
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Input File Path</label>
          <input
            type="text"
            value={inputPath}
            onChange={e => setInputPath(e.target.value)}
            placeholder="/path/to/import.json"
            style={{ width: '100%' }}
          />
        </div>

        <button
          className="secondary"
          onClick={handlePreview}
          disabled={loading || !inputPath}
          style={{ marginBottom: 16, width: '100%' }}
        >
          Preview Import
        </button>

        {preview && (
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              backgroundColor: 'var(--vscode-input-bg)',
              borderRadius: 4,
            }}
          >
            <strong>Import Preview:</strong>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 8,
                marginTop: 8,
              }}
            >
              <div>
                <strong>Total:</strong> {preview.total}
              </div>
              <div>
                <strong>New:</strong> {preview.newDocuments}
              </div>
              <div>
                <strong>Existing:</strong> {preview.existingDocuments}
              </div>
              <div>
                <strong>Conflicts:</strong> {preview.conflicts}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              color: 'var(--vscode-error)',
              marginBottom: 16,
              padding: 8,
              backgroundColor: 'rgba(244, 71, 71, 0.1)',
              borderRadius: 4,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button onClick={handleImport} disabled={loading || !inputPath}>
            {loading ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
};
