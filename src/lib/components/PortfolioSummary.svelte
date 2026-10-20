<script lang="ts">
	import type { Fees } from '#lib/models/stock.ts';
	import { fmt, groupInput, parseDigits, sgn } from '#lib/utils/number.ts';

	let {
		unrealized,
		realized,
		fees,
		goal,
		onfees,
		ongoal
	}: {
		unrealized: number;
		realized: number;
		fees: Fees;
		onfees: (fees: Fees) => void;
		goal: number;
		ongoal: (goal: number) => void;
	} = $props();

	const total = $derived(realized + unrealized);
	const pct = $derived(Math.max(0, (total / goal) * 100));

	// accepts "0,15" or "0.15"
	function setFee(key: keyof Fees, e: Event & { currentTarget: HTMLInputElement }) {
		const v = parseFloat(e.currentTarget.value.replace(',', '.'));
		if (v >= 0 && v < 100) onfees({ ...fees, [key]: v });
	}
</script>

<section class="summary" aria-label="Portfolio">
	{#each [['Realized', realized], ['Unrealized', unrealized], ['Total', total]] as const as [lbl, v] (lbl)}
		<div class="cell">
			<div class="lbl">{lbl}</div>
			<div class="val" class:up={v > 0} class:down={v < 0}>
				{sgn(v)}{fmt.format(Math.round(v))}
			</div>
		</div>
	{/each}
	<div class="cell goal">
		<label class="lbl">
			Goal
			<input
				inputmode="numeric"
				placeholder="5.000.000"
				value={goal ? fmt.format(goal) : ''}
				oninput={(e) => ongoal(parseDigits(groupInput(e.currentTarget)))}
				aria-label="Profit goal"
			/>
			{#if goal > 0}{pct.toFixed(0)}%{/if}
		</label>
		{#if goal > 0}
			<div
				class="seg"
				role="progressbar"
				aria-valuenow={Math.round(pct)}
				title={total >= goal ? 'reached' : `${fmt.format(Math.round(goal - total))} to go`}
			>
				{#each { length: 10 }, i (i)}<i class:on={pct >= (i + 1) * 10}></i>{/each}
			</div>
		{/if}
		<div class="fees">
			fees
			<input
				inputmode="decimal"
				value={fees.buy}
				oninput={(e) => setFee('buy', e)}
				aria-label="Buy fee percent"
			/>/<input
				inputmode="decimal"
				value={fees.sell}
				oninput={(e) => setFee('sell', e)}
				aria-label="Sell fee percent"
			/>%
		</div>
	</div>
</section>

<style>
	.summary {
		margin-top: 0.75rem;
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		border: 1px solid var(--line);
		border-radius: 10px;
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-variant-numeric: tabular-nums;
	}
	.cell {
		padding: 0.9rem 1rem;
		border-left: 1px solid var(--line);
	}
	.cell:first-child {
		border-left: 0;
	}
	.lbl {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.72rem;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}
	.val {
		font-size: 1.35rem;
		font-weight: 500;
		margin-top: 0.3rem;
	}
	.up {
		color: var(--up);
	}
	.down {
		color: var(--down);
	}
	.seg {
		display: grid;
		grid-template-columns: repeat(10, 1fr);
		gap: 3px;
		margin-top: 0.5rem;
	}
	.seg i {
		height: 8px;
		border-radius: 2px;
		background: var(--line);
	}
	.seg i.on {
		background: var(--up);
	}
	.fees {
		margin-top: 0.4rem;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.15rem;
		font-size: 0.8rem;
		color: var(--muted);
	}
	input {
		padding: 0.1rem 0.2rem;
		font:
			500 0.8rem 'Geist Mono',
			monospace;
		color: var(--text);
		background: none;
		border: 1px solid transparent;
		border-radius: 4px;
		field-sizing: content;
		min-width: 2ch;
	}
	input:hover,
	input:focus-visible {
		outline: none;
		border-color: var(--line);
	}
	@media (max-width: 720px) {
		.summary {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		/* total and goal get full rows so the goal inputs don't wrap */
		.cell:nth-child(n + 3) {
			grid-column: 1 / -1;
			border-left: 0;
			border-top: 1px solid var(--line);
		}
		.val {
			font-size: 1.1rem;
		}
	}
</style>
