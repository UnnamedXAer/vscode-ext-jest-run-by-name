import * as vscode from 'vscode';
import { QuickPickItem } from '../models/quickPickItem';
import { Testable } from '../models/testable';
import { TestableProvider } from './testableProvider';
const { displayName } = require('../../package.json');

const testPatternsHistory: QuickPickItem[] = [];
const historyIcon = '$(timeline-open) ';

export const quickPickCommandHandler = async (param: any) => {
	const quickPick = createQuickPick();
	quickPick.show();
	quickPick.onDidHide(() => {
		quickPick.dispose();
	});
	quickPick.onDidAccept(() => {
		let userValue: QuickPickItem | null = null;
		const pick = quickPick.selectedItems[0];
		if (pick) {
			userValue = pick;
			// @refactor //not_found
			if (userValue.details === 'not_found') {
				// @i: force using input text
				userValue = null;
			}
		}
		const inputValue = quickPick.value;
		if (!pick && inputValue && inputValue.length > 0) {
			userValue = new QuickPickItem(inputValue);
		}
		if (userValue !== null) {
			saveAndRunUserInput(userValue);
		}
		quickPick.dispose();
	});

	// quickPick.ignoreFocusOut = true;

	const testableProvider = new TestableProvider();
	const testableItems = await testableProvider.getTestable();

	let quickPickItems: QuickPickItem[] = createPickItems(testableItems);
	// @refactor: refactor case when no testable items found.
	if (quickPickItems.length === 0) {
		quickPickItems = createPickItems([
			new Testable(
				'Did not found any tests, but you can still type the name.',
				'',
				'not_found'
			)
		]);
	}
	const itemsWithHistory = testPatternsHistory
		.map((histItem) => new QuickPickItem(historyIcon + histItem.label))
		.concat(quickPickItems);
	quickPick.items = itemsWithHistory;
	quickPick.busy = false;
};

export const getTerminal = (name: string): vscode.Terminal => {
	let terminal = vscode.window.terminals.find((terminal) => terminal.name === name);
	if (terminal) {
		return terminal;
	}
	return vscode.window.createTerminal(name);
};

export const userInputCommandHandler = async () => {
	const pick = await vscode.window.showInputBox({
		prompt: 'Type the test name or name pattern.'
	});

	if (pick) {
		saveAndRunUserInput(pick);
	}
};

const createPickItems = (options: Testable[]) => {
	const quickPickItems: QuickPickItem[] = options.map((option) => {
		return new QuickPickItem(option.label, option.jestMethod, option.source);
	});
	return quickPickItems;
};

export const createQuickPick = (): vscode.QuickPick<vscode.QuickPickItem> => {
	const quickPick = vscode.window.createQuickPick();
	quickPick.busy = true;
	quickPick.matchOnDescription = true;
	quickPick.matchOnDetail = true;
	quickPick.title = `${displayName} - quick pick.`;
	quickPick.items = testPatternsHistory.map(
		(pattern) =>
			new QuickPickItem(
				historyIcon + pattern.label,
				pattern.description,
				pattern.details
			)
	);
	return quickPick;
};

const executeCommand = (
	terminal: vscode.Terminal,
	command: string
): vscode.Disposable => {
	terminal.show();
	const handler = vscode.window.onDidCloseTerminal((ev) => {
		if (ev.exitStatus !== undefined && ev.processId === terminal.processId) {
			handler.dispose();
			terminal.dispose();
		}
	});
	terminal.sendText(command);

	return handler;
};

const saveAndRunUserInput = (userInput: string | QuickPickItem) => {
	const pickItem =
		typeof userInput === 'string'
			? new QuickPickItem(userInput)
			: new QuickPickItem(
					userInput.label,
					userInput.description,
					userInput.details
			  );

	addLastPickedItem(pickItem);
	runJestTestsByNamePattern(pickItem.label);
};

const runJestTestsByNamePattern = (namePattern: string) => {
	const terminal = getTerminal(displayName);
	let command = `jest --testNamePattern="${namePattern}" `;

	executeCommand(terminal, command);
};

const addLastPickedItem = (pickItem: QuickPickItem) => {
	const newPatternIdx = testPatternsHistory.findIndex(
		(x) => x.label === pickItem.label
	);
	if (newPatternIdx >= 0) {
		testPatternsHistory.splice(newPatternIdx, 1);
	}

	testPatternsHistory.unshift(pickItem);
	if (testPatternsHistory.length > 3) {
		testPatternsHistory.pop();
	}
};
