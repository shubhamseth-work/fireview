import * as vscode from 'vscode';
import { createChildLogger } from '@vistiq/shared';
const treeLogger = createChildLogger('treeProvider');
export class ProjectTreeProvider {
    connectionManager;
    webviewManager;
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    constructor(connectionManager, webviewManager) {
        this.connectionManager = connectionManager;
        this.webviewManager = webviewManager;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
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
    getRootItems() {
        const connections = this.connectionManager.getConnections();
        const activeProjectId = this.connectionManager.getActiveProjectId();
        const items = [];
        for (const conn of connections) {
            const isActive = conn.projectId === activeProjectId;
            const isEmulator = conn.authMethod === 'emulator';
            const isProduction = conn.environment === 'production';
            const item = new ProjectTreeItem(conn.displayName || conn.projectId, 'project', vscode.TreeItemCollapsibleState.Collapsed, {
                projectId: conn.projectId,
                isActive,
                isEmulator,
                isProduction,
                environment: conn.environment,
            });
            item.iconPath = isEmulator
                ? new vscode.ThemeIcon('debug-alt')
                : isProduction
                    ? new vscode.ThemeIcon('warning', new vscode.ThemeColor('errorForeground'))
                    : new vscode.ThemeIcon('cloud');
            item.contextValue = isEmulator ? 'emulatorProject' : isProduction ? 'productionProject' : 'project';
            item.tooltip = `${conn.displayName}\n${conn.projectId}\n${conn.environment}`;
            items.push(item);
        }
        if (items.length === 0) {
            items.push(new ProjectTreeItem('No projects connected', 'empty', vscode.TreeItemCollapsibleState.None, {}, 'Click "Connect Project" to get started'));
        }
        return items;
    }
    async getProjectChildren(element) {
        const projectId = element.context.projectId;
        if (!projectId)
            return [];
        const connection = this.connectionManager.getConnection(projectId);
        if (!connection || !connection.firestore) {
            return [new ProjectTreeItem('Not connected', 'error', vscode.TreeItemCollapsibleState.None, {})];
        }
        try {
            const collections = await connection.firestore.listCollections();
            const items = [];
            items.push(new ProjectTreeItem('Firestore', 'firestore', vscode.TreeItemCollapsibleState.Collapsed, { projectId }, `${collections.length} collections`));
            if (connection.emulatorConfig) {
                items.push(new ProjectTreeItem('Emulator', 'emulator', vscode.TreeItemCollapsibleState.Collapsed, { projectId }, `Firestore: ${connection.emulatorConfig.firestorePort}`));
            }
            return items;
        }
        catch (error) {
            treeLogger.error('Failed to load project children', { projectId, error: error.message });
            return [new ProjectTreeItem('Failed to load', 'error', vscode.TreeItemCollapsibleState.None, {})];
        }
    }
    async getFirestoreChildren(element) {
        const projectId = element.context.projectId;
        if (!projectId)
            return [];
        const connection = this.connectionManager.getConnection(projectId);
        if (!connection || !connection.firestore)
            return [];
        try {
            const collections = await connection.firestore.listCollections();
            return collections.map((col) => {
                const item = new ProjectTreeItem(col.id, 'collection', vscode.TreeItemCollapsibleState.Collapsed, { projectId, collectionPath: col.path }, col.documentCount !== undefined ? `${col.documentCount} docs` : '');
                item.iconPath = new vscode.ThemeIcon('folder');
                item.contextValue = 'collection';
                return item;
            });
        }
        catch (error) {
            treeLogger.error('Failed to load collections', { projectId, error: error.message });
            return [new ProjectTreeItem('Failed to load collections', 'error', vscode.TreeItemCollapsibleState.None, {})];
        }
    }
    async getCollectionChildren(element) {
        const { projectId, collectionPath } = element.context;
        if (!projectId || !collectionPath)
            return [];
        const connection = this.connectionManager.getConnection(projectId);
        if (!connection || !connection.firestore)
            return [];
        try {
            const page = await connection.firestore.listDocuments(collectionPath, { limit: 20 });
            return page.documents.map((doc) => {
                const item = new ProjectTreeItem(doc.id, 'document', vscode.TreeItemCollapsibleState.None, { projectId, documentPath: doc.path, collectionPath }, 'Document');
                item.iconPath = new vscode.ThemeIcon('file');
                item.contextValue = 'document';
                item.command = {
                    command: 'vistiq.openDocument',
                    title: 'Open Document',
                    arguments: [doc.path],
                };
                return item;
            });
        }
        catch (error) {
            treeLogger.error('Failed to load documents', { projectId, collectionPath, error: error.message });
            return [new ProjectTreeItem('Failed to load documents', 'error', vscode.TreeItemCollapsibleState.None, {})];
        }
    }
}
export class ProjectTreeItem extends vscode.TreeItem {
    type;
    context;
    constructor(label, type, collapsibleState, context, description) {
        super(label, collapsibleState);
        this.type = type;
        this.context = context;
        this.description = description;
    }
}
//# sourceMappingURL=treeProvider.js.map