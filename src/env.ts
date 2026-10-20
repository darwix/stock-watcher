import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	DATABASE_URL: {},
	NEON_AUTH_BASE_URL: {}
});
