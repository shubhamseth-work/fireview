import { AuthProvider, Connection, AuthStatus, EmulatorConfig } from '@vistiq/core';
import { CredentialService } from '@vistiq/credentials';
import { Firestore } from 'firebase-admin/firestore';
export declare class ServiceAccountProvider implements AuthProvider {
    private credentialService;
    private app;
    private firestore;
    private projectId;
    constructor(credentialService: CredentialService);
    connect(_config?: EmulatorConfig): Promise<Connection>;
    disconnect(): Promise<void>;
    getStatus(): Promise<AuthStatus>;
    testConnection(): Promise<void>;
    getFirestore(): Firestore | null;
    getProjectId(): string | null;
    setProjectId(projectId: string): void;
}
export declare class EmulatorProvider implements AuthProvider {
    private emulatorConfig;
    private firestore;
    private app;
    connect(config?: EmulatorConfig): Promise<Connection>;
    disconnect(): Promise<void>;
    getStatus(): Promise<AuthStatus>;
    getFirestore(): Firestore | null;
    getEmulatorConfig(): EmulatorConfig | null;
}
export declare class GoogleOAuthProvider implements AuthProvider {
    private credentialService;
    private projectId;
    private oauthClient;
    constructor(credentialService: CredentialService);
    connect(_config?: EmulatorConfig): Promise<Connection>;
    disconnect(): Promise<void>;
    getStatus(): Promise<AuthStatus>;
    setProjectId(projectId: string): void;
}
export declare function createAuthProviders(credentialService: CredentialService): {
    serviceAccount: ServiceAccountProvider;
    emulator: EmulatorProvider;
    oauth: GoogleOAuthProvider;
    firebaseAuth: FirebaseAuthProvider;
};
export type AuthProviders = ReturnType<typeof createAuthProviders>;
export declare class FirebaseAuthProvider implements AuthProvider {
    private credentialService;
    private app;
    private firestore;
    private auth;
    private projectId;
    private userId;
    private refreshToken;
    constructor(credentialService: CredentialService);
    connect(config?: EmulatorConfig): Promise<Connection>;
    disconnect(): Promise<void>;
    getStatus(): Promise<AuthStatus>;
    getFirestore(): Firestore | null;
    getProjectId(): string | null;
    setProjectId(projectId: string): void;
}
//# sourceMappingURL=index.d.ts.map