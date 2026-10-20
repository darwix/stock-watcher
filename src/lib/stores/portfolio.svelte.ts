import type { Fees, Position } from '#lib/models/stock.ts';
import { load, save, type Storage } from '#lib/utils/storage.ts';

const KEY = 'portfolio';

export class Portfolio {
	positions = $state<Record<string, Position>>({});
	fees = $state<Fees>({ buy: 0.15, sell: 0.25 });

	constructor(private storage: Storage | undefined) {
		const saved = load(storage, KEY) as
			{ positions?: Record<string, Position>; fees?: Fees } | undefined;
		if (saved?.positions) this.positions = saved.positions;
		if (saved?.fees) this.fees = saved.fees;
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
		save(this.storage, KEY, { positions: this.positions, fees: this.fees });
	}
}
