import { describe, it, expect, vi } from 'vitest';
import chartBbca from '../../../mocks/yahoo/chart-bbca.json';
import chartNotFound from '../../../mocks/yahoo/chart-notfound.json';
import searchTelkom from '../../../mocks/yahoo/search-telkom.json';
import { parseChart, parseSearch, createQuoteFetcher } from './yahoo';

describe('parseChart', () => {
	it('maps a chart response to a quote', () => {
		expect(parseChart(chartBbca)).toEqual({
			symbol: 'BBCA.JK',
			name: 'PT Bank Central Asia Tbk',
			price: 4980,
			change: 160,
			changePercent: (160 / 4820) * 100,
			time: 1792465205 * 1000
		});
	});

	it('returns null for unknown symbols', () => {
		expect(parseChart(chartNotFound)).toBeNull();
	});
});

describe('parseSearch', () => {
	it('keeps only Jakarta equities', () => {
		const results = parseSearch(searchTelkom);
		expect(results.length).toBeGreaterThan(0);
		expect(results.every((r) => r.symbol.endsWith('.JK'))).toBe(true);
		expect(results[0]).toEqual({ symbol: 'TLKM.JK', name: 'Telkom Indonesia (Persero) Tbk.' });
	});
});

describe('createQuoteFetcher', () => {
	const okFetch = () => vi.fn(async () => new Response(JSON.stringify(chartBbca), { status: 200 }));

	it('caches a symbol for the ttl', async () => {
		let now = 0;
		const fetch = okFetch();
		const getQuote = createQuoteFetcher(10_000, () => now);
		await getQuote('BBCA.JK', fetch);
		now = 9_000;
		await getQuote('BBCA.JK', fetch);
		expect(fetch).toHaveBeenCalledTimes(1);
		now = 11_000;
		await getQuote('BBCA.JK', fetch);
		expect(fetch).toHaveBeenCalledTimes(2);
	});

	it('returns null when yahoo says not found', async () => {
		const fetch = vi.fn(async () => new Response(JSON.stringify(chartNotFound), { status: 404 }));
		expect(await createQuoteFetcher()('ZZZZ.JK', fetch)).toBeNull();
	});

	it('throws on upstream failure', async () => {
		const fetch = vi.fn(async () => new Response('blocked', { status: 429 }));
		await expect(createQuoteFetcher()('BBCA.JK', fetch)).rejects.toThrow('429');
	});
});
