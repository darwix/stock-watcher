<script lang="ts">
	import type { Fees } from '#lib/models/stock.ts';
	import { sumPositions } from '#lib/utils/position.ts';

	let {
		items,
		fees,
		onfees
	}: {
		items: { cost: number; value: number }[];
		fees: Fees;
		onfees: (fees: Fees) => void;
	} = $props();

	const fmt = new Intl.NumberFormat('id-ID');
	const t = $derived(sumPositions(items));
	const sgn = $derived(t.pl > 0 ? '+' : '');

	// accepts "0,15" or "0.15"
	function setFee(key: keyof Fees, e: Event & { currentTarget: HTMLInputElement }) {
		const v = parseFloat(e.currentTarget.value.replace(',', '.'));
		if (v >= 0 && v < 100) onfees({ ...fees, [key]: v });
	}
</script>

<section class="summary" aria-label="Portfolio">
	<div>
		<div class="lbl">Cost</div>
		<div class="val">{fmt.format(Math.round(t.cost))}</div>
	</div>
	<div>
		<div class="lbl">Value now</div>
		<div class="val">{fmt.format(Math.round(t.value))}</div>
	</div>
	<div>
		<div class="lbl">Net P/L</div>
		<div class="val" class:up={t.pl > 0} class:down={t.pl < 0}>
			{sgn}{fmt.format(Math.round(t.pl))} ({sgn}{t.pct.toFixed(2)}%)
		</div>
	</div>
	<div class="fees">
		Fees
		<label>
			buy
			<input
				inputmode="decimal"
				value={fees.buy}
				oninput={(e) => setFee('buy', e)}
				aria-label="Buy fee percent"
			/>%
		</label>
		·
		<label>
			sell
			<input
				inputmode="decimal"
				value={fees.sell}
				oninput={(e) => setFee('sell', e)}
				aria-label="Sell fee percent"
			/>%
		</label>
	</div>
</section>

<style>
	.summary {
		margin-top: 1rem;
		display: grid;
		grid-template-columns: repeat(3, auto) 1fr;
		gap: 0.5rem 2.5rem;
		align-items: end;
		padding: 1rem 1.2rem;
		background: var(--card);
		border-radius: 10px;
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-variant-numeric: tabular-nums;
	}
	.lbl {
		font-size: 0.72rem;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		margin-bottom: 0.2rem;
	}
	.val {
		font-size: 1.35rem;
		font-weight: 500;
	}
	.up {
		color: var(--up);
	}
	.down {
		color: var(--down);
	}
	.fees {
		justify-self: end;
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		align-items: center;
		font-size: 0.8rem;
		color: var(--muted);
	}
	label {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}
	input {
		width: 5rem;
		padding: 0.3rem 0.45rem;
		font:
			500 0.85rem 'Geist Mono',
			monospace;
		color: var(--text);
		background: var(--board);
		border: 1px solid var(--line);
		border-radius: 6px;
	}
	input:focus-visible {
		outline: none;
		border-color: var(--muted);
	}
	@media (max-width: 720px) {
		.summary {
			grid-template-columns: 1fr 1fr;
			gap: 0.75rem 1rem;
		}
		.val {
			font-size: 1.1rem;
		}
		.fees {
			justify-self: start;
			grid-column: 1 / -1;
		}
	}
</style>
