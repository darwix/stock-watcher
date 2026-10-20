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

	it('sets, clears and persists positions and fees', () => {
		const storage = memoryStorage();
		const p = new Portfolio(storage);
		p.setPosition('BBRI.JK', { price: 3650, lot: 20 });
		p.setFees({ buy: 0.1, sell: 0.2 });
		const reloaded = new Portfolio(storage);
		expect(reloaded.positions).toEqual({ 'BBRI.JK': { price: 3650, lot: 20 } });
		expect(reloaded.fees).toEqual({ buy: 0.1, sell: 0.2 });
		reloaded.setPosition('BBRI.JK', null);
		expect(new Portfolio(storage).positions).toEqual({});
	});

	it('survives corrupt or missing storage', () => {
		const p = new Portfolio(memoryStorage({ portfolio: '{oops' }));
		expect(p.positions).toEqual({});
		expect(new Portfolio(undefined).fees).toEqual({ buy: 0.15, sell: 0.25 });
	});
});
