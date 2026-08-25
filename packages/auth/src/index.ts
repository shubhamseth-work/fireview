import { AuthProvider, Connection, AuthStatus, AuthMethod, EmulatorConfig, StoredServiceAccount } from '@vistiq/core';
import { logger, VistiqError, ERROR_CODES } from '@vistiq/shared';
import { CredentialService } from '@vistiq/credentials';
import { GoogleAuth } from 'google-auth-library';
import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

export class ServiceAccountProvider implements AuthProvider {
  private credentialService: CredentialService;
  private app: App | null = null;
  private firestore: Firestore | null = null;
  private projectId: string | null = null;

  constructor(credentialService: CredentialService) {
    this.credentialService = credentialService;
  }

  async connect(config?: EmulatorConfig): Promise<Connection> {
    const stored = await this.credentialService.getServiceAccount(this.projectId || '');
    if (!stored) {
      throw new VistiqError('No service account found', ERROR_CODES.INVALID_CREDENTIALS);
    }

    this.projectId = stored.project_id;

    try {
      const credential = cert({
        projectId: stored.project_id,
        clientEmail: stored.client_email,
        privateKey: stored.private_key,
      });

      const appName = `vistiq-${stored.project_id}`;
      const existingApp = getApps().find(a => a.name === appName);
      this.app = existingApp || initializeApp({ credential }, appName);
      this.firestore = getFirestore(this.app);

      await this.testConnection();

      const connection: Connection = {
        projectId: stored.project_id,
        displayName: stored.project_id,
        environment: 'custom',
        authMethod: 'service-account',
        connectedAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
      };

      logger.info('Service account connected', { projectId: stored.project_id });
      return connection;
    } catch (error) {
      logger.error('Service account connection failed', { error: (error as Error).message });
      throw new VistiqError(
        `Failed to connect: ${(error as Error).message}`,
        ERROR_CODES.AUTH_FAILED,
        { originalError: error }
      );
    }
  }

  async disconnect(): Promise<void> {
    if (this.app) {
      await this.app.delete();
      this.app = null;
      this.firestore = null;
    }
    this.projectId = null;
    logger.info('Service account disconnected');
  }

  async getStatus(): Promise<AuthStatus> {
    if (!this.app || !this.projectId) {
      return { connected: false };
    }
    try {
      await this.testConnection();
      return { connected: true, projectId: this.projectId };
    } catch {
      return { connected: false, projectId: this.projectId, error: 'Connection test failed' };
    }
  }

  async testConnection(): Promise<void> {
    if (!this.firestore) throw new VistiqError('Not initialized', ERROR_CODES.AUTH_FAILED);
    await this.firestore.collection('__vistiq_test__').limit(1).get();
  }

  getFirestore(): Firestore | null {
    return this.firestore;
  }

  getProjectId(): string | null {
    return this.projectId;
  }

  setProjectId(projectId: string): void {
    this.projectId = projectId;
  }
}

export class EmulatorProvider implements AuthProvider {
  private emulatorConfig: EmulatorConfig | null = null;
  private firestore: Firestore | null = null;
  private app: App | null = null;

  async connect(config?: EmulatorConfig): Promise<Connection> {
    if (!config) {
      throw new VistiqError('Emulator config required', ERROR_CODES.INVALID_CREDENTIALS);
    }
    this.emulatorConfig = config;

    process.env.FIRESTORE_EMULATOR_HOST = `${config.host}:${config.firestorePort || 8080}`;

    const appName = `vistiq-emulator-${config.host}-${config.firestorePort}`;
    const existingApp = getApps().find(a => a.name === appName);
    this.app = existingApp || initializeApp({ projectId: 'demo-project' }, appName);
    this.firestore = getFirestore(this.app);

    const connection: Connection = {
      projectId: 'demo-project',
      displayName: 'Firebase Emulator',
      environment: 'development',
      authMethod: 'emulator',
      emulatorConfig: config,
      connectedAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    };

    logger.info('Emulator connected', { config });
    return connection;
  }

  async disconnect(): Promise<void> {
    delete process.env.FIRESTORE_EMULATOR_HOST;
    if (this.app) {
      await this.app.delete();
      this.app = null;
      this.firestore = null;
    }
    this.emulatorConfig = null;
    logger.info('Emulator disconnected');
  }

  async getStatus(): Promise<AuthStatus> {
    if (!this.firestore || !this.emulatorConfig) {
      return { connected: false };
    }
    try {
      await this.firestore.collection('__vistiq_test__').limit(1).get();
      return { connected: true, projectId: 'demo-project' };
    } catch {
      return { connected: false, error: 'Emulator connection test failed' };
    }
  }

  getFirestore(): Firestore | null {
    return this.firestore;
  }

  getEmulatorConfig(): EmulatorConfig | null {
    return this.emulatorConfig;
  }
}

export class GoogleOAuthProvider implements AuthProvider {
  private credentialService: CredentialService;
  private projectId: string | null = null;
  private authClient: GoogleAuth | null = null;

  constructor(credentialService: CredentialService) {
    this.credentialService = credentialService;
  }

  async connect(config?: EmulatorConfig): Promise<Connection> {
    const token = await this.credentialService.getOAuthToken(this.projectId || '');
    if (!token) {
      throw new VistiqError('No OAuth token found', ERROR_CODES.INVALID_CREDENTIALS);
    }

    this.authClient = new GoogleAuth({
      credentials: {
        access_token: token.accessToken,
        refresh_token: token.refreshToken,
        scope: token.scope,
        token_type: 'Bearer',
        expiry_date: token.expiresAt,
      },
    });

    const connection: Connection = {
      projectId: this.projectId || 'unknown',
      displayName: this.projectId || 'OAuth Project',
      environment: 'custom',
      authMethod: 'oauth',
      connectedAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    };

    logger.info('OAuth connected', { projectId: this.projectId });
    return connection;
  }

  async disconnect(): Promise<void> {
    this.authClient = null;
    this.projectId = null;
    logger.info('OAuth disconnected');
  }

  async getStatus(): Promise<AuthStatus> {
    if (!this.authClient || !this.projectId) {
      return { connected: false };
    }
    try {
      await this.authClient.getAccessToken();
      return { connected: true, projectId: this.projectId };
    } catch {
      return { connected: false, projectId: this.projectId, error: 'Token expired or invalid' };
    }
  }

  setProjectId(projectId: string): void {
    this.projectId = projectId;
  }
}

export function createAuthProviders(credentialService: CredentialService) {
  return {
    serviceAccount: new ServiceAccountProvider(credentialService),
    emulator: new EmulatorProvider(),
    oauth: new GoogleOAuthProvider(credentialService),
  };
}

export type AuthProviders = ReturnType<typeof createAuthProviders>;