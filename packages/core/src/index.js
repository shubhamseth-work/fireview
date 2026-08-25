"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFirestoreValue = isFirestoreValue;
exports.serializeFirestoreValue = serializeFirestoreValue;
exports.deserializeFirestoreValue = deserializeFirestoreValue;
function isFirestoreValue(value) {
    if (value === null)
        return true;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
        return true;
    if (Array.isArray(value))
        return value.every(isFirestoreValue);
    if (typeof value === 'object' && value !== null) {
        const obj = value;
        if ('__type__' in obj) {
            switch (obj.__type__) {
                case 'timestamp':
                case 'reference':
                case 'geopoint':
                case 'bytes':
                    return true;
                case 'array':
                    return Array.isArray(obj.value) && obj.value.every(isFirestoreValue);
                case 'map':
                    return Object.values(obj.value).every(isFirestoreValue);
                default:
                    return false;
            }
        }
        return Object.values(obj).every(isFirestoreValue);
    }
    return false;
}
function serializeFirestoreValue(value) {
    if (value === null)
        return null;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
        return value;
    if (Array.isArray(value))
        return value.map(serializeFirestoreValue);
    if (typeof value === 'object' && value !== null) {
        const obj = value;
        if ('__type__' in obj) {
            return obj;
        }
        const result = {};
        for (const [k, v] of Object.entries(obj)) {
            result[k] = serializeFirestoreValue(v);
        }
        return result;
    }
    return value;
}
function deserializeFirestoreValue(value) {
    if (value === null)
        return null;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
        return value;
    if (Array.isArray(value))
        return { __type__: 'array', value: value.map(deserializeFirestoreValue) };
    if (typeof value === 'object' && value !== null) {
        const obj = value;
        if ('__type__' in obj) {
            return obj;
        }
        const result = {};
        for (const [k, v] of Object.entries(obj)) {
            result[k] = deserializeFirestoreValue(v);
        }
        return { __type__: 'map', value: result };
    }
    return value;
}
//# sourceMappingURL=index.js.map