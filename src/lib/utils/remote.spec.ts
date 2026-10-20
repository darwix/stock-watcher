import { describe, it, expect, vi } from 'vitest';
import { remoteStorage } from './remote.ts';

describe('remoteStorage', () => {
	it('reads from the account copy and pushes the whole copy after writes settle', () => {
		vi.useFakeTimers();
		const push = vi.fn();
		const s = remoteStorage({ watchlist: '["BBCA.JK"]' }, push);
		expect(s.getItem('watchlist')).toBe('["BBCA.JK"]');
		expect(s.getItem('portfolio')).toBeNull();

		s.setItem('watchlist', '[]');
		s.setItem('portfolio', '{}');
		expect(s.getItem('watchlist')).toBe('[]');
		expect(push).not.toHaveBeenCalled();
		vi.runAllTimers();
		expect(push).toHaveBeenCalledOnce();
		expect(push).toHaveBeenCalledWith({ watchlist: '[]', portfolio: '{}' });
		vi.useRealTimers();
	});
});
