import { error, json } from '@sveltejs/kit';
import { search } from '#lib/services/yahoo.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, fetch }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';
	if (!q || q.length > 50) return json([]);
	try {
		return json(await search(q, fetch));
	} catch {
		error(502, 'search unavailable');
	}
};
