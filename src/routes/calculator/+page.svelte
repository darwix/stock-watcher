<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { sellScenarios } from '#lib/utils/position.ts';
	import { fmt, groupInput, parseDigits, sgn } from '#lib/utils/number.ts';
	import { load, save } from '#lib/utils/storage.ts';
	import type { Fees } from '#lib/models/stock.ts';

	const KEY = 'calculator';

	let buy = $state(0);
	let lot = $state(0);
	let target = $state(0);
	let fees = $state<Fees>({ buy: 0.15, sell: 0.25 });
	let ready = $state(false);

	const result = $derived(buy > 0 && lot > 0 ? sellScenarios(buy, lot, target, fees) : undefined);
	const rp = (n: number) => fmt.format(Math.round(Math.abs(n)));
	const tone = (n: number) => (n > 0 ? 'up' : n < 0 ? 'down' : '');

	onMount(() => {
		// ponytail: local fees only; signed-in users with remote-only fees get defaults
		const saved = load(localStorage, 'portfolio') as { fees?: Fees } | undefined;
		if (saved?.fees) fees = saved.fees;
		const last = load(localStorage, KEY) as
			{ buy: number; lot: number; target: number } | undefined;
		if (last) ({ buy, lot, target } = last);
		ready = true;
	});

	$effect(() => {
		if (ready) save(localStorage, KEY, { buy, lot, target });
	});
</script>

<svelte:head><title>Sell scenarios · IDX watchlist</title></svelte:head>

<main>
	<header>
		<a href={resolve('/')} aria-label="Back">←</a>
		<h1>Sell scenarios</h1>
	</header>

	<section class="card">
		<div class="inputs">
			<label
				>Buy price / share<input
					inputmode="numeric"
					value={buy ? fmt.format(buy) : ''}
					oninput={(e) => (buy = parseDigits(groupInput(e.currentTarget)))}
				/></label
			>
			<label
				>Lots (×100)<input
					inputmode="numeric"
					value={lot ? fmt.format(lot) : ''}
					oninput={(e) => (lot = parseDigits(groupInput(e.currentTarget)))}
				/></label
			>
			<label
				>Target sell price<input
					inputmode="numeric"
					value={target ? fmt.format(target) : ''}
					oninput={(e) => (target = parseDigits(groupInput(e.currentTarget)))}
				/></label
			>
		</div>
		<div class="summary">
			<span
				>Buy total <b class="mono"
					><span class="rp">Rp&nbsp;</span>{result ? rp(result.cost) : '–'}</b
				></span
			>
			<span>Fees buy <b class="mono">{fees.buy}%</b> · sell <b class="mono">{fees.sell}%</b></span>
		</div>
	</section>

	{#if result}
		<section class="card">
			<table>
				<thead>
					<tr>
						<th>Sell price</th>
						<th>Change</th>
						<th class="gross">Gross sale</th>
						<th>Net profit</th>
						<th>Return</th>
					</tr>
				</thead>
				<tbody>
					{#each result.rows as r, i (i)}
						<tr class={r.kind}>
							<td class="mono"
								>{fmt.format(r.price)}{#if r.kind === 'be'}<span class="tag">BE</span
									>{:else if r.kind === 'target'}<span class="tag">target</span>{/if}</td
							>
							<td class="mono {tone(r.profit)}">{sgn(r.change)}{r.change.toFixed(1)}%</td>
							<td class="mono gross">Rp {fmt.format(r.gross)}</td>
							<td class="mono {tone(r.profit)}"
								>{r.profit < 0 ? '−' : sgn(r.profit)}<span class="rp">Rp&nbsp;</span>{rp(
									r.profit
								)}</td
							>
							<td class="mono {tone(r.profit)}">{r.pct.toFixed(2)}%</td>
						</tr>
					{/each}
				</tbody>
			</table>
			<p class="note">
				Prices snapped to IDX tick size. Profit and return are net of buy and sell fees.
			</p>
		</section>
	{/if}
</main>

<style>
	.mono,
	input {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-variant-numeric: tabular-nums;
	}
	main {
		max-width: 820px;
		margin: 0 auto;
		padding: 2rem 1rem 4rem;
	}
	header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1.25rem;
	}
	header a {
		color: var(--muted);
		text-decoration: none;
		font-size: 1.2rem;
	}
	h1 {
		margin: 0;
		font-size: 1.6rem;
		font-weight: 600;
		letter-spacing: -0.02em;
	}
	.card {
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: 10px;
		padding: 1rem;
		margin-bottom: 1rem;
	}
	.inputs {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.75rem;
	}
	label {
		display: grid;
		gap: 0.35rem;
		font-size: 0.8rem;
		color: var(--muted);
	}
	input {
		width: 100%;
		box-sizing: border-box;
		padding: 0.6rem 0.7rem;
		font-size: 1rem;
		font-weight: 500;
		border: 1px solid var(--line);
		border-radius: 6px;
		background: var(--board);
		color: var(--text);
	}
	.summary {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem 1.5rem;
		margin-top: 0.9rem;
		font-size: 0.85rem;
		color: var(--muted);
	}
	.summary b {
		color: var(--text);
		font-weight: 500;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}
	th {
		text-align: right;
		font-weight: 500;
		font-size: 0.75rem;
		color: var(--muted);
		padding: 0 0.5rem 0.6rem;
		border-bottom: 1px solid var(--line);
	}
	td {
		text-align: right;
		padding: 0.6rem 0.5rem;
		border-bottom: 1px solid var(--line);
	}
	th:first-child,
	td:first-child {
		text-align: left;
	}
	tr.be td {
		background: color-mix(in srgb, var(--text) 5%, transparent);
	}
	tr.target td {
		background: color-mix(in srgb, #e8c26a 10%, transparent);
	}
	.tag {
		font:
			0.65rem Geist,
			sans-serif;
		padding: 0.1rem 0.4rem;
		border-radius: 4px;
		margin-left: 0.4rem;
		border: 1px solid var(--line);
		color: var(--muted);
	}
	tr.target .tag {
		color: #e8c26a;
		border-color: #e8c26a;
	}
	.up {
		color: var(--up);
	}
	.down {
		color: var(--down);
	}
	.note {
		font-size: 0.75rem;
		color: var(--muted);
		margin: 0.75rem 0 0;
	}
	@media (max-width: 560px) {
		.inputs {
			grid-template-columns: 1fr 1fr;
		}
		.inputs label:last-child {
			grid-column: 1 / -1;
		}
		.gross,
		.rp {
			display: none;
		}
		table {
			font-size: 0.8rem;
		}
		td,
		th {
			white-space: nowrap;
			padding-left: 0.25rem;
			padding-right: 0.25rem;
		}
		.tag {
			margin-left: 0.25rem;
			padding: 0.05rem 0.25rem;
		}
	}
</style>
