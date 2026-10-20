import type { Fees, Position } from '#lib/models/stock.ts';

const SHARES_PER_LOT = 100;

// IDX price fractions
const tick = (p: number) => (p < 200 ? 1 : p < 500 ? 2 : p < 2000 ? 5 : p < 5000 ? 10 : 25);

/** round up to the next valid IDX price */
export function ceilTick(p: number): number {
	const up = Math.ceil(p / tick(p)) * tick(p);
	// crossing into a coarser band: re-round with that band's tick
	return Math.ceil(p / tick(up)) * tick(up);
}

export function calcPosition(pos: Position, live: number, fees: Fees) {
	const shares = pos.lot * SHARES_PER_LOT;
	const sellKeep = 1 - fees.sell / 100;
	const cost = pos.price * shares * (1 + fees.buy / 100);
	const value = live * shares * sellKeep;
	const pl = value - cost;
	return { cost, value, pl, pct: (pl / cost) * 100, bep: ceilTick(cost / (shares * sellKeep)) };
}

export function sumPositions(items: { cost: number; value: number }[]) {
	const cost = items.reduce((a, c) => a + c.cost, 0);
	const value = items.reduce((a, c) => a + c.value, 0);
	return { cost, value, pl: value - cost, pct: ((value - cost) / cost) * 100 };
}
