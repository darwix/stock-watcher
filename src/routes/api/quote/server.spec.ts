import { describe, it, expect, vi } from 'vitest';
import chartBbca from '../../../../mocks/yahoo/chart-bbca.json';
import chartNotFound from '../../../../mocks/yahoo/chart-notfound.json';
import { GET } from './+server';

const call = (qs: string, fetch: typeof globalThis.fetch) =>
	GET({ url: new URL(`http://x/api/quote?${qs}`), fetch } as never);

describe('GET /api/quote', () => {
	it('returns quotes keyed by symbol, null for unknown, error for failures', async () => {
		const fetch = vi.fn(async (url: string | URL | Request) => {
			const u = String(url);
			if (u.includes('BBCA.JK')) return new Response(JSON.stringify(chartBbca));
			if (u.includes('FAIL.JK')) return new Response('', { status: 500 });
			return new Response(JSON.stringify(chartNotFound), { status: 404 });
		});
		const res = await call('symbols=BBCA.JK,ZZZZ.JK,FAIL.JK', fetch as never);
		const body = await res.json();
		expect(body['BBCA.JK'].price).toBe(4980);
		expect(body['ZZZZ.JK']).toBeNull();
		expect(body['FAIL.JK']).toEqual({ error: true });
	});

	it('rejects bad symbols', async () => {
		const res = await Promise.resolve(call('symbols=../evil', vi.fn() as never)).catch(
			(e: Response) => e
		);
		expect(res.status).toBe(400);
	});
});
