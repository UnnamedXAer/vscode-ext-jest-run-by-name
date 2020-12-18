export const getArraysUnion = <T>(arr1: T[], arr2: T[], prop?: keyof T): T[] => {
	const output: T[] = [...arr1];
	if (arr2.length === 0) {
		return output;
	}

	if (typeof arr2[0] === 'string') {
		for (let lenArr2 = arr2.length, i = lenArr2 - 1; i >= 0; i--) {
			if (output.indexOf(arr2[i]) === -1) {
				output.push(arr2[i]);
			}
		}
	} else {
		if (!prop) {
			throw new Error(
				'The "prop" parameter must not be nullish when T is and object.'
			);
		}
		for (let lenArr2 = arr2.length, i = lenArr2 - 1; i >= 0; i--) {
			if (output.findIndex((x) => x[prop] === arr2[i][prop]) === -1) {
				output.push(arr2[i]);
			}
		}
	}
	return output;
};
