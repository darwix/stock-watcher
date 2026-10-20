<script lang="ts">
	import { onMount } from 'svelte';
	import StockSearch from '#lib/components/StockSearch.svelte';
	import PositionEditor from '#lib/components/PositionEditor.svelte';
	import PortfolioSummary from '#lib/components/PortfolioSummary.svelte';
	import { Watchlist } from '#lib/stores/watchlist.svelte.ts';
	import { Portfolio } from '#lib/stores/portfolio.svelte.ts';
	import { calcPosition } from '#lib/utils/position.ts';
	import { isMarketOpen } from '#lib/utils/market.ts';
	import type { Quote, QuoteResult } from '#lib/models/stock.ts';

	const REFRESH_MS = 15_000;

	let watchlist = $state<Watchlist>();
	let portfolio = $state<Portfolio>();
	let quotes = $state<Record<string, Quote>>({});
	let stale = $state<Record<string, boolean>>({});
	let missing = $state<Record<string, boolean>>({});
	// price before the latest update, to flash the box when it moves
	let prev = $state<Record<string, number>>({});
	let open = $state(isMarketOpen());

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
		watchlist = new Watchlist(localStorage);
		portfolio = new Portfolio(localStorage);
		refresh();
		const id = setInterval(() => {
			open = isMarketOpen();
			if (open) refresh();
		}, REFRESH_MS);
		return () => clearInterval(id);
	});

	// positions on watched stocks that have a live price
	const held = $derived.by(() => {
		if (!portfolio || !watchlist) return [];
		const { positions, fees } = portfolio;
		return watchlist.symbols
			.filter((s) => positions[s] && quotes[s])
			.map((s) => calcPosition(positions[s], quotes[s].price, fees));
	});

	const fmt = new Intl.NumberFormat('id-ID');
	const time = new Intl.DateTimeFormat('id-ID', {
		timeStyle: 'medium',
		timeZone: 'Asia/Jakarta'
	});
</script>

<main>
	<header>
		<h1>IDX watchlist</h1>
		<span class="badge" class:live={open}>{open ? '● Live · 15s' : 'Market closed'}</span>
	</header>

	<StockSearch onpick={add} />

	{#if portfolio && held.length}
		<PortfolioSummary items={held} fees={portfolio.fees} onfees={(f) => portfolio?.setFees(f)} />
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
					<div class="px">{q ? fmt.format(q.price) : missing[s] ? 'N/A' : '—'}</div>
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
							pos={portfolio.positions[s]}
							fees={portfolio.fees}
							onsave={(pos) => portfolio?.setPosition(s, pos)}
						/>
					{/if}
					<button class="x" aria-label="Remove {s}" onclick={() => watchlist?.remove(s)}>×</button>
				</article>
			{/each}
		</section>
	{:else if watchlist}
		<p class="empty">No stocks yet. Search above to add one.</p>
	{/if}
</main>

<style>
	:global(:root) {
		--bg: #0e0f11;
		--board: #0b0c0d;
		--card: #131517;
		--text: #d9d6cf;
		--muted: #7d7a74;
		--line: #272a2f;
		--up: #5bd68f;
		--down: #ff7a63;
		color-scheme: dark;
	}
	:global(body) {
		margin: 0;
		background: var(--bg);
		color: var(--text);
		font-family: Geist, system-ui, sans-serif;
	}
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
		justify-content: space-between;
		margin-bottom: 1.25rem;
	}
	h1 {
		margin: 0;
		font-size: 1.6rem;
		font-weight: 600;
		letter-spacing: -0.02em;
		color: #ecebe8;
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
		margin-top: 1rem;
		background: var(--board);
		border-radius: 14px;
		padding: 6px;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 6px;
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
	.empty {
		margin-top: 3rem;
		text-align: center;
		color: var(--muted);
	}
	@media (hover: none) {
		.x {
			opacity: 1;
		}
	}
</style>
