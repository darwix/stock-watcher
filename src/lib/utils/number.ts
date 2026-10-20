export const fmt = new Intl.NumberFormat('id-ID');
export const sgn = (n: number) => (n > 0 ? '+' : '');

/** "12.500" -> 12500; non-digits ignored */
export const parseDigits = (v: string) => +v.replace(/\D/g, '');

/** reformat with thousands dots, keeping the caret after the same digit */
export function groupDigits(raw: string, caret: number) {
	const digitsBefore = raw.slice(0, caret).replace(/\D/g, '').replace(/^0+/, '').length;
	const digits = raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
	const value = digits ? fmt.format(+digits) : '';
	let pos = 0;
	for (let seen = 0; pos < value.length && seen < digitsBefore; pos++)
		if (/\d/.test(value[pos])) seen++;
	return { value, caret: pos };
}
