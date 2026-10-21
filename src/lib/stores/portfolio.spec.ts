import { describe, it, expect } from 'vitest';
import { Portfolio } from './portfolio.svelte';

const memoryStorage = (init: Record<string, string> = {}) => {
	const data = { ...init };
	return {
		data,
		getItem: (k: string) => data[k] ?? null,
		setItem: (k: string, v: string) => void (data[k] = v)
	};
};

describe('Portfolio', () => {
	it('defaults fees to 0.15 / 0.25', () => {
		expect(new Portfolio(memoryStorage()).fees).toEqual({ buy: 0.15, sell: 0.25 });
	});

	it('adds trades with current fee, persists, and derives holdings', () => {
		const storage = memoryStorage();
		const p = new Portfolio(storage);
		const trade = { date: '2026-10-01', symbol: 'BBRI.JK', price: 3650, lot: 20 };
		expect(p.addTrade({ ...trade, side: 'buy' })).toBeUndefined();
		p.setFees({ buy: 0.1, sell: 0.2 });
		const reloaded = new Portfolio(storage);
		expect(reloaded.trades[0]).toMatchObject({ ...trade, side: 'buy', fee: 0.15 });
		expect(reloaded.fees).toEqual({ buy: 0.1, sell: 0.2 });
		expect(reloaded.book.holdings['BBRI.JK'].lot).toBe(20);
		reloaded.addTrade({ ...trade, date: '2026-10-02', side: 'sell', lot: 5 });
		expect(reloaded.trades[1].fee).toBe(0.2);
		expect(reloaded.book.realized).not.toBe(0);
	});

	it('rejects oversell and deletes that break later sells', () => {
		const p = new Portfolio(memoryStorage());
		const base = { symbol: 'A', price: 1000 };
		p.addTrade({ ...base, date: '2026-10-01', side: 'buy', lot: 5 });
		expect(p.addTrade({ ...base, date: '2026-10-02', side: 'sell', lot: 6 })).toMatch(/5 lot/);
		expect(p.trades).toHaveLength(1);
		p.addTrade({ ...base, date: '2026-10-02', side: 'sell', lot: 5 });
		expect(p.removeTrade(p.trades[0].id)).toBeTruthy();
		expect(p.trades).toHaveLength(2);
		expect(p.removeTrade(p.trades[1].id)).toBeUndefined();
		expect(p.trades).toHaveLength(1);
	});

	it('edits a trade in place, keeping its fee, and rejects oversell edits', () => {
		const p = new Portfolio(memoryStorage());
		const base = { symbol: 'A', price: 1000 };
		p.addTrade({ ...base, date: '2026-10-01', side: 'buy', lot: 5 });
		p.addTrade({ ...base, date: '2026-10-02', side: 'sell', lot: 5 });
		p.setFees({ buy: 0.5, sell: 0.5 });
		const [buy] = p.trades;
		expect(
			p.updateTrade(buy.id, { ...base, date: '2026-10-01', side: 'buy', lot: 8, price: 900 })
		).toBeUndefined();
		expect(p.trades[0]).toMatchObject({ id: buy.id, lot: 8, price: 900, fee: 0.15 });
		expect(p.book.holdings.A.lot).toBe(3);
		expect(p.updateTrade(buy.id, { ...base, date: '2026-10-01', side: 'buy', lot: 4 })).toMatch(
			/4 lot/
		);
		expect(p.trades[0].lot).toBe(8);
	});

	it('uses the current fee of the new side when an edit flips buy/sell', () => {
		const p = new Portfolio(memoryStorage());
		const base = { symbol: 'A', price: 1000, date: '2026-10-01' };
		p.addTrade({ ...base, side: 'buy', lot: 10 });
		p.addTrade({ ...base, side: 'buy', lot: 5 });
		const id = p.trades[1].id;
		p.updateTrade(id, { ...base, side: 'sell', lot: 5 });
		expect(p.trades[1]).toMatchObject({ side: 'sell', fee: 0.25 });
	});

	it('migrates old positions into buy trades', () => {
		const old = JSON.stringify({
			positions: { 'BBRI.JK': { price: 3650, lot: 20 } },
			fees: { buy: 0.1, sell: 0.2 }
		});
		const p = new Portfolio(memoryStorage({ portfolio: old }));
		expect(p.trades).toEqual([
			expect.objectContaining({ symbol: 'BBRI.JK', side: 'buy', price: 3650, lot: 20, fee: 0.1 })
		]);
	});

	it('persists profit goal, 0 = none', () => {
		const storage = memoryStorage();
		expect(new Portfolio(storage).goal).toBe(0);
		new Portfolio(storage).setGoal(5_000_000);
		expect(new Portfolio(storage).goal).toBe(5_000_000);
	});

	it('survives corrupt or missing storage', () => {
		const p = new Portfolio(memoryStorage({ portfolio: '{oops' }));
		expect(p.trades).toEqual([]);
		expect(new Portfolio(undefined).fees).toEqual({ buy: 0.15, sell: 0.25 });
	});
});
