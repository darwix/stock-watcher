import { describe, it, expect } from 'vitest';
import { isMarketOpen } from './market';

// Jakarta is UTC+7, so 09:00 WIB = 02:00Z
describe('isMarketOpen', () => {
	it.each([
		['2026-10-20T01:59:00Z', false], // Tue 08:59 WIB
		['2026-10-20T02:00:00Z', true], // Tue 09:00 WIB
		['2026-10-20T08:59:00Z', true], // Tue 15:59 WIB
		['2026-10-20T09:00:00Z', false], // Tue 16:00 WIB
		['2026-10-24T03:00:00Z', false], // Sat
		['2026-10-25T03:00:00Z', false] // Sun
	])('%s -> %s', (iso, open) => {
		expect(isMarketOpen(new Date(iso))).toBe(open);
	});
});
