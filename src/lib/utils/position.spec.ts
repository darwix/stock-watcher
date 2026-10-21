import { describe, it, expect } from 'vitest';
import { ceilTick, calcPosition, ledger, sellScenarios } from './position';
import type { Trade } from '#lib/models/stock.ts';

let id = 0;
const t = (
	side: Trade['side'],
	price: number,
	lot: number,
	date = '2026-10-01',
	symbol = 'BBCA.JK'
): Trade => ({
	id: ++id,
	date,
	symbol,
	side,
	price,
	lot,
	fee: side === 'buy' ? 0.15 : 0.25
});

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
		const c = calcPosition({ lot: 20, cost: 7_310_950 }, 3870, 0.25);
		expect(c.cost).toBeCloseTo(7_310_950);
		expect(c.value).toBeCloseTo(7_720_650);
		expect(c.pl).toBeCloseTo(409_700);
		expect(c.pct).toBeCloseTo((409_700 / 7_310_950) * 100);
		expect(c.bep).toBe(3670);
	});

	it('is a loss at buy price because of fees', () => {
		const c = calcPosition({ lot: 1, cost: 100_150 }, 1000, 0.25);
		expect(c.pl).toBeLessThan(0);
		expect(c.bep).toBeGreaterThan(1000);
	});
});

describe('ledger', () => {
	it('averages cost across buys, buy fee included', () => {
		const l = ledger([t('buy', 9200, 10), t('buy', 9600, 10)]);
		expect(l.holdings['BBCA.JK'].lot).toBe(20);
		expect(l.holdings['BBCA.JK'].cost).toBeCloseTo((9200 + 9600) * 1000 * 1.0015);
		expect(l.realized).toBe(0);
	});

	it('realizes sells against average cost, net of sell fee', () => {
		const sell = t('sell', 10100, 8, '2026-10-05');
		const l = ledger([t('buy', 9200, 10), t('buy', 9600, 10), sell]);
		const avg = ((9200 + 9600) * 1000 * 1.0015) / 2000;
		const r = 10100 * 800 * 0.9975 - avg * 800;
		expect(l.realized).toBeCloseTo(r);
		expect(l.realizedById[sell.id]).toBeCloseTo(r);
		expect(l.holdings['BBCA.JK'].lot).toBe(12);
		expect(l.holdings['BBCA.JK'].cost).toBeCloseTo(avg * 1200);
	});

	it('orders by date, not insertion', () => {
		const l = ledger([t('sell', 1100, 5, '2026-10-02'), t('buy', 1000, 5, '2026-10-01')]);
		expect(l.holdings['BBCA.JK'].lot).toBe(0);
		expect(l.realized).toBeCloseTo(1100 * 500 * 0.9975 - 1000 * 500 * 1.0015);
	});

	it('keeps symbols separate and sums realized', () => {
		const l = ledger([
			t('buy', 1000, 1, '2026-10-01', 'A'),
			t('buy', 2000, 1, '2026-10-01', 'B'),
			t('sell', 1000, 1, '2026-10-02', 'A')
		]);
		expect(l.holdings.B.lot).toBe(1);
		expect(l.holdings.A.lot).toBe(0);
		expect(l.realized).toBeLessThan(0);
	});

	it('throws when selling more than held at that date', () => {
		expect(() =>
			ledger([t('buy', 1000, 5, '2026-10-02'), t('sell', 1000, 5, '2026-10-01')])
		).toThrow();
		expect(() => ledger([t('buy', 1000, 5), t('sell', 1000, 6, '2026-10-02')])).toThrow();
	});
});

describe('sellScenarios', () => {
	const fees = { buy: 0.15, sell: 0.25 };
	const rows = sellScenarios(8750, 20, 9400, fees);
	const by = (kind: string) => rows.find((r) => r.kind === kind)!;

	it('snaps ladder prices to the IDX tick', () => {
		expect(rows.filter((r) => r.kind === 'ladder').map((r) => r.price)).toEqual([
			10500, 9625, 9200, 8925, 8750, 8575, 8325, 7875
		]);
	});

	it('marks the lowest tick price that does not lose money', () => {
		expect(by('be').price).toBe(8800);
		expect(by('be').profit).toBeCloseTo(29750);
	});

	it('nets both fees out of the target row', () => {
		expect(by('target')).toMatchObject({ price: 9400, gross: 18_800_000 });
		expect(by('target').profit).toBeCloseTo(1_226_750);
		expect(by('target').pct).toBeCloseTo(7.0, 2);
	});

	it('sorts by price, highest first, and omits an empty target', () => {
		const r = sellScenarios(8750, 20, 0, fees);
		expect(r.some((x) => x.kind === 'target')).toBe(false);
		expect(r.map((x) => x.price)).toEqual([...r.map((x) => x.price)].sort((a, b) => b - a));
	});
});
