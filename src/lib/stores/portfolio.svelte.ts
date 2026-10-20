import type { Fees, Position } from '#lib/models/stock.ts';

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;

const KEY = 'portfolio';

export class Portfolio {
	positions = $state<Record<string, Position>>({});
	fees = $state<Fees>({ buy: 0.15, sell: 0.25 });

	constructor(private storage: Storage | undefined) {
		try {
			const saved = JSON.parse(storage?.getItem(KEY) ?? '{}');
			if (saved.positions) this.positions = saved.positions;
			if (saved.fees) this.fees = saved.fees;
		} catch {
			// corrupt storage: start with defaults
		}
	}

	setPosition(symbol: string, pos: Position | null) {
		if (pos) this.positions[symbol] = pos;
		else delete this.positions[symbol];
		this.save();
	}

	setFees(fees: Fees) {
		this.fees = fees;
		this.save();
	}

	private save() {
		try {
			this.storage?.setItem(KEY, JSON.stringify({ positions: this.positions, fees: this.fees }));
		} catch {
			// storage full/blocked: keep in memory
		}
	}
}
