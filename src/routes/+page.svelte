<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import StockSearch from '#lib/components/StockSearch.svelte';
	import PositionEditor from '#lib/components/PositionEditor.svelte';
	import PortfolioSummary from '#lib/components/PortfolioSummary.svelte';
	import TradeHistory from '#lib/components/TradeHistory.svelte';
	import { Watchlist } from '#lib/stores/watchlist.svelte.ts';
	import { Portfolio } from '#lib/stores/portfolio.svelte.ts';
	import { calcPosition } from '#lib/utils/position.ts';
	import { fmt } from '#lib/utils/number.ts';
	import { isMarketOpen } from '#lib/utils/market.ts';
	import type { Quote, QuoteResult } from '#lib/models/stock.ts';
	import type { Storage } from '#lib/utils/storage.ts';
	import { remoteStorage } from '#lib/utils/remote.ts';
	import { createAuthClient } from '@neondatabase/auth';

	const REFRESH_MS = 15_000;

	let watchlist = $state<Watchlist>();
	let portfolio = $state<Portfolio>();
	let quotes = $state<Record<string, Quote>>({});
	let stale = $state<Record<string, boolean>>({});
	let missing = $state<Record<string, boolean>>({});
	// price before the latest update, to flash the box when it moves
	let prev = $state<Record<string, number>>({});
	let open = $state(isMarketOpen());
	const auth = createAuthClient(import.meta.env.VITE_NEON_AUTH_URL);
	let user = $state<{ name: string }>();
	let syncError = $state('');

	async function api(method: 'GET' | 'PUT', body?: unknown) {
		// Neon Auth puts the JWT on the (cached, auto-refreshed) session
		const token = (await auth.getSession()).data?.session.token;
		const res = await fetch('/api/portfolio', {
			method,
			headers: { authorization: `Bearer ${token}` },
			body: body ? JSON.stringify(body) : undefined
		});
		if (!res.ok) throw new Error(String(res.status));
		return res;
	}

	// guests use this device; signed-in users use their account copy
	async function storage(): Promise<Storage> {
		// auth unreachable: carry on as a guest
		const { data } = await auth.getSession().catch(() => ({ data: null }));
		if (!data?.user) return localStorage;
		user = data.user;
		const push = (d: unknown) =>
			api('PUT', d).then(
				() => (syncError = ''),
				() => (syncError = 'Not saved to your account. Retrying on next change.')
			);
		try {
			const saved: Record<string, string> | null = await (await api('GET')).json();
			if (saved) return remoteStorage(saved, push);
			// ponytail: new account starts from this device's guest data; existing account wins
			const seed = Object.fromEntries(
				['watchlist', 'portfolio'].map((k) => [k, localStorage.getItem(k)]).filter(([, v]) => v)
			);
			push(seed);
			return remoteStorage(seed, push);
		} catch {
			syncError = "Couldn't load your account. Showing this device's data, not synced.";
			return localStorage;
		}
	}

	const signIn = () => auth.signIn.social({ provider: 'google', callbackURL: location.href });
	const signOut = () => auth.signOut().then(() => location.reload());

	async function refresh(symbols = watchlist?.symbols ?? []) {
		if (!symbols.length) return;
		let data: Record<string, QuoteResult>;
		try {
			const res = await fetch(`/api/quote?symbols=${symbols.join(',')}`);
			if (!res.ok) throw new Error();
			data = await res.json();
		} catch {
			for (const s of symbols) stale[s] = true;
			return;
		}
		for (const [s, r] of Object.entries(data)) {
			if (r && 'error' in r) stale[s] = true;
			else if (r) {
				if (quotes[s]) prev[s] = quotes[s].price;
				quotes[s] = r;
				stale[s] = false;
			} else missing[s] = true;
		}
	}

	function add(symbol: string) {
		watchlist?.add(symbol);
		refresh([symbol]);
	}

	onMount(() => {
		storage().then((s) => {
			watchlist = new Watchlist(s);
			portfolio = new Portfolio(s);
			refresh();
		});
		const id = setInterval(() => {
			open = isMarketOpen();
			if (open) refresh();
		}, REFRESH_MS);
		return () => clearInterval(id);
	});

	// open holdings on watched stocks that have a live price
	const held = $derived.by(() => {
		if (!portfolio || !watchlist) return [];
		const {
			book: { holdings },
			fees
		} = portfolio;
		return watchlist.symbols
			.filter((s) => holdings[s]?.lot && quotes[s])
			.map((s) => calcPosition(holdings[s], quotes[s].price, fees.sell));
	});

	const time = new Intl.DateTimeFormat('id-ID', {
		timeStyle: 'medium',
		timeZone: 'Asia/Jakarta'
	});
</script>

<main>
	<header>
		<h1>IDX</h1>
		<div class="grow">
			{#if watchlist}<StockSearch onpick={add} />{:else}<div class="sk sk-search"></div>{/if}
		</div>
		<a class="acct" href={resolve('/calculator')}>Calculator</a>
		<span class="badge" class:live={open}>{open ? '● Live' : 'Closed'}</span>
		{#if user}
			<button class="acct" onclick={signOut} title="Signed in as {user.name}">Sign out</button>
		{:else if watchlist}
			<button class="acct" onclick={signIn}>Sign in</button>
		{/if}
	</header>
	{#if syncError}<p class="sync" role="alert">{syncError}</p>{/if}

	{#if portfolio?.trades.length}
		<PortfolioSummary
			unrealized={held.reduce((a, c) => a + c.pl, 0)}
			realized={portfolio.book.realized}
			fees={portfolio.fees}
			onfees={(f) => portfolio?.setFees(f)}
			goal={portfolio.goal}
			ongoal={(g) => portfolio?.setGoal(g)}
		/>
	{/if}

	{#if watchlist?.symbols.length}
		<section class="board" aria-label="Watchlist">
			{#each watchlist.symbols as s (s)}
				{@const q = quotes[s]}
				{@const dir = q ? Math.sign(q.change) : 0}
				<article class="box" class:up={dir > 0} class:down={dir < 0} title={q?.name}>
					<!-- only this layer remounts on a new price, so an open position form survives -->
					{#key q?.price}
						<div
							class="flash"
							class:on={q && prev[s] !== undefined && prev[s] !== q.price}
							aria-hidden="true"
						></div>
					{/key}
					<div class="row">
						<span class="tk">{s.replace('.JK', '')}</span>
						<span>
							{#if stale[s]}<span class="stale">stale</span>{/if}
							{q ? time.format(q.time) : ''}
						</span>
					</div>
					<div class="px">
						{#if q}{fmt.format(q.price)}{:else if missing[s]}N/A{:else}<span class="sk sk-px"
							></span>{/if}
					</div>
					<div class="ch">
						{#if q}
							{dir > 0 ? '▲' : dir < 0 ? '▼' : ''}
							{dir > 0 ? '+' : ''}{fmt.format(q.change)} ({dir > 0
								? '+'
								: ''}{q.changePercent.toFixed(2)}%)
						{:else if missing[s]}
							Not found on IDX
						{/if}
					</div>
					{#if portfolio && !missing[s]}
						<PositionEditor
							symbol={s}
							live={q?.price}
							holding={portfolio.book.holdings[s]}
							fees={portfolio.fees}
							onadd={(t) => portfolio?.addTrade(t)}
						/>
					{/if}
					<!-- held stocks stay so their unrealized P/L keeps a live price -->
					{#if !portfolio?.book.holdings[s]?.lot}
						<button class="x" aria-label="Remove {s}" onclick={() => watchlist?.remove(s)}>×</button
						>
					{/if}
				</article>
			{/each}
		</section>
	{:else if watchlist}
		<p class="empty">No stocks yet. Search above to add one.</p>
	{:else}
		<div class="loading" aria-busy="true" aria-label="Loading portfolio">
			<div class="sk sk-strip"></div>
			<div class="board">
				{#each { length: 3 }, i (i)}<div class="sk sk-box"></div>{/each}
			</div>
			<div class="sk sk-h"></div>
			<div class="sk-rows">
				{#each { length: 3 }, i (i)}<div class="sk sk-row"></div>{/each}
			</div>
		</div>
	{/if}

	{#if portfolio?.trades.length}
		<TradeHistory
			trades={portfolio.trades}
			realizedById={portfolio.book.realizedById}
			onupdate={(id, t) => portfolio?.updateTrade(id, t)}
			onremove={(id) => portfolio?.removeTrade(id)}
		/>
	{/if}
</main>

<style>
	:global(.muted) {
		color: var(--muted);
		font-size: 0.85em;
	}
	main {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem 1rem 4rem;
	}
	header {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.6rem 0.75rem;
		background: var(--board);
		border: 1px solid var(--line);
		border-radius: 10px;
	}
	.acct {
		text-decoration: none;
		padding: 0.3rem 0.7rem;
		font:
			500 0.8rem Geist,
			sans-serif;
		color: var(--text);
		background: none;
		border: 1px solid var(--line);
		border-radius: 6px;
		cursor: pointer;
		transition: background 0.2s;
	}
	.acct:hover {
		background: var(--card);
	}
	.sync {
		margin: 0.5rem 0 0;
		font-size: 0.8rem;
		color: #f5b04b;
	}
	.grow {
		flex: 1;
		--card: var(--bg);
	}
	h1 {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 600;
		letter-spacing: -0.02em;
		color: #fff;
	}
	.badge {
		font:
			500 0.8rem 'Geist Mono',
			monospace;
		padding: 0.25rem 0.7rem;
		border-radius: 6px;
		background: var(--card);
		color: var(--muted);
	}
	.badge.live {
		color: var(--up);
	}
	.board {
		margin-top: 0.75rem;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 0.75rem;
	}
	.box {
		position: relative;
		background: var(--card);
		border-radius: 8px;
		padding: 1rem 1.1rem;
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-variant-numeric: tabular-nums;
		isolation: isolate;
	}
	.row {
		padding-right: 2rem;
		display: flex;
		justify-content: space-between;
		font-size: 0.8rem;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}
	.tk {
		color: var(--text);
		font-weight: 600;
	}
	.px {
		font-size: clamp(2.8rem, 7vw, 4rem);
		font-weight: 500;
		letter-spacing: -0.04em;
		line-height: 1.1;
		margin: 0.6rem 0 0.2rem;
	}
	.ch {
		font-size: 0.95rem;
		min-height: 1.4em;
	}
	.up :is(.px, .ch) {
		color: var(--up);
	}
	.down :is(.px, .ch) {
		color: var(--down);
	}
	@keyframes flash-up {
		from {
			background: #5bd68f33;
		}
	}
	@keyframes flash-down {
		from {
			background: #ff7a6333;
		}
	}
	.flash {
		position: absolute;
		inset: 0;
		z-index: -1;
		border-radius: inherit;
		pointer-events: none;
	}
	.up .flash.on {
		animation: flash-up 1.2s ease-out;
	}
	.down .flash.on {
		animation: flash-down 1.2s ease-out;
	}
	.stale {
		margin-right: 0.5rem;
		padding: 0 0.4rem;
		border-radius: 4px;
		background: #f59e0b26;
		color: #f5b04b;
	}
	.x {
		position: absolute;
		top: 0.55rem;
		right: 0.6rem;
		width: 28px;
		height: 28px;
		border: 0;
		border-radius: 6px;
		background: none;
		color: var(--muted);
		font-size: 1.1rem;
		cursor: pointer;
		opacity: 0;
		transition:
			opacity 0.2s,
			background 0.2s;
	}
	.box:hover .x,
	.x:focus-visible {
		opacity: 1;
	}
	.x:hover {
		background: #fff1;
	}
	.x:focus-visible {
		outline: 2px solid var(--text);
	}
	.loading {
		margin-top: 0.75rem;
	}
	.sk {
		border-radius: 8px;
		background: linear-gradient(90deg, var(--card) 30%, #1d1d1d 50%, var(--card) 70%) 0 0 / 300%
			100%;
		animation: shimmer 1.4s linear infinite;
	}
	@keyframes shimmer {
		to {
			background-position: -150% 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.sk {
			animation: none;
		}
	}
	.sk-strip {
		height: 5.5rem;
		border-radius: 10px;
	}
	.sk-box {
		height: 12rem;
	}
	.sk-search {
		height: 2.3rem;
		border-radius: 6px;
	}
	/* trade history */
	.sk-h {
		width: 8rem;
		height: 0.8rem;
		margin: 1.8rem 0 0.7rem;
		border-radius: 4px;
	}
	.sk-rows {
		display: grid;
		gap: 1px;
		padding: 1px;
		border: 1px solid var(--line);
		border-radius: 10px;
	}
	.sk-row {
		height: 2.6rem;
		border-radius: 6px;
	}
	.sk-px {
		display: block;
		width: 60%;
		height: 0.8em;
		margin: 0.15em 0;
	}
	.empty {
		margin-top: 3rem;
		text-align: center;
		color: var(--muted);
	}
	@media (max-width: 720px) {
		header {
			flex-wrap: wrap;
		}
		.grow {
			flex-basis: 100%;
			order: 3;
		}
		.badge {
			margin-left: auto;
		}
	}
	@media (hover: none) {
		.x {
			opacity: 1;
		}
	}
</style>
