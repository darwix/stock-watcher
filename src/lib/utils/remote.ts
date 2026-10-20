import type { Storage } from './storage.ts';

const PUSH_DELAY_MS = 1000;

/** in-memory Storage over the account copy; pushes the whole copy once writes settle */
export function remoteStorage(
	initial: Record<string, string>,
	push: (data: Record<string, string>) => void
): Storage {
	const data = { ...initial };
	let timer: ReturnType<typeof setTimeout>;
	return {
		getItem: (k) => data[k] ?? null,
		setItem(k, v) {
			data[k] = v;
			clearTimeout(timer);
			timer = setTimeout(() => push({ ...data }), PUSH_DELAY_MS);
		}
	};
}
