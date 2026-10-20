import { neon } from '@neondatabase/serverless';
import { DATABASE_URL } from '$app/env/private';

export const sql = neon(DATABASE_URL);
