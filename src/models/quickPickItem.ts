import * as vscode from 'vscode';

export class QuickPickItem implements vscode.QuickPickItem {
	constructor(
		public label: string,
		public description?: string,
		public details?: string
	) {}
}