export class DiffService {
    diff(left, right) {
        const changes = [];
        if (!left && !right) {
            return { left: null, right: null, changes: [] };
        }
        if (!left) {
            return {
                left: null,
                right,
                changes: this.collectAdded('', right.data),
            };
        }
        if (!right) {
            return {
                left,
                right: null,
                changes: this.collectRemoved('', left.data),
            };
        }
        this.compareObjects('', left.data, right.data, changes);
        return { left, right, changes };
    }
    compareObjects(path, left, right, changes) {
        const allKeys = new Set([...Object.keys(left), ...Object.keys(right)]);
        for (const key of allKeys) {
            const newPath = path ? `${path}.${key}` : key;
            const leftVal = left[key];
            const rightVal = right[key];
            if (!(key in left)) {
                changes.push({ path: newPath, type: 'added', rightValue: rightVal });
            }
            else if (!(key in right)) {
                changes.push({ path: newPath, type: 'removed', leftValue: leftVal });
            }
            else if (!this.valuesEqual(leftVal, rightVal)) {
                if (this.isObject(leftVal) && this.isObject(rightVal)) {
                    this.compareObjects(newPath, this.getObjectValue(leftVal), this.getObjectValue(rightVal), changes);
                }
                else if (Array.isArray(leftVal) && Array.isArray(rightVal)) {
                    this.compareArrays(newPath, leftVal, rightVal, changes);
                }
                else {
                    changes.push({ path: newPath, type: 'changed', leftValue: leftVal, rightValue: rightVal });
                }
            }
        }
    }
    compareArrays(path, left, right, changes) {
        const maxLen = Math.max(left.length, right.length);
        for (let i = 0; i < maxLen; i++) {
            const newPath = `${path}[${i}]`;
            const leftVal = left[i];
            const rightVal = right[i];
            if (i >= left.length) {
                changes.push({ path: newPath, type: 'added', rightValue: rightVal });
            }
            else if (i >= right.length) {
                changes.push({ path: newPath, type: 'removed', leftValue: leftVal });
            }
            else if (!this.valuesEqual(leftVal, rightVal)) {
                if (this.isObject(leftVal) && this.isObject(rightVal)) {
                    this.compareObjects(newPath, this.getObjectValue(leftVal), this.getObjectValue(rightVal), changes);
                }
                else {
                    changes.push({ path: newPath, type: 'changed', leftValue: leftVal, rightValue: rightVal });
                }
            }
        }
    }
    collectAdded(path, obj) {
        const changes = [];
        for (const [key, value] of Object.entries(obj)) {
            const newPath = path ? `${path}.${key}` : key;
            if (this.isObject(value)) {
                changes.push({ path: newPath, type: 'added', rightValue: value });
                this.collectAdded(newPath, this.getObjectValue(value)).forEach(c => changes.push(c));
            }
            else if (Array.isArray(value)) {
                changes.push({ path: newPath, type: 'added', rightValue: value });
                for (let i = 0; i < value.length; i++) {
                    const itemPath = `${newPath}[${i}]`;
                    const item = value[i];
                    if (this.isObject(item)) {
                        this.collectAdded(itemPath, this.getObjectValue(item)).forEach(c => changes.push(c));
                    }
                }
            }
            else {
                changes.push({ path: newPath, type: 'added', rightValue: value });
            }
        }
        return changes;
    }
    collectRemoved(path, obj) {
        const changes = [];
        for (const [key, value] of Object.entries(obj)) {
            const newPath = path ? `${path}.${key}` : key;
            if (this.isObject(value)) {
                changes.push({ path: newPath, type: 'removed', leftValue: value });
                this.collectRemoved(newPath, this.getObjectValue(value)).forEach(c => changes.push(c));
            }
            else if (Array.isArray(value)) {
                changes.push({ path: newPath, type: 'removed', leftValue: value });
                for (let i = 0; i < value.length; i++) {
                    const itemPath = `${newPath}[${i}]`;
                    const item = value[i];
                    if (this.isObject(item)) {
                        this.collectRemoved(itemPath, this.getObjectValue(item)).forEach(c => changes.push(c));
                    }
                }
            }
            else {
                changes.push({ path: newPath, type: 'removed', leftValue: value });
            }
        }
        return changes;
    }
    isObject(value) {
        if (typeof value === 'object' && value !== null) {
            const obj = value;
            if ('__type__' in obj) {
                return obj.__type__ === 'map';
            }
            return true;
        }
        return false;
    }
    getObjectValue(value) {
        if (typeof value === 'object' && value !== null) {
            const obj = value;
            if ('__type__' in obj && obj.__type__ === 'map') {
                return obj.value;
            }
            return obj;
        }
        return {};
    }
    valuesEqual(a, b) {
        return JSON.stringify(this.normalizeForCompare(a)) === JSON.stringify(this.normalizeForCompare(b));
    }
    normalizeForCompare(value) {
        if (value === null || typeof value !== 'object')
            return value;
        if (Array.isArray(value))
            return value.map(v => this.normalizeForCompare(v));
        const obj = value;
        if ('__type__' in obj) {
            switch (obj.__type__) {
                case 'array':
                    return { __type__: 'array', value: obj.value.map(v => this.normalizeForCompare(v)) };
                case 'map':
                    const mapResult = {};
                    for (const [k, v] of Object.entries(obj.value)) {
                        mapResult[k] = this.normalizeForCompare(v);
                    }
                    return { __type__: 'map', value: mapResult };
                default:
                    return obj;
            }
        }
        const result = {};
        for (const [k, v] of Object.entries(obj)) {
            result[k] = this.normalizeForCompare(v);
        }
        return result;
    }
}
export function createDiffService() {
    return new DiffService();
}
//# sourceMappingURL=index.js.map