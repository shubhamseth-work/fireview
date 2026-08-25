import * as vscode from 'vscode';
import { ConnectionManager } from './connectionManager.js';
import { AuditService } from '@vistiq/audit';
import { logger, createChildLogger } from '@vistiq/shared';
import { Connection, FirestoreDocument, FirestoreQuery, QueryFilter, QueryOperator, OrderByClause } from '@vistiq/core';

const webviewLogger = createChildLogger('webviewManager');

interface WebviewMessage {
  type: string;
  payload?: unknown;
  requestId?: string;
}

interface WebviewResponse {
  type: 'response';
  requestId: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

export class WebviewManager {
  private panels: Map<string, vscode.WebviewPanel> = new Map();
  private pendingRequests: Map<string, (response: WebviewResponse) => void> = new Map();
  private requestIdCounter = 0;

  constructor(
    private context: vscode.ExtensionContext,
    private connectionManager: ConnectionManager,
    private auditService: AuditService
  ) {}

  openFirestore(): void {
    const active = this.connectionManager.getActiveConnection();
    if (!active) {
      vscode.window.showErrorMessage('No active connection. Connect to a project first.');
      return;
    }

    this.createOrShowPanel('firestore', 'Firestore', vscode.ViewColumn.One, {});
  }

  newDocument(): void {
    const active = this.connectionManager.getActiveConnection();
    if (!active) {
      vscode.window.showErrorMessage('No active connection');
      return;
    }

    this.sendToPanel('firestore', { type: 'newDocument', payload: {} });
  }

  runQuery(): void {
    this.sendToPanel('firestore', { type: 'openQueryBuilder', payload: {} });
  }

  saveQuery(): void {
    this.sendToPanel('firestore', { type: 'saveQuery', payload: {} });
  }

  exportCollection(): void {
    this.sendToPanel('firestore', { type: 'exportCollection', payload: {} });
  }

  importCollection(): void {
    this.sendToPanel('firestore', { type: 'importCollection', payload: {} });
  }

  compareDocuments(): void {
    this.createOrShowPanel('compare', 'Compare Documents', vscode.ViewColumn.One, {});
  }

  compareProjects(): void {
    this.createOrShowPanel('project-compare', 'Compare Projects', vscode.ViewColumn.One, {});
  }

  copyToProject(): void {
    this.createOrShowPanel('migration', 'Copy to Project', vscode.ViewColumn.One, {});
  }

  openAuditHistory(): void {
    this.createOrShowPanel('audit', 'Audit History', vscode.ViewColumn.One, {});
  }

  openDocument(documentPath: string): void {
    this.sendToPanel('firestore', { type: 'openDocument', payload: { documentPath } });
  }

  private createOrShowPanel(
    viewType: string,
    title: string,
    column: vscode.ViewColumn,
    _options: vscode.WebviewPanelOptions
  ): void {
    const existing = this.panels.get(viewType);
    if (existing) {
      existing.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      viewType,
      title,
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview'),
        ],
      }
    );

    panel.webview.html = this.getWebviewHtml(viewType);
    panel.webview.onDidReceiveMessage(this.handleMessage.bind(this), null, this.context.subscriptions);

    panel.onDidDispose(() => {
      this.panels.delete(viewType);
    }, null, this.context.subscriptions);

    this.panels.set(viewType, panel);
  }

  private sendToPanel(viewType: string, message: WebviewMessage): void {
    const panel = this.panels.get(viewType);
    if (panel) {
      panel.webview.postMessage(message);
    }
  }

  private async handleMessage(message: WebviewMessage): Promise<void> {
    webviewLogger.debug('Received message', { type: message.type });

    if (message.type === 'response') {
      const callback = this.pendingRequests.get((message as WebviewResponse).requestId);
      if (callback) {
        callback(message as WebviewResponse);
        this.pendingRequests.delete((message as WebviewResponse).requestId);
      }
      return;
    }

    try {
      let result: unknown;

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

      this.sendResponse(message.requestId!, true, result);
    } catch (error) {
      webviewLogger.error('Message handler error', { type: message.type, error: (error as Error).message });
      this.sendResponse(message.requestId!, false, undefined, (error as Error).message);
    }
  }

  private sendResponse(requestId: string, success: boolean, data?: unknown, error?: string): void {
    const panel = Array.from(this.panels.values())[0];
    if (panel) {
      panel.webview.postMessage({
        type: 'response',
        requestId,
        success,
        data,
        error,
      } as WebviewResponse);
    }
  }

  private async handleGetCollections(payload: unknown): Promise<unknown> {
    const active = this.connectionManager.getActiveConnection();
    if (!active?.firestore) throw new Error('No active Firestore connection');
    return active.firestore.listCollections();
  }

  private async handleListDocuments(payload: unknown): Promise<unknown> {
    const { collectionPath, options } = payload as { collectionPath: string; options?: unknown };
    const active = this.connectionManager.getActiveConnection();
    if (!active?.firestore) throw new Error('No active Firestore connection');
    return active.firestore.listDocuments(collectionPath, options as any);
  }

  private async handleGetDocument(payload: unknown): Promise<unknown> {
    const { documentPath } = payload as { documentPath: string };
    const active = this.connectionManager.getActiveConnection();
    if (!active?.firestore) throw new Error('No active Firestore connection');
    return active.firestore.getDocument(documentPath);
  }

  private async handleCreateDocument(payload: unknown): Promise<unknown> {
    const { collectionPath, data, documentId } = payload as {
      collectionPath: string;
      data: FirestoreDocument;
      documentId?: string;
    };
    const active = this.connectionManager.getActiveConnection();
    if (!active?.firestore) throw new Error('No active Firestore connection');
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

  private async handleUpdateDocument(payload: unknown): Promise<unknown> {
    const { documentPath, data } = payload as { documentPath: string; data: Partial<FirestoreDocument> };
    const active = this.connectionManager.getActiveConnection();
    if (!active?.firestore) throw new Error('No active Firestore connection');
    await active.firestore.updateDocument(documentPath, data);
    this.auditService.record({
      operation: 'update-document',
      projectId: active.projectId,
      documentPath,
      result: 'success',
    });
    return { success: true };
  }

  private async handleDeleteDocument(payload: unknown): Promise<unknown> {
    const { documentPath } = payload as { documentPath: string };
    const active = this.connectionManager.getActiveConnection();
    if (!active?.firestore) throw new Error('No active Firestore connection');
    await active.firestore.deleteDocument(documentPath);
    this.auditService.record({
      operation: 'delete-document',
      projectId: active.projectId,
      documentPath,
      result: 'success',
    });
    return { success: true };
  }

  private async handleRunQuery(payload: unknown): Promise<unknown> {
    const { query } = payload as { query: FirestoreQuery };
    const active = this.connectionManager.getActiveConnection();
    if (!active?.firestore) throw new Error('No active Firestore connection');
    const result = await active.firestore.runQuery(query);
    this.auditService.record({
      operation: 'run-query',
      projectId: active.projectId,
      collectionPath: query.collectionPath,
      result: 'success',
    });
    return result;
  }

  private async handleExportCollection(payload: unknown): Promise<unknown> {
    const { collectionPath, format, outputPath } = payload as {
      collectionPath: string;
      format: 'json' | 'csv';
      outputPath: string;
    };
    const active = this.connectionManager.getActiveConnection();
    if (!active?.firestore) throw new Error('No active Firestore connection');

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

  private async handleImportCollection(payload: unknown): Promise<unknown> {
    const { collectionPath, format, mode, inputPath } = payload as {
      collectionPath: string;
      format: 'json' | 'csv';
      mode: 'create' | 'update' | 'upsert';
      inputPath: string;
    };
    const active = this.connectionManager.getActiveConnection();
    if (!active?.firestore) throw new Error('No active Firestore connection');

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

  private async handleGetAuditHistory(payload: unknown): Promise<unknown> {
    const options = payload as any;
    return this.auditService.getEntries(options);
  }

  private getWebviewHtml(viewType: string): string {
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

  private getScriptUri(viewType: string): vscode.Uri {
    return vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', `${viewType}.js`);
  }

  private getStyleUri(viewType: string): vscode.Uri {
    return vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', `${viewType}.css`);
  }

  private generateNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}