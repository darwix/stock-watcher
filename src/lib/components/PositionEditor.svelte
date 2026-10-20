<script lang="ts">
	import type { Fees, Holding, Trade } from '#lib/models/stock.ts';
	import { calcPosition } from '#lib/utils/position.ts';
	import { fmt, groupInput, parseDigits, sgn } from '#lib/utils/number.ts';

	let {
		symbol,
		live,
		holding,
		fees,
		onadd
	}: {
		symbol: string;
		live: number | undefined;
		holding: Holding | undefined;
		fees: Fees;
		/** error message, or undefined when saved */
		onadd: (t: Omit<Trade, 'id' | 'fee'>) => string | undefined;
	} = $props();

	let editing = $state(false);
	let side = $state<Trade['side']>('buy');
	let price = $state('');
	let lot = $state('');
	let date = $state('');
	let error = $state('');
	let priceEl = $state<HTMLInputElement>();

	const held = $derived(holding?.lot ? holding : undefined);
	const calc = $derived(held && live ? calcPosition(held, live, fees.sell) : undefined);
	const draft = $derived.by(() => {
		const p = parseDigits(price);
		const l = parseDigits(lot);
		if (!(p > 0 && l > 0)) return '';
		const amount = p * l * 100;
		return side === 'buy'
			? `Cost ${fmt.format(Math.round(amount * (1 + fees.buy / 100)))}`
			: `Proceeds ${fmt.format(Math.round(amount * (1 - fees.sell / 100)))}`;
	});

	function edit() {
		side = 'buy';
		price = live ? fmt.format(live) : '';
		lot = '';
		date = new Date().toLocaleDateString('sv', { timeZone: 'Asia/Jakarta' });
		error = '';
		editing = true;
		queueMicrotask(() => priceEl?.focus());
	}

	function submit(e: SubmitEvent & { currentTarget: HTMLFormElement }) {
		e.preventDefault();
		const p = parseDigits(price);
		const l = parseDigits(lot);
		if (!(p > 0 && l > 0) || !date) {
			error = 'Enter price, lot and date.';
			return;
		}
		error = onadd({ date, symbol, side, price: p, lot: l }) ?? '';
		if (!error) editing = false;
	}
</script>

<div class="pos">
	{#if editing}
		<form onsubmit={submit}>
			<div class="seg" role="group" aria-label="Side">
				<button
					type="button"
					class="b"
					aria-pressed={side === 'buy'}
					onclick={() => (side = 'buy')}
				>
					Buy
				</button>
				<button
					type="button"
					class="s"
					aria-pressed={side === 'sell'}
					onclick={() => (side = 'sell')}
				>
					Sell
				</button>
			</div>
			<label>
				Price
				<input
					name="price"
					inputmode="numeric"
					autocomplete="off"
					bind:this={priceEl}
					value={price}
					oninput={(e) => (price = groupInput(e.currentTarget))}
				/>
			</label>
			<label>
				Lot
				<input
					name="lot"
					inputmode="numeric"
					autocomplete="off"
					placeholder={side === 'sell' && held ? String(held.lot) : '10'}
					value={lot}
					oninput={(e) => (lot = groupInput(e.currentTarget))}
				/>
			</label>
			<label class="full">
				Date
				<input name="date" type="date" bind:value={date} />
			</label>
			<div class="preview" class:err={error}>{error || draft}</div>
			<div class="actions">
				<button type="button" onclick={() => (editing = false)}>Cancel</button>
				<button class="save">Add trade</button>
			</div>
		</form>
	{:else if held}
		<button class="held" aria-label="Add {symbol} trade" onclick={edit}>
			<span
				><b>{fmt.format(held.lot)}</b> lot · avg
				<b>{fmt.format(Math.round(held.cost / held.lot / 100))}</b></span
			>
			{#if calc}
				<span>BEP <b>{fmt.format(calc.bep)}</b></span>
				<span class="pl" class:up={calc.pl > 0} class:down={calc.pl < 0}>
					{sgn(calc.pl)}{fmt.format(Math.round(calc.pl))} ({sgn(calc.pl)}{calc.pct.toFixed(2)}%)
				</span>
			{/if}
		</button>
	{:else}
		<button class="add" onclick={edit}>{holding ? 'No holding · + trade' : '+ trade'}</button>
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
	.preview.err {
		color: var(--down);
	}
	.seg,
	.full {
		grid-column: 1 / -1;
	}
	.seg {
		display: flex;
		border: 1px solid var(--line);
		border-radius: 6px;
		overflow: hidden;
		align-self: end;
	}
	.seg button {
		flex: 1;
		padding: 0.45rem 0;
		background: none;
		border: 0;
		color: var(--muted);
		font:
			600 0.8rem Geist,
			sans-serif;
		cursor: pointer;
	}
	.seg .b[aria-pressed='true'] {
		background: var(--up);
		color: var(--board);
	}
	.seg .s[aria-pressed='true'] {
		background: var(--down);
		color: var(--board);
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
	button:focus-visible {
		outline: 2px solid var(--text);
		outline-offset: 2px;
	}
</style>
