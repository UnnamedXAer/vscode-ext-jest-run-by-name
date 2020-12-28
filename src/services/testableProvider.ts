import * as vscode from 'vscode';
import { Testable } from '../models/testable';
import { TestableType } from '../types/types';
import { getArraysUnion } from '../utils/array';

// @improvement: cache file & testable
// @improvement: update files & testable on file change only
export class TestableProvider {
	protected readonly defaultJestMatchTestsGlobPatterns: string[] = [
		'**/__tests__/**/*.[jt]s?(x)',
		'**/?(*.)+(spec|test).[jt]s?(x)'
	];

	async getTestable() {
		const matchTestsGlobPatterns = await this.getMatchTestsGlobPatterns();
		const filesUri = await this.findTestFiles(matchTestsGlobPatterns);
		const testableItems = await this.findsTestable(filesUri);
		return testableItems;
	}

	async getMatchTestsGlobPatterns(): Promise<string[]> {
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
		testMatch: string[];
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
		matchTestsGlobPatterns: string[]
	): Promise<vscode.Uri[]> {
		let testFilesUris: vscode.Uri[] = [];
		let globTestFilesUris: vscode.Uri[] = [];
		const { name: workspaceName, workspaceFolders } = vscode.workspace;
		if (workspaceName === undefined || workspaceFolders === undefined) {
			throw new Error(`No active workspace${!workspaceFolders ? ' folders' : ''}.`);
		}
		for (let folderIdx = 0; folderIdx < workspaceFolders.length; folderIdx++) {
			const folder = workspaceFolders[folderIdx];

			// - by vscode.workspace.findFiles
			// @info: vscode.workspace.findFiles does not support extended patterns like "?(pattern)"
			// for (
			// 	let patternIdx = 0;
			// 	patternIdx < matchTestsGlobPatterns.length;
			// 	patternIdx++
			// ) {

			// 	const currentPattern = matchTestsGlobPatterns[patternIdx];
			// 	const relativePattern = new vscode.RelativePattern(
			// 		folder.uri.fsPath,
			// 		currentPattern
			// 	);
			// 	const files = await vscode.workspace.findFiles(
			// 		relativePattern,
			// 		'**/dist/**'
			// 	);
			// 	testFilesUris = getArraysUnion<vscode.Uri>(
			// 		testFilesUris,
			// 		files,
			// 		'fsPath'
			// 	);
			// }
			// console.log('by [vscode.workspace.findFiles]', testFilesUris.length);

			// - by npm Glob
			var glob = require('glob');
			for (
				let patternIdx = 0;
				patternIdx < matchTestsGlobPatterns.length;
				patternIdx++
			) {
				const currentPattern = matchTestsGlobPatterns[patternIdx];
				const files: any[] = await new Promise((resolve, reject) => {
					glob(
						currentPattern,
						{
							absolute: true,
							cwd: folder.uri.fsPath,
							// @todo: read ignore patterns
							ignore: ['**/node_modules/**', '**/dist/**']
						},
						function (err: Error, files: any[]) {
							if (err) {
								return reject(err);
							}
							resolve(files);
						}
					);
				});
				globTestFilesUris = getArraysUnion(globTestFilesUris, files);
			}
			console.log('by [npm Glob]', globTestFilesUris.length);
		}

		if (testFilesUris.length === 0) {
			return globTestFilesUris;
		}
		return testFilesUris;
	}

	protected async findsTestable(fileUris: vscode.Uri[]): Promise<Testable[]> {
		const testable: Testable[] = [];
		for (
			let len = fileUris.length, fileIndex = len - 1;
			fileIndex >= 0;
			fileIndex--
		) {
			try {
				// @i: the uri = vscode.Uri.file... is temporary until the findTestFiles function fix
				const uri = vscode.Uri.file((fileUris[fileIndex] as unknown) as string);
				// const uri = fileUris[fileIndex];
				const fileContent = await vscode.workspace.fs.readFile(uri);

				const text = fileContent.toString();

				const pattern = /(it|test|description)(\s|\t|\n|\r|)*\(('|").+\3,/gim;

				const matches = text.match(pattern);
				if (matches !== null) {
					for (let matchIndex = 0; matchIndex < matches.length; matchIndex++) {
						const match = matches[matchIndex];
						const parenthesiseIdx = match.indexOf('(');
						const type = match.slice(0, parenthesiseIdx) as TestableType;
						const label = match.slice(parenthesiseIdx + 2, -2);
						testable.push(new Testable(label, type, uri.fsPath));
					}
				}
			} catch (err) {
				console.warn('ERRR: ', err);
			}
		}
		return testable;
	}
}
