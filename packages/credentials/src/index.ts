import { SecretStorage, Disposable } from 'vscode';
import { logger } from '@vistiq/shared';
import { EmulatorConfig, AuthMethod, StoredConnection, StoredServiceAccount } from '@vistiq/core';

const SECRET_KEYS = {
  SERVICE_ACCOUNT: 'serviceAccount',
  OAUTH_TOKEN: 'oauthToken',
  EMULATOR_CONFIG: 'emulatorConfig',
  CONNECTIONS: 'connections',
  ACTIVE_CONNECTION: 'activeConnection',
} as const;

export interface StoredOAuthToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string;
}

export class CredentialService {
  private secretStorage: SecretStorage;
  private disposal: Disposable[] = [];

  constructor(secretStorage: SecretStorage) {
    this.secretStorage = secretStorage;
  }

  async storeServiceAccount(projectId: string, serviceAccount: StoredServiceAccount): Promise<void> {
    const key = this.getKey(SECRET_KEYS.SERVICE_ACCOUNT, projectId);
    await this.secretStorage.store(key, JSON.stringify(serviceAccount));
    logger.info('Service account stored', { projectId });
  }

  async getServiceAccount(projectId: string): Promise<StoredServiceAccount | null> {
    const key = this.getKey(SECRET_KEYS.SERVICE_ACCOUNT, projectId);
    const value = await this.secretStorage.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as StoredServiceAccount;
    } catch {
      logger.error('Failed to parse service account', { projectId });
      return null;
    }
  }

  async deleteServiceAccount(projectId: string): Promise<void> {
    const key = this.getKey(SECRET_KEYS.SERVICE_ACCOUNT, projectId);
    await this.secretStorage.delete(key);
    logger.info('Service account deleted', { projectId });
  }

  async storeOAuthToken(projectId: string, token: StoredOAuthToken): Promise<void> {
    const key = this.getKey(SECRET_KEYS.OAUTH_TOKEN, projectId);
    await this.secretStorage.store(key, JSON.stringify(token));
    logger.info('OAuth token stored', { projectId });
  }

  async getOAuthToken(projectId: string): Promise<StoredOAuthToken | null> {
    const key = this.getKey(SECRET_KEYS.OAUTH_TOKEN, projectId);
    const value = await this.secretStorage.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as StoredOAuthToken;
    } catch {
      logger.error('Failed to parse OAuth token', { projectId });
      return null;
    }
  }

  async deleteOAuthToken(projectId: string): Promise<void> {
    const key = this.getKey(SECRET_KEYS.OAUTH_TOKEN, projectId);
    await this.secretStorage.delete(key);
    logger.info('OAuth token deleted', { projectId });
  }

  async storeEmulatorConfig(projectId: string, config: EmulatorConfig): Promise<void> {
    const key = this.getKey(SECRET_KEYS.EMULATOR_CONFIG, projectId);
    await this.secretStorage.store(key, JSON.stringify(config));
    logger.info('Emulator config stored', { projectId });
  }

  async getEmulatorConfig(projectId: string): Promise<EmulatorConfig | null> {
    const key = this.getKey(SECRET_KEYS.EMULATOR_CONFIG, projectId);
    const value = await this.secretStorage.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as EmulatorConfig;
    } catch {
      logger.error('Failed to parse emulator config', { projectId });
      return null;
    }
  }

  async deleteEmulatorConfig(projectId: string): Promise<void> {
    const key = this.getKey(SECRET_KEYS.EMULATOR_CONFIG, projectId);
    await this.secretStorage.delete(key);
    logger.info('Emulator config deleted', { projectId });
  }

  async storeConnection(connection: StoredConnection): Promise<void> {
    const connections = await this.getConnections();
    const existingIndex = connections.findIndex(c => c.projectId === connection.projectId);
    if (existingIndex >= 0) {
      connections[existingIndex] = connection;
    } else {
      connections.push(connection);
    }
    await this.secretStorage.store(SECRET_KEYS.CONNECTIONS, JSON.stringify(connections));
    logger.info('Connection stored', { projectId: connection.projectId });
  }

  async getConnections(): Promise<StoredConnection[]> {
    const value = await this.secretStorage.get(SECRET_KEYS.CONNECTIONS);
    if (!value) return [];
    try {
      return JSON.parse(value) as StoredConnection[];
    } catch {
      logger.error('Failed to parse connections');
      return [];
    }
  }

  async getConnection(projectId: string): Promise<StoredConnection | null> {
    const connections = await this.getConnections();
    return connections.find(c => c.projectId === projectId) || null;
  }

  async deleteConnection(projectId: string): Promise<void> {
    const connections = await this.getConnections();
    const filtered = connections.filter(c => c.projectId !== projectId);
    await this.secretStorage.store(SECRET_KEYS.CONNECTIONS, JSON.stringify(filtered));
    await this.deleteServiceAccount(projectId);
    await this.deleteOAuthToken(projectId);
    await this.deleteEmulatorConfig(projectId);
    logger.info('Connection deleted', { projectId });
  }

  async setActiveConnection(projectId: string): Promise<void> {
    await this.secretStorage.store(SECRET_KEYS.ACTIVE_CONNECTION, projectId);
  }

  async getActiveConnection(): Promise<string | null> {
    const value = await this.secretStorage.get(SECRET_KEYS.ACTIVE_CONNECTION);
    return (value as string | null) ?? null;
  }

  async clearAll(): Promise<void> {
    const connections = await this.getConnections();
    for (const conn of connections) {
      await this.deleteServiceAccount(conn.projectId);
      await this.deleteOAuthToken(conn.projectId);
      await this.deleteEmulatorConfig(conn.projectId);
    }
    await this.secretStorage.delete(SECRET_KEYS.CONNECTIONS);
    await this.secretStorage.delete(SECRET_KEYS.ACTIVE_CONNECTION);
    logger.info('All credentials cleared');
  }

  private getKey(prefix: string, projectId: string): string {
    return `${prefix}.${projectId}`;
  }

  dispose(): void {
    for (const d of this.disposal) {
      d.dispose();
    }
    this.disposal = [];
  }
}

export function createCredentialService(secretStorage: SecretStorage): CredentialService {
  return new CredentialService(secretStorage);
}