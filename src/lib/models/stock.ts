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
