import * as vscode from 'vscode';
import { createCredentialService } from '@vistiq/credentials';
import { createAuthProviders } from '@vistiq/auth';
import { createEmulatorService } from '@vistiq/emulator';
import { createAuditService } from '@vistiq/audit';
import { setLogLevel, createChildLogger } from '@vistiq/shared';
import { ProjectTreeProvider } from './treeProvider';
import { WebviewManager } from './webviewManager';
import { ConnectionManager } from './connectionManager';
let credentialService;
let authProviders;
let connectionManager;
let webviewManager;
let projectTreeProvider;
let auditService;
let emulatorService;
export async function activate(context) {
    const config = vscode.workspace.getConfiguration('vistiq');
    const debugLogging = config.get('enableDebugLogging') || false;
    if (debugLogging)
        setLogLevel('debug');
    const extLogger = createChildLogger('extension');
    extLogger.info('Activating Vistiq extension');
    credentialService = createCredentialService(context.secrets);
    auditService = createAuditService(context.globalStorageUri.fsPath + '/audit.json');
    emulatorService = createEmulatorService(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '');
    authProviders = createAuthProviders(credentialService);
    connectionManager = new ConnectionManager(credentialService, authProviders, auditService, emulatorService);
    webviewManager = new WebviewManager(context, connectionManager, auditService);
    projectTreeProvider = new ProjectTreeProvider(connectionManager, webviewManager);
    context.subscriptions.push(vscode.window.registerTreeDataProvider('vistiq.projects', projectTreeProvider), vscode.commands.registerCommand('vistiq.connectProject', () => connectionManager.showConnectDialog()), vscode.commands.registerCommand('vistiq.disconnectProject', () => connectionManager.disconnectActive()), vscode.commands.registerCommand('vistiq.refresh', () => projectTreeProvider.refresh()), vscode.commands.registerCommand('vistiq.openFirestore', () => webviewManager.openFirestore()), vscode.commands.registerCommand('vistiq.newDocument', () => webviewManager.newDocument()), vscode.commands.registerCommand('vistiq.runQuery', () => webviewManager.runQuery()), vscode.commands.registerCommand('vistiq.saveQuery', () => webviewManager.saveQuery()), vscode.commands.registerCommand('vistiq.exportCollection', () => webviewManager.exportCollection()), vscode.commands.registerCommand('vistiq.importCollection', () => webviewManager.importCollection()), vscode.commands.registerCommand('vistiq.compareDocuments', () => webviewManager.compareDocuments()), vscode.commands.registerCommand('vistiq.compareProjects', () => webviewManager.compareProjects()), vscode.commands.registerCommand('vistiq.copyToProject', () => webviewManager.copyToProject()), vscode.commands.registerCommand('vistiq.openAuditHistory', () => webviewManager.openAuditHistory()), vscode.commands.registerCommand('vistiq.settings', () => vscode.commands.executeCommand('workbench.action.openSettings', 'vistiq')), vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('vistiq.enableDebugLogging')) {
            setLogLevel(config.get('enableDebugLogging') ? 'debug' : 'info');
        }
    }));
    await connectionManager.initialize();
    extLogger.info('Vistiq extension activated');
}
export function deactivate() {
    credentialService?.dispose();
    authProviders.serviceAccount.disconnect();
    authProviders.emulator.disconnect();
    authProviders.oauth.disconnect();
}
//# sourceMappingURL=extension.js.map