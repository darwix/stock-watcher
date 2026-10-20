import { createRemoteJWKSet, jwtVerify } from 'jose';
import { NEON_AUTH_BASE_URL } from '$app/env/private';

const jwks = createRemoteJWKSet(new URL(`${NEON_AUTH_BASE_URL}/.well-known/jwks.json`));

/** Neon Auth user id from a valid bearer token, else undefined */
export async function userId(request: Request): Promise<string | undefined> {
	const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
	if (!token) return;
	try {
		const { payload } = await jwtVerify(token, jwks);
		return payload.sub;
	} catch {
		return;
	}
}
