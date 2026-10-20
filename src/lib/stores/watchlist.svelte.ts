import { load, save, type Storage } from '#lib/utils/storage.ts';

const KEY = 'watchlist';

export class Watchlist {
	symbols = $state<string[]>([]);

	constructor(private storage: Storage | undefined) {
		const saved = load(storage, KEY);
		if (Array.isArray(saved)) this.symbols = saved;
	}

	add(symbol: string) {
		if (this.symbols.includes(symbol)) return;
		this.symbols = [...this.symbols, symbol];
		save(this.storage, KEY, this.symbols);
	}

	remove(symbol: string) {
		this.symbols = this.symbols.filter((s) => s !== symbol);
		save(this.storage, KEY, this.symbols);
	}
}
