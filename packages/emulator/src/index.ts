import { EmulatorConfig, ProjectFileDetectionResult } from '@vistiq/core';
import { logger } from '@vistiq/shared';
import * as fs from 'fs';
import * as path from 'path';

export class EmulatorService {
  private workspaceRoot: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  detectEmulatorConfig(): EmulatorConfig | null {
    const firebaseJsonPath = path.join(this.workspaceRoot, 'firebase.json');
    if (!fs.existsSync(firebaseJsonPath)) return null;

    try {
      const content = fs.readFileSync(firebaseJsonPath, 'utf8');
      const config = JSON.parse(content);

      if (!config.emulators) return null;

      const emulators = config.emulators;
      return {
        host: emulators.host || 'localhost',
        firestorePort: emulators.firestore?.port || 8080,
        authPort: emulators.auth?.port || 9099,
        functionsPort: emulators.functions?.port || 5001,
        storagePort: emulators.storage?.port || 9199,
        uiPort: emulators.ui?.port || 4000,
      };
    } catch (error) {
      logger.error('Failed to parse firebase.json', { error: (error as Error).message });
      return null;
    }
  }

  isEmulatorRunning(config: EmulatorConfig): Promise<boolean> {
    return new Promise((resolve) => {
      const net = require('net');
      const socket = new net.Socket();
      socket.setTimeout(1000);

      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.on('error', () => {
        resolve(false);
      });

      socket.connect(config.firestorePort || 8080, config.host);
    });
  }

  async detectProjectFiles(): Promise<ProjectFileDetectionResult | null> {
    const firebaseJson = fs.existsSync(path.join(this.workspaceRoot, 'firebase.json'));
    const firebaserc = fs.existsSync(path.join(this.workspaceRoot, '.firebaserc'));
    const firestoreRules = fs.existsSync(path.join(this.workspaceRoot, 'firestore.rules'));
    const firestoreIndexes = fs.existsSync(path.join(this.workspaceRoot, 'firestore.indexes.json'));
    const packageJson = fs.existsSync(path.join(this.workspaceRoot, 'package.json'));

    if (!firebaseJson && !firebaserc && !firestoreRules && !firestoreIndexes) {
      return null;
    }

    let projectId = 'unknown';
    if (firebaserc) {
      try {
        const content = fs.readFileSync(path.join(this.workspaceRoot, '.firebaserc'), 'utf8');
        const config = JSON.parse(content);
        projectId = config.projects?.default || 'unknown';
      } catch {
        // ignore
      }
    }

    return {
      projectId,
      firebaseJson,
      firebaserc,
      firestoreRules,
      firestoreIndexes,
      packageJson,
      emulatorConfig: this.detectEmulatorConfig() !== null,
    };
  }

  getWorkspaceRoot(): string {
    return this.workspaceRoot;
  }

  setWorkspaceRoot(root: string): void {
    this.workspaceRoot = root;
  }
}

export function createEmulatorService(workspaceRoot: string): EmulatorService {
  return new EmulatorService(workspaceRoot);
}