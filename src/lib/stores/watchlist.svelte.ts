type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;

const KEY = 'watchlist';

export class Watchlist {
	symbols = $state<string[]>([]);

	constructor(private storage: Storage | undefined) {
		try {
			const saved = JSON.parse(storage?.getItem(KEY) ?? '[]');
			if (Array.isArray(saved)) this.symbols = saved;
		} catch {
			// corrupt storage: start empty
		}
	}

	add(symbol: string) {
		if (this.symbols.includes(symbol)) return;
		this.symbols = [...this.symbols, symbol];
		this.save();
	}

	remove(symbol: string) {
		this.symbols = this.symbols.filter((s) => s !== symbol);
		this.save();
	}

	private save() {
		try {
			this.storage?.setItem(KEY, JSON.stringify(this.symbols));
		} catch {
			// storage full/blocked: keep in memory
		}
	}
}
