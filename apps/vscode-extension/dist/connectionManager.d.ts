import { CredentialService } from '@vistiq/credentials';
import { AuthProviders } from '@vistiq/auth';
import { FirestoreService } from '@vistiq/firestore';
import { AuditService } from '@vistiq/audit';
import { EmulatorService } from '@vistiq/emulator';
import { Connection, StoredServiceAccount, EmulatorConfig, EnvironmentLabel } from '@vistiq/core';
interface ActiveConnection extends Connection {
    firestore?: FirestoreService;
    serviceAccount?: StoredServiceAccount;
    emulatorConfig?: EmulatorConfig;
}
export declare class ConnectionManager {
    private connections;
    private activeProjectId;
    private credentialService;
    private authProviders;
    private auditService;
    private emulatorService;
    constructor(credentialService: CredentialService, authProviders: AuthProviders, auditService: AuditService, emulatorService: EmulatorService);
    initialize(): Promise<void>;
    private restoreConnection;
    connectServiceAccount(projectId: string, displayName: string, environment: EnvironmentLabel, serviceAccount: StoredServiceAccount): Promise<Connection>;
    connectEmulator(config: EmulatorConfig): Promise<Connection>;
    disconnect(projectId: string): Promise<void>;
    disconnectActive(): Promise<void>;
    getConnection(projectId: string): ActiveConnection | undefined;
    getConnections(): ActiveConnection[];
    getActiveConnection(): ActiveConnection | undefined;
    getActiveProjectId(): string | null;
    setActiveConnection(projectId: string): Promise<void>;
    showConnectDialog(): Promise<void>;
    private showServiceAccountDialog;
    private showEmulatorDialog;
    detectProjectFiles(): ReturnType<EmulatorService['detectProjectFiles']>;
}
export {};
//# sourceMappingURL=connectionManager.d.ts.map