import type { AuditService } from '@vistiq/audit';
import type { AuthProviders } from '@vistiq/auth';
import type {
  AuthMethod,
  Connection,
  EmulatorConfig,
  EnvironmentLabel,
  StoredConnection,
  StoredServiceAccount,
} from '@vistiq/core';
import type { CredentialService } from '@vistiq/credentials';
import type { EmulatorService } from '@vistiq/emulator';
import { createFirestoreService, type FirestoreService } from '@vistiq/firestore';
import { createChildLogger, ERROR_CODES, VistiqError } from '@vistiq/shared';
import * as fs from 'fs';
import * as vscode from 'vscode';

const connLogger = createChildLogger('connectionManager');

export interface ActiveConnection extends Connection {
  firestore?: FirestoreService;
  serviceAccount?: StoredServiceAccount;
  emulatorConfig?: EmulatorConfig;
  firebaseAuth?: { refreshToken: string; userId: string; email: string };
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
      } else if (stored.authMethod === 'firebase-auth') {
        const firebaseAuth = await this.credentialService.getFirebaseAuth(stored.projectId);
        if (firebaseAuth) {
          this.authProviders.firebaseAuth.setProjectId(stored.projectId);
          await this.authProviders.firebaseAuth.connect({
            idToken: '', // Will be refreshed from refresh token
            refreshToken: firebaseAuth.refreshToken,
            projectId: stored.projectId,
            userId: firebaseAuth.userId,
            email: firebaseAuth.email,
          } as any);
          firestore = createFirestoreService(
            this.authProviders.firebaseAuth.getFirestore()!,
            stored.projectId
          );
        }
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
    } else if (connection.authMethod === 'firebase-auth') {
      await this.authProviders.firebaseAuth.disconnect();
      await this.credentialService.deleteFirebaseAuth(projectId);
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
    } else if (authMethod.value === 'emulator') {
      await this.showEmulatorDialog();
    }
  }

  async showServiceAccountDialog(): Promise<void> {
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

    // Step 1: File picker for service account JSON
    const jsonUri = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: { 'JSON Files': ['json'] },
      openLabel: 'Select Service Account JSON',
      title: 'Select Service Account Key File',
    });

    let serviceAccount: StoredServiceAccount;
    let finalProjectId = projectId;
    let finalDisplayName = displayName;

    if (jsonUri && jsonUri.length > 0) {
      // File selected - read and parse
      try {
        const jsonContent = fs.readFileSync(jsonUri[0].fsPath, 'utf8');
        serviceAccount = JSON.parse(jsonContent);

        if (!serviceAccount.type || serviceAccount.type !== 'service_account') {
          throw new Error('Not a valid service account JSON (missing type=service_account)');
        }
      } catch {
        vscode.window.showErrorMessage('Invalid Service Account JSON file');
        return;
      }

      // Auto-fill project ID from JSON if not provided
      if (!finalProjectId && serviceAccount.project_id) {
        finalProjectId = serviceAccount.project_id;
      }

      // Auto-fill display name from client_email if not provided
      if (!finalDisplayName && serviceAccount.client_email) {
        finalDisplayName = serviceAccount.client_email;
      }
    } else {
      // Step 2: Fallback - paste JSON (user cancelled file picker)
      const pasteAction = await vscode.window.showInformationMessage(
        'No file selected. Paste Service Account JSON instead?',
        'Paste JSON',
        'Cancel'
      );

      if (pasteAction !== 'Paste JSON') return;

      const json = await vscode.window.showInputBox({
        prompt: 'Paste Service Account JSON',
        placeHolder: '{ "type": "service_account", ... }',
        validateInput: v => {
          try { JSON.parse(v); return null; } catch { return 'Invalid JSON'; }
        },
        password: true,
      });
      if (!json) return;

      try {
        serviceAccount = JSON.parse(json);
      } catch {
        vscode.window.showErrorMessage('Invalid Service Account JSON');
        return;
      }

      // Auto-fill project ID from JSON if not provided
      if (!finalProjectId && serviceAccount.project_id) {
        finalProjectId = serviceAccount.project_id;
      }

      // Auto-fill display name from client_email if not provided
      if (!finalDisplayName && serviceAccount.client_email) {
        finalDisplayName = serviceAccount.client_email;
      }
    }

    // Validate required fields
    if (!finalProjectId) {
      vscode.window.showErrorMessage('Project ID is required');
      return;
    }
    if (!finalDisplayName) {
      vscode.window.showErrorMessage('Display name is required');
      return;
    }

    try {
      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'Connecting to Firestore...' },
        async () => {
          await this.connectServiceAccount(
            finalProjectId,
            finalDisplayName,
            environment.value,
            serviceAccount
          );
        }
      );
      vscode.window.showInformationMessage(`Connected to ${finalDisplayName}`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to connect: ${(error as Error).message}`);
    }
  }

  async showEmulatorDialog(): Promise<void> {
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

  async connectFirebaseAuth(
    idToken: string,
    refreshToken: string,
    projectId: string,
    userId: string,
    email: string
  ): Promise<Connection> {
    await this.authProviders.firebaseAuth.connect({
      idToken,
      refreshToken,
      projectId,
      userId,
      email,
    } as any);
    const firestoreInstance = this.authProviders.firebaseAuth.getFirestore()!;
    const firestore = createFirestoreService(firestoreInstance, projectId);

    const connection: ActiveConnection = {
      projectId,
      displayName: email,
      environment: 'custom',
      authMethod: 'firebase-auth',
      connectedAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      firestore,
      firebaseAuth: { refreshToken, userId, email },
    };

    await firestore.connect();
    this.connections.set(projectId, connection);
    await this.credentialService.storeConnection({
      projectId,
      displayName: email,
      environment: 'custom',
      authMethod: 'firebase-auth',
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

  async switchFirebaseProject(projectId: string): Promise<Connection> {
    // Switch to a different Firebase project for the authenticated user
    const firebaseAuth = await this.credentialService.getFirebaseAuth(this.activeProjectId!);
    if (!firebaseAuth) {
      throw new VistiqError('No Firebase Auth found', ERROR_CODES.INVALID_CREDENTIALS);
    }

    // Disconnect current connection
    await this.disconnect(this.activeProjectId!);

    // Connect to new project with same credentials
    return this.connectFirebaseAuth(
      '',
      firebaseAuth.refreshToken,
      projectId,
      firebaseAuth.userId,
      firebaseAuth.email
    );
  }
}
