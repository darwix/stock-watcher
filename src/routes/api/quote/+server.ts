import { error, json } from '@sveltejs/kit';
import { createQuoteFetcher } from '#lib/services/yahoo.ts';
import type { QuoteResult } from '#lib/models/stock.ts';
import type { RequestHandler } from './$types';

const getQuote = createQuoteFetcher();
const SYMBOL = /^[A-Z0-9-]{1,10}\.JK$/;

export const GET: RequestHandler = async ({ url, fetch }) => {
	const symbols = (url.searchParams.get('symbols') ?? '').split(',').filter(Boolean);
	if (symbols.length > 50 || !symbols.every((s) => SYMBOL.test(s))) error(400, 'bad symbols');

	const entries = await Promise.all(
		symbols.map(async (s): Promise<[string, QuoteResult]> => {
			try {
				return [s, await getQuote(s, fetch)];
			} catch {
				return [s, { error: true }];
			}
		})
	);
	return json(Object.fromEntries(entries));
};
