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

	let sheet: HTMLDialogElement;
	const presets = [1e6, 1.5e6, 5e6, 1e7];

	// accepts "0,15" or "0.15"
	function setFee(key: keyof Fees, e: Event & { currentTarget: HTMLInputElement }) {
		const v = parseFloat(e.currentTarget.value.replace(',', '.'));
		if (v >= 0 && v < 100) onfees({ ...fees, [key]: v });
	}
</script>

<!-- phone: goal hero; desktop: hidden -->
<div class="hero">
	<button class="ring" onclick={() => sheet.showModal()} aria-label="Edit goal and fees">
		<svg viewBox="0 0 36 36" aria-hidden="true">
			<circle cx="18" cy="18" r="15.9" pathLength="100" />
			{#if pct > 0}
				<circle
					class="arc"
					cx="18"
					cy="18"
					r="15.9"
					pathLength="100"
					stroke-dasharray="{Math.min(pct, 100)} 100"
				/>
			{/if}
		</svg>
		<span>{goal > 0 ? `${pct.toFixed(0)}%` : 'Goal'}</span>
	</button>
	<div class="hero-txt">
		<div class="lbl">Total</div>
		<div class="val" class:up={total > 0} class:down={total < 0}>
			{sgn(total)}{fmt.format(Math.round(total))}
		</div>
		<div class="note">
			{#if goal > 0}
				of {fmt.format(goal)} · {total >= goal
					? 'reached'
					: `${fmt.format(Math.round(goal - total))} to go`}
			{:else}
				no goal set
			{/if}
		</div>
		<div class="note row">
			fees {fees.buy} / {fees.sell}%
			<button class="edit" onclick={() => sheet.showModal()}>Edit</button>
		</div>
	</div>
</div>

<dialog bind:this={sheet} class="sheet" onclick={(e) => e.target === sheet && sheet.close()}>
	<form method="dialog">
		<h2>Goal &amp; fees</h2>
		<label class="field">
			<span class="lbl">Profit goal</span>
			<input
				inputmode="numeric"
				placeholder="5.000.000"
				value={goal ? fmt.format(goal) : ''}
				oninput={(e) => ongoal(parseDigits(groupInput(e.currentTarget)))}
			/>
		</label>
		<div class="chips">
			{#each presets as p (p)}
				<button type="button" class:sel={goal === p} onclick={() => ongoal(p)}>
					{fmt.format(p / 1e6)}jt
				</button>
			{/each}
		</div>
		<div class="pair">
			<label class="field">
				<span class="lbl">Buy fee %</span>
				<input inputmode="decimal" value={fees.buy} oninput={(e) => setFee('buy', e)} />
			</label>
			<label class="field">
				<span class="lbl">Sell fee %</span>
				<input inputmode="decimal" value={fees.sell} oninput={(e) => setFee('sell', e)} />
			</label>
		</div>
		<button class="done">Done</button>
	</form>
</dialog>

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
	.summary,
	.hero {
		margin-top: 0.75rem;
		border: 1px solid var(--line);
		border-radius: 10px;
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-variant-numeric: tabular-nums;
	}
	.summary {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
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
	.hero {
		display: none;
	}
	.sheet {
		box-sizing: border-box;
		margin: auto auto 0;
		width: 100%;
		max-width: 480px;
		padding: 0.6rem 1rem 1.25rem;
		color: var(--text);
		background: #111;
		border: 0;
		border-top: 1px solid var(--line);
		border-radius: 20px 20px 0 0;
	}
	.sheet::backdrop {
		background: rgb(0 0 0 / 0.55);
	}
	.sheet form {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}
	.sheet h2 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.sheet input {
		min-height: 44px;
		padding: 0 0.75rem;
		font-size: 1rem;
		background: #141414;
		border-color: var(--line);
		border-radius: 8px;
		field-sizing: fixed;
		box-sizing: border-box;
		width: 100%;
	}
	.sheet input:focus-visible {
		border-color: var(--muted);
	}
	.pair {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.6rem;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.sheet button {
		min-height: 36px;
		padding: 0 0.75rem;
		font:
			500 0.8rem 'Geist Mono',
			monospace;
		color: var(--text);
		background: none;
		border: 1px solid var(--line);
		border-radius: 8px;
		cursor: pointer;
	}
	.chips .sel {
		color: var(--up);
		border-color: var(--up);
	}
	.sheet .done {
		min-height: 44px;
		color: var(--bg);
		background: var(--text);
		border-color: var(--text);
	}
	@media (max-width: 720px) {
		.hero {
			display: flex;
			align-items: center;
			gap: 1rem;
			padding: 0.9rem 1rem;
		}
		.ring {
			position: relative;
			flex: none;
			width: 84px;
			height: 84px;
			padding: 0;
			color: var(--text);
			background: none;
			border: 0;
			border-radius: 50%;
			cursor: pointer;
		}
		.ring svg {
			width: 100%;
			height: 100%;
			transform: rotate(-90deg);
		}
		.ring circle {
			fill: none;
			stroke: var(--line);
			stroke-width: 3;
		}
		.ring .arc {
			stroke: var(--up);
			stroke-linecap: round;
		}
		.ring span {
			position: absolute;
			inset: 0;
			display: grid;
			place-items: center;
			font:
				500 0.85rem 'Geist Mono',
				monospace;
		}
		.hero-txt {
			flex: 1;
			min-width: 0;
		}
		.hero .val {
			font-size: 1.4rem;
		}
		.note {
			font-size: 0.75rem;
			color: var(--muted);
		}
		.row {
			display: flex;
			justify-content: space-between;
			align-items: center;
		}
		.edit {
			min-height: 44px;
			padding: 0;
			font: inherit;
			color: var(--muted);
			text-decoration: underline;
			text-underline-offset: 3px;
			background: none;
			border: 0;
			cursor: pointer;
		}
		.summary {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			margin-top: 0.6rem;
		}
		/* total + goal live in the hero on phones */
		.cell:nth-child(n + 3) {
			display: none;
		}
		.val {
			font-size: 1.1rem;
		}
	}
</style>
