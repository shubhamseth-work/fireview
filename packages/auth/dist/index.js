import { logger, VistiqError, ERROR_CODES } from '@vistiq/shared';
import { OAuth2Client } from 'google-auth-library';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
export class ServiceAccountProvider {
    credentialService;
    app = null;
    firestore = null;
    projectId = null;
    constructor(credentialService) {
        this.credentialService = credentialService;
    }
    async connect(_config) {
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
            const connection = {
                projectId: stored.project_id,
                displayName: stored.project_id,
                environment: 'custom',
                authMethod: 'service-account',
                connectedAt: new Date().toISOString(),
                lastUsedAt: new Date().toISOString(),
            };
            logger.info('Service account connected', { projectId: stored.project_id });
            return connection;
        }
        catch (error) {
            logger.error('Service account connection failed', { error: error.message });
            throw new VistiqError(`Failed to connect: ${error.message}`, ERROR_CODES.AUTH_FAILED, { originalError: error });
        }
    }
    async disconnect() {
        if (this.app) {
            await this.app.delete();
            this.app = null;
            this.firestore = null;
        }
        this.projectId = null;
        logger.info('Service account disconnected');
    }
    async getStatus() {
        if (!this.app || !this.projectId) {
            return { connected: false };
        }
        try {
            await this.testConnection();
            return { connected: true, projectId: this.projectId };
        }
        catch {
            return { connected: false, projectId: this.projectId, error: 'Connection test failed' };
        }
    }
    async testConnection() {
        if (!this.firestore)
            throw new VistiqError('Not initialized', ERROR_CODES.AUTH_FAILED);
        await this.firestore.collection('_vistiq_test').limit(1).get();
    }
    getFirestore() {
        return this.firestore;
    }
    getProjectId() {
        return this.projectId;
    }
    setProjectId(projectId) {
        this.projectId = projectId;
    }
}
export class EmulatorProvider {
    emulatorConfig = null;
    firestore = null;
    app = null;
    async connect(config) {
        if (!config) {
            throw new VistiqError('Emulator config required', ERROR_CODES.INVALID_CREDENTIALS);
        }
        this.emulatorConfig = config;
        process.env.FIRESTORE_EMULATOR_HOST = `${config.host}:${config.firestorePort || 8080}`;
        const appName = `vistiq-emulator-${config.host}-${config.firestorePort}`;
        const existingApp = getApps().find(a => a.name === appName);
        this.app = existingApp || initializeApp({ projectId: 'demo-project' }, appName);
        this.firestore = getFirestore(this.app);
        const connection = {
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
    async disconnect() {
        delete process.env.FIRESTORE_EMULATOR_HOST;
        if (this.app) {
            await this.app.delete();
            this.app = null;
            this.firestore = null;
        }
        this.emulatorConfig = null;
        logger.info('Emulator disconnected');
    }
    async getStatus() {
        if (!this.firestore || !this.emulatorConfig) {
            return { connected: false };
        }
        try {
            await this.firestore.collection('_vistiq_test').limit(1).get();
            return { connected: true, projectId: 'demo-project' };
        }
        catch {
            return { connected: false, error: 'Emulator connection test failed' };
        }
    }
    getFirestore() {
        return this.firestore;
    }
    getEmulatorConfig() {
        return this.emulatorConfig;
    }
}
export class GoogleOAuthProvider {
    credentialService;
    projectId = null;
    oauthClient = null;
    constructor(credentialService) {
        this.credentialService = credentialService;
    }
    async connect(_config) {
        const token = await this.credentialService.getOAuthToken(this.projectId || '');
        if (!token) {
            throw new VistiqError('No OAuth token found', ERROR_CODES.INVALID_CREDENTIALS);
        }
        this.oauthClient = new OAuth2Client();
        this.oauthClient.setCredentials({
            access_token: token.accessToken,
            refresh_token: token.refreshToken,
            scope: token.scope,
            token_type: 'Bearer',
            expiry_date: token.expiresAt,
        });
        const connection = {
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
    async disconnect() {
        this.oauthClient = null;
        this.projectId = null;
        logger.info('OAuth disconnected');
    }
    async getStatus() {
        if (!this.oauthClient || !this.projectId) {
            return { connected: false };
        }
        try {
            await this.oauthClient.getAccessToken();
            return { connected: true, projectId: this.projectId };
        }
        catch {
            return { connected: false, projectId: this.projectId, error: 'Token expired or invalid' };
        }
    }
    setProjectId(projectId) {
        this.projectId = projectId;
    }
}
export function createAuthProviders(credentialService) {
    return {
        serviceAccount: new ServiceAccountProvider(credentialService),
        emulator: new EmulatorProvider(),
        oauth: new GoogleOAuthProvider(credentialService),
        firebaseAuth: new FirebaseAuthProvider(credentialService),
    };
}
export class FirebaseAuthProvider {
    credentialService;
    app = null;
    firestore = null;
    auth = null;
    projectId = null;
    userId = null;
    refreshToken = null;
    constructor(credentialService) {
        this.credentialService = credentialService;
    }
    async connect(config) {
        // Firebase Auth provider expects a custom config with idToken, not EmulatorConfig
        const firebaseConfig = config;
        if (!firebaseConfig) {
            throw new VistiqError('Firebase Auth config required', ERROR_CODES.INVALID_CREDENTIALS);
        }
        try {
            const { idToken, refreshToken, projectId, userId, email: configEmail } = firebaseConfig;
            // Verify the ID token
            const adminAuth = getAuth();
            const decodedToken = await adminAuth.verifyIdToken(idToken);
            const { uid, email: tokenEmail, firebase } = decodedToken;
            this.userId = uid;
            this.projectId = projectId;
            this.refreshToken = refreshToken;
            // Create custom token for this user
            const customToken = await adminAuth.createCustomToken(uid);
            // Initialize Admin SDK with user's custom token
            const appName = `vistiq-firebase-${projectId}`;
            const existingApp = getApps().find(a => a.name === appName);
            // Use custom token as credential
            const userCredential = cert({ projectId, clientEmail: 'firebase-auth', privateKey: customToken });
            this.app = existingApp || initializeApp({ credential: userCredential }, appName);
            this.firestore = getFirestore(this.app);
            this.auth = getAuth(this.app);
            // Store refresh token for persistence
            await this.credentialService.storeFirebaseAuth(projectId, {
                refreshToken,
                projectId,
                userId: uid,
                email: tokenEmail || configEmail || '',
                expiresAt: Date.now() + 3600000 // 1 hour
            });
            const connection = {
                projectId,
                displayName: tokenEmail || configEmail || projectId,
                environment: 'custom',
                authMethod: 'firebase-auth',
                connectedAt: new Date().toISOString(),
                lastUsedAt: new Date().toISOString(),
            };
            logger.info('Firebase Auth connected', { projectId, email: tokenEmail || configEmail });
            return connection;
        }
        catch (error) {
            logger.error('Firebase Auth connection failed', { error: error.message });
            throw new VistiqError(`Failed to connect: ${error.message}`, ERROR_CODES.AUTH_FAILED, { originalError: error });
        }
    }
    async disconnect() {
        if (this.app) {
            await this.app.delete();
            this.app = null;
            this.firestore = null;
            this.auth = null;
        }
        this.projectId = null;
        this.userId = null;
        this.refreshToken = null;
        logger.info('Firebase Auth disconnected');
    }
    async getStatus() {
        if (!this.app || !this.projectId) {
            return { connected: false };
        }
        try {
            await this.firestore.collection('_vistiq_test').limit(1).get();
            return { connected: true, projectId: this.projectId };
        }
        catch {
            return { connected: false, projectId: this.projectId, error: 'Connection test failed' };
        }
    }
    getFirestore() {
        return this.firestore;
    }
    getProjectId() {
        return this.projectId;
    }
    setProjectId(projectId) {
        this.projectId = projectId;
    }
}
//# sourceMappingURL=index.js.map