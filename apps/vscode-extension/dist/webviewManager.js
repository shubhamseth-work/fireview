import * as vscode from 'vscode';
import { createChildLogger } from '@vistiq/shared';
const webviewLogger = createChildLogger('webviewManager');
export class WebviewManager {
    context;
    connectionManager;
    auditService;
    panels = new Map();
    pendingRequests = new Map();
    requestIdCounter = 0;
    constructor(context, connectionManager, auditService) {
        this.context = context;
        this.connectionManager = connectionManager;
        this.auditService = auditService;
    }
    openFirestore() {
        const active = this.connectionManager.getActiveConnection();
        if (!active) {
            vscode.window.showErrorMessage('No active connection. Connect to a project first.');
            return;
        }
        this.createOrShowPanel('firestore', 'Firestore', vscode.ViewColumn.One, {});
    }
    newDocument() {
        const active = this.connectionManager.getActiveConnection();
        if (!active) {
            vscode.window.showErrorMessage('No active connection');
            return;
        }
        this.sendToPanel('firestore', { type: 'newDocument', payload: {} });
    }
    runQuery() {
        this.sendToPanel('firestore', { type: 'openQueryBuilder', payload: {} });
    }
    saveQuery() {
        this.sendToPanel('firestore', { type: 'saveQuery', payload: {} });
    }
    exportCollection() {
        this.sendToPanel('firestore', { type: 'exportCollection', payload: {} });
    }
    importCollection() {
        this.sendToPanel('firestore', { type: 'importCollection', payload: {} });
    }
    compareDocuments() {
        this.createOrShowPanel('compare', 'Compare Documents', vscode.ViewColumn.One, {});
    }
    compareProjects() {
        this.createOrShowPanel('project-compare', 'Compare Projects', vscode.ViewColumn.One, {});
    }
    copyToProject() {
        this.createOrShowPanel('migration', 'Copy to Project', vscode.ViewColumn.One, {});
    }
    openAuditHistory() {
        this.createOrShowPanel('audit', 'Audit History', vscode.ViewColumn.One, {});
    }
    openDocument(documentPath) {
        this.sendToPanel('firestore', { type: 'openDocument', payload: { documentPath } });
    }
    createOrShowPanel(viewType, title, column, _options) {
        const existing = this.panels.get(viewType);
        if (existing) {
            existing.reveal(column);
            return;
        }
        const panel = vscode.window.createWebviewPanel(viewType, title, column, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview'),
            ],
        });
        panel.webview.html = this.getWebviewHtml(viewType);
        panel.webview.onDidReceiveMessage(this.handleMessage.bind(this), null, this.context.subscriptions);
        panel.onDidDispose(() => {
            this.panels.delete(viewType);
        }, null, this.context.subscriptions);
        this.panels.set(viewType, panel);
    }
    sendToPanel(viewType, message) {
        const panel = this.panels.get(viewType);
        if (panel) {
            panel.webview.postMessage(message);
        }
    }
    async handleMessage(message) {
        webviewLogger.debug('Received message', { type: message.type });
        if (message.type === 'response') {
            const callback = this.pendingRequests.get(message.requestId);
            if (callback) {
                callback(message);
                this.pendingRequests.delete(message.requestId);
            }
            return;
        }
        try {
            let result;
            switch (message.type) {
                case 'getCollections':
                    result = await this.handleGetCollections(message.payload);
                    break;
                case 'listDocuments':
                    result = await this.handleListDocuments(message.payload);
                    break;
                case 'getDocument':
                    result = await this.handleGetDocument(message.payload);
                    break;
                case 'createDocument':
                    result = await this.handleCreateDocument(message.payload);
                    break;
                case 'updateDocument':
                    result = await this.handleUpdateDocument(message.payload);
                    break;
                case 'deleteDocument':
                    result = await this.handleDeleteDocument(message.payload);
                    break;
                case 'runQuery':
                    result = await this.handleRunQuery(message.payload);
                    break;
                case 'exportCollection':
                    result = await this.handleExportCollection(message.payload);
                    break;
                case 'importCollection':
                    result = await this.handleImportCollection(message.payload);
                    break;
                case 'getConnections':
                    result = this.connectionManager.getConnections().map(c => ({
                        projectId: c.projectId,
                        displayName: c.displayName,
                        environment: c.environment,
                        authMethod: c.authMethod,
                    }));
                    break;
                case 'getActiveConnection':
                    result = this.connectionManager.getActiveConnection();
                    break;
                case 'getAuditHistory':
                    result = await this.handleGetAuditHistory(message.payload);
                    break;
                default:
                    throw new Error(`Unknown message type: ${message.type}`);
            }
            this.sendResponse(message.requestId, true, result);
        }
        catch (error) {
            webviewLogger.error('Message handler error', { type: message.type, error: error.message });
            this.sendResponse(message.requestId, false, undefined, error.message);
        }
    }
    sendResponse(requestId, success, data, error) {
        const panel = Array.from(this.panels.values())[0];
        if (panel) {
            panel.webview.postMessage({
                type: 'response',
                requestId,
                success,
                data,
                error,
            });
        }
    }
    async handleGetCollections(payload) {
        const active = this.connectionManager.getActiveConnection();
        if (!active?.firestore)
            throw new Error('No active Firestore connection');
        return active.firestore.listCollections();
    }
    async handleListDocuments(payload) {
        const { collectionPath, options } = payload;
        const active = this.connectionManager.getActiveConnection();
        if (!active?.firestore)
            throw new Error('No active Firestore connection');
        return active.firestore.listDocuments(collectionPath, options);
    }
    async handleGetDocument(payload) {
        const { documentPath } = payload;
        const active = this.connectionManager.getActiveConnection();
        if (!active?.firestore)
            throw new Error('No active Firestore connection');
        return active.firestore.getDocument(documentPath);
    }
    async handleCreateDocument(payload) {
        const { collectionPath, data, documentId } = payload;
        const active = this.connectionManager.getActiveConnection();
        if (!active?.firestore)
            throw new Error('No active Firestore connection');
        const id = await active.firestore.createDocument(collectionPath, data, documentId);
        this.auditService.record({
            operation: 'create-document',
            projectId: active.projectId,
            collectionPath,
            documentPath: `${collectionPath}/${id}`,
            result: 'success',
        });
        return { id };
    }
    async handleUpdateDocument(payload) {
        const { documentPath, data } = payload;
        const active = this.connectionManager.getActiveConnection();
        if (!active?.firestore)
            throw new Error('No active Firestore connection');
        await active.firestore.updateDocument(documentPath, data);
        this.auditService.record({
            operation: 'update-document',
            projectId: active.projectId,
            documentPath,
            result: 'success',
        });
        return { success: true };
    }
    async handleDeleteDocument(payload) {
        const { documentPath } = payload;
        const active = this.connectionManager.getActiveConnection();
        if (!active?.firestore)
            throw new Error('No active Firestore connection');
        await active.firestore.deleteDocument(documentPath);
        this.auditService.record({
            operation: 'delete-document',
            projectId: active.projectId,
            documentPath,
            result: 'success',
        });
        return { success: true };
    }
    async handleRunQuery(payload) {
        const { query } = payload;
        const active = this.connectionManager.getActiveConnection();
        if (!active?.firestore)
            throw new Error('No active Firestore connection');
        const result = await active.firestore.runQuery(query);
        this.auditService.record({
            operation: 'run-query',
            projectId: active.projectId,
            collectionPath: query.collectionPath,
            result: 'success',
        });
        return result;
    }
    async handleExportCollection(payload) {
        const { collectionPath, format, outputPath } = payload;
        const active = this.connectionManager.getActiveConnection();
        if (!active?.firestore)
            throw new Error('No active Firestore connection');
        const { ExportService, createExportService } = await import('@vistiq/export');
        const exportService = createExportService(active.firestore);
        await exportService.export({
            format,
            includeDocumentId: true,
            includeNestedFields: true,
            collectionPath,
            outputPath,
        });
        this.auditService.record({
            operation: 'export-collection',
            projectId: active.projectId,
            collectionPath,
            result: 'success',
        });
        return { success: true, path: outputPath };
    }
    async handleImportCollection(payload) {
        const { collectionPath, format, mode, inputPath } = payload;
        const active = this.connectionManager.getActiveConnection();
        if (!active?.firestore)
            throw new Error('No active Firestore connection');
        const { ImportService, createImportService } = await import('@vistiq/import');
        const importService = createImportService(active.firestore);
        const result = await importService.import({
            format,
            mode,
            collectionPath,
            inputPath,
        });
        this.auditService.record({
            operation: 'import-collection',
            projectId: active.projectId,
            collectionPath,
            result: result.failed > 0 ? 'partial' : 'success',
        });
        return result;
    }
    async handleGetAuditHistory(payload) {
        const options = payload;
        return this.auditService.getEntries(options);
    }
    getWebviewHtml(viewType) {
        const nonce = this.generateNonce();
        const scriptUri = this.getScriptUri(viewType);
        const styleUri = this.getStyleUri(viewType);
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}' https:; img-src https: data:; font-src https: data:; connect-src https:;">
  <link nonce="${nonce}" rel="stylesheet" href="${styleUri}">
  <title>Vistiq - ${viewType}</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }
    getScriptUri(viewType) {
        return vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', `${viewType}.js`);
    }
    getStyleUri(viewType) {
        return vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', `${viewType}.css`);
    }
    generateNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}
//# sourceMappingURL=webviewManager.js.map