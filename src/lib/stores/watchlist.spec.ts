import { describe, it, expect } from 'vitest';
import { Watchlist } from './watchlist.svelte';

const memoryStorage = (init: Record<string, string> = {}) => {
	const data = { ...init };
	return {
		data,
		getItem: (k: string) => data[k] ?? null,
		setItem: (k: string, v: string) => void (data[k] = v)
	};
};

describe('Watchlist', () => {
	it('adds in order, ignores duplicates, persists', () => {
		const storage = memoryStorage();
		const list = new Watchlist(storage);
		list.add('BBCA.JK');
		list.add('TLKM.JK');
		list.add('BBCA.JK');
		expect(list.symbols).toEqual(['BBCA.JK', 'TLKM.JK']);
		expect(JSON.parse(storage.data.watchlist)).toEqual(['BBCA.JK', 'TLKM.JK']);
	});

	it('removes and loads saved list', () => {
		const storage = memoryStorage({ watchlist: '["BBCA.JK","TLKM.JK"]' });
		const list = new Watchlist(storage);
		list.remove('BBCA.JK');
		expect(list.symbols).toEqual(['TLKM.JK']);
	});

	it('survives corrupt or missing storage', () => {
		expect(new Watchlist(memoryStorage({ watchlist: '{oops' })).symbols).toEqual([]);
		expect(new Watchlist(undefined).symbols).toEqual([]);
	});
});
