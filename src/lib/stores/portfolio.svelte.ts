import type { Fees, Trade } from '#lib/models/stock.ts';
import { ledger } from '#lib/utils/position.ts';
import { load, save, type Storage } from '#lib/utils/storage.ts';

const KEY = 'portfolio';

type Saved = {
	trades?: Trade[];
	fees?: Fees;
	/** pre-history format */
	positions?: Record<string, { price: number; lot: number }>;
};

export class Portfolio {
	trades = $state<Trade[]>([]);
	fees = $state<Fees>({ buy: 0.15, sell: 0.25 });
	book = $derived(ledger(this.trades));

	constructor(private storage: Storage | undefined) {
		const saved = load(storage, KEY) as Saved | undefined;
		if (saved?.fees) this.fees = saved.fees;
		if (saved?.trades) this.trades = saved.trades;
		else if (saved?.positions) {
			const date = new Intl.DateTimeFormat('sv', { timeZone: 'Asia/Jakarta' }).format();
			this.trades = Object.entries(saved.positions).map(([symbol, p], i) => ({
				id: i + 1,
				date,
				symbol,
				side: 'buy',
				price: p.price,
				lot: p.lot,
				fee: this.fees.buy
			}));
		}
	}

	/** error message, or undefined on success */
	addTrade(t: Omit<Trade, 'id' | 'fee'>) {
		const id = Math.max(0, ...this.trades.map((x) => x.id)) + 1;
		return this.commit([...this.trades, { ...t, id, fee: this.fees[t.side] }]);
	}

	/** error message, or undefined on success; keeps the trade's original fee */
	updateTrade(id: number, t: Omit<Trade, 'id' | 'fee'>) {
		return this.commit(this.trades.map((x) => (x.id === id ? { ...x, ...t } : x)));
	}

	/** error message, or undefined on success */
	removeTrade(id: number) {
		return this.commit(this.trades.filter((t) => t.id !== id));
	}

	setFees(fees: Fees) {
		this.fees = fees;
		this.save();
	}

	private commit(trades: Trade[]) {
		try {
			ledger(trades);
		} catch (e) {
			return (e as Error).message;
		}
		this.trades = trades;
		this.save();
	}

	private save() {
		save(this.storage, KEY, { trades: this.trades, fees: this.fees });
	}
}
