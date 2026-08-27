import type { AuditService } from '@vistiq/audit';
import type { FirestoreDocument, FirestoreQuery } from '@vistiq/core';
import { createChildLogger } from '@vistiq/shared';
import * as fs from 'fs';
import * as vscode from 'vscode';
import type { ConnectionManager } from './connectionManager.js';

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
  private requestPanelMap: Map<string, string> = new Map(); // requestId -> panel viewType
  private requestIdCounter = 0;

  constructor(
    private context: vscode.ExtensionContext,
    private connectionManager: ConnectionManager,
    private auditService: AuditService
  ) {}

  openFirestore(requireActiveConnection = true): void {
    if (requireActiveConnection) {
      const active = this.connectionManager.getActiveConnection();
      if (!active) {
        void vscode.window.showErrorMessage('No active connection');
        return;
      }
    }

    void this.createOrShowPanel('firestore', 'Firestore', vscode.ViewColumn.One, {});
  }

  showFirebaseAuthModal(): void {
    // Open the Firestore view without requiring an active connection
    const panel = this.createOrShowPanel('firestore', 'Firestore', vscode.ViewColumn.One, {});

    // Send message to show Firebase Auth modal when panel is ready
    this.sendWhenReady(panel, { type: 'showFirebaseAuthModal', payload: {} });
  }

  newDocument(): void {
    const active = this.connectionManager.getActiveConnection();
    if (!active) {
      void vscode.window.showErrorMessage('No active connection');
      return;
    }

    void this.sendToPanel('firestore', { type: 'newDocument', payload: {} });
  }

  runQuery(): void {
    void this.sendToPanel('firestore', { type: 'openQueryBuilder', payload: {} });
  }

  saveQuery(): void {
    void this.sendToPanel('firestore', { type: 'saveQuery', payload: {} });
  }

  exportCollection(): void {
    void this.sendToPanel('firestore', { type: 'exportCollection', payload: {} });
  }

  importCollection(): void {
    void this.sendToPanel('firestore', { type: 'importCollection', payload: {} });
  }

  compareDocuments(): void {
    void this.createOrShowPanel('compare', 'Compare Documents', vscode.ViewColumn.One, {});
  }

  compareProjects(): void {
    void this.createOrShowPanel('project-compare', 'Compare Projects', vscode.ViewColumn.One, {});
  }

  copyToProject(): void {
    void this.createOrShowPanel('migration', 'Copy to Project', vscode.ViewColumn.One, {});
  }

  openAuditHistory(): void {
    void this.createOrShowPanel('audit', 'Audit History', vscode.ViewColumn.One, {});
  }

  openDocument(documentPath: string): void {
    webviewLogger.info('openDocument called', { documentPath });
    const active = this.connectionManager.getActiveConnection();
    if (!active) {
      webviewLogger.error('openDocument: No active connection');
      void vscode.window.showErrorMessage('No active connection');
      return;
    }

    const panel = this.createOrShowPanel('firestore', 'Firestore', vscode.ViewColumn.One, {});

    // Wait for panel to be ready, then send openDocument message
    webviewLogger.debug('openDocument: Sending openDocument message when ready', { documentPath });
    this.sendWhenReady(panel, { type: 'openDocument', payload: { documentPath } });
  }

  private createOrShowPanel(
    viewType: string,
    title: string,
    column: vscode.ViewColumn,
    _options: vscode.WebviewPanelOptions
  ): vscode.WebviewPanel {
    const existing = this.panels.get(viewType);
    if (existing) {
      existing.reveal(column);
      return existing;
    }

    const panel = vscode.window.createWebviewPanel(viewType, title, column, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview')],
    });

    panel.webview.html = this.getWebviewHtml(viewType, panel.webview);
    panel.webview.onDidReceiveMessage(
      message => this.handleMessage(message, viewType),
      null,
      this.context.subscriptions
    );

    panel.onDidDispose(
      () => {
        this.panels.delete(viewType);
      },
      null,
      this.context.subscriptions
    );

    this.panels.set(viewType, panel);
    return panel;
  }

  private sendWhenReady(panel: vscode.WebviewPanel, message: WebviewMessage): void {
    webviewLogger.debug('sendWhenReady called', {
      messageType: message.type,
      panelVisible: panel.visible,
    });
    if (panel.visible) {
      webviewLogger.debug('sendWhenReady: Panel visible, sending immediately', {
        messageType: message.type,
      });
      void panel.webview.postMessage(message);
      return;
    }

    webviewLogger.debug('sendWhenReady: Panel not visible, waiting for visibility change', {
      messageType: message.type,
    });
    const disposable = panel.onDidChangeViewState(
      e => {
        if (e.webviewPanel.visible) {
          webviewLogger.debug('sendWhenReady: Panel became visible, sending message', {
            messageType: message.type,
          });
          disposable.dispose();
          setTimeout(() => {
            void panel.webview.postMessage(message);
          }, 100);
        }
      },
      null,
      this.context.subscriptions
    );

    // Fallback timeout
    setTimeout(() => {
      webviewLogger.debug('sendWhenReady: Fallback timeout, sending message anyway', {
        messageType: message.type,
      });
      disposable.dispose();
      void panel.webview.postMessage(message);
    }, 1000);
  }

  private sendToPanel(viewType: string, message: WebviewMessage): void {
    const panel = this.panels.get(viewType);
    if (panel) {
      void panel.webview.postMessage(message);
    }
  }

  private async handleMessage(message: WebviewMessage, panelViewType: string): Promise<void> {
    webviewLogger.debug('handleMessage: Received message', {
      type: message.type,
      panel: panelViewType,
      hasRequestId: !!message.requestId,
      requestId: message.requestId,
    });

    if (message.type === 'response') {
      webviewLogger.debug('handleMessage: Received response', { requestId: message.requestId });
      const callback = this.pendingRequests.get((message as WebviewResponse).requestId);
      if (callback) {
        callback(message as WebviewResponse);
        this.pendingRequests.delete((message as WebviewResponse).requestId);
      }
      return;
    }

    // Track which panel this request came from
    if (message.requestId) {
      this.requestPanelMap.set(message.requestId, panelViewType);
      webviewLogger.debug('handleMessage: Mapped requestId to panel', {
        requestId: message.requestId,
        panelViewType,
      });
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
        case 'createCollection':
          result = await this.handleCreateCollection(message.payload);
          break;
        case 'connectServiceAccount':
          result = await this.handleConnectServiceAccount(message.payload);
          break;
        case 'connectEmulator':
          result = await this.handleConnectEmulator(message.payload);
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
      webviewLogger.error('Message handler error', {
        type: message.type,
        error: (error as Error).message,
      });
      this.sendResponse(message.requestId!, false, undefined, (error as Error).message);
    }
  }

  private sendResponse(requestId: string, success: boolean, data?: unknown, error?: string): void {
    webviewLogger.debug('sendResponse', {
      requestId,
      success,
      hasError: !!error,
      errorMessage: error,
    });
    const panelViewType = this.requestPanelMap.get(requestId);
    const panel = panelViewType
      ? this.panels.get(panelViewType)
      : Array.from(this.panels.values())[0];

    if (panel) {
      void panel.webview.postMessage({
        type: 'response',
        requestId,
        success,
        data,
        error,
      } as WebviewResponse);
      webviewLogger.debug('sendResponse: Sent response to panel', { requestId, panelViewType });
    } else {
      webviewLogger.warn('sendResponse: No panel found for requestId', { requestId });
    }
    this.requestPanelMap.delete(requestId);
  }

  private getPanelViewTypeForMessage(_message: WebviewMessage): string | undefined {
    // Find which panel this message came from by checking the webview that sent it
    // Since we can't directly get the sender panel, we'll use the message type to infer
    // For messages that are responses to commands, we track the panel in openDocument
    // For other messages, we need to infer from context
    return undefined; // Will be set in specific handlers
  }

  private handleGetCollections(_payload: unknown): Promise<unknown> {
    const active = this.connectionManager.getActiveConnection();
    if (!active?.firestore) throw new Error('No active Firestore connection');
    return active.firestore.listCollections();
  }

  private handleListDocuments(payload: unknown): Promise<unknown> {
    const { collectionPath, options } = payload as { collectionPath: string; options?: unknown };
    const active = this.connectionManager.getActiveConnection();
    if (!active?.firestore) throw new Error('No active Firestore connection');
    return active.firestore.listDocuments(collectionPath, options as any);
  }

  private handleGetDocument(payload: unknown): Promise<unknown> {
    const { documentPath } = payload as { documentPath: string };
    webviewLogger.debug('handleGetDocument called', { documentPath });
    const active = this.connectionManager.getActiveConnection();
    if (!active) {
      webviewLogger.error('handleGetDocument: No active connection');
      throw new Error('No active connection');
    }
    if (!active.firestore) {
      webviewLogger.error('handleGetDocument: No active Firestore connection', {
        projectId: active.projectId,
        authMethod: active.authMethod,
      });
      throw new Error('No active Firestore connection');
    }
    webviewLogger.debug('handleGetDocument: Calling firestore.getDocument', {
      documentPath,
      projectId: active.projectId,
    });
    return active.firestore
      .getDocument(documentPath)
      .then(doc => {
        webviewLogger.debug('handleGetDocument: Success', {
          documentPath,
          found: doc !== null,
          docId: doc?.id,
          docPath: doc?.path,
          dataKeys: doc?.data ? Object.keys(doc.data) : [],
        });
        return doc;
      })
      .catch(err => {
        webviewLogger.error('handleGetDocument: Error', {
          documentPath,
          error: (err as Error).message,
          stack: (err as Error).stack,
        });
        throw err;
      });
  }

  private async handleCreateDocument(payload: unknown): Promise<unknown> {
    const { collectionPath, data } = payload as {
      collectionPath: string;
      data: FirestoreDocument;
    };
    const documentId = data.id || undefined;
    webviewLogger.debug('handleCreateDocument called', {
      collectionPath,
      docId: data.id,
      dataKeys: Object.keys(data.data),
    });
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
    const { documentPath, data } = payload as {
      documentPath: string;
      data: Partial<FirestoreDocument>;
    };
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

  private async handleCreateCollection(payload: unknown): Promise<unknown> {
    const { collectionId } = payload as { collectionId: string };
    const active = this.connectionManager.getActiveConnection();
    if (!active?.firestore) throw new Error('No active Firestore connection');

    await active.firestore.createCollection(collectionId);

    this.auditService.record({
      operation: 'create-collection',
      projectId: active.projectId,
      collectionPath: collectionId,
      result: 'success',
    });

    return { success: true };
  }

  private async handleGetAuditHistory(payload: unknown): Promise<unknown> {
    const options = payload as any;
    return this.auditService.getEntries(options);
  }

  private async handleConnectServiceAccount(_payload: unknown): Promise<unknown> {
    await this.connectionManager.showServiceAccountDialog();
    return { success: true };
  }

  private async handleConnectEmulator(_payload: unknown): Promise<unknown> {
    await this.connectionManager.showEmulatorDialog();
    return { success: true };
  }

  private getScriptUri(viewType: string, webview: vscode.Webview): vscode.Uri {
    const baseType = viewType.startsWith('document-') ? 'firestore' : viewType;
    const onDiskPath = vscode.Uri.joinPath(
      this.context.extensionUri,
      'dist',
      'webview',
      `${baseType}.js`
    );
    return webview.asWebviewUri(onDiskPath);
  }

  private getStyleUri(viewType: string, webview: vscode.Webview): vscode.Uri {
    const baseType = viewType.startsWith('document-') ? 'firestore' : viewType;
    const onDiskPath = vscode.Uri.joinPath(
      this.context.extensionUri,
      'dist',
      'webview',
      `${baseType}.css`
    );
    return webview.asWebviewUri(onDiskPath);
  }

  private generateNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  private getWebviewHtml(viewType: string, webview: vscode.Webview): string {
    const baseType = viewType.startsWith('document-') ? 'firestore' : viewType;
    const htmlPath = vscode.Uri.joinPath(
      this.context.extensionUri,
      'dist',
      'webview',
      baseType,
      'index.html'
    );

    let html = fs.readFileSync(htmlPath.fsPath, 'utf8');
    const nonce = this.generateNonce();
    const cspSource = webview.cspSource;

    // Replace script and style asset paths with webview URIs
    html = html.replace(/src="\/assets\/([^"]+)"/g, (_match, filename: string) => {
      const scriptUri = webview.asWebviewUri(
        vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'assets', filename)
      );
      return `src="${scriptUri}" nonce="${nonce}"`;
    });

    html = html.replace(/href="\/assets\/([^"]+)"/g, (_match, filename: string) => {
      const styleUri = webview.asWebviewUri(
        vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'assets', filename)
      );
      return `href="${styleUri}"`;
    });

    // Add CSP meta tag with nonce
    const cspMeta = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}' 'unsafe-eval' https://apis.google.com https://www.gstatic.com; style-src ${cspSource} 'unsafe-inline'; img-src ${cspSource} data:; font-src ${cspSource} data:; frame-src https://accounts.google.com https://apis.google.com; connect-src https://www.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com;">`;
    html = html.replace('<head>', `<head>\n  ${cspMeta}`);

    return html;
  }
}
