<script lang="ts">
	import { onMount } from 'svelte';
	import StockSearch from '#lib/components/StockSearch.svelte';
	import { Watchlist } from '#lib/stores/watchlist.svelte.ts';
	import { isMarketOpen } from '#lib/utils/market.ts';
	import type { Quote, QuoteResult } from '#lib/models/stock.ts';

	const REFRESH_MS = 15_000;

	let watchlist = $state<Watchlist>();
	let quotes = $state<Record<string, Quote>>({});
	let stale = $state<Record<string, boolean>>({});
	let missing = $state<Record<string, boolean>>({});
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
		refresh();
		const id = setInterval(() => {
			open = isMarketOpen();
			if (open) refresh();
		}, REFRESH_MS);
		return () => clearInterval(id);
	});

	const fmt = new Intl.NumberFormat('id-ID');
	const time = new Intl.DateTimeFormat('id-ID', {
		timeStyle: 'medium',
		timeZone: 'Asia/Jakarta'
	});
</script>

<svelte:head><title>IDX Watchlist</title></svelte:head>

<main>
	<header>
		<h1>IDX Watchlist</h1>
		<span class="badge" class:live={open}>{open ? '● Live · 15s' : 'Market closed'}</span>
	</header>

	<StockSearch onpick={add} />

	{#if watchlist?.symbols.length}
		<table>
			<thead>
				<tr
					><th>Stock</th><th class="num">Price</th><th class="num">Change</th><th>Updated</th><th
					></th></tr
				>
			</thead>
			<tbody>
				{#each watchlist.symbols as s (s)}
					{@const q = quotes[s]}
					{@const dir = q ? Math.sign(q.change) : 0}
					<tr>
						<td>
							<b>{s.replace('.JK', '')}</b>
							<div class="muted">{q?.name ?? (missing[s] ? 'Not found' : '…')}</div>
						</td>
						<td class="num">{q ? fmt.format(q.price) : '—'}</td>
						<td class="num" class:up={dir > 0} class:down={dir < 0}>
							{#if q}
								{dir > 0 ? '+' : ''}{fmt.format(q.change)} ({q.changePercent.toFixed(2)}%)
							{/if}
						</td>
						<td class="muted">
							{q ? time.format(q.time) : ''}
							{#if stale[s]}<span class="stale">stale</span>{/if}
						</td>
						<td>
							<button class="x" aria-label="Remove {s}" onclick={() => watchlist?.remove(s)}
								>×</button
							>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{:else if watchlist}
		<p class="muted empty">No stocks yet. Search above to add one.</p>
	{/if}
</main>

<style>
	:global(:root) {
		--bg: #f7f7f8;
		--card: #fff;
		--text: #111;
		--muted: #6b7280;
		--line: #e5e7eb;
		--up: #15803d;
		--down: #b91c1c;
	}
	@media (prefers-color-scheme: dark) {
		:global(:root) {
			--bg: #0f1115;
			--card: #181b21;
			--text: #e5e7eb;
			--muted: #9ca3af;
			--line: #2a2e36;
			--up: #4ade80;
			--down: #f87171;
		}
	}
	:global(body) {
		margin: 0;
		background: var(--bg);
		color: var(--text);
		font-family: system-ui, sans-serif;
	}
	:global(.muted) {
		color: var(--muted);
		font-size: 0.85em;
	}
	main {
		max-width: 760px;
		margin: 0 auto;
		padding: 1.5rem 1rem;
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}
	h1 {
		font-size: 1.4rem;
		margin: 0;
	}
	.badge {
		font-size: 0.8rem;
		padding: 0.2rem 0.6rem;
		border-radius: 999px;
		background: var(--line);
	}
	.badge.live {
		color: var(--up);
	}
	table {
		width: 100%;
		margin-top: 1rem;
		border-collapse: collapse;
		background: var(--card);
		border-radius: 8px;
		overflow: hidden;
	}
	th,
	td {
		padding: 0.6rem 0.8rem;
		border-bottom: 1px solid var(--line);
		text-align: left;
	}
	th {
		font-size: 0.75rem;
		text-transform: uppercase;
		color: var(--muted);
	}
	.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.up {
		color: var(--up);
	}
	.down {
		color: var(--down);
	}
	.stale {
		margin-left: 0.4rem;
		padding: 0 0.4rem;
		border-radius: 4px;
		background: #f59e0b33;
		color: #b45309;
	}
	.x {
		border: 0;
		background: none;
		color: var(--muted);
		font-size: 1.2rem;
		cursor: pointer;
	}
	.empty {
		margin-top: 2rem;
		text-align: center;
	}
	@media (max-width: 520px) {
		th:nth-child(4),
		td:nth-child(4) {
			display: none;
		}
	}
</style>
