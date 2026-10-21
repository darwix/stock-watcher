import type { Fees, Holding, Trade } from '#lib/models/stock.ts';

const SHARES_PER_LOT = 100;

// IDX price fractions
const tick = (p: number) => (p < 200 ? 1 : p < 500 ? 2 : p < 2000 ? 5 : p < 5000 ? 10 : 25);
const roundTick = (p: number) => Math.round(p / tick(p)) * tick(p);

/** round up to the next valid IDX price */
export function ceilTick(p: number): number {
	const up = Math.ceil(p / tick(p)) * tick(p);
	// crossing into a coarser band: re-round with that band's tick
	return Math.ceil(p / tick(up)) * tick(up);
}

/** unrealized result of selling a holding at live price */
export function calcPosition({ lot, cost }: Holding, live: number, sellFee: number) {
	const shares = lot * SHARES_PER_LOT;
	const sellKeep = 1 - sellFee / 100;
	const value = live * shares * sellKeep;
	const pl = value - cost;
	return { cost, value, pl, pct: (pl / cost) * 100, bep: ceilTick(cost / (shares * sellKeep)) };
}

/** replays trades by date with average-cost basis; throws on selling more than held */
export function ledger(trades: Trade[]) {
	const holdings: Record<string, Holding> = {};
	const realizedById: Record<number, number> = {};
	let realized = 0;
	const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
	for (const t of sorted) {
		const h = (holdings[t.symbol] ??= { lot: 0, cost: 0 });
		const amount = t.price * t.lot * SHARES_PER_LOT;
		if (t.side === 'buy') {
			h.lot += t.lot;
			h.cost += amount * (1 + t.fee / 100);
			continue;
		}
		if (t.lot > h.lot) throw new RangeError(`Only ${h.lot} lot ${t.symbol} held on ${t.date}`);
		const basis = (h.cost / h.lot) * t.lot;
		const r = amount * (1 - t.fee / 100) - basis;
		h.lot -= t.lot;
		h.cost -= basis;
		realized += r;
		realizedById[t.id] = r;
	}
	return { holdings, realized, realizedById };
}

const LADDER = [-10, -5, -2, 0, 2, 5, 10, 20];

/** net result of selling `lot` bought at `buy` across a % ladder, break-even and a target price */
export function sellScenarios(buy: number, lot: number, target: number, fees: Fees) {
	const shares = lot * SHARES_PER_LOT;
	const cost = buy * shares * (1 + fees.buy / 100);
	const row = (price: number, kind: 'ladder' | 'be' | 'target') => {
		const gross = price * shares;
		const profit = gross * (1 - fees.sell / 100) - cost;
		return {
			price,
			kind,
			change: (price / buy - 1) * 100,
			gross,
			profit,
			pct: (profit / cost) * 100
		};
	};
	const rows = LADDER.map((p) => row(roundTick(buy * (1 + p / 100)), 'ladder'));
	rows.push(row(calcPosition({ lot, cost }, buy, fees.sell).bep, 'be'));
	if (target > 0) rows.push(row(target, 'target'));
	return { cost, rows: rows.sort((a, b) => b.price - a.price) };
}
