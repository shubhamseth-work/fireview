import React, { useEffect, useRef, useState } from 'react';
import { useNotify } from '../context/NotificationContext';
import { ConfirmationModal } from './ConfirmationModal';
import { CopyMoveModal } from './CopyMoveModal';
import { NewDocumentModal } from './NewDocumentModal';

interface CollectionTreeProps {
  collections: any[];
  selectedCollection: string;
  onSelect: (collectionPath: string) => void;
  loading: boolean;
  readOnlyCollections: Set<string>;
  onToggleReadOnly: (collectionPath: string) => void;
  onExportCollection: (collectionPath: string) => void;
  onImportCollection: (collectionPath: string) => void;
  onAddDocument: (collectionPath: string, docId: string, data: Record<string, any>) => void;
}

export const CollectionTree: React.FC<CollectionTreeProps> = ({
  collections,
  selectedCollection,
  onSelect,
  loading,
  readOnlyCollections,
  onToggleReadOnly,
  onExportCollection,
  onImportCollection,
  onAddDocument,
}) => {
  const notify = useNotify();
  const [contextMenu, setContextMenu] = useState<{ collection: any; x: number; y: number } | null>(
    null
  );
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'primary';
  } | null>(null);
  const [copyMoveModal, setCopyMoveModal] = useState<{
    mode: 'copy' | 'move';
    collection: any;
  } | null>(null);
  const [newDocModal, setNewDocModal] = useState<{
    isOpen: boolean;
    collectionPath: string;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, collection: any) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ collection, x: e.clientX, y: e.clientY });
  };

  const handleAction = (action: string, collection: any) => {
    switch (action) {
      case 'addDocument':
        setNewDocModal({ isOpen: true, collectionPath: collection.path });
        break;
      case 'toggleReadOnly':
        onToggleReadOnly(collection.path);
        break;
      case 'export':
        onExportCollection(collection.path);
        break;
      case 'import':
        onImportCollection(collection.path);
        break;
      case 'rename':
        const newName = prompt('Enter new collection name:', collection.id);
        if (newName && newName !== collection.id) {
          // Would need backend support for collection rename
          notify('info', 'Collection rename not yet implemented');
        }
        break;
      case 'delete':
        setConfirmModal({
          title: 'Delete Collection',
          message: `Are you sure you want to delete collection "${collection.id}"? This will delete ALL documents in this collection and cannot be undone.`,
          onConfirm: () => {
            // Would need backend support for collection delete
            notify('info', 'Collection delete not yet implemented');
          },
          variant: 'danger',
        });
        break;
    }
    setContextMenu(null);
  };

  const handleCopyMoveConfirm = (targetProjectId: string, targetCollection: string) => {
    if (!copyMoveModal) return;
    // Collection copy/move would need backend support
    notify('info', `${copyMoveModal.mode} collection not yet implemented`);
    setCopyMoveModal(null);
  };

  const handleConfirmOk = () => {
    confirmModal?.onConfirm();
    setConfirmModal(null);
  };

  const handleConfirmCancel = () => {
    setConfirmModal(null);
  };

  const handleNewDocConfirm = (docId: string, data: Record<string, any>) => {
    if (newDocModal) {
      onAddDocument(newDocModal.collectionPath, docId, data);
      notify('success', 'Document created successfully');
    }
    setNewDocModal(null);
  };

  const handleNewDocCancel = () => {
    setNewDocModal(null);
  };

  if (loading) {
    return (
      <div
        style={{ padding: 16, textAlign: 'center', color: 'var(--vscode-descriptionForeground)' }}
      >
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
      {collections.map(col => {
        const isReadOnly = readOnlyCollections.has(col.path);
        return (
          <div
            key={col.id}
            className={`tree-item ${selectedCollection === col.path ? 'selected' : ''} ${isReadOnly ? 'read-only' : ''}`}
            onClick={() => !isReadOnly && onSelect(col.path)}
            onContextMenu={e => handleContextMenu(e, col)}
            style={{
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              opacity: isReadOnly ? 0.6 : 1,
              cursor: isReadOnly ? 'not-allowed' : 'pointer',
            }}
          >
            <span className="icon">📁</span>
            <span
              style={{
                flex: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {col.id}
              {isReadOnly && <span style={{ marginLeft: 8, fontSize: 12 }}>🔒</span>}
            </span>
            {col.documentCount !== undefined && (
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--vscode-descriptionForeground)',
                  marginLeft: 8,
                }}
              >
                {col.documentCount}
              </span>
            )}
          </div>
        );
      })}

      {contextMenu && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: 'var(--vscode-dropdown-background)',
            border: '1px solid var(--vscode-dropdown-border)',
            borderRadius: 4,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 1000,
            minWidth: 200,
            padding: '4px 0',
          }}
        >
          <div
            style={{
              padding: '4px 12px',
              fontSize: 11,
              color: 'var(--vscode-descriptionForeground)',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              borderBottom: '1px solid var(--vscode-dropdown-border)',
            }}
          >
            {contextMenu.collection.id}
          </div>
          <button
            onClick={() => handleAction('toggleReadOnly', contextMenu.collection)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              background: 'none',
              border: 'none',
              color: 'var(--vscode-dropdown-foreground)',
              fontSize: 12,
              textAlign: 'left',
              cursor: 'pointer',
            }}
            onMouseOver={e =>
              (e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)')
            }
            onMouseOut={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <span>{readOnlyCollections.has(contextMenu.collection.path) ? '🔓' : '🔒'}</span>
            <span>
              {readOnlyCollections.has(contextMenu.collection.path)
                ? 'Make Writable'
                : 'Make Read-Only'}
            </span>
          </button>
          <div style={{ borderTop: '1px solid var(--vscode-dropdown-border)', margin: '4px 0' }} />
          <button
            onClick={() => handleAction('export', contextMenu.collection)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              background: 'none',
              border: 'none',
              color: 'var(--vscode-dropdown-foreground)',
              fontSize: 12,
              textAlign: 'left',
              cursor: 'pointer',
            }}
            onMouseOver={e =>
              (e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)')
            }
            onMouseOut={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <span>📤</span>
            <span>Export Collection...</span>
          </button>
          <button
            onClick={() => handleAction('import', contextMenu.collection)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              background: 'none',
              border: 'none',
              color: 'var(--vscode-dropdown-foreground)',
              fontSize: 12,
              textAlign: 'left',
              cursor: 'pointer',
            }}
            onMouseOver={e =>
              (e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)')
            }
            onMouseOut={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <span>📥</span>
            <span>Import Collection...</span>
          </button>
          <button
            onClick={() => handleAction('addDocument', contextMenu.collection)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              background: 'none',
              border: 'none',
              color: 'var(--vscode-dropdown-foreground)',
              fontSize: 12,
              textAlign: 'left',
              cursor: 'pointer',
            }}
            onMouseOver={e =>
              (e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)')
            }
            onMouseOut={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <span>➕</span>
            <span>Add Document...</span>
          </button>
          <div style={{ borderTop: '1px solid var(--vscode-dropdown-border)', margin: '4px 0' }} />
          <button
            onClick={() => handleAction('rename', contextMenu.collection)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              background: 'none',
              border: 'none',
              color: 'var(--vscode-dropdown-foreground)',
              fontSize: 12,
              textAlign: 'left',
              cursor: 'pointer',
            }}
            onMouseOver={e =>
              (e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)')
            }
            onMouseOut={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <span>✏️</span>
            <span>Rename Collection...</span>
          </button>
          <button
            onClick={() => handleAction('delete', contextMenu.collection)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              background: 'none',
              border: 'none',
              color: 'var(--vscode-errorForeground)',
              fontSize: 12,
              textAlign: 'left',
              cursor: 'pointer',
            }}
            onMouseOver={e =>
              (e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)')
            }
            onMouseOut={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <span>🗑️</span>
            <span>Delete Collection</span>
          </button>
        </div>
      )}

      {confirmModal && (
        <ConfirmationModal
          isOpen={true}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={handleConfirmOk}
          onCancel={handleConfirmCancel}
          variant={confirmModal.variant}
        />
      )}

      {newDocModal && (
        <NewDocumentModal
          isOpen={true}
          onConfirm={handleNewDocConfirm}
          onCancel={handleNewDocCancel}
        />
      )}
    </div>
  );
};
