import type { AuditService } from '@vistiq/audit';
import type { AuthProviders } from '@vistiq/auth';
import { EmulatorProvider, ServiceAccountProvider } from '@vistiq/auth';
import { CredentialService } from '@vistiq/credentials';
import { EmulatorService } from '@vistiq/emulator';
import type { createFirestoreService, FirestoreService } from '@vistiq/firestore';
import { createFirestoreService } from '@vistiq/firestore';
import { createChildLogger, ERROR_CODES, VistiqError } from '@vistiq/shared';
import type { logger } from '@vistiq/shared';
import type { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as vscode from 'vscode';

const connLogger = createChildLogger('connectionManager');

interface ActiveConnection extends Connection {
  firestore?: FirestoreService;
  serviceAccount?: StoredServiceAccount;
  emulatorConfig?: EmulatorConfig;
}

export class ConnectionManager {
  private connections: Map<string, ActiveConnection> = new Map();
  private activeProjectId: string | null = null;
  private credentialService: CredentialService;
  private authProviders: AuthProviders;
  private auditService: AuditService;
  private emulatorService: EmulatorService;

  constructor(
    credentialService: CredentialService,
    authProviders: AuthProviders,
    auditService: AuditService,
    emulatorService: EmulatorService
  ) {
    this.credentialService = credentialService;
    this.authProviders = authProviders;
    this.auditService = auditService;
    this.emulatorService = emulatorService;
  }

  async initialize(): Promise<void> {
    const stored = await this.credentialService.getConnections();
    for (const conn of stored) {
      await this.restoreConnection(conn);
    }

    const activeId = await this.credentialService.getActiveConnection();
    if (activeId) {
      this.activeProjectId = activeId;
    }
  }

  private async restoreConnection(stored: StoredConnection): Promise<void> {
    try {
      let firestore: FirestoreService | undefined;

      if (stored.authMethod === 'service-account') {
        const sa = await this.credentialService.getServiceAccount(stored.projectId);
        if (sa) {
          this.authProviders.serviceAccount.setProjectId(stored.projectId);
          await this.authProviders.serviceAccount.connect();
          firestore = createFirestoreService(
            this.authProviders.serviceAccount.getFirestore()!,
            stored.projectId
          );
        }
      } else if (stored.authMethod === 'emulator' && stored.emulatorConfig) {
        await this.authProviders.emulator.connect(stored.emulatorConfig);
        firestore = createFirestoreService(
          this.authProviders.emulator.getFirestore()!,
          'demo-project'
        );
      }

      if (firestore) {
        await firestore.connect();
        this.connections.set(stored.projectId, {
          ...stored,
          firestore,
        } as ActiveConnection);
      }
    } catch (error) {
      connLogger.warn('Failed to restore connection', {
        projectId: stored.projectId,
        error: (error as Error).message,
      });
    }
  }

  async connectServiceAccount(
    projectId: string,
    displayName: string,
    environment: EnvironmentLabel,
    serviceAccount: StoredServiceAccount
  ): Promise<Connection> {
    await this.credentialService.storeServiceAccount(projectId, serviceAccount);

    this.authProviders.serviceAccount.setProjectId(projectId);
    await this.authProviders.serviceAccount.connect();

    const firestore = createFirestoreService(
      this.authProviders.serviceAccount.getFirestore()!,
      projectId
    );
    await firestore.connect();

    const connection: ActiveConnection = {
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

  async connectEmulator(config: EmulatorConfig): Promise<Connection> {
    await this.authProviders.emulator.connect(config);

    const firestore = createFirestoreService(
      this.authProviders.emulator.getFirestore()!,
      'demo-project'
    );
    await firestore.connect();

    const projectId = `emulator-${config.host}-${config.firestorePort}`;
    const connection: ActiveConnection = {
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

  async disconnect(projectId: string): Promise<void> {
    const connection = this.connections.get(projectId);
    if (!connection) return;

    if (connection.authMethod === 'service-account') {
      await this.authProviders.serviceAccount.disconnect();
      await this.credentialService.deleteServiceAccount(projectId);
    } else if (connection.authMethod === 'emulator') {
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

  async disconnectActive(): Promise<void> {
    if (this.activeProjectId) {
      await this.disconnect(this.activeProjectId);
    }
  }

  getConnection(projectId: string): ActiveConnection | undefined {
    return this.connections.get(projectId);
  }

  getConnections(): ActiveConnection[] {
    return Array.from(this.connections.values());
  }

  getActiveConnection(): ActiveConnection | undefined {
    return this.activeProjectId ? this.connections.get(this.activeProjectId) : undefined;
  }

  getActiveProjectId(): string | null {
    return this.activeProjectId;
  }

  async setActiveConnection(projectId: string): Promise<void> {
    const connection = this.connections.get(projectId);
    if (!connection) throw new VistiqError('Connection not found', ERROR_CODES.PROJECT_NOT_FOUND);

    this.activeProjectId = projectId;
    connection.lastUsedAt = new Date().toISOString();
    await this.credentialService.setActiveConnection(projectId);
    await this.credentialService.storeConnection({
      ...connection,
      lastUsedAt: connection.lastUsedAt,
    });
  }

  async showConnectDialog(): Promise<void> {
    const authMethod = await vscode.window.showQuickPick<
      vscode.QuickPickItem & { value: 'service-account' | 'emulator' }
    >(
      [
        {
          label: 'Service Account',
          value: 'service-account',
          description: 'Connect using Google Cloud Service Account JSON',
        },
        {
          label: 'Firebase Emulator',
          value: 'emulator',
          description: 'Connect to local Firebase Emulator',
        },
      ],
      { placeHolder: 'Select authentication method' }
    );

    if (!authMethod) return;

    if (authMethod.value === 'service-account') {
      await this.showServiceAccountDialog();
    } else {
      await this.showEmulatorDialog();
    }
  }

  private async showServiceAccountDialog(): Promise<void> {
    const projectId = await vscode.window.showInputBox({
      prompt: 'Enter Firebase Project ID',
      placeHolder: 'my-project-123',
      validateInput: v => (v ? null : 'Project ID is required'),
    });
    if (!projectId) return;

    const displayName = await vscode.window.showInputBox({
      prompt: 'Enter display name',
      placeHolder: projectId,
      value: projectId,
    });
    if (!displayName) return;

    const environment = await vscode.window.showQuickPick<
      vscode.QuickPickItem & { value: EnvironmentLabel }
    >(
      [
        { label: 'Development', value: 'development' },
        { label: 'Staging', value: 'staging' },
        { label: 'Production', value: 'production' },
        { label: 'Custom', value: 'custom' },
      ],
      { placeHolder: 'Select environment' }
    );
    if (!environment) return;

    const isProduction = environment.value === 'production';
    if (isProduction) {
      const confirm = await vscode.window.showWarningMessage(
        'This is a PRODUCTION project. Are you sure?',
        { modal: true },
        'Yes, I understand',
        'Cancel'
      );
      if (confirm !== 'Yes, I understand') return;
    }

    const json = await vscode.window.showInputBox({
      prompt: 'Paste Service Account JSON',
      placeHolder: '{ "type": "service_account", ... }',
      validateInput: v => {
        try {
          JSON.parse(v);
          return null;
        } catch {
          return 'Invalid JSON';
        }
      },
      password: true,
    });
    if (!json) return;

    let serviceAccount: StoredServiceAccount;
    try {
      serviceAccount = JSON.parse(json);
    } catch {
      vscode.window.showErrorMessage('Invalid Service Account JSON');
      return;
    }

    try {
      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'Connecting to Firestore...' },
        async () => {
          await this.connectServiceAccount(
            projectId,
            displayName,
            environment.value,
            serviceAccount
          );
        }
      );
      vscode.window.showInformationMessage(`Connected to ${displayName}`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to connect: ${(error as Error).message}`);
    }
  }

  private async showEmulatorDialog(): Promise<void> {
    const config = this.emulatorService.detectEmulatorConfig();

    const host = await vscode.window.showInputBox({
      prompt: 'Emulator host',
      value: config?.host || 'localhost',
    });
    if (!host) return;

    const firestorePort = await vscode.window.showInputBox({
      prompt: 'Firestore emulator port',
      value: String(config?.firestorePort || 8080),
      validateInput: v => (/^\d+$/.test(v) ? null : 'Must be a number'),
    });
    if (!firestorePort) return;

    const emulatorConfig: EmulatorConfig = {
      host,
      firestorePort: parseInt(firestorePort),
      authPort: config?.authPort,
      functionsPort: config?.functionsPort,
      storagePort: config?.storagePort,
      uiPort: config?.uiPort,
    };

    const running = await this.emulatorService.isEmulatorRunning(emulatorConfig);
    if (!running) {
      const proceed = await vscode.window.showWarningMessage(
        'Emulator does not appear to be running. Connect anyway?',
        'Yes',
        'No'
      );
      if (proceed !== 'Yes') return;
    }

    try {
      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'Connecting to Emulator...' },
        async () => {
          await this.connectEmulator(emulatorConfig);
        }
      );
      vscode.window.showInformationMessage('Connected to Firebase Emulator');
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to connect: ${(error as Error).message}`);
    }
  }

  detectProjectFiles(): ReturnType<EmulatorService['detectProjectFiles']> {
    return this.emulatorService.detectProjectFiles();
  }
}
