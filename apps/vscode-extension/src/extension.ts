import type { AuditService } from '@fireview/audit';
import { createAuditService } from '@fireview/audit';
import type { AuthProviders } from '@fireview/auth';
import { createAuthProviders } from '@fireview/auth';
import type { CredentialService } from '@fireview/credentials';
import { createCredentialService } from '@fireview/credentials';
import type { StoredConnection } from '@fireview/core';
import { EmulatorService, createEmulatorService } from '@fireview/emulator';
import { createChildLogger, setLogLevel } from '@fireview/shared';
import * as vscode from 'vscode';
import { ConnectionManager } from './connectionManager.js';
import { ProjectTreeProvider } from './treeProvider.js';
import { WebviewManager } from './webviewManager.js';

let credentialService: CredentialService;
let authProviders: AuthProviders;
let connectionManager: ConnectionManager;
let webviewManager: WebviewManager;
let projectTreeProvider: ProjectTreeProvider;
let auditService: AuditService;
let emulatorService: ReturnType<typeof createEmulatorService>;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const config = vscode.workspace.getConfiguration('fireview');
  const debugLogging = config.get<boolean>('enableDebugLogging') || false;
  if (debugLogging) setLogLevel('debug');

  const extLogger = createChildLogger('extension');
  extLogger.info('Activating FireView extension');

  credentialService = createCredentialService(context.secrets);
  auditService = createAuditService(context.globalStorageUri.fsPath + '/audit.json');
  emulatorService = createEmulatorService(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '');

  authProviders = createAuthProviders(credentialService);
  connectionManager = new ConnectionManager(
    credentialService,
    authProviders,
    auditService,
    emulatorService
  );
  webviewManager = new WebviewManager(context, connectionManager, auditService);
  projectTreeProvider = new ProjectTreeProvider(connectionManager, webviewManager);

  // Register callback to refresh tree after successful connection
  connectionManager.onDidConnect(projectId => {
    projectTreeProvider.refresh();
  });

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('fireview.projects', projectTreeProvider),
    vscode.commands.registerCommand('fireview.connectProject', () =>
      connectionManager.showConnectDialog()
    ),
    vscode.commands.registerCommand('fireview.disconnectProject', async () => {
      await connectionManager.disconnectAll();
      projectTreeProvider.refresh();
    }),
    vscode.commands.registerCommand('fireview.disconnectAllProjects', async () => {
      await connectionManager.disconnectAll();
      projectTreeProvider.refresh();
    }),
    vscode.commands.registerCommand(
      'fireview.disconnectSpecificProject',
      async (projectId: string) => {
        await connectionManager.disconnect(projectId);
        projectTreeProvider.refresh();
      }
    ),
    vscode.commands.registerCommand('fireview.refresh', () => projectTreeProvider.refresh()),
    vscode.commands.registerCommand('fireview.refreshProject', (projectId: string) => {
      // Refresh specific project by triggering tree refresh
      projectTreeProvider.refresh();
    }),
    vscode.commands.registerCommand('fireview.setActiveProject', async (projectId: string) => {
      try {
        await connectionManager.setActiveConnection(projectId);
      } catch (error) {
        // Connection not found in memory - try to restore from stored credentials
        extLogger.warn('setActiveProject: Connection not in memory, attempting restore', { projectId, error: (error as Error).message });
        const stored = await credentialService.getConnection(projectId);
        if (stored) {
          await connectionManager.restoreConnection(stored);
          await connectionManager.setActiveConnection(projectId);
        } else {
          throw error;
        }
      }
      projectTreeProvider.refresh();
      // WebviewManager listens for active project changes and notifies webview automatically
    }),
    vscode.commands.registerCommand('fireview.openFirestore', (requireActiveConnection = true) =>
      webviewManager.openFirestore(requireActiveConnection)
    ),
    vscode.commands.registerCommand('fireview.newDocument', () => webviewManager.newDocument()),
    vscode.commands.registerCommand('fireview.runQuery', () => webviewManager.runQuery()),
    vscode.commands.registerCommand('fireview.saveQuery', () => webviewManager.saveQuery()),
    vscode.commands.registerCommand('fireview.exportCollection', () =>
      webviewManager.exportCollection()
    ),
    vscode.commands.registerCommand('fireview.importCollection', () =>
      webviewManager.importCollection()
    ),
    vscode.commands.registerCommand('fireview.compareDocuments', () =>
      webviewManager.compareDocuments()
    ),
    vscode.commands.registerCommand('fireview.compareProjects', () =>
      webviewManager.compareProjects()
    ),
    vscode.commands.registerCommand('fireview.copyToProject', () => webviewManager.copyToProject()),
    vscode.commands.registerCommand('fireview.openAuditHistory', () =>
      webviewManager.openAuditHistory()
    ),
    vscode.commands.registerCommand(
      'fireview.openDocument',
      async (documentPath: string, projectId?: string) =>
        void (await webviewManager.openDocument(documentPath, projectId))
    ),
    vscode.commands.registerCommand('fireview.settings', () =>
      vscode.commands.executeCommand('workbench.action.openSettings', 'fireview')
    ),
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('fireview.enableDebugLogging')) {
        setLogLevel(config.get<boolean>('enableDebugLogging') ? 'debug' : 'info');
      }
    })
  );

  await connectionManager.initialize();
  extLogger.info('FireView extension activated');
}

export function deactivate(): void {
  credentialService.dispose();
  authProviders.serviceAccount.disconnect();
  authProviders.emulator.disconnect();
  authProviders.oauth.disconnect();
}
