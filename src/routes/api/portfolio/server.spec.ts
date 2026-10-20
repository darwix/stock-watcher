import { describe, it, expect, vi, beforeEach } from 'vitest';

const sql = vi.fn();
vi.mock('#lib/server/db.ts', () => ({ sql }));
vi.mock('#lib/server/auth.ts', () => ({
	userId: async (req: Request) =>
		req.headers.get('authorization') === 'Bearer good' ? 'user-1' : undefined
}));

const { GET, PUT } = await import('./+server');

const req = (token?: string, body?: unknown) =>
	new Request('http://x/api/portfolio', {
		method: body === undefined ? 'GET' : 'PUT',
		headers: token ? { authorization: `Bearer ${token}` } : {},
		body: body === undefined ? undefined : JSON.stringify(body)
	});
const status = (p: Response | Promise<Response>) =>
	Promise.resolve(p)
		.then((r) => r.status)
		.catch((e: Response) => e.status);

beforeEach(() => sql.mockReset());

describe('GET /api/portfolio', () => {
	it('rejects missing or invalid tokens', async () => {
		expect(await status(GET({ request: req() } as never))).toBe(401);
		expect(await status(GET({ request: req('bad') } as never))).toBe(401);
		expect(sql).not.toHaveBeenCalled();
	});

	it("returns the user's saved data, or null for a new account", async () => {
		sql.mockResolvedValueOnce([{ data: { watchlist: '["BBCA.JK"]' } }]);
		const res = await GET({ request: req('good') } as never);
		expect(await res.json()).toEqual({ watchlist: '["BBCA.JK"]' });
		expect(sql.mock.calls[0].slice(1)).toEqual(['user-1']);

		sql.mockResolvedValueOnce([]);
		expect(await (await GET({ request: req('good') } as never)).json()).toBeNull();
	});
});

describe('PUT /api/portfolio', () => {
	it('saves known keys for the token user', async () => {
		sql.mockResolvedValueOnce([]);
		const data = { watchlist: '[]', portfolio: '{"trades":[]}' };
		expect(await status(PUT({ request: req('good', data) } as never))).toBe(204);
		expect(sql.mock.calls[0].slice(1)).toEqual(['user-1', JSON.stringify(data)]);
	});

	it('rejects bad tokens and malformed bodies', async () => {
		expect(await status(PUT({ request: req(undefined, {}) } as never))).toBe(401);
		for (const bad of [[], { evil: 'x' }, { watchlist: 1 }, { watchlist: 'x'.repeat(300_000) }])
			expect(await status(PUT({ request: req('good', bad) } as never))).toBe(400);
		expect(sql).not.toHaveBeenCalled();
	});
});
