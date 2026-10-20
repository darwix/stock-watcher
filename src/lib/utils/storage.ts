export type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;

/** parsed JSON at key, or undefined when missing/corrupt/blocked */
export function load(storage: Storage | undefined, key: string): unknown {
	try {
		return JSON.parse(storage?.getItem(key) ?? 'null') ?? undefined;
	} catch {
		return undefined;
	}
}

export function save(storage: Storage | undefined, key: string, value: unknown) {
	try {
		storage?.setItem(key, JSON.stringify(value));
	} catch {
		// storage full/blocked: keep in memory
	}
}
