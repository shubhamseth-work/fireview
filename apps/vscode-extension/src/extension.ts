import * as vscode from 'vscode';
import { CredentialService, createCredentialService } from '@vistiq/credentials';
import { createAuthProviders, AuthProviders } from '@vistiq/auth';
import { FirestoreService, createFirestoreService } from '@vistiq/firestore';
import { ExportService, createExportService } from '@vistiq/export';
import { ImportService, createImportService } from '@vistiq/import';
import { BatchService, createBatchService } from '@vistiq/batch';
import { DiffService, createDiffService } from '@vistiq/diff';
import { ProjectCompareService, createProjectCompareService } from '@vistiq/project-compare';
import { MigrationService, createMigrationService } from '@vistiq/migration';
import { EmulatorService, createEmulatorService } from '@vistiq/emulator';
import { AuditService, createAuditService } from '@vistiq/audit';
import { logger, setLogLevel, createChildLogger } from '@vistiq/shared';
import { ProjectTreeProvider } from './treeProvider';
import { WebviewManager } from './webviewManager';
import { ConnectionManager } from './connectionManager';

let credentialService: CredentialService;
let authProviders: AuthProviders;
let connectionManager: ConnectionManager;
let webviewManager: WebviewManager;
let projectTreeProvider: ProjectTreeProvider;
let auditService: AuditService;
let emulatorService: ReturnType<typeof createEmulatorService>;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const config = vscode.workspace.getConfiguration('vistiq');
  const debugLogging = config.get<boolean>('enableDebugLogging') || false;
  if (debugLogging) setLogLevel('debug');

  const extLogger = createChildLogger('extension');
  extLogger.info('Activating Vistiq extension');

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

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('vistiq.projects', projectTreeProvider),
    vscode.commands.registerCommand('vistiq.connectProject', () => connectionManager.showConnectDialog()),
    vscode.commands.registerCommand('vistiq.disconnectProject', () => connectionManager.disconnectActive()),
    vscode.commands.registerCommand('vistiq.refresh', () => projectTreeProvider.refresh()),
    vscode.commands.registerCommand('vistiq.openFirestore', () => webviewManager.openFirestore()),
    vscode.commands.registerCommand('vistiq.newDocument', () => webviewManager.newDocument()),
    vscode.commands.registerCommand('vistiq.runQuery', () => webviewManager.runQuery()),
    vscode.commands.registerCommand('vistiq.saveQuery', () => webviewManager.saveQuery()),
    vscode.commands.registerCommand('vistiq.exportCollection', () => webviewManager.exportCollection()),
    vscode.commands.registerCommand('vistiq.importCollection', () => webviewManager.importCollection()),
    vscode.commands.registerCommand('vistiq.compareDocuments', () => webviewManager.compareDocuments()),
    vscode.commands.registerCommand('vistiq.compareProjects', () => webviewManager.compareProjects()),
    vscode.commands.registerCommand('vistiq.copyToProject', () => webviewManager.copyToProject()),
    vscode.commands.registerCommand('vistiq.openAuditHistory', () => webviewManager.openAuditHistory()),
    vscode.commands.registerCommand('vistiq.settings', () => vscode.commands.executeCommand('workbench.action.openSettings', 'vistiq')),
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('vistiq.enableDebugLogging')) {
        setLogLevel(config.get<boolean>('enableDebugLogging') ? 'debug' : 'info');
      }
    })
  );

  await connectionManager.initialize();
  extLogger.info('Vistiq extension activated');
}

export function deactivate(): void {
  credentialService?.dispose();
  authProviders.serviceAccount.disconnect();
  authProviders.emulator.disconnect();
  authProviders.oauth.disconnect();
}