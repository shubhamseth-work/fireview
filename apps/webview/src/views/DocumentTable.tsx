import type { FirestoreDocument, FirestoreQuery } from '@fireview/core';
import { Connection, OrderByClause, QueryFilter, QueryOperator } from '@fireview/core';
import React, { useEffect, useRef, useState } from 'react';
import { useNotify } from '../context/NotificationContext';
import { ConfirmationModal } from './ConfirmationModal';
import { CopyMoveModal } from './CopyMoveModal';
import { RenameModal } from './RenameModal';

interface DocumentTableProps {
  documents: FirestoreDocument[];
  loading: boolean;
  error: string | null;
  pagination: { page: number; hasMore: boolean; nextToken: string; pageSize: number };
  onRowClick: (doc: FirestoreDocument) => void;
  onRunQuery: (query: FirestoreQuery) => void;
  onLoadMore: () => void;
  onPageSizeChange: (pageSize: number) => void;
  onCopyDocument: (doc: FirestoreDocument) => void;
  onCopyDocumentTo: (doc: FirestoreDocument, targetCollection: string) => void;
  onOpenDocument: (doc: FirestoreDocument) => void;
  onDeleteDocument: (documentPath: string) => void;
  onDuplicateDocument: (doc: FirestoreDocument) => void;
  onRenameDocument: (doc: FirestoreDocument, newId: string) => void;
  onMoveDocument: (doc: FirestoreDocument, targetCollection: string) => void;
  onShowGeopoints: (doc: FirestoreDocument) => void;
  onImportDocument: (doc: FirestoreDocument) => void;
  onExportDocument: (doc: FirestoreDocument) => void;
  onRevealInConsole: (doc: FirestoreDocument) => void;
  onExportSelectedDocuments: (documents: FirestoreDocument[], format: 'json' | 'csv') => void;
  connections: Array<{ projectId: string; displayName: string }>;
  activeProjectId: string | null;
  collections: string[];
  selectedCollection: string;
  readOnlyCollections: Set<string>;
}

type MenuAction =
  | 'editJson'
  | 'openNewTab'
  | 'rename'
  | 'move'
  | 'duplicate'
  | 'copyTo'
  | 'delete'
  | 'showGeopoints'
  | 'export'
  | 'import'
  | 'copyData'
  | 'revealInConsole';

const menuItems: { action: MenuAction; label: string; icon: string; divider?: boolean }[] = [
  { action: 'editJson', label: 'Edit Document as JSON...', icon: '✏️' },
  { action: 'openNewTab', label: 'Open in new Tab', icon: '🔗', divider: true },
  { action: 'rename', label: 'Rename Document...', icon: '✏️' },
  { action: 'move', label: 'Move Document to...', icon: '📁' },
  { action: 'duplicate', label: 'Duplicate Document...', icon: '📋' },
  { action: 'copyTo', label: 'Copy Document to...', icon: '📄', divider: true },
  { action: 'delete', label: 'Delete Document', icon: '🗑️', divider: true },
  { action: 'showGeopoints', label: 'Show Geopoints on Map', icon: '📍' },
  { action: 'export', label: 'Export Document...', icon: '📤' },
  { action: 'import', label: 'Import...', icon: '📥', divider: true },
  { action: 'copyData', label: 'Copy Data as JSON', icon: '📋' },
  { action: 'revealInConsole', label: 'Reveal in Firebase Console', icon: '🔥' },
];

function cleanData(data: Record<string, any>): Record<string, any> {
  const safeData = data ?? {};
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(safeData)) {
    result[key] = cleanValue(value);
  }
  return result;
}

function cleanValue(value: any): any {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(cleanValue);
  if (value.__type__) {
    switch (value.__type__) {
      case 'timestamp':
        return value.value;
      case 'reference':
        return value.value;
      case 'geopoint':
        return { latitude: value.value?.latitude ?? 0, longitude: value.value?.longitude ?? 0 };
      case 'bytes':
        return `base64:${value.value ?? ''}`;
      case 'array':
        return value.value?.map(cleanValue) ?? [];
      case 'map': {
        const mapResult: Record<string, any> = {};
        const mapValue = value.value ?? {};
        for (const [k, v] of Object.entries(mapValue)) {
          mapResult[k] = cleanValue(v);
        }
        return mapResult;
      }
    }
  }
  const objResult: Record<string, any> = {};
  for (const [k, v] of Object.entries(value ?? {})) {
    objResult[k] = cleanValue(v);
  }
  return objResult;
}

// Flatten object for CSV export with dot-notation
function flattenObject(obj: Record<string, any>, prefix = ''): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (value === null || typeof value !== 'object') {
      result[newKey] = value;
    } else if (Array.isArray(value)) {
      result[newKey] = JSON.stringify(value);
    } else if (typeof value === 'object' && value !== null) {
      const obj = value as { __type__?: string; value?: unknown };
      if ('__type__' in obj) {
        const type = obj.__type__ as string;
        const val = obj.value;
        if (type === 'timestamp' || type === 'reference' || type === 'bytes') {
          result[newKey] = val;
        } else if (type === 'geopoint') {
          const gp = val as { latitude: number; longitude: number } | null;
          if (!gp) return result;
          result[`${newKey}.latitude`] = gp.latitude;
          result[`${newKey}.longitude`] = gp.longitude;
        } else if (type === 'array') {
          result[newKey] = JSON.stringify(val);
        } else if (type === 'map') {
          Object.assign(result, flattenObject(val as Record<string, any>, newKey));
        }
      } else {
        Object.assign(result, flattenObject(value as Record<string, any>, newKey));
      }
    }
  }
  return result;
}

function generateCsv(documents: FirestoreDocument[]): string {
  if (documents.length === 0) return '';

  // Flatten all documents
  const flatDocs = documents.map(doc => ({
    id: doc.id,
    path: doc.path,
    ...flattenObject(doc.data ?? {})
  })) as Record<string, any>[];

  // Get all unique headers
  const headers = new Set<string>();
  flatDocs.forEach(doc => Object.keys(doc).forEach(k => headers.add(k)));
  const headerArray = Array.from(headers).sort();

  // Generate CSV rows
  const rows = [headerArray.join(',')];
  flatDocs.forEach(doc => {
    const row = headerArray.map(header => {
      const value = doc[header];
      if (value === undefined || value === null) return '';
      const str = String(value);
      // Escape CSV special characters
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    rows.push(row.join(','));
  });

  return rows.join('\n');
}

interface ExportSelectedModalProps {
  isOpen: boolean;
  format: 'json' | 'csv';
  onClose: () => void;
  onExport: (docs: FirestoreDocument[], format: 'json' | 'csv') => void;
  documents: FirestoreDocument[];
  selectedIds: Set<string>;
  selectedCollection: string;
}

const ExportSelectedModal: React.FC<ExportSelectedModalProps> = ({
  isOpen,
  format: initialFormat,
  onClose,
  onExport,
  documents,
  selectedIds,
  selectedCollection
}) => {
  const [format, setFormat] = useState<'json' | 'csv'>(initialFormat);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedDocs = documents.filter(d => selectedIds.has(d.id));

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    try {
      await onExport(selectedDocs, format);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <h3 className="modal-title">Export {selectedDocs.length} Documents</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div style={{ marginBottom: 16 }}>
          <strong>{selectedDocs.length} documents selected</strong>
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
        {error && (
          <div style={{ color: 'var(--vscode-error)', marginBottom: 16, padding: 8, backgroundColor: 'rgba(244, 71, 71, 0.1)', borderRadius: 4 }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button onClick={handleExport} disabled={loading || selectedDocs.length === 0}>
            {loading ? 'Exporting...' : `Export ${format.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export const DocumentTable: React.FC<DocumentTableProps> = ({
  documents,
  loading,
  error,
  pagination,
  onRowClick,
  onRunQuery,
  onLoadMore,
  onPageSizeChange,
  onCopyDocument,
  onCopyDocumentTo,
  onOpenDocument,
  onDeleteDocument,
  onDuplicateDocument,
  onRenameDocument,
  onMoveDocument,
  onShowGeopoints,
  onImportDocument,
  onExportDocument,
  onRevealInConsole,
  connections,
  activeProjectId,
  collections,
  selectedCollection,
  readOnlyCollections,
}) => {
  const notify = useNotify();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ doc: FirestoreDocument; rect: DOMRect } | null>(
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
    doc: FirestoreDocument;
  } | null>(null);
  const [renameModal, setRenameModal] = useState<{
    doc: FirestoreDocument;
    currentName: string;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  // Selection state for bulk operations
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showExportModal, setShowExportModal] = useState<{
    isOpen: boolean;
    format: 'json' | 'csv';
  } | null>(null);

  // Clear selection when documents change (page change)
  React.useEffect(() => {
    setSelectedRows(new Set());
  }, [documents]);

  const selectedCount = selectedRows.size;
  const isAllSelected = documents.length > 0 && selectedRows.size === documents.length;
  const isIndeterminate = selectedRows.size > 0 && selectedRows.size < documents.length;

  // Update indeterminate state
  React.useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(documents.map(d => d.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleRowSelect = (docId: string, checked: boolean) => {
    const newSelection = new Set(selectedRows);
    if (checked) newSelection.add(docId);
    else newSelection.delete(docId);
    setSelectedRows(newSelection);
  };

  const handleOpenExportModal = (format: 'json' | 'csv') => {
    setShowExportModal({ isOpen: true, format });
  };

  const handleCloseExportModal = () => {
    setShowExportModal(null);
  };

  const handleExportSelected = async (docs: FirestoreDocument[], format: 'json' | 'csv') => {
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(docs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const collectionName = selectedCollection || 'export';
      a.download = `${collectionName}_export_${timestamp}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const csv = generateCsv(docs);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const collectionName = selectedCollection || 'export';
      a.download = `${collectionName}_export_${timestamp}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setShowExportModal(null);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAnchor(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuAction = (action: MenuAction) => {
    if (!menuAnchor) return;
    const { doc } = menuAnchor;

    // Check if document's collection is read-only
    const isReadOnly = readOnlyCollections.has(selectedCollection);

    // Actions that modify data
    const modifyingActions: MenuAction[] = [
      'rename',
      'move',
      'duplicate',
      'copyTo',
      'delete',
      'import',
    ];

    if (isReadOnly && modifyingActions.includes(action)) {
      notify(
        'warning',
        'This collection is read-only. Please disable read-only mode first to perform this action.'
      );
      setMenuAnchor(null);
      return;
    }

    switch (action) {
      case 'editJson':
        onOpenDocument(doc);
        break;
      case 'openNewTab':
        onOpenDocument(doc);
        break;
      case 'rename':
        setRenameModal({ doc, currentName: doc.id });
        break;
      case 'move':
        setCopyMoveModal({ mode: 'move', doc });
        break;
      case 'duplicate':
        onDuplicateDocument(doc);
        break;
      case 'copyTo':
        setCopyMoveModal({ mode: 'copy', doc });
        break;
      case 'delete':
        setConfirmModal({
          title: 'Delete Document',
          message: `Are you sure you want to delete document "${doc.id}"? This action cannot be undone.`,
          onConfirm: () => onDeleteDocument(doc.path),
          variant: 'danger',
        });
        break;
      case 'showGeopoints':
        onShowGeopoints(doc);
        break;
      case 'export':
        onExportDocument(doc);
        break;
      case 'import':
        onImportDocument(doc);
        break;
      case 'copyData':
        const cleanDocData = cleanData(doc.data);
        const json = JSON.stringify(cleanDocData, null, 2);
        navigator.clipboard.writeText(json);
        setCopiedId(doc.id);
        setTimeout(() => setCopiedId(null), 2000);
        notify('success', 'Document data copied as JSON');
        onCopyDocument(doc);
        break;
      case 'revealInConsole':
        onRevealInConsole(doc);
        break;
    }
    setMenuAnchor(null);
  };

  const handleCopyMoveConfirm = (
    targetProjectId: string,
    targetCollection: string,
    targetDocId?: string
  ) => {
    if (!copyMoveModal) return;

    // For now, we only support same-project operations via the existing callbacks
    // The callbacks expect targetCollection path, but we need to handle cross-project differently
    // For same project, just call the existing callback
    if (targetProjectId === activeProjectId) {
      if (copyMoveModal.mode === 'copy') {
        onCopyDocumentTo(copyMoveModal.doc, targetCollection);
        notify('success', `Document copied to ${targetCollection}`);
      } else {
        onMoveDocument(copyMoveModal.doc, targetCollection);
        notify('success', `Document moved to ${targetCollection}`);
      }
    } else {
      // Cross-project: would need new API endpoints
      notify(
        'error',
        `Cross-project ${copyMoveModal.mode} not yet implemented. Please use same project.`
      );
    }
    setCopyMoveModal(null);
  };

  const handleCopyMoveCancel = () => {
    setCopyMoveModal(null);
  };

  const handleConfirmCancel = () => {
    setConfirmModal(null);
  };

  const handleConfirmOk = () => {
    confirmModal?.onConfirm();
    setConfirmModal(null);
  };

  const handleRenameConfirm = (newName: string) => {
    if (renameModal) {
      onRenameDocument(renameModal.doc, newName);
      notify('success', `Document renamed to ${newName}`);
    }
    setRenameModal(null);
  };

  const handleRenameCancel = () => {
    setRenameModal(null);
  };

  if (loading) {
    return (
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
          <div>Loading documents...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: 24,
        }}
      >
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
      const data = doc.data ?? {};
      Object.keys(data).forEach(key => fields.add(key));
    });
    return ['id', ...Array.from(fields).sort()];
  };

  const columns = getColumns();

  const formatValue = (value: any): string => {
    if (value === null) return 'null';
    if (typeof value === 'object') {
      if (value.__type__) {
        switch (value.__type__) {
          case 'timestamp':
            return `🕐 ${value.value ?? ''}`;
          case 'reference':
            return `🔗 ${value.value ?? ''}`;
          case 'geopoint':
            return `📍 ${value.value?.latitude ?? 0}, ${value.value?.longitude ?? 0}`;
          case 'bytes':
            return `📦 base64:${(value.value ?? '').substring(0, 20)}...`;
          case 'array':
            return `[${value.value?.length ?? 0} items]`;
          case 'map':
            return `{${value.value ? Object.keys(value.value).length : 0} fields}`;
        }
      }
      if (Array.isArray(value)) return `[${value.length} items]`;
      return `{${value ? Object.keys(value).length : 0} fields}`;
    }
    return String(value);
  };

  const openMenu = (doc: FirestoreDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuAnchor({ doc, rect });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="table-container" style={{ flex: 1, overflow: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th style={{ minWidth: 40, textAlign: 'center' }}>
                <input
                  type="checkbox"
                  ref={selectAllCheckboxRef}
                  checked={isAllSelected}
                  onChange={e => handleSelectAll(e.target.checked)}
                  aria-label="Select all documents"
                  style={{ cursor: 'pointer' }}
                />
              </th>
              <th style={{ minWidth: 40, textAlign: 'center' }}>Actions</th>
              {columns.map(col => (
                <th key={col} style={{ minWidth: 120 }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {documents.map(doc => (
              <tr key={doc.id} onClick={() => onRowClick(doc)} style={{ cursor: 'pointer' }}>
                <td style={{ textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={selectedRows.has(doc.id)}
                    onChange={e => handleRowSelect(doc.id, e.target.checked)}
                    onClick={e => e.stopPropagation()}
                    aria-label={`Select document ${doc.id}`}
                    style={{ cursor: 'pointer' }}
                  />
                </td>
                <td style={{ textAlign: 'center', whiteSpace: 'nowrap', position: 'relative' }}>
                  <button
                    onClick={e => openMenu(doc, e)}
                    title="More actions"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      color: 'var(--vscode-icon-foreground)',
                      fontSize: 16,
                      lineHeight: 1,
                    }}
                  >
                    ⋮
                  </button>
                  {menuAnchor && menuAnchor.doc.id === doc.id && (
                    <div
                      ref={menuRef}
                      style={{
                        position: 'fixed',
                        top: menuAnchor.rect.bottom + 4,
                        left: menuAnchor.rect.left,
                        backgroundColor: 'var(--vscode-dropdown-background)',
                        border: '1px solid var(--vscode-dropdown-border)',
                        borderRadius: 4,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        zIndex: 1000,
                        minWidth: 220,
                        padding: '4px 0',
                      }}
                    >
                      {menuItems.map((item, i) => (
                        <div key={item.action}>
                          {item.divider && (
                            <div
                              style={{
                                borderTop: '1px solid var(--vscode-dropdown-border)',
                                margin: '4px 0',
                              }}
                            />
                          )}
                          <button
                            onClick={() => handleMenuAction(item.action)}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '6px 12px',
                              background: 'none',
                              border: 'none',
                              color:
                                item.action === 'delete'
                                  ? 'var(--vscode-errorForeground)'
                                  : 'var(--vscode-dropdown-foreground)',
                              fontSize: 12,
                              textAlign: 'left',
                              cursor: 'pointer',
                            }}
                            onMouseOver={e =>
                              (e.currentTarget.style.backgroundColor =
                                'var(--vscode-list-hoverBackground)')
                            }
                            onMouseOut={e =>
                              (e.currentTarget.style.backgroundColor = 'transparent')
                            }
                          >
                            <span>{item.icon}</span>
                            <span>{item.label}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 11,
                    color: 'var(--vscode-descriptionForeground)',
                  }}
                >
                  {doc.id}
                </td>
                {columns.slice(1).map(col => (
                  <td key={col}>
                    {doc.data?.[col] !== undefined ? formatValue(doc.data[col]) : '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        className="pagination"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px',
          borderTop: '1px solid var(--vscode-border)',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
{selectedCount > 0 && (
              <button
                onClick={() => handleOpenExportModal('json')}
                style={{
                  padding: '6px 12px',
                  fontSize: 12,
                  backgroundColor: 'var(--vscode-button-background)',
                  color: 'var(--vscode-button-foreground)',
                  border: 'none',
                  borderRadius: 2,
                  cursor: 'pointer',
                }}
              >
                📤 Export ({selectedCount})
              </button>
            )}
            <span style={{ fontSize: 12, color: 'var(--vscode-descriptionForeground)' }}>
            Page {pagination.page} • {documents.length} documents
          </span>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 12 }}>
            Page size:
            <select
              value={pagination.pageSize}
              onChange={e => onPageSizeChange(Number(e.target.value))}
              style={{
                padding: '2px 8px',
                fontSize: 11,
                backgroundColor: 'var(--vscode-input-bg)',
                color: 'var(--vscode-input-foreground)',
                border: '1px solid var(--vscode-input-border)',
                borderRadius: 2,
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </label>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {pagination.hasMore && (
            <button
              onClick={onLoadMore}
              disabled={loading}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                backgroundColor: 'var(--vscode-button-background)',
                color: 'var(--vscode-button-foreground)',
                border: 'none',
                borderRadius: 2,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Loading...' : 'Load More'}
            </button>
          )}
          {!pagination.hasMore && documents.length > 0 && (
            <span style={{ fontSize: 12, color: 'var(--vscode-descriptionForeground)' }}>
              End of results
            </span>
          )}
        </div>
      </div>

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

      {copyMoveModal && (
        <CopyMoveModal
          isOpen={true}
          mode={copyMoveModal.mode}
          sourceDoc={{
            id: copyMoveModal.doc.id,
            path: copyMoveModal.doc.path,
            collectionPath: selectedCollection,
          }}
          connections={connections}
          activeProjectId={activeProjectId}
          collections={collections}
          onConfirm={handleCopyMoveConfirm}
          onCancel={handleCopyMoveCancel}
        />
      )}

      {renameModal && (
        <RenameModal
          isOpen={true}
          currentName={renameModal.currentName}
          onConfirm={handleRenameConfirm}
          onCancel={handleRenameCancel}
        />
      )}

      {showExportModal && (
        <ExportSelectedModal
          isOpen={showExportModal.isOpen}
          format={showExportModal.format}
          onClose={handleCloseExportModal}
          onExport={handleExportSelected}
          documents={documents}
          selectedIds={selectedRows}
          selectedCollection={selectedCollection}
        />
      )}
    </div>
  );
};
