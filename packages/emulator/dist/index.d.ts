import { EmulatorConfig, ProjectFileDetectionResult } from '@vistiq/core';
export declare class EmulatorService {
    private workspaceRoot;
    constructor(workspaceRoot: string);
    detectEmulatorConfig(): EmulatorConfig | null;
    isEmulatorRunning(config: EmulatorConfig): Promise<boolean>;
    detectProjectFiles(): Promise<ProjectFileDetectionResult | null>;
    getWorkspaceRoot(): string;
    setWorkspaceRoot(root: string): void;
}
export declare function createEmulatorService(workspaceRoot: string): EmulatorService;
//# sourceMappingURL=index.d.ts.map