import { describe, it, expect } from 'vitest';
import { ceilTick, calcPosition, sumPositions } from './position';

const fees = { buy: 0.15, sell: 0.25 };

describe('ceilTick', () => {
	it.each([
		[150.2, 151], // Rp1 band
		[201, 202], // Rp2 band
		[501, 505], // Rp5 band
		[2001, 2010], // Rp10 band
		[5001, 5025], // Rp25 band
		[3664.64, 3670],
		[3670, 3670], // already on tick
		[4998, 5000], // crosses into Rp25 band, 5000 is valid
		[1999, 2000] // crosses into Rp10 band
	])('%s -> %s', (p, want) => {
		expect(ceilTick(p)).toBe(want);
	});
});

describe('calcPosition', () => {
	it('matches hand calculation (BBRI 20 lot @ 3650, live 3870)', () => {
		const c = calcPosition({ price: 3650, lot: 20 }, 3870, fees);
		expect(c.cost).toBeCloseTo(7_310_950);
		expect(c.value).toBeCloseTo(7_720_650);
		expect(c.pl).toBeCloseTo(409_700);
		expect(c.pct).toBeCloseTo((409_700 / 7_310_950) * 100);
		expect(c.bep).toBe(3670);
	});

	it('is a loss at buy price because of fees', () => {
		const c = calcPosition({ price: 1000, lot: 1 }, 1000, fees);
		expect(c.pl).toBeLessThan(0);
		expect(c.bep).toBeGreaterThan(1000);
	});
});

describe('sumPositions', () => {
	it('totals cost, value and pl', () => {
		const t = sumPositions([
			{ cost: 100, value: 150 },
			{ cost: 200, value: 180 }
		]);
		expect(t).toEqual({ cost: 300, value: 330, pl: 30, pct: 10 });
	});
});
