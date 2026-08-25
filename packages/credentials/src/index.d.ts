import { SecretStorage } from 'vscode';
import { AuthMethod, EmulatorConfig } from '@vistiq/core';
export interface StoredServiceAccount {
    type: string;
    project_id: string;
    private_key_id: string;
    private_key: string;
    client_email: string;
    client_id: string;
    auth_uri: string;
    token_uri: string;
    auth_provider_x509_cert_url: string;
    client_x509_cert_url: string;
    universe_domain?: string;
}
export interface StoredOAuthToken {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    scope: string;
}
export interface StoredConnection {
    projectId: string;
    displayName: string;
    environment: string;
    authMethod: AuthMethod;
    emulatorConfig?: EmulatorConfig;
    region?: string;
    connectedAt: string;
    lastUsedAt: string;
}
export declare class CredentialService {
    private secretStorage;
    private disposal;
    constructor(secretStorage: SecretStorage);
    storeServiceAccount(projectId: string, serviceAccount: StoredServiceAccount): Promise<void>;
    getServiceAccount(projectId: string): Promise<StoredServiceAccount | null>;
    deleteServiceAccount(projectId: string): Promise<void>;
    storeOAuthToken(projectId: string, token: StoredOAuthToken): Promise<void>;
    getOAuthToken(projectId: string): Promise<StoredOAuthToken | null>;
    deleteOAuthToken(projectId: string): Promise<void>;
    storeEmulatorConfig(projectId: string, config: EmulatorConfig): Promise<void>;
    getEmulatorConfig(projectId: string): Promise<EmulatorConfig | null>;
    deleteEmulatorConfig(projectId: string): Promise<void>;
    storeConnection(connection: StoredConnection): Promise<void>;
    getConnections(): Promise<StoredConnection[]>;
    getConnection(projectId: string): Promise<StoredConnection | null>;
    deleteConnection(projectId: string): Promise<void>;
    setActiveConnection(projectId: string): Promise<void>;
    getActiveConnection(): Promise<string | null>;
    clearAll(): Promise<void>;
    private getKey;
    dispose(): void;
}
export declare function createCredentialService(secretStorage: SecretStorage): CredentialService;
//# sourceMappingURL=index.d.ts.map