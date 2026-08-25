import * as vscode from 'vscode';
import { ConnectionManager } from './connectionManager';
import { WebviewManager } from './webviewManager';
export declare class ProjectTreeProvider implements vscode.TreeDataProvider<ProjectTreeItem> {
    private connectionManager;
    private webviewManager;
    private _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<ProjectTreeItem | undefined | null | void>;
    constructor(connectionManager: ConnectionManager, webviewManager: WebviewManager);
    refresh(): void;
    getTreeItem(element: ProjectTreeItem): vscode.TreeItem;
    getChildren(element?: ProjectTreeItem): Promise<ProjectTreeItem[]>;
    private getRootItems;
    private getProjectChildren;
    private getFirestoreChildren;
    private getCollectionChildren;
}
export declare class ProjectTreeItem extends vscode.TreeItem {
    readonly type: string;
    readonly context: Record<string, unknown>;
    constructor(label: string, type: string, collapsibleState: vscode.TreeItemCollapsibleState, context: Record<string, unknown>, description?: string);
    context: Record<string, unknown>;
}
//# sourceMappingURL=treeProvider.d.ts.map