import { SecretStorage } from 'vscode';
import { EmulatorConfig, StoredConnection, StoredServiceAccount } from '@vistiq/core';
export interface StoredOAuthToken {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    scope: string;
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