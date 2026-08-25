"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleOAuthProvider = exports.EmulatorProvider = exports.ServiceAccountProvider = void 0;
exports.createAuthProviders = createAuthProviders;
const shared_1 = require("@vistiq/shared");
const google_auth_library_1 = require("google-auth-library");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
class ServiceAccountProvider {
    credentialService;
    app = null;
    firestore = null;
    projectId = null;
    constructor(credentialService) {
        this.credentialService = credentialService;
    }
    async connect() {
        const stored = await this.credentialService.getServiceAccount(this.projectId || '');
        if (!stored) {
            throw new shared_1.VistiqError('No service account found', shared_1.ERROR_CODES.INVALID_CREDENTIALS);
        }
        this.projectId = stored.project_id;
        try {
            const credential = (0, app_1.cert)({
                projectId: stored.project_id,
                clientEmail: stored.client_email,
                privateKey: stored.private_key,
            });
            const appName = `vistiq-${stored.project_id}`;
            const existingApp = (0, app_1.getApps)().find(a => a.name === appName);
            this.app = existingApp || (0, app_1.initializeApp)({ credential }, appName);
            this.firestore = (0, firestore_1.getFirestore)(this.app);
            await this.testConnection();
            const connection = {
                projectId: stored.project_id,
                displayName: stored.project_id,
                environment: 'custom',
                authMethod: 'service-account',
                connectedAt: new Date().toISOString(),
                lastUsedAt: new Date().toISOString(),
            };
            shared_1.logger.info('Service account connected', { projectId: stored.project_id });
            return connection;
        }
        catch (error) {
            shared_1.logger.error('Service account connection failed', { error: error.message });
            throw new shared_1.VistiqError(`Failed to connect: ${error.message}`, shared_1.ERROR_CODES.AUTH_FAILED, { originalError: error });
        }
    }
    async disconnect() {
        if (this.app) {
            await this.app.delete();
            this.app = null;
            this.firestore = null;
        }
        this.projectId = null;
        shared_1.logger.info('Service account disconnected');
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
            throw new shared_1.VistiqError('Not initialized', shared_1.ERROR_CODES.AUTH_FAILED);
        await this.firestore.collection('__vistiq_test__').limit(1).get();
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
exports.ServiceAccountProvider = ServiceAccountProvider;
class EmulatorProvider {
    emulatorConfig = null;
    firestore = null;
    app = null;
    async connect(config) {
        this.emulatorConfig = config;
        process.env.FIRESTORE_EMULATOR_HOST = `${config.host}:${config.firestorePort || 8080}`;
        const appName = `vistiq-emulator-${config.host}-${config.firestorePort}`;
        const existingApp = (0, app_1.getApps)().find(a => a.name === appName);
        this.app = existingApp || (0, app_1.initializeApp)({ projectId: 'demo-project' }, appName);
        this.firestore = (0, firestore_1.getFirestore)(this.app);
        const connection = {
            projectId: 'demo-project',
            displayName: 'Firebase Emulator',
            environment: 'development',
            authMethod: 'emulator',
            emulatorConfig: config,
            connectedAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString(),
        };
        shared_1.logger.info('Emulator connected', { config });
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
        shared_1.logger.info('Emulator disconnected');
    }
    async getStatus() {
        if (!this.firestore || !this.emulatorConfig) {
            return { connected: false };
        }
        try {
            await this.firestore.collection('__vistiq_test__').limit(1).get();
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
exports.EmulatorProvider = EmulatorProvider;
class GoogleOAuthProvider {
    credentialService;
    projectId = null;
    authClient = null;
    constructor(credentialService) {
        this.credentialService = credentialService;
    }
    async connect() {
        const token = await this.credentialService.getOAuthToken(this.projectId || '');
        if (!token) {
            throw new shared_1.VistiqError('No OAuth token found', shared_1.ERROR_CODES.INVALID_CREDENTIALS);
        }
        this.authClient = new google_auth_library_1.GoogleAuth({
            credentials: {
                access_token: token.accessToken,
                refresh_token: token.refreshToken,
                scope: token.scope,
                token_type: 'Bearer',
                expiry_date: token.expiresAt,
            },
        });
        const connection = {
            projectId: this.projectId || 'unknown',
            displayName: this.projectId || 'OAuth Project',
            environment: 'custom',
            authMethod: 'oauth',
            connectedAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString(),
        };
        shared_1.logger.info('OAuth connected', { projectId: this.projectId });
        return connection;
    }
    async disconnect() {
        this.authClient = null;
        this.projectId = null;
        shared_1.logger.info('OAuth disconnected');
    }
    async getStatus() {
        if (!this.authClient || !this.projectId) {
            return { connected: false };
        }
        try {
            await this.authClient.getAccessToken();
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
exports.GoogleOAuthProvider = GoogleOAuthProvider;
function createAuthProviders(credentialService) {
    return {
        serviceAccount: new ServiceAccountProvider(credentialService),
        emulator: new EmulatorProvider(),
        oauth: new GoogleOAuthProvider(credentialService),
    };
}
//# sourceMappingURL=index.js.map