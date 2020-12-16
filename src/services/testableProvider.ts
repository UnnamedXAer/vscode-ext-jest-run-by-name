import * as vscode from 'vscode';
import { Testable } from '../models/testable';
import { TestableType } from '../types/types';

// @improvement: cache file & testable
// @improvement: update files & testable on file change only
export class TestableProvider {
	protected readonly defaultJestMatchTestsGlobPatterns: vscode.GlobPattern[] = [
		'**/__tests__/**/*.[jt]s?(x)',
		'**/?(*.)+(spec|test).[tj]s?(x)'
		// '**/__tests__/**/*.test.ts'
	];

	async getTestable() {
		const matchTestsGlobPatterns = await this.getMatchTestsGlobPatterns();
		const files = await this.findTestFiles(matchTestsGlobPatterns);
		const testable = await this.findsTestable(files);
		return testable;
	}

	async getMatchTestsGlobPatterns(): Promise<vscode.GlobPattern[]> {
		const jestConfigPatterns = await this.getJestConfigPatterns();
		if (jestConfigPatterns !== null) {
			if (Array.isArray(jestConfigPatterns.testMatch)) {
				return [...jestConfigPatterns.testMatch];
			}

			if (typeof jestConfigPatterns.testMatch === 'string') {
				return [...jestConfigPatterns.testMatch];
			}
		}
		return this.defaultJestMatchTestsGlobPatterns;
	}

	protected async getJestConfigPatterns(): Promise<{
		testMatch: vscode.GlobPattern[];
		source: string;
	} | null> {
		// @todo: check package.json for the "jest" config
		const jestConfigFilesUri = await vscode.workspace.findFiles(
			'jest.config.*s',
			'**​/node_modules/**'
		);

		for (let len = jestConfigFilesUri.length, i = len - 1; i >= 0; i--) {
			const testMatch = this.getTestMatchFromJestConfig(
				jestConfigFilesUri[i].fsPath
			);
			if (testMatch) {
				return {
					testMatch: typeof testMatch === 'string' ? [testMatch] : testMatch,
					source: jestConfigFilesUri[i].fsPath
				};
			}
		}

		return null;
	}

	protected getTestMatchFromJestConfig(path: string): string | string[] | null {
		const jestConfig = require(path);
		return (jestConfig.testMatch as string[] | string) || null;
	}

	protected async findTestFiles(
		matchTestsGlobPatterns: vscode.GlobPattern[]
	): Promise<vscode.Uri[]> {
		const testFilesUris: vscode.Uri[] = [];
		const workspaceName = vscode.workspace.name;
		if (workspaceName === undefined) {
			throw new Error('No active workspace.');
		}
		for (let i = 0; i < matchTestsGlobPatterns.length; i++) {
			const currentPattern = /*workspaceName + '/' +*/ matchTestsGlobPatterns[i];
			const patternTestFilesUris = await vscode.workspace.findFiles(
				currentPattern,
				'**/node_modules/**'
			);
			testFilesUris.push(...patternTestFilesUris);
		}
		// @todo: remove duplicates.
		return testFilesUris;
	}

	protected async findsTestable(fileUris: vscode.Uri[]): Promise<Testable[]> {
		const testable: Testable[] = [];
		for (
			let len = fileUris.length, fileIndex = len - 1;
			fileIndex >= 0;
			fileIndex--
		) {
			const text = (
				await vscode.workspace.fs.readFile(fileUris[fileIndex])
			).toString();

			const pattern = /(it|test|description)(\s|\t|\n|\r|)*\(('|").+\3,/gim;

			const matches = text.match(pattern);
			if (matches !== null) {
				for (let matchIndex = 0; matchIndex < matches.length; matchIndex++) {
					const match = matches[matchIndex];
					const parenthesiseIdx = match.indexOf('(');
					const type = match.slice(0, parenthesiseIdx) as TestableType;
					const label = match.slice(parenthesiseIdx + 2, -2);
					testable.push(new Testable(label, type));
				}
			}
		}
		return testable;
	}
}
