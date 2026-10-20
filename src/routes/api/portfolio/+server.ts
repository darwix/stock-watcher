import { error, json } from '@sveltejs/kit';
import { sql } from '#lib/server/db.ts';
import { userId } from '#lib/server/auth.ts';
import type { RequestHandler } from './$types';

const KEYS = new Set(['watchlist', 'portfolio']);
const MAX_CHARS = 256_000;

async function user(request: Request) {
	const id = await userId(request);
	if (!id) error(401);
	return id;
}

export const GET: RequestHandler = async ({ request }) => {
	const id = await user(request);
	const [row] = await sql`select data from portfolios where user_id = ${id}`;
	return json(row?.data ?? null);
};

export const PUT: RequestHandler = async ({ request }) => {
	const id = await user(request);
	const data: object | null = await request.json().catch(() => null);
	const valid =
		data?.constructor === Object &&
		Object.entries(data).every(([k, v]) => KEYS.has(k) && typeof v === 'string');
	const body = JSON.stringify(data);
	if (!valid || body.length > MAX_CHARS) error(400);
	await sql`insert into portfolios (user_id, data) values (${id}, ${body}::jsonb)
		on conflict (user_id) do update set data = excluded.data, updated_at = now()`;
	return new Response(null, { status: 204 });
};
