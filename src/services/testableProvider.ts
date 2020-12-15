import * as vscode from 'vscode';
import { promises as fs } from 'fs';
import { Testable } from '../models/testable';
export class TestableProvider {
	protected testable: Testable[] = [];
	getTestable() {
		return this.testable;
	}

	protected async getJestConfigPattern() {
		const config = JSON.parse(	(await fs.readFile('jest.config.js')).toString());
	}

	protected async getPattern(pattern?: string | RegExp) {
		if (pattern === undefined) {
		}
	}

	protected async findsTestable(pattern?: string | RegExp) {
		const _pattern = this.getPattern(pattern);
	}
}
