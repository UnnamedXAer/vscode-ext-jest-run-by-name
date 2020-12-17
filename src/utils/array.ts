export const getArraysUnion = <T>(arr1: T[], arr2: T[]): T[] => {
	const output: T[] = [...arr1];
	for (let lenArr2 = arr2.length, i = lenArr2 - 1; i >= 0; i--) {
		if (output.indexOf(arr2[i]) === -1) {
			output.push(arr2[i]);
		}
	}

	return output;
};
