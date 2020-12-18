export class Testable {
	constructor(
		public label: string,
		public jestMethod: 'test' | 'description' | 'it' | '',
		public source: string
	) {}
}
