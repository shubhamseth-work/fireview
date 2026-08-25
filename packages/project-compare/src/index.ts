import {
  ProjectComparison,
  CollectionComparison,
  ComparisonSummary,
  CollectionInfo,
  FieldInfo,
} from '@vistiq/core';
import { FirestoreConnection } from '@vistiq/firestore';
import { logger } from '@vistiq/shared';

export class ProjectCompareService {
  private sourceFirestore: FirestoreConnection;
  private destFirestore: FirestoreConnection;

  constructor(sourceFirestore: FirestoreConnection, destFirestore: FirestoreConnection) {
    this.sourceFirestore = sourceFirestore;
    this.destFirestore = destFirestore;
  }

  async compare(sourceProjectId: string, destinationProjectId: string): Promise<ProjectComparison> {
    const [sourceCollections, destCollections] = await Promise.all([
      this.sourceFirestore.listCollections(),
      this.destFirestore.listCollections(),
    ]);

    const collections = await this.compareCollections(sourceCollections, destCollections);
    const summary = this.generateSummary(collections);

    return {
      sourceProjectId,
      destinationProjectId,
      collections,
      summary,
    };
  }

  private async compareCollections(
    source: CollectionInfo[],
    dest: CollectionInfo[]
  ): Promise<CollectionComparison[]> {
    const sourceMap = new Map(source.map(c => [c.id, c]));
    const destMap = new Map(dest.map(c => [c.id, c]));
    const allIds = new Set([...sourceMap.keys(), ...destMap.keys()]);

    const results: CollectionComparison[] = [];

    for (const id of allIds) {
      const sourceCol = sourceMap.get(id);
      const destCol = destMap.get(id);

      if (sourceCol && destCol) {
        const [sourceStructure, destStructure] = await Promise.all([
          this.inferStructure(sourceCol.path),
          this.inferStructure(destCol.path),
        ]);

        const structureMatch = this.structuresMatch(sourceStructure, destStructure);

        results.push({
          collectionId: id,
          sourceCount: sourceCol.documentCount,
          destinationCount: destCol.documentCount,
          sourceStructure,
          destinationStructure,
          status: structureMatch ? 'match' : 'structure-diff',
        });
      } else if (sourceCol) {
        const structure = await this.inferStructure(sourceCol.path);
        results.push({
          collectionId: id,
          sourceCount: sourceCol.documentCount,
          sourceStructure: structure,
          status: 'missing-in-destination',
        });
      } else {
        const structure = await this.inferStructure(destCol!.path);
        results.push({
          collectionId: id,
          destinationCount: destCol!.documentCount,
          destinationStructure: structure,
          status: 'missing-in-source',
        });
      }
    }

    return results;
  }

  private async inferStructure(collectionPath: string): Promise<Record<string, FieldInfo>> {
    try {
      const page = await this.sourceFirestore.listDocuments(collectionPath, { limit: 100 });
      const structure: Record<string, FieldInfo> = {};

      for (const doc of page.documents) {
        this.analyzeDocument(doc.data, structure);
      }

      return structure;
    } catch {
      return {};
    }
  }

  private analyzeDocument(
    data: Record<string, unknown>,
    structure: Record<string, FieldInfo>,
    prefix = ''
  ): void {
    for (const [key, value] of Object.entries(data)) {
      const path = prefix ? `${prefix}.${key}` : key;

      if (value === null) {
        structure[path] = { type: 'null', nullable: true, array: false };
      } else if (Array.isArray(value)) {
        structure[path] = { type: 'array', nullable: false, array: true };
        if (value.length > 0) {
          this.analyzeValue(value[0], structure, path);
        }
      } else if (typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        if ('__type__' in obj) {
          switch (obj.__type__) {
            case 'timestamp':
              structure[path] = { type: 'timestamp', nullable: false, array: false };
              break;
            case 'reference':
              structure[path] = { type: 'reference', nullable: false, array: false };
              break;
            case 'geopoint':
              structure[path] = { type: 'geopoint', nullable: false, array: false };
              break;
            case 'bytes':
              structure[path] = { type: 'bytes', nullable: false, array: false };
              break;
            case 'map':
              structure[path] = { type: 'map', nullable: false, array: false };
              this.analyzeDocument(obj.value as Record<string, unknown>, structure, path);
              break;
            case 'array':
              structure[path] = { type: 'array', nullable: false, array: true };
              break;
          }
        } else {
          structure[path] = { type: 'map', nullable: false, array: false };
          this.analyzeDocument(obj, structure, path);
        }
      } else {
        structure[path] = { type: typeof value, nullable: false, array: false };
      }
    }
  }

  private analyzeValue(
    value: unknown,
    structure: Record<string, FieldInfo>,
    prefix: string
  ): void {
    if (value === null) return;
    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      if ('__type__' in obj) {
        if (obj.__type__ === 'map') {
          this.analyzeDocument(obj.value as Record<string, unknown>, structure, prefix);
        }
      } else {
        this.analyzeDocument(obj, structure, prefix);
      }
    }
  }

  private structuresMatch(
    source: Record<string, FieldInfo>,
    dest: Record<string, FieldInfo>
  ): boolean {
    const sourceKeys = Object.keys(source).sort();
    const destKeys = Object.keys(dest).sort();
    return JSON.stringify(sourceKeys) === JSON.stringify(destKeys);
  }

  private generateSummary(collections: CollectionComparison[]): ComparisonSummary {
    return {
      totalCollections: collections.length,
      matchingCollections: collections.filter(c => c.status === 'match').length,
      missingInSource: collections.filter(c => c.status === 'missing-in-source').length,
      missingInDestination: collections.filter(c => c.status === 'missing-in-destination').length,
      structureDifferences: collections.filter(c => c.status === 'structure-diff').length,
    };
  }
}

export function createProjectCompareService(
  sourceFirestore: FirestoreConnection,
  destFirestore: FirestoreConnection
): ProjectCompareService {
  return new ProjectCompareService(sourceFirestore, destFirestore);
}