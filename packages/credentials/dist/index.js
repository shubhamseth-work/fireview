import { logger } from '@vistiq/shared';
const SECRET_KEYS = {
    SERVICE_ACCOUNT: 'serviceAccount',
    OAUTH_TOKEN: 'oauthToken',
    EMULATOR_CONFIG: 'emulatorConfig',
    CONNECTIONS: 'connections',
    ACTIVE_CONNECTION: 'activeConnection',
};
export class CredentialService {
    secretStorage;
    disposal = [];
    constructor(secretStorage) {
        this.secretStorage = secretStorage;
    }
    async storeServiceAccount(projectId, serviceAccount) {
        const key = this.getKey(SECRET_KEYS.SERVICE_ACCOUNT, projectId);
        await this.secretStorage.store(key, JSON.stringify(serviceAccount));
        logger.info('Service account stored', { projectId });
    }
    async getServiceAccount(projectId) {
        const key = this.getKey(SECRET_KEYS.SERVICE_ACCOUNT, projectId);
        const value = await this.secretStorage.get(key);
        if (!value)
            return null;
        try {
            return JSON.parse(value);
        }
        catch {
            logger.error('Failed to parse service account', { projectId });
            return null;
        }
    }
    async deleteServiceAccount(projectId) {
        const key = this.getKey(SECRET_KEYS.SERVICE_ACCOUNT, projectId);
        await this.secretStorage.delete(key);
        logger.info('Service account deleted', { projectId });
    }
    async storeOAuthToken(projectId, token) {
        const key = this.getKey(SECRET_KEYS.OAUTH_TOKEN, projectId);
        await this.secretStorage.store(key, JSON.stringify(token));
        logger.info('OAuth token stored', { projectId });
    }
    async getOAuthToken(projectId) {
        const key = this.getKey(SECRET_KEYS.OAUTH_TOKEN, projectId);
        const value = await this.secretStorage.get(key);
        if (!value)
            return null;
        try {
            return JSON.parse(value);
        }
        catch {
            logger.error('Failed to parse OAuth token', { projectId });
            return null;
        }
    }
    async deleteOAuthToken(projectId) {
        const key = this.getKey(SECRET_KEYS.OAUTH_TOKEN, projectId);
        await this.secretStorage.delete(key);
        logger.info('OAuth token deleted', { projectId });
    }
    async storeEmulatorConfig(projectId, config) {
        const key = this.getKey(SECRET_KEYS.EMULATOR_CONFIG, projectId);
        await this.secretStorage.store(key, JSON.stringify(config));
        logger.info('Emulator config stored', { projectId });
    }
    async getEmulatorConfig(projectId) {
        const key = this.getKey(SECRET_KEYS.EMULATOR_CONFIG, projectId);
        const value = await this.secretStorage.get(key);
        if (!value)
            return null;
        try {
            return JSON.parse(value);
        }
        catch {
            logger.error('Failed to parse emulator config', { projectId });
            return null;
        }
    }
    async deleteEmulatorConfig(projectId) {
        const key = this.getKey(SECRET_KEYS.EMULATOR_CONFIG, projectId);
        await this.secretStorage.delete(key);
        logger.info('Emulator config deleted', { projectId });
    }
    async storeConnection(connection) {
        const connections = await this.getConnections();
        const existingIndex = connections.findIndex(c => c.projectId === connection.projectId);
        if (existingIndex >= 0) {
            connections[existingIndex] = connection;
        }
        else {
            connections.push(connection);
        }
        await this.secretStorage.store(SECRET_KEYS.CONNECTIONS, JSON.stringify(connections));
        logger.info('Connection stored', { projectId: connection.projectId });
    }
    async getConnections() {
        const value = await this.secretStorage.get(SECRET_KEYS.CONNECTIONS);
        if (!value)
            return [];
        try {
            return JSON.parse(value);
        }
        catch {
            logger.error('Failed to parse connections');
            return [];
        }
    }
    async getConnection(projectId) {
        const connections = await this.getConnections();
        return connections.find(c => c.projectId === projectId) || null;
    }
    async deleteConnection(projectId) {
        const connections = await this.getConnections();
        const filtered = connections.filter(c => c.projectId !== projectId);
        await this.secretStorage.store(SECRET_KEYS.CONNECTIONS, JSON.stringify(filtered));
        await this.deleteServiceAccount(projectId);
        await this.deleteOAuthToken(projectId);
        await this.deleteEmulatorConfig(projectId);
        logger.info('Connection deleted', { projectId });
    }
    async setActiveConnection(projectId) {
        await this.secretStorage.store(SECRET_KEYS.ACTIVE_CONNECTION, projectId);
    }
    async getActiveConnection() {
        const value = this.secretStorage.get(SECRET_KEYS.ACTIVE_CONNECTION);
        return value === undefined ? null : value;
    }
    async clearAll() {
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
    getKey(prefix, projectId) {
        return `${prefix}.${projectId}`;
    }
    dispose() {
        for (const d of this.disposal) {
            d.dispose();
        }
        this.disposal = [];
    }
}
export function createCredentialService(secretStorage) {
    return new CredentialService(secretStorage);
}
//# sourceMappingURL=index.js.map