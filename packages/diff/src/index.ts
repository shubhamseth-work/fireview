import { DocumentDiff, DiffChange, FirestoreDocument, FirestoreValue } from '@fireview/core';

export class DiffService {
  diff(left: FirestoreDocument | null, right: FirestoreDocument | null): DocumentDiff {
    const changes: DiffChange[] = [];

    if (!left && !right) {
      return { left: null, right: null, changes: [] };
    }

    if (!left) {
      return {
        left: null,
        right,
        changes: this.collectAdded('', right!.data),
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

  private compareObjects(
    path: string,
    left: Record<string, FirestoreValue>,
    right: Record<string, FirestoreValue>,
    changes: DiffChange[]
  ): void {
    const allKeys = new Set([...Object.keys(left), ...Object.keys(right)]);

    for (const key of allKeys) {
      const newPath = path ? `${path}.${key}` : key;
      const leftVal = left[key];
      const rightVal = right[key];

      if (!(key in left)) {
        changes.push({ path: newPath, type: 'added', rightValue: rightVal });
      } else if (!(key in right)) {
        changes.push({ path: newPath, type: 'removed', leftValue: leftVal });
      } else if (!this.valuesEqual(leftVal, rightVal)) {
        if (this.isObject(leftVal) && this.isObject(rightVal)) {
          this.compareObjects(
            newPath,
            this.getObjectValue(leftVal),
            this.getObjectValue(rightVal),
            changes
          );
        } else if (Array.isArray(leftVal) && Array.isArray(rightVal)) {
          this.compareArrays(newPath, leftVal, rightVal, changes);
        } else {
          changes.push({ path: newPath, type: 'changed', leftValue: leftVal, rightValue: rightVal });
        }
      }
    }
  }

  private compareArrays(
    path: string,
    left: FirestoreValue[],
    right: FirestoreValue[],
    changes: DiffChange[]
  ): void {
    const maxLen = Math.max(left.length, right.length);
    for (let i = 0; i < maxLen; i++) {
      const newPath = `${path}[${i}]`;
      const leftVal = left[i];
      const rightVal = right[i];

      if (i >= left.length) {
        changes.push({ path: newPath, type: 'added', rightValue: rightVal });
      } else if (i >= right.length) {
        changes.push({ path: newPath, type: 'removed', leftValue: leftVal });
      } else if (!this.valuesEqual(leftVal, rightVal)) {
        if (this.isObject(leftVal) && this.isObject(rightVal)) {
          this.compareObjects(
            newPath,
            this.getObjectValue(leftVal),
            this.getObjectValue(rightVal),
            changes
          );
        } else {
          changes.push({ path: newPath, type: 'changed', leftValue: leftVal, rightValue: rightVal });
        }
      }
    }
  }

  private collectAdded(path: string, obj: Record<string, FirestoreValue>): DiffChange[] {
    const changes: DiffChange[] = [];
    for (const [key, value] of Object.entries(obj)) {
      const newPath = path ? `${path}.${key}` : key;
      if (this.isObject(value)) {
        changes.push({ path: newPath, type: 'added', rightValue: value });
        this.collectAdded(newPath, this.getObjectValue(value)).forEach(c => changes.push(c));
      } else if (Array.isArray(value)) {
        changes.push({ path: newPath, type: 'added', rightValue: value });
        for (let i = 0; i < value.length; i++) {
          const itemPath = `${newPath}[${i}]`;
          const item = value[i];
          if (this.isObject(item)) {
            this.collectAdded(itemPath, this.getObjectValue(item)).forEach(c => changes.push(c));
          }
        }
      } else {
        changes.push({ path: newPath, type: 'added', rightValue: value });
      }
    }
    return changes;
  }

  private collectRemoved(path: string, obj: Record<string, FirestoreValue>): DiffChange[] {
    const changes: DiffChange[] = [];
    for (const [key, value] of Object.entries(obj)) {
      const newPath = path ? `${path}.${key}` : key;
      if (this.isObject(value)) {
        changes.push({ path: newPath, type: 'removed', leftValue: value });
        this.collectRemoved(newPath, this.getObjectValue(value)).forEach(c => changes.push(c));
      } else if (Array.isArray(value)) {
        changes.push({ path: newPath, type: 'removed', leftValue: value });
        for (let i = 0; i < value.length; i++) {
          const itemPath = `${newPath}[${i}]`;
          const item = value[i];
          if (this.isObject(item)) {
            this.collectRemoved(itemPath, this.getObjectValue(item)).forEach(c => changes.push(c));
          }
        }
      } else {
        changes.push({ path: newPath, type: 'removed', leftValue: value });
      }
    }
    return changes;
  }

  private isObject(value: FirestoreValue): boolean {
    if (typeof value === 'object' && value !== null) {
      const obj = value as unknown as Record<string, unknown>;
      if ('__type__' in obj) {
        return obj.__type__ === 'map';
      }
      return true;
    }
    return false;
  }

  private getObjectValue(value: FirestoreValue): Record<string, FirestoreValue> {
    if (typeof value === 'object' && value !== null) {
      const obj = value as unknown as Record<string, unknown>;
      if ('__type__' in obj && obj.__type__ === 'map') {
        return obj.value as Record<string, FirestoreValue>;
      }
      return obj as Record<string, FirestoreValue>;
    }
    return {};
  }

  private valuesEqual(a: FirestoreValue, b: FirestoreValue): boolean {
    return JSON.stringify(this.normalizeForCompare(a)) === JSON.stringify(this.normalizeForCompare(b));
  }

  private normalizeForCompare(value: FirestoreValue): unknown {
    if (value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(v => this.normalizeForCompare(v));
    const obj = value as unknown as Record<string, unknown>;
    if ('__type__' in obj) {
      switch (obj.__type__) {
        case 'array':
          return { __type__: 'array', value: (obj.value as FirestoreValue[]).map(v => this.normalizeForCompare(v)) };
        case 'map':
          const mapResult: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(obj.value as Record<string, FirestoreValue>)) {
            mapResult[k] = this.normalizeForCompare(v);
          }
          return { __type__: 'map', value: mapResult };
        default:
          return obj;
      }
    }
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = this.normalizeForCompare(v as FirestoreValue);
    }
    return result;
  }
}

export function createDiffService(): DiffService {
  return new DiffService();
}