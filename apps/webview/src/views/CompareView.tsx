import type { Connection, FirestoreDocument } from '@fireview/core';
import React, { useState } from 'react';

interface CompareViewProps {
  connection: Connection;
  onRunQuery: (query: any) => void;
}

export const CompareView: React.FC<CompareViewProps> = ({ connection, onRunQuery }) => {
  const [leftDoc, setLeftDoc] = useState<FirestoreDocument | null>(null);
  const [rightDoc, setRightDoc] = useState<FirestoreDocument | null>(null);
  const [leftPath, setLeftPath] = useState('');
  const [rightPath, setRightPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [diff, setDiff] = useState<any>(null);

  const loadDocument = async (path: string, side: 'left' | 'right') => {
    setLoading(true);
    try {
      // In real implementation, call backend to get document
      console.log('Load document:', path);
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = () => {
    if (!leftDoc || !rightDoc) return;
    // In real implementation, call diff service
    setDiff({ changes: [] });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 16 }}>
      <h2 style={{ marginBottom: 16 }}>Document Compare</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 8 }}>Left Document</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={leftPath}
              onChange={e => setLeftPath(e.target.value)}
              placeholder="projects/p/databases/(default)/documents/collection/doc"
              style={{ flex: 1 }}
            />
            <button onClick={() => loadDocument(leftPath, 'left')} disabled={loading || !leftPath}>
              Load
            </button>
          </div>
          {leftDoc && (
            <div
              style={{
                marginTop: 8,
                padding: 8,
                backgroundColor: 'var(--vscode-input-bg)',
                borderRadius: 4,
                fontSize: 12,
              }}
            >
              <strong>{leftDoc.id}</strong>
              <br />
              {leftDoc.path}
            </div>
          )}
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 8 }}>Right Document</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={rightPath}
              onChange={e => setRightPath(e.target.value)}
              placeholder="projects/p/databases/(default)/documents/collection/doc"
              style={{ flex: 1 }}
            />
            <button
              onClick={() => loadDocument(rightPath, 'right')}
              disabled={loading || !rightPath}
            >
              Load
            </button>
          </div>
          {rightDoc && (
            <div
              style={{
                marginTop: 8,
                padding: 8,
                backgroundColor: 'var(--vscode-input-bg)',
                borderRadius: 4,
                fontSize: 12,
              }}
            >
              <strong>{rightDoc.id}</strong>
              <br />
              {rightDoc.path}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleCompare}
        disabled={!leftDoc || !rightDoc || loading}
        style={{ width: 'fit-content' }}
      >
        Compare Documents
      </button>

      {diff && (
        <div style={{ marginTop: 16, flex: 1, overflow: 'auto' }}>
          <h3>Differences</h3>
          <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(diff, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
