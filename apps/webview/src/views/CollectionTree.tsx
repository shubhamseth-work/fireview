import React from 'react';

interface CollectionTreeProps {
  collections: any[];
  selectedCollection: string;
  onSelect: (collectionPath: string) => void;
  loading: boolean;
}

export const CollectionTree: React.FC<CollectionTreeProps> = ({
  collections,
  selectedCollection,
  onSelect,
  loading,
}) => {
  if (loading) {
    return (
      <div style={{ padding: 16, textAlign: 'center', color: 'var(--vscode-descriptionForeground)' }}>
        Loading collections...
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div className="empty-state" style={{ flex: 1, padding: 16 }}>
        <div className="icon">📁</div>
        <h3>No Collections</h3>
        <p>This project has no Firestore collections.</p>
      </div>
    );
  }

  return (
    <div className="tree-view" style={{ flex: 1, overflow: 'auto' }}>
      {collections.map(col => (
        <div
          key={col.id}
          className={`tree-item ${selectedCollection === col.path ? 'selected' : ''}`}
          onClick={() => onSelect(col.path)}
          style={{ padding: '8px 12px', display: 'flex', alignItems: 'center' }}
        >
          <span className="icon">📁</span>
          <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {col.id}
          </span>
          {col.documentCount !== undefined && (
            <span style={{ fontSize: 11, color: 'var(--vscode-descriptionForeground)', marginLeft: 8 }}>
              {col.documentCount}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};