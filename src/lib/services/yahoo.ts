import type { Quote, SearchResult } from '#lib/models/stock.ts';

// ponytail: unofficial Yahoo endpoints, no key. Swap to GoAPI.id if Yahoo starts blocking.
const BASE = 'https://query1.finance.yahoo.com';
const HEADERS = { 'User-Agent': 'Mozilla/5.0' };

type Fetch = typeof fetch;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseChart(json: any): Quote | null {
	const meta = json?.chart?.result?.[0]?.meta;
	if (!meta) return null;
	const prev = meta.chartPreviousClose;
	const change = meta.regularMarketPrice - prev;
	return {
		symbol: meta.symbol,
		name: meta.longName ?? meta.shortName ?? meta.symbol,
		price: meta.regularMarketPrice,
		change,
		changePercent: (change / prev) * 100,
		time: meta.regularMarketTime * 1000
	};
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseSearch(json: any): SearchResult[] {
	return (json?.quotes ?? [])
		.filter(
			(q: { symbol?: string; quoteType?: string }) =>
				q.symbol?.endsWith('.JK') && q.quoteType === 'EQUITY'
		)
		.map((q: { symbol: string; shortname?: string; longname?: string }) => ({
			symbol: q.symbol,
			name: q.shortname ?? q.longname ?? q.symbol
		}));
}

// ponytail: in-memory cache per server instance; fine for one user
export function createQuoteFetcher(ttl = 10_000, now = Date.now) {
	const cache = new Map<string, { at: number; quote: Quote | null }>();
	return async (symbol: string, fetch: Fetch): Promise<Quote | null> => {
		const hit = cache.get(symbol);
		if (hit && now() - hit.at < ttl) return hit.quote;
		const res = await fetch(
			`${BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
			{
				headers: HEADERS
			}
		);
		if (!res.ok && res.status !== 404) throw new Error(`Yahoo ${res.status}`);
		const quote = parseChart(await res.json());
		cache.set(symbol, { at: now(), quote });
		return quote;
	};
}

export async function search(q: string, fetch: Fetch): Promise<SearchResult[]> {
	const res = await fetch(
		`${BASE}/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=20&newsCount=0`,
		{ headers: HEADERS }
	);
	if (!res.ok) throw new Error(`Yahoo ${res.status}`);
	return parseSearch(await res.json());
}
