import * as vscode from 'vscode';
import { TestableProvider } from './testableProvider';

export const quickPickCommandHandler = async () => {
	const testableProvider = new TestableProvider();
	const testableItems = await testableProvider.getTestable();

	const pick = await vscode.window.showQuickPick(testableItems, {
		onDidSelectItem: (item) => {
			console.log('onDidSelectItem - pickItem:', item);
		},
		canPickMany: false,
		matchOnDescription: true,
		matchOnDetail: true,
		placeHolder: 'search test name...'
	});

	if (pick) {
		const terminal = vscode.window.createTerminal('Jest run by name');
		terminal.show();
		const handler = vscode.window.onDidCloseTerminal((ev) => {
			if (ev.exitStatus !== undefined && ev.processId === terminal.processId) {
				vscode.window.showInformationMessage('"Jest by name" - Done.');
				handler.dispose();
				terminal.dispose();
			}
		});
		let command = `jest --testNamePattern="${pick.label}" `;
		// command += ' --runInBand';
		console.log(command);
		terminal.sendText(command);
	}
};

export const userInputCommandHandler = async () => {
	const pick = await vscode.window.showInputBox({
		prompt: 'Type test description.'
	});

	if (pick) {
		const terminal = vscode.window.createTerminal('Jest run by name');
		terminal.show();
		const handler = vscode.window.onDidCloseTerminal((ev) => {
			if (ev.exitStatus !== undefined && ev.processId === terminal.processId) {
				vscode.window.showInformationMessage('"Jest by name" - Done.');
				handler.dispose();
				terminal.dispose();
			}
		});
		let command = `jest --testNamePattern="${pick}" `;
		// command += ' --runInBand';
		console.log(command);
		terminal.sendText(command);
	}
};
