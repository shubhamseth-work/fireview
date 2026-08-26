import { describe, it, expect } from 'vitest';

function extractGeopoints(data: Record<string, any>): Array<{ label: string; lat: number; lng: number }> {
  const geopoints: Array<{ label: string; lat: number; lng: number }> = [];
  
  const traverse = (obj: any, path: string = '') => {
    if (!obj || typeof obj !== 'object') return;
    
    if (obj.__type__ === 'geopoint' && obj.value) {
      geopoints.push({
        label: path || 'location',
        lat: obj.value.latitude,
        lng: obj.value.longitude
      });
    } else if (obj.__type__ === 'map' && obj.value) {
      for (const [key, value] of Object.entries(obj.value)) {
        traverse(value, path ? `${path}.${key}` : key);
      }
    } else if (obj.__type__ === 'array' && obj.value) {
      obj.value.forEach((item: any, index: number) => {
        traverse(item, `${path}[${index}]`);
      });
    } else if (Array.isArray(obj)) {
      obj.forEach((item: any, index: number) => {
        traverse(item, `${path}[${index}]`);
      });
    } else {
      for (const [key, value] of Object.entries(obj)) {
        traverse(value, path ? `${path}.${key}` : key);
      }
    }
  };
  
  traverse(data);
  return geopoints;
}

describe('extractGeopoints', () => {
  it('should return empty array for no geopoints', () => {
    const input = { name: 'test', value: 42 };
    const output = extractGeopoints(input);
    expect(output).toEqual([]);
  });

  it('should extract single geopoint at root', () => {
    const input = { 
      location: { __type__: 'geopoint', value: { latitude: 37.7749, longitude: -122.4194 } } 
    };
    const output = extractGeopoints(input);
    expect(output).toHaveLength(1);
    expect(output[0]).toEqual({
      label: 'location',
      lat: 37.7749,
      lng: -122.4194
    });
  });

  it('should extract geopoint in nested map', () => {
    const input = { 
      user: { 
        __type__: 'map', 
        value: { 
          address: { 
            __type__: 'map', 
            value: { 
              coordinates: { __type__: 'geopoint', value: { latitude: 40.7128, longitude: -74.0060 } } 
            } 
          } 
        } 
      } 
    };
    const output = extractGeopoints(input);
    expect(output).toHaveLength(1);
    expect(output[0]).toEqual({
      label: 'user.address.coordinates',
      lat: 40.7128,
      lng: -74.0060
    });
  });

  it('should extract multiple geopoints', () => {
    const input = { 
      start: { __type__: 'geopoint', value: { latitude: 37.7749, longitude: -122.4194 } },
      end: { __type__: 'geopoint', value: { latitude: 40.7128, longitude: -74.0060 } }
    };
    const output = extractGeopoints(input);
    expect(output).toHaveLength(2);
    expect(output[0].label).toBe('start');
    expect(output[1].label).toBe('end');
  });

  it('should extract geopoints from array', () => {
    const input = { 
      waypoints: { 
        __type__: 'array', 
        value: [
          { __type__: 'geopoint', value: { latitude: 37.7749, longitude: -122.4194 } },
          { __type__: 'geopoint', value: { latitude: 40.7128, longitude: -74.0060 } }
        ] 
      } 
    };
    const output = extractGeopoints(input);
    expect(output).toHaveLength(2);
    expect(output[0].label).toBe('waypoints[0]');
    expect(output[1].label).toBe('waypoints[1]');
  });

  it('should extract geopoints from plain array', () => {
    const input = { 
      points: [
        { __type__: 'geopoint', value: { latitude: 37.7749, longitude: -122.4194 } },
        { name: 'Not a geopoint' }
      ] 
    };
    const output = extractGeopoints(input);
    expect(output).toHaveLength(1);
    expect(output[0].label).toBe('points[0]');
  });

  it('should handle deeply nested geopoints', () => {
    const input = { 
      level1: { 
        level2: { 
          level3: { 
            __type__: 'map', 
            value: { 
              location: { __type__: 'geopoint', value: { latitude: 51.5074, longitude: -0.1278 } } 
            } 
          } 
        } 
      } 
    };
    const output = extractGeopoints(input);
    expect(output).toHaveLength(1);
    expect(output[0].label).toBe('level1.level2.level3.location');
  });

  it('should ignore non-geopoint types', () => {
    const input = { 
      timestamp: { __type__: 'timestamp', value: '2024-01-01T00:00:00Z' },
      reference: { __type__: 'reference', value: 'users/123' },
      bytes: { __type__: 'bytes', value: 'aGVsbG8=' }
    };
    const output = extractGeopoints(input);
    expect(output).toEqual([]);
  });

  it('should handle empty object', () => {
    const input = {};
    const output = extractGeopoints(input);
    expect(output).toEqual([]);
  });

  it('should handle null values', () => {
    const input = { location: null, data: undefined };
    const output = extractGeopoints(input);
    expect(output).toEqual([]);
  });
});