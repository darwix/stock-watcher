// ponytail: plain Mon–Fri 09:00–16:00 WIB; ignores lunch break and IDX holidays
export function isMarketOpen(date = new Date()): boolean {
	const wib = new Date(date.getTime() + 7 * 3600_000);
	const day = wib.getUTCDay();
	const hour = wib.getUTCHours();
	return day >= 1 && day <= 5 && hour >= 9 && hour < 16;
}
