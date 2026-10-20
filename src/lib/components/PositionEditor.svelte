<script lang="ts">
	import type { Fees, Position } from '#lib/models/stock.ts';
	import { calcPosition } from '#lib/utils/position.ts';
	import { fmt, groupDigits, parseDigits, sgn } from '#lib/utils/number.ts';

	let {
		symbol,
		live,
		pos,
		fees,
		onsave
	}: {
		symbol: string;
		live: number | undefined;
		pos: Position | undefined;
		fees: Fees;
		onsave: (pos: Position | null) => void;
	} = $props();

	let editing = $state(false);
	let price = $state('');
	let lot = $state('');
	let priceEl = $state<HTMLInputElement>();

	const calc = $derived(pos && live ? calcPosition(pos, live, fees) : undefined);
	const draft = $derived.by(() => {
		const p = parseDigits(price);
		const l = parseDigits(lot);
		return p > 0 && l > 0 && live ? calcPosition({ price: p, lot: l }, live, fees) : undefined;
	});

	function edit() {
		price = pos ? fmt.format(pos.price) : '';
		lot = pos ? fmt.format(pos.lot) : '';
		editing = true;
		queueMicrotask(() => priceEl?.focus());
	}

	// thousands dots while typing, caret stays after the same digit
	function group(e: Event & { currentTarget: HTMLInputElement }) {
		const el = e.currentTarget;
		const g = groupDigits(el.value, el.selectionStart ?? el.value.length);
		el.value = g.value;
		el.setSelectionRange(g.caret, g.caret);
		return g.value;
	}

	function submit(e: SubmitEvent & { currentTarget: HTMLFormElement }) {
		e.preventDefault();
		const p = parseDigits(price);
		const l = parseDigits(lot);
		// both empty = remove; otherwise both required
		if (!price && !lot) onsave(null);
		else if (p > 0 && l > 0) onsave({ price: p, lot: l });
		else {
			(e.currentTarget.elements.namedItem(p > 0 ? 'lot' : 'price') as HTMLInputElement).focus();
			return;
		}
		editing = false;
	}

	function remove() {
		onsave(null);
		editing = false;
	}
</script>

<div class="pos">
	{#if editing}
		<form onsubmit={submit}>
			<label>
				Buy price
				<input
					name="price"
					inputmode="numeric"
					autocomplete="off"
					placeholder={live ? fmt.format(live) : ''}
					bind:this={priceEl}
					value={price}
					oninput={(e) => (price = group(e))}
				/>
			</label>
			<label>
				Lot
				<input
					name="lot"
					inputmode="numeric"
					autocomplete="off"
					placeholder="10"
					value={lot}
					oninput={(e) => (lot = group(e))}
				/>
			</label>
			<div class="preview">
				{#if draft}Cost {fmt.format(Math.round(draft.cost))} · BEP {fmt.format(draft.bep)}{/if}
			</div>
			<div class="actions">
				{#if pos}<button type="button" class="clear" onclick={remove}>Remove</button>{/if}
				<button type="button" onclick={() => (editing = false)}>Cancel</button>
				<button class="save">Save</button>
			</div>
		</form>
	{:else if pos}
		<button class="held" aria-label="Edit {symbol} position" onclick={edit}>
			<span><b>{fmt.format(pos.lot)}</b> lot @ <b>{fmt.format(pos.price)}</b></span>
			{#if calc}
				<span>BEP <b>{fmt.format(calc.bep)}</b></span>
				<span class="pl" class:up={calc.pl > 0} class:down={calc.pl < 0}>
					{sgn(calc.pl)}{fmt.format(Math.round(calc.pl))} ({sgn(calc.pl)}{calc.pct.toFixed(2)}%)
				</span>
			{/if}
		</button>
	{:else}
		<button class="add" onclick={edit}>+ position</button>
	{/if}
</div>

<style>
	.pos {
		margin-top: 0.9rem;
		padding-top: 0.8rem;
		border-top: 1px dashed var(--line);
		font-size: 0.82rem;
	}
	.add {
		background: none;
		border: 0;
		padding: 0.2rem 0;
		color: var(--muted);
		font: inherit;
		cursor: pointer;
		transition: color 0.2s;
	}
	.add:hover {
		color: var(--text);
	}
	.held {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.25rem 1rem;
		width: calc(100% + 0.8rem);
		margin: -0.4rem;
		padding: 0.4rem;
		text-align: left;
		background: none;
		border: 0;
		border-radius: 6px;
		font: inherit;
		color: var(--muted);
		cursor: pointer;
		transition: background 0.2s;
	}
	.held:hover {
		background: #1a1d20;
	}
	.held b {
		color: var(--text);
		font-weight: 500;
	}
	.pl {
		grid-column: 1 / -1;
		font-size: 1.15rem;
		font-weight: 500;
	}
	.up {
		color: var(--up);
	}
	.down {
		color: var(--down);
	}
	form {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
	}
	label {
		min-width: 0;
		display: grid;
		gap: 0.25rem;
		font-size: 0.7rem;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}
	input {
		box-sizing: border-box;
		width: 100%;
		padding: 0.45rem 0.55rem;
		font:
			500 0.95rem 'Geist Mono',
			monospace;
		color: var(--text);
		background: var(--board);
		border: 1px solid var(--line);
		border-radius: 6px;
		transition: border-color 0.2s;
	}
	input:focus-visible {
		outline: none;
		border-color: var(--muted);
	}
	.preview {
		grid-column: 1 / -1;
		color: var(--muted);
		font-size: 0.78rem;
		min-height: 1.2em;
	}
	.actions {
		grid-column: 1 / -1;
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}
	.actions button {
		padding: 0.4rem 0.8rem;
		border-radius: 6px;
		font:
			500 0.8rem Geist,
			sans-serif;
		cursor: pointer;
		border: 1px solid var(--line);
		background: none;
		color: var(--muted);
		transition: transform 0.1s;
	}
	.actions button:active {
		transform: translateY(1px);
	}
	.actions .save {
		background: var(--text);
		color: var(--board);
		border-color: var(--text);
	}
	.actions .clear {
		margin-right: auto;
		border: 0;
		padding-left: 0;
		color: var(--down);
	}
	button:focus-visible {
		outline: 2px solid var(--text);
		outline-offset: 2px;
	}
</style>
