export type Quote = {
	symbol: string;
	name: string;
	price: number;
	change: number;
	changePercent: number;
	/** epoch ms of last trade */
	time: number;
};

export type SearchResult = { symbol: string; name: string };

/** null = unknown symbol, { error } = upstream failed this round */
export type QuoteResult = Quote | null | { error: true };

export type Trade = {
	id: number;
	/** yyyy-mm-dd */
	date: string;
	symbol: string;
	side: 'buy' | 'sell';
	price: number;
	lot: number;
	/** fee percent in effect when entered */
	fee: number;
};

/** open lots and their remaining cost, buy fees included */
export type Holding = { lot: number; cost: number };

/** percent, e.g. 0.15 = 0.15% */
export type Fees = { buy: number; sell: number };
