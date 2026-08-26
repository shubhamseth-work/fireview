import { describe, it, expect } from 'vitest';

function cleanValue(value: any): any {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(cleanValue);
  if (value.__type__) {
    switch (value.__type__) {
      case 'timestamp':
        return value.value;
      case 'reference':
        return value.value;
      case 'geopoint':
        return { latitude: value.value.latitude, longitude: value.value.longitude };
      case 'bytes':
        return `base64:${value.value}`;
      case 'array':
        return value.value.map(cleanValue);
      case 'map': {
        const mapResult: Record<string, any> = {};
        for (const [k, v] of Object.entries(value.value)) {
          mapResult[k] = cleanValue(v);
        }
        return mapResult;
      }
    }
  }
  const objResult: Record<string, any> = {};
  for (const [k, v] of Object.entries(value)) {
    objResult[k] = cleanValue(v);
  }
  return objResult;
}

function cleanData(data: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    result[key] = cleanValue(value);
  }
  return result;
}

describe('cleanData', () => {
  it('should handle null values', () => {
    const input = { field: null };
    const output = cleanData(input);
    expect(output.field).toBeNull();
  });

  it('should handle primitive values', () => {
    const input = { string: 'hello', number: 42, boolean: true };
    const output = cleanData(input);
    expect(output).toEqual(input);
  });

  it('should clean timestamp type', () => {
    const input = { createdAt: { __type__: 'timestamp', value: '2024-01-01T00:00:00.000Z' } };
    const output = cleanData(input);
    expect(output.createdAt).toBe('2024-01-01T00:00:00.000Z');
  });

  it('should clean reference type', () => {
    const input = { ref: { __type__: 'reference', value: 'users/user123' } };
    const output = cleanData(input);
    expect(output.ref).toBe('users/user123');
  });

  it('should clean geopoint type', () => {
    const input = { location: { __type__: 'geopoint', value: { latitude: 37.7749, longitude: -122.4194 } } };
    const output = cleanData(input);
    expect(output.location).toEqual({ latitude: 37.7749, longitude: -122.4194 });
  });

  it('should clean bytes type', () => {
    const input = { data: { __type__: 'bytes', value: 'aGVsbG8=' } };
    const output = cleanData(input);
    expect(output.data).toBe('base64:aGVsbG8=');
  });

  it('should clean map type', () => {
    const input = { 
      metadata: { 
        __type__: 'map', 
        value: { 
          status: 'active', 
          count: 5 
        } 
      } 
    };
    const output = cleanData(input);
    expect(output.metadata).toEqual({ status: 'active', count: 5 });
  });

  it('should clean array type', () => {
    const input = { 
      tags: { 
        __type__: 'array', 
        value: ['tag1', 'tag2', 'tag3'] 
      } 
    };
    const output = cleanData(input);
    expect(output.tags).toEqual(['tag1', 'tag2', 'tag3']);
  });

  it('should handle nested objects', () => {
    const input = { 
      user: { 
        name: 'John', 
        address: { 
          city: 'NYC',
          coordinates: { __type__: 'geopoint', value: { latitude: 40.7128, longitude: -74.0060 } }
        } 
      } 
    };
    const output = cleanData(input);
    expect(output.user.name).toBe('John');
    expect(output.user.address.city).toBe('NYC');
    expect(output.user.address.coordinates).toEqual({ latitude: 40.7128, longitude: -74.0060 });
  });

  it('should handle empty object', () => {
    const input = {};
    const output = cleanData(input);
    expect(output).toEqual({});
  });

  it('should handle arrays of objects', () => {
    const input = { 
      items: [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2', meta: { __type__: 'map', value: { created: { __type__: 'timestamp', value: '2024-01-01' } } } }
      ] 
    };
    const output = cleanData(input);
    expect(output.items).toHaveLength(2);
    expect(output.items[0]).toEqual({ id: 1, name: 'Item 1' });
    expect(output.items[1].meta).toEqual({ created: '2024-01-01' });
  });
});