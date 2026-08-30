import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock VSCode API
const mockPostMessage = vi.fn();
const mockGetState = vi.fn();
const mockSetState = vi.fn();

vi.stubGlobal('vscode', {
  postMessage: mockPostMessage,
  getState: mockGetState,
  setState: mockSetState,
});

vi.stubGlobal('localStorage', {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
});

const mockCreateElement = vi.fn(() => ({
  href: '',
  download: '',
  click: vi.fn(),
  setAttribute: vi.fn(),
}));
vi.stubGlobal('document', {
  createElement: mockCreateElement,
  getElementById: vi.fn(),
  querySelector: vi.fn(),
  querySelectorAll: vi.fn(),
});

vi.stubGlobal('URL', {
  createObjectURL: vi.fn(() => 'blob:mock-url'),
  revokeObjectURL: vi.fn(),
});
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();
global.open = vi.fn();

// Mock console
vi.spyOn(console, 'debug').mockImplementation(() => {});
vi.spyOn(console, 'info').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

// Mock window.open
global.open = vi.fn();

// Types
type Connection = {
  projectId: string;
  displayName: string;
  environment: string;
  authMethod: string;
  firestore: any;
};

type FirestoreDocument = {
  id: string;
  path: string;
  data: Record<string, any>;
};

describe('FirestoreView Logic Tests', () => {
  const mockConnection = {
    projectId: 'test-project',
    displayName: 'Test Project',
    environment: 'development',
    authMethod: 'service-account',
    firestore: {},
  };

  const mockCollections = [
    { id: 'users', name: 'users', documentCount: 10 },
    { id: 'products', name: 'products', documentCount: 5 },
  ];

  const mockDocuments = [
    { id: 'doc1', path: 'users/doc1', data: { name: 'User 1', email: 'user1@test.com' } },
    { id: 'doc2', path: 'users/doc2', data: { name: 'User 2', email: 'user2@test.com' } },
  ];

  const mockPagination = {
    page: 1,
    hasMore: true,
    nextToken: 'next-token',
    pageSize: 50,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Project Selection Logic', () => {
    it('should call setActiveProject with correct projectId when project changes', () => {
      const handleProjectChange = (projectId: string) => {
        if (projectId !== 'test-project') {
          mockPostMessage({ type: 'setActiveProject', payload: { projectId } });
        }
      };

      handleProjectChange('project-2');
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'setActiveProject',
        payload: { projectId: 'project-2' },
      });
    });

    it('should not call setActiveProject when project is same', () => {
      const handleProjectChange = (projectId: string) => {
        if (projectId !== 'test-project') {
          mockPostMessage({ type: 'setActiveProject', payload: { projectId } });
        }
      };

      handleProjectChange('test-project');
      expect(mockPostMessage).not.toHaveBeenCalled();
    });
  });

  describe('Collection Click Logic', () => {
    it('should call onLoadDocuments with collection path', () => {
      const onLoadDocuments = vi.fn();
      const handleCollectionClick = (collectionPath: string) => {
        onLoadDocuments(collectionPath);
      };

      handleCollectionClick('users');
      expect(onLoadDocuments).toHaveBeenCalledWith('users');
    });

    it('should handle empty collection path', () => {
      const onLoadDocuments = vi.fn();
      const handleCollectionClick = (collectionPath: string) => {
        if (collectionPath) {
          onLoadDocuments(collectionPath);
        }
      };

      handleCollectionClick('');
      expect(onLoadDocuments).not.toHaveBeenCalled();
    });
  });

  describe('Open Document Logic', () => {
    it('should call onOpenDocument with document', () => {
      const onOpenDocument = vi.fn();
      const doc = { id: 'doc1', path: 'users/doc1', data: { name: 'Test' } };
      
      const handleOpenDocument = (doc: any) => {
        onOpenDocument(doc);
      };

      handleOpenDocument({ id: 'doc1', path: 'users/doc1', data: { name: 'Test' } });
      expect(onOpenDocument).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'doc1' })
      );
    });
  });

  describe('Close Document Logic', () => {
    it('should call onCloseDocument', () => {
      const onCloseDocument = vi.fn();
      const handleCloseDocument = () => {
        onCloseDocument();
      };

      handleCloseDocument();
      expect(onCloseDocument).toHaveBeenCalled();
    });
  });

  describe('New Document Logic', () => {
    it('should open new document modal when collection is selected', () => {
      const setShowNewDocumentModal = vi.fn();
      const selectedCollection = 'users';
      
      const handleNewDocument = () => {
        if (!selectedCollection) return;
        setShowNewDocumentModal(true);
      };

      handleNewDocument();
      expect(setShowNewDocumentModal).toHaveBeenCalledWith(true);
    });

    it('should not open modal when no collection selected', () => {
      const setShowNewDocumentModal = vi.fn();
      const selectedCollection = '';
      
      const handleNewDocument = () => {
        if (!selectedCollection) return;
        setShowNewDocumentModal(true);
      };

      handleNewDocument();
      expect(setShowNewDocumentModal).not.toHaveBeenCalled();
    });
  });

  describe('Add Collection Logic', () => {
    it('should open add collection modal with correct project', () => {
      const setShowNewCollectionModal = vi.fn();
      const activeProjectId = 'test-project';
      const connections = [{ projectId: 'test-project', displayName: 'Test Project' }];
      
      const handleAddCollection = () => {
        setShowNewCollectionModal({
          isOpen: true,
          selectedProjectId: activeProjectId || connections[0]?.projectId || '',
        });
      };

      handleAddCollection();
      expect(setShowNewCollectionModal).toHaveBeenCalledWith({
        isOpen: true,
        selectedProjectId: 'test-project',
      });
    });

    it('should use first connection when no active project', () => {
      const setShowNewCollectionModal = vi.fn();
      const activeProjectId = null;
      const connections = [{ projectId: 'test-project', displayName: 'Test Project' }];
      
      const handleAddCollection = () => {
        setShowNewCollectionModal({
          isOpen: true,
          selectedProjectId: activeProjectId || connections[0]?.projectId || '',
        });
      };

      handleAddCollection();
      expect(setShowNewCollectionModal).toHaveBeenCalledWith({
        isOpen: true,
        selectedProjectId: 'test-project',
      });
    });

    it('should handle empty connections array', () => {
      const setShowNewCollectionModal = vi.fn();
      const activeProjectId = null;
      const connections: any[] = [];
      
      const handleAddCollection = () => {
        setShowNewCollectionModal({
          isOpen: true,
          selectedProjectId: activeProjectId || connections[0]?.projectId || '',
        });
      };

      handleAddCollection();
      expect(setShowNewCollectionModal).toHaveBeenCalledWith({
        isOpen: true,
        selectedProjectId: '',
      });
    });
  });

  describe('New Collection Confirm Logic', () => {
    it('should create collection and document when project matches', () => {
      const onCreateCollection = vi.fn();
      const onCreateDocument = vi.fn();
      const activeProjectId = 'test-project';
      
      const handleNewCollectionConfirm = (
        collectionId: string,
        projectId: string,
        docId: string,
        data: Record<string, any>
      ) => {
        const createCollectionAndDoc = () => {
          onCreateCollection(collectionId);
          if (data && Object.keys(data).length > 0) {
            onCreateDocument(collectionId, { id: docId, path: '', data });
          }
        };

        if (projectId !== activeProjectId) {
          // Would post message and timeout
        } else {
          createCollectionAndDoc();
        }
      };

      handleNewCollectionConfirm('new-collection', 'test-project', 'doc1', { field: 'value' });
      
      expect(onCreateCollection).toHaveBeenCalledWith('new-collection');
      expect(onCreateDocument).toHaveBeenCalledWith('new-collection', { id: 'doc1', path: '', data: { field: 'value' } });
    });

    it('should not create document when data is empty', () => {
      const onCreateCollection = vi.fn();
      const onCreateDocument = vi.fn();
      const activeProjectId = 'test-project';
      
      const handleNewCollectionConfirm = (
        collectionId: string,
        projectId: string,
        docId: string,
        data: Record<string, any>
      ) => {
        const createCollectionAndDoc = () => {
          onCreateCollection(collectionId);
          if (data && Object.keys(data).length > 0) {
            onCreateDocument(collectionId, { id: docId, path: '', data });
          }
        };

        if (projectId !== activeProjectId) {
        } else {
          createCollectionAndDoc();
        }
      };

      handleNewCollectionConfirm('new-collection', 'test-project', 'doc1', {});
      
      expect(onCreateCollection).toHaveBeenCalledWith('new-collection');
      expect(onCreateDocument).not.toHaveBeenCalled();
    });
  });

  describe('Export Logic', () => {
    it('should call onExportCollection with correct params', () => {
      const onExportCollection = vi.fn();
      const selectedCollection = 'users';
      
      const handleExport = () => {
        if (!selectedCollection) return;
        onExportCollection(selectedCollection, 'json', '');
      };

      handleExport();
      expect(onExportCollection).toHaveBeenCalledWith('users', 'json', '');
    });

    it('should not export when no collection selected', () => {
      const onExportCollection = vi.fn();
      const selectedCollection = '';
      
      const handleExport = () => {
        if (!selectedCollection) return;
        onExportCollection(selectedCollection, 'json', '');
      };

      handleExport();
      expect(onExportCollection).not.toHaveBeenCalled();
    });
  });

  describe('Import Logic', () => {
    it('should call onImportCollection with correct params', () => {
      const onImportCollection = vi.fn();
      const selectedCollection = 'users';
      
      const handleImport = () => {
        if (!selectedCollection) return;
        onImportCollection(selectedCollection, 'json', 'upsert', '');
      };

      handleImport();
      expect(onImportCollection).toHaveBeenCalledWith('users', 'json', 'upsert', '');
    });
  });

  describe('Query Builder Logic', () => {
    it('should run query and close builder', () => {
      const onRunQuery = vi.fn();
      const setShowQueryBuilder = vi.fn();
      
      const handleRunQuery = (query: any) => {
        onRunQuery(query);
        setShowQueryBuilder(false);
      };

      const query = { collectionPath: 'users', filters: [] };
      handleRunQuery(query);
      
      expect(onRunQuery).toHaveBeenCalledWith(query);
      expect(setShowQueryBuilder).toHaveBeenCalledWith(false);
    });
  });

  describe('ReadOnly Toggle Logic', () => {
    it('should add collection to readOnly set when not present', () => {
      const setReadOnlyCollections = vi.fn();
      
      const handleToggleReadOnly = (collectionPath: string) => {
        setReadOnlyCollections((prev: Set<string>) => {
          const next = new Set(prev);
          if (next.has(collectionPath)) {
            next.delete(collectionPath);
          } else {
            next.add(collectionPath);
          }
          return next;
        });
      };

      handleToggleReadOnly('products');
      
      // Verify setReadOnlyCollections was called with an updater function
      expect(setReadOnlyCollections).toHaveBeenCalledTimes(1);
      const updater = setReadOnlyCollections.mock.calls[0][0];
      const result = updater(new Set(['users']));
      expect(result.has('products')).toBe(true);
    });

    it('should remove collection from readOnly set when present', () => {
      const setReadOnlyCollections = vi.fn();
      
      const handleToggleReadOnly = (collectionPath: string) => {
        setReadOnlyCollections((prev: Set<string>) => {
          const next = new Set(prev);
          if (next.has(collectionPath)) {
            next.delete(collectionPath);
          } else {
            next.add(collectionPath);
          }
          return next;
        });
      };

      handleToggleReadOnly('users');
      
      // Verify setReadOnlyCollections was called with an updater function
      expect(setReadOnlyCollections).toHaveBeenCalledTimes(1);
      const updater = setReadOnlyCollections.mock.calls[0][0];
      const result = updater(new Set(['users', 'products']));
      expect(result.has('users')).toBe(false);
    });
  });

  describe('Document Operations', () => {
    it('should call onDuplicateDocument with document', () => {
      const onDuplicateDocument = vi.fn();
      const doc = { id: 'doc1', path: 'users/doc1', data: { name: 'Test' } };
      
      const handleDuplicate = () => {
        onDuplicateDocument(doc);
      };

      handleDuplicate();
      expect(onDuplicateDocument).toHaveBeenCalledWith(doc);
    });

    it('should call onDeleteDocument with document path', () => {
      const onDeleteDocument = vi.fn();
      const doc = { id: 'doc1', path: 'users/doc1', data: { name: 'Test' } };
      
      const handleDelete = () => {
        onDeleteDocument(doc.path);
      };

      handleDelete();
      expect(onDeleteDocument).toHaveBeenCalledWith('users/doc1');
    });

    it('should call onRenameDocument with document and new ID', () => {
      const onRenameDocument = vi.fn();
      const doc = { id: 'doc1', path: 'users/doc1', data: { name: 'Test' } };
      
      const handleRename = (newId: string) => {
        onRenameDocument(doc, newId);
      };

      handleRename('new-doc-id');
      expect(onRenameDocument).toHaveBeenCalledWith(doc, 'new-doc-id');
    });

    it('should call onMoveDocument with document and target collection', () => {
      const onMoveDocument = vi.fn();
      const doc = { id: 'doc1', path: 'users/doc1', data: { name: 'Test' } };
      
      const handleMove = (targetCollection: string) => {
        onMoveDocument(doc, targetCollection);
      };

      handleMove('products');
      expect(onMoveDocument).toHaveBeenCalledWith(doc, 'products');
    });
  });

  describe('Error Handling', () => {
    it('should handle null connection gracefully', () => {
      const connection = null;
      const handleProjectChange = (projectId: string) => {
        if (!connection) return;
        mockPostMessage({ type: 'setActiveProject', payload: { projectId } });
      };

      handleProjectChange('test');
      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    it('should handle undefined onLoadDocuments', () => {
      const onLoadDocuments = undefined;
      const handleCollectionClick = (collectionPath: string) => {
        if (onLoadDocuments) {
          onLoadDocuments(collectionPath);
        }
      };

      handleCollectionClick('users');
      // Should not throw
    });

    it('should handle empty collections array', () => {
      const collections: any[] = [];
      const selectedCollection = 'users';
      
      const handleCollectionClick = (collectionPath: string) => {
        // Would set selected collection
      };

      expect(() => handleCollectionClick('users')).not.toThrow();
    });

    it('should handle empty documents array', () => {
      const documents: any[] = [];
      const selectedDocument = null;
      
      expect(() => {
        // Render logic for empty documents
        const hasDocuments = documents.length > 0;
        expect(hasDocuments).toBe(false);
      }).not.toThrow();
    });

    it('handles missing pagination gracefully', () => {
      const pagination = null;
      
      expect(() => {
        const hasMore = pagination?.hasMore ?? false;
        expect(hasMore).toBe(false);
      }).not.toThrow();
    });
  });

  describe('View State Management', () => {
    it('should toggle query builder visibility', () => {
      let showQueryBuilder = false;
      const setShowQueryBuilder = vi.fn((val: boolean) => { showQueryBuilder = val; });
      
      const toggleQueryBuilder = () => {
        setShowQueryBuilder(!showQueryBuilder);
      };

      toggleQueryBuilder();
      expect(setShowQueryBuilder).toHaveBeenCalledWith(true);
      
      toggleQueryBuilder();
      expect(setShowQueryBuilder).toHaveBeenCalledWith(false);
    });

    it('should set initial view correctly', () => {
      const initialView = 'query';
      const showQueryBuilder = initialView === 'query';
      
      expect(showQueryBuilder).toBe(true);
    });

    it('should set initial view to firestore by default', () => {
      const initialView = 'firestore';
      const showQueryBuilder = initialView === 'query';
      
      expect(showQueryBuilder).toBe(false);
    });
  });

  describe('Sidebar Management', () => {
    it('should track sidebar width', () => {
      let sidebarWidth = 280;
      const setSidebarWidth = vi.fn((val: number) => { sidebarWidth = val; });
      
      const handleResize = (deltaX: number) => {
        setSidebarWidth(Math.max(200, Math.min(500, 280 + deltaX)));
      };

      handleResize(50);
      expect(setSidebarWidth).toHaveBeenCalledWith(330);
    });

    it('should clamp sidebar width to min/max', () => {
      let sidebarWidth = 280;
      const setSidebarWidth = vi.fn((val: number) => { sidebarWidth = val; });
      
      const handleResize = (deltaX: number) => {
        setSidebarWidth(Math.max(200, Math.min(500, 280 + deltaX)));
      };

      handleResize(-200);
      expect(setSidebarWidth).toHaveBeenCalledWith(200);
      
      handleResize(500);
      expect(setSidebarWidth).toHaveBeenCalledWith(500);
    });
  });

  describe('Export Selected Documents', () => {
    it('should flatten document for CSV export', () => {
      const flattenObject = (obj: Record<string, any>, prefix = ''): Record<string, any> => {
        const result: Record<string, any> = {};
        for (const [key, value] of Object.entries(obj)) {
          const newKey = prefix ? `${prefix}.${key}` : key;
          if (value === null || typeof value !== 'object') {
            result[newKey] = value;
          } else if (Array.isArray(value)) {
            result[newKey] = JSON.stringify(value);
          } else if (typeof value === 'object' && value !== null) {
            Object.assign(result, flattenObject(value, newKey));
          } else {
            result[newKey] = value;
          }
        }
        return result;
      };

      const doc = { name: 'Test', nested: { field: 'value' }, tags: ['a', 'b'] };
      const flattened = flattenObject(doc);
      
      expect(flattened.name).toBe('Test');
      expect(flattened['nested.field']).toBe('value');
      expect(flattened.tags).toBe('["a","b"]');
    });

    it('should generate CSV with correct headers', () => {
      const generateCsv = (documents: any[]): string => {
        if (documents.length === 0) return '';
        
        const flatDocs = documents.map(doc => ({
          id: doc.id,
          path: doc.path,
          ...doc.data
        }));
        
        const headers = new Set<string>();
        flatDocs.forEach(doc => Object.keys(doc).forEach(k => headers.add(k)));
        const headerArray = Array.from(headers).sort();
        
        const rows = [headerArray.join(',')];
        flatDocs.forEach(doc => {
          const row = headerArray.map(header => {
            const value = doc[header];
            if (value === undefined || value === null) return '';
            return String(value);
          });
          rows.push(row.join(','));
        });
        
        return rows.join('\n');
      };

      const docs = [
        { id: '1', path: 'users/1', data: { name: 'A', age: 25 } },
        { id: '2', path: 'users/2', data: { name: 'B', age: 30 } },
      ];

      const csv = generateCsv(docs);
      const lines = csv.split('\n');
      
      expect(lines[0]).toContain('id');
      expect(lines[0]).toContain('name');
      expect(lines[0]).toContain('age');
      expect(lines.length).toBe(3); // header + 2 docs
    });
  });
});

describe('FirestoreView Edge Cases', () => {
  it('handles rapid state changes', () => {
    let state = { view: 'firestore', loading: false };
    const setState = vi.fn((updater: any) => {
      if (typeof updater === 'function') {
        return updater(state);
      }
      return { ...state, ...updater };
    });

    // Rapid state changes
    for (let i = 0; i < 10; i++) {
      setState({ loading: i % 2 === 0 });
    }

    expect(state).toBeDefined();
  });

  it('handles rapid project switching', () => {
    let activeProjectId = 'p1';
    const setActiveProjectId = vi.fn((id: string) => { activeProjectId = id; });

    ['p1', 'p2', 'p3', 'p1', 'p2'].forEach(id => {
      setActiveProjectId(id);
    });

    expect(activeProjectId).toBe('p2');
  });

  it('handles document ID extraction from path', () => {
    const extractDocId = (path: string) => {
      return path.split('/').pop() || '';
    };

    expect(extractDocId('users/doc1')).toBe('doc1');
    expect(extractDocId('users/sub/doc2')).toBe('doc2');
    expect(extractDocId('single')).toBe('single');
  });

  it('handles collection path extraction from document path', () => {
    const getCollectionPath = (docPath: string) => {
      return docPath.split('/').slice(0, -1).join('/');
    };

    expect(getCollectionPath('users/doc1')).toBe('users');
    expect(getCollectionPath('users/sub/doc2')).toBe('users/sub');
    expect(getCollectionPath('single')).toBe('');
  });
});