import React, { useState } from 'react';

interface ExportModalProps {
  collectionPath: string;
  onClose: () => void;
  onExport: (collectionPath: string, format: 'json' | 'csv', outputPath: string) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ collectionPath, onClose, onExport }) => {
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [includeId, setIncludeId] = useState(true);
  const [includeNested, setIncludeNested] = useState(true);
  const [outputPath, setOutputPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    if (!outputPath) {
      setError('Output path is required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onExport(collectionPath, format, outputPath);
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
          <h3 className="modal-title">Export Collection</h3>
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
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <input
              type="checkbox"
              checked={includeId}
              onChange={e => setIncludeId(e.target.checked)}
            />
            <span>Include Document ID</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={includeNested}
              onChange={e => setIncludeNested(e.target.checked)}
            />
            <span>Include Nested Fields</span>
          </label>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Output Path</label>
          <input
            type="text"
            value={outputPath}
            onChange={e => setOutputPath(e.target.value)}
            placeholder="/path/to/export.json"
            style={{ width: '100%' }}
          />
        </div>

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
          <button onClick={handleExport} disabled={loading || !outputPath}>
            {loading ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
};
