import * as vscode from 'vscode';
import { createFirestoreService } from '@vistiq/firestore';
import { createChildLogger, VistiqError, ERROR_CODES } from '@vistiq/shared';
const connLogger = createChildLogger('connectionManager');
export class ConnectionManager {
    connections = new Map();
    activeProjectId = null;
    credentialService;
    authProviders;
    auditService;
    emulatorService;
    constructor(credentialService, authProviders, auditService, emulatorService) {
        this.credentialService = credentialService;
        this.authProviders = authProviders;
        this.auditService = auditService;
        this.emulatorService = emulatorService;
    }
    async initialize() {
        const stored = await this.credentialService.getConnections();
        for (const conn of stored) {
            await this.restoreConnection(conn);
        }
        const activeId = await this.credentialService.getActiveConnection();
        if (activeId) {
            this.activeProjectId = activeId;
        }
    }
    async restoreConnection(stored) {
        try {
            let firestore;
            if (stored.authMethod === 'service-account') {
                const sa = await this.credentialService.getServiceAccount(stored.projectId);
                if (sa) {
                    this.authProviders.serviceAccount.setProjectId(stored.projectId);
                    await this.authProviders.serviceAccount.connect();
                    firestore = createFirestoreService(this.authProviders.serviceAccount.getFirestore(), stored.projectId);
                }
            }
            else if (stored.authMethod === 'emulator' && stored.emulatorConfig) {
                await this.authProviders.emulator.connect(stored.emulatorConfig);
                firestore = createFirestoreService(this.authProviders.emulator.getFirestore(), 'demo-project');
            }
            if (firestore) {
                await firestore.connect();
                this.connections.set(stored.projectId, {
                    ...stored,
                    firestore,
                });
            }
        }
        catch (error) {
            connLogger.warn('Failed to restore connection', { projectId: stored.projectId, error: error.message });
        }
    }
    async connectServiceAccount(projectId, displayName, environment, serviceAccount) {
        await this.credentialService.storeServiceAccount(projectId, serviceAccount);
        this.authProviders.serviceAccount.setProjectId(projectId);
        await this.authProviders.serviceAccount.connect();
        const firestore = createFirestoreService(this.authProviders.serviceAccount.getFirestore(), projectId);
        await firestore.connect();
        const connection = {
            projectId,
            displayName,
            environment,
            authMethod: 'service-account',
            connectedAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString(),
            firestore,
            serviceAccount,
        };
        this.connections.set(projectId, connection);
        await this.credentialService.storeConnection({
            projectId,
            displayName,
            environment,
            authMethod: 'service-account',
            connectedAt: connection.connectedAt,
            lastUsedAt: connection.lastUsedAt,
        });
        await this.setActiveConnection(projectId);
        this.auditService.record({
            operation: 'connect',
            projectId,
            result: 'success',
        });
        return connection;
    }
    async connectEmulator(config) {
        await this.authProviders.emulator.connect(config);
        const firestore = createFirestoreService(this.authProviders.emulator.getFirestore(), 'demo-project');
        await firestore.connect();
        const projectId = `emulator-${config.host}-${config.firestorePort}`;
        const connection = {
            projectId,
            displayName: 'Firebase Emulator',
            environment: 'development',
            authMethod: 'emulator',
            emulatorConfig: config,
            connectedAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString(),
            firestore,
        };
        this.connections.set(projectId, connection);
        await this.credentialService.storeConnection({
            projectId,
            displayName: connection.displayName,
            environment: connection.environment,
            authMethod: 'emulator',
            emulatorConfig: config,
            connectedAt: connection.connectedAt,
            lastUsedAt: connection.lastUsedAt,
        });
        await this.setActiveConnection(projectId);
        this.auditService.record({
            operation: 'emulator-connect',
            projectId,
            result: 'success',
        });
        return connection;
    }
    async disconnect(projectId) {
        const connection = this.connections.get(projectId);
        if (!connection)
            return;
        if (connection.authMethod === 'service-account') {
            await this.authProviders.serviceAccount.disconnect();
            await this.credentialService.deleteServiceAccount(projectId);
        }
        else if (connection.authMethod === 'emulator') {
            await this.authProviders.emulator.disconnect();
        }
        if (connection.firestore) {
            await connection.firestore.disconnect();
        }
        this.connections.delete(projectId);
        await this.credentialService.deleteConnection(projectId);
        if (this.activeProjectId === projectId) {
            this.activeProjectId = null;
            await this.credentialService.setActiveConnection('');
        }
        this.auditService.record({
            operation: 'disconnect',
            projectId,
            result: 'success',
        });
    }
    async disconnectActive() {
        if (this.activeProjectId) {
            await this.disconnect(this.activeProjectId);
        }
    }
    getConnection(projectId) {
        return this.connections.get(projectId);
    }
    getConnections() {
        return Array.from(this.connections.values());
    }
    getActiveConnection() {
        return this.activeProjectId ? this.connections.get(this.activeProjectId) : undefined;
    }
    getActiveProjectId() {
        return this.activeProjectId;
    }
    async setActiveConnection(projectId) {
        const connection = this.connections.get(projectId);
        if (!connection)
            throw new VistiqError('Connection not found', ERROR_CODES.PROJECT_NOT_FOUND);
        this.activeProjectId = projectId;
        connection.lastUsedAt = new Date().toISOString();
        await this.credentialService.setActiveConnection(projectId);
        await this.credentialService.storeConnection({
            ...connection,
            lastUsedAt: connection.lastUsedAt,
        });
    }
    async showConnectDialog() {
        const authMethod = await vscode.window.showQuickPick([
            { label: 'Service Account', value: 'service-account', description: 'Connect using Google Cloud Service Account JSON' },
            { label: 'Firebase Emulator', value: 'emulator', description: 'Connect to local Firebase Emulator' },
        ], { placeHolder: 'Select authentication method' });
        if (!authMethod)
            return;
        if (authMethod.value === 'service-account') {
            await this.showServiceAccountDialog();
        }
        else {
            await this.showEmulatorDialog();
        }
    }
    async showServiceAccountDialog() {
        const projectId = await vscode.window.showInputBox({
            prompt: 'Enter Firebase Project ID',
            placeHolder: 'my-project-123',
            validateInput: v => v ? null : 'Project ID is required',
        });
        if (!projectId)
            return;
        const displayName = await vscode.window.showInputBox({
            prompt: 'Enter display name',
            placeHolder: projectId,
            value: projectId,
        });
        if (!displayName)
            return;
        const environment = await vscode.window.showQuickPick([
            { label: 'Development', value: 'development' },
            { label: 'Staging', value: 'staging' },
            { label: 'Production', value: 'production' },
            { label: 'Custom', value: 'custom' },
        ], { placeHolder: 'Select environment' });
        if (!environment)
            return;
        const isProduction = environment.value === 'production';
        if (isProduction) {
            const confirm = await vscode.window.showWarningMessage('This is a PRODUCTION project. Are you sure?', { modal: true }, 'Yes, I understand', 'Cancel');
            if (confirm !== 'Yes, I understand')
                return;
        }
        const json = await vscode.window.showInputBox({
            prompt: 'Paste Service Account JSON',
            placeHolder: '{ "type": "service_account", ... }',
            validateInput: v => {
                try {
                    JSON.parse(v);
                    return null;
                }
                catch {
                    return 'Invalid JSON';
                }
            },
            password: true,
        });
        if (!json)
            return;
        let serviceAccount;
        try {
            serviceAccount = JSON.parse(json);
        }
        catch {
            vscode.window.showErrorMessage('Invalid Service Account JSON');
            return;
        }
        try {
            await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Connecting to Firestore...' }, async () => {
                await this.connectServiceAccount(projectId, displayName, environment.value, serviceAccount);
            });
            vscode.window.showInformationMessage(`Connected to ${displayName}`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to connect: ${error.message}`);
        }
    }
    async showEmulatorDialog() {
        const config = this.emulatorService.detectEmulatorConfig();
        const host = await vscode.window.showInputBox({
            prompt: 'Emulator host',
            value: config?.host || 'localhost',
        });
        if (!host)
            return;
        const firestorePort = await vscode.window.showInputBox({
            prompt: 'Firestore emulator port',
            value: String(config?.firestorePort || 8080),
            validateInput: v => /^\d+$/.test(v) ? null : 'Must be a number',
        });
        if (!firestorePort)
            return;
        const emulatorConfig = {
            host,
            firestorePort: parseInt(firestorePort),
            authPort: config?.authPort,
            functionsPort: config?.functionsPort,
            storagePort: config?.storagePort,
            uiPort: config?.uiPort,
        };
        const running = await this.emulatorService.isEmulatorRunning(emulatorConfig);
        if (!running) {
            const proceed = await vscode.window.showWarningMessage('Emulator does not appear to be running. Connect anyway?', 'Yes', 'No');
            if (proceed !== 'Yes')
                return;
        }
        try {
            await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Connecting to Emulator...' }, async () => {
                await this.connectEmulator(emulatorConfig);
            });
            vscode.window.showInformationMessage('Connected to Firebase Emulator');
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to connect: ${error.message}`);
        }
    }
    detectProjectFiles() {
        return this.emulatorService.detectProjectFiles();
    }
}
//# sourceMappingURL=connectionManager.js.map