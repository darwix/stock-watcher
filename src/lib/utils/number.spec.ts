import { describe, it, expect } from 'vitest';
import { parseDigits, groupDigits } from './number';

describe('parseDigits', () => {
	it('ignores dots and junk', () => {
		expect(parseDigits('12.500')).toBe(12500);
		expect(parseDigits('1a2')).toBe(12);
		expect(parseDigits('')).toBe(0);
	});
});

describe('groupDigits', () => {
	it('adds thousands dots', () => {
		expect(groupDigits('12500', 5)).toEqual({ value: '12.500', caret: 6 });
	});

	it('keeps caret after the same digit when inserting mid-number', () => {
		// "12.500" with "3" typed after "12" -> "123.500", caret after the 3
		expect(groupDigits('123.500', 3)).toEqual({ value: '123.500', caret: 3 });
		expect(groupDigits('1234.500', 4)).toEqual({ value: '1.234.500', caret: 5 });
	});

	it('drops leading zeros and empties cleanly', () => {
		expect(groupDigits('007', 3)).toEqual({ value: '7', caret: 1 });
		expect(groupDigits('', 0)).toEqual({ value: '', caret: 0 });
	});
});
