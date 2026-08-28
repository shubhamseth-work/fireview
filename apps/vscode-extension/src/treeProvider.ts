import { Connection } from '@vistiq/core';
import { createChildLogger } from '@vistiq/shared';
import * as vscode from 'vscode';
import type { ConnectionManager, ActiveConnection } from './connectionManager.js';
import type { WebviewManager } from './webviewManager.js';

const treeLogger = createChildLogger('treeProvider');

export class ProjectTreeProvider implements vscode.TreeDataProvider<ProjectTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ProjectTreeItem | undefined | null | void> =
    new vscode.EventEmitter<ProjectTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ProjectTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  constructor(
    private connectionManager: ConnectionManager,
    private webviewManager: WebviewManager
  ) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ProjectTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ProjectTreeItem): Promise<ProjectTreeItem[]> {
    if (!element) {
      return this.getRootItems();
    }

    switch (element.type) {
      case 'project':
        return this.getProjectChildren(element);
      case 'firestore':
        return this.getFirestoreChildren(element);
      case 'collection':
        return this.getCollectionChildren(element);
      default:
        return [];
    }
  }

  private getRootItems(): ProjectTreeItem[] {
    const connections = this.connectionManager.getConnections();
    const activeProjectId = this.connectionManager.getActiveProjectId();

    const items: ProjectTreeItem[] = [];

    for (const conn of connections) {
      const isActive = conn.projectId === activeProjectId;
      const isEmulator = conn.authMethod === 'emulator';
      const isProduction = conn.environment === 'production';

      const item = new ProjectTreeItem(
        conn.displayName || conn.projectId,
        'project',
        vscode.TreeItemCollapsibleState.Collapsed,
        {
          projectId: conn.projectId,
          isActive,
          isEmulator,
          isProduction,
          environment: conn.environment,
        }
      );

      item.iconPath = isEmulator
        ? new vscode.ThemeIcon('debug-alt')
        : isProduction
          ? new vscode.ThemeIcon('warning', new vscode.ThemeColor('errorForeground'))
          : new vscode.ThemeIcon('cloud');

      item.contextValue = isEmulator
        ? 'emulatorProject'
        : isProduction
          ? 'productionProject'
          : 'project';
      item.tooltip = `${conn.displayName}\n${conn.projectId}\n${conn.environment}`;

      items.push(item);
    }

    if (items.length === 0) {
      const item = new ProjectTreeItem(
        'No projects connected',
        'empty',
        vscode.TreeItemCollapsibleState.None,
        {},
        'Click to connect'
      );
      item.command = {
        command: 'vistiq.connectProject',
        title: 'Connect Project',
      };
      items.push(item);
    }

    return items;
  }

  private getProjectChildren(element: ProjectTreeItem): Promise<ProjectTreeItem[]> {
    const projectId = element.context.projectId as string;
    if (!projectId) return Promise.resolve([]);

    const connection = this.connectionManager.getConnection(projectId);
    if (!connection || !connection.firestore) {
      return Promise.resolve([
        new ProjectTreeItem(
          'Not connected',
          'error',
          vscode.TreeItemCollapsibleState.None,
          {} as Record<string, unknown>
        ),
      ]);
    }

    return this.loadProjectChildren(connection, projectId);
  }

  private async loadProjectChildren(connection: ActiveConnection, projectId: string): Promise<ProjectTreeItem[]> {
    try {
      if (!connection.firestore) {
        return [
          new ProjectTreeItem(
            'Not connected',
            'error',
            vscode.TreeItemCollapsibleState.None,
            {} as Record<string, unknown>
          ),
        ];
      }
      const items: ProjectTreeItem[] = [];

      // Add Firestore node only (actions are handled via context menu in package.json)
      const collections = await connection.firestore.listCollections();
      items.push(
        new ProjectTreeItem(
          'Firestore',
          'firestore',
          vscode.TreeItemCollapsibleState.Collapsed,
          { projectId },
          `${collections.length} collections`
        )
      );

      return items;
    } catch (error) {
      treeLogger.error('Failed to load project children', {
        projectId: connection.projectId,
        error: (error as Error).message,
      });
      return [
        new ProjectTreeItem(
          'Failed to load',
          'error',
          vscode.TreeItemCollapsibleState.None,
          {} as Record<string, unknown>
        ),
      ];
    }
  }

  private async getFirestoreChildren(element: ProjectTreeItem): Promise<ProjectTreeItem[]> {
    const projectId = element.context.projectId as string;
    if (!projectId) return [];

    const connection = this.connectionManager.getConnection(projectId);
    if (!connection || !connection.firestore) return [];

    try {
      const collections = await connection.firestore.listCollections();
      return collections.map((col: { id: string; path: string; documentCount?: number }) => {
        const item = new ProjectTreeItem(
          col.id,
          'collection',
          vscode.TreeItemCollapsibleState.Collapsed,
          { projectId, collectionPath: col.path },
          col.documentCount !== undefined ? `${col.documentCount} docs` : ''
        );
        item.iconPath = new vscode.ThemeIcon('folder');
        item.contextValue = 'collection';
        return item;
      });
    } catch (error) {
      treeLogger.error('Failed to load collections', {
        projectId,
        error: (error as Error).message,
      });
      return [
        new ProjectTreeItem(
          'Failed to load collections',
          'error',
          vscode.TreeItemCollapsibleState.None,
          {} as Record<string, unknown>
        ),
      ];
    }
  }

  private async getCollectionChildren(element: ProjectTreeItem): Promise<ProjectTreeItem[]> {
    const { projectId, collectionPath } = element.context as {
      projectId: string;
      collectionPath: string;
    };
    if (!projectId || !collectionPath) return [];

    const connection = this.connectionManager.getConnection(projectId);
    if (!connection || !connection.firestore) return [];

    try {
      const page = await connection.firestore.listDocuments(collectionPath, { limit: 20 });
      return page.documents.map((doc: { id: string; path: string }) => {
        const item = new ProjectTreeItem(
          doc.id,
          'document',
          vscode.TreeItemCollapsibleState.None,
          { projectId, documentPath: doc.path, collectionPath },
          'Document'
        );
        item.iconPath = new vscode.ThemeIcon('file');
        item.contextValue = 'document';
        item.command = {
          command: 'vistiq.openDocument',
          title: 'Open Document',
          arguments: [doc.path],
        };
        return item;
      });
    } catch (error) {
      treeLogger.error('Failed to load documents', {
        projectId,
        collectionPath,
        error: (error as Error).message,
      });
      return [
        new ProjectTreeItem(
          'Failed to load documents',
          'error',
          vscode.TreeItemCollapsibleState.None,
          {}
        ),
      ];
    }
  }
}

export class ProjectTreeItem extends vscode.TreeItem {
  constructor(
    label: string,
    public readonly type: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly context: Record<string, unknown>,
    description?: string
  ) {
    super(label, collapsibleState);
    this.description = description;
  }
}
