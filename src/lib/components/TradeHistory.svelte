<script lang="ts">
	import type { Trade } from '#lib/models/stock.ts';
	import { fmt, parseDigits, sgn } from '#lib/utils/number.ts';

	let {
		trades,
		realizedById,
		onupdate,
		onremove
	}: {
		trades: Trade[];
		realizedById: Record<number, number>;
		/** error message, or undefined when saved */
		onupdate: (id: number, t: Omit<Trade, 'id' | 'fee'>) => string | undefined;
		/** error message, or undefined when removed */
		onremove: (id: number) => string | undefined;
	} = $props();

	let error = $state('');
	/** trade being edited, with price/lot as typed */
	let draft = $state<(Omit<Trade, 'price' | 'lot'> & { price: string; lot: string }) | undefined>();

	function edit(t: Trade) {
		draft = { ...t, price: fmt.format(t.price), lot: fmt.format(t.lot) };
		error = '';
	}

	function saveEdit() {
		if (!draft) return;
		const { id, date, symbol, side } = draft;
		const price = parseDigits(draft.price);
		const lot = parseDigits(draft.lot);
		if (!(price > 0 && lot > 0) || !date) {
			error = 'Enter price, lot and date.';
			return;
		}
		error = onupdate(id, { date, symbol, side, price, lot }) ?? '';
		if (!error) draft = undefined;
	}
	const rows = $derived([...trades].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id));
	// phone timeline: rows grouped by day, newest first (rows already sorted)
	const days = $derived(Object.entries(Object.groupBy(rows, (t) => t.date)));
	const dayFmt = new Intl.DateTimeFormat('en-GB', {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		timeZone: 'UTC'
	});
	/** timeline item showing its edit/delete actions */
	let picked = $state<number>();
	const amount = (t: Trade) =>
		t.price * t.lot * 100 * (1 + ((t.side === 'buy' ? 1 : -1) * t.fee) / 100);
</script>

<section aria-label="Trade history">
	<h2>Trade history</h2>
	{#if error}<p class="err" role="alert">{error}</p>{/if}
	<div class="card">
		<table>
			<thead>
				<tr>
					<th>Date</th><th>Symbol</th><th>Side</th><th>Price</th><th>Lot</th><th>Fee</th>
					<th>Amount</th><th>Realized P/L</th><th></th>
				</tr>
			</thead>
			<tbody>
				{#each rows as t (t.id)}
					{@const r = realizedById[t.id]}
					{#if draft?.id === t.id}
						<tr class="editing">
							<td><input type="date" aria-label="Date" bind:value={draft.date} /></td>
							<td>{t.symbol.replace('.JK', '')}</td>
							<td>
								<select aria-label="Side" bind:value={draft.side}>
									<option value="buy">BUY</option>
									<option value="sell">SELL</option>
								</select>
							</td>
							<td><input inputmode="numeric" aria-label="Price" bind:value={draft.price} /></td>
							<td
								><input
									inputmode="numeric"
									aria-label="Lot"
									class="lot"
									bind:value={draft.lot}
								/></td
							>
							<td>{t.fee}%</td>
							<td colspan="2"></td>
							<td class="acts">
								<button class="save" onclick={saveEdit}>Save</button>
								<button onclick={() => ((draft = undefined), (error = ''))}>Cancel</button>
							</td>
						</tr>
					{:else}
						<tr>
							<td>{t.date}</td>
							<td>{t.symbol.replace('.JK', '')}</td>
							<td><span class="tag {t.side}">{t.side.toUpperCase()}</span></td>
							<td>{fmt.format(t.price)}</td>
							<td>{fmt.format(t.lot)}</td>
							<td>{t.fee}%</td>
							<td>{fmt.format(Math.round(amount(t)))}</td>
							<td class:up={r > 0} class:down={r < 0}>
								{r === undefined ? '—' : `${sgn(r)}${fmt.format(Math.round(r))}`}
							</td>
							<td class="acts">
								<button aria-label="Edit {t.side} {t.symbol} {t.date}" onclick={() => edit(t)}
									>✎</button
								>
								<button
									class="del"
									aria-label="Delete {t.side} {t.symbol} {t.date}"
									onclick={() => (error = onremove(t.id) ?? '')}>×</button
								>
							</td>
						</tr>
					{/if}
				{/each}
			</tbody>
		</table>
	</div>
	<div class="timeline">
		{#each days as [day, ts] (day)}
			<h3>{dayFmt.format(new Date(day))}</h3>
			{#each ts ?? [] as t (t.id)}
				{@const r = realizedById[t.id]}
				<div class="item" class:open={picked === t.id || draft?.id === t.id}>
					{#if draft?.id === t.id}
						<div class="form">
							<b>{t.symbol.replace('.JK', '')}</b>
							<input type="date" aria-label="Date" bind:value={draft.date} />
							<select aria-label="Side" bind:value={draft.side}>
								<option value="buy">BUY</option>
								<option value="sell">SELL</option>
							</select>
							<input inputmode="numeric" aria-label="Price" bind:value={draft.price} />
							<input inputmode="numeric" aria-label="Lot" class="lot" bind:value={draft.lot} />
						</div>
						<div class="btns">
							<button class="save" onclick={saveEdit}>Save</button>
							<button onclick={() => ((draft = undefined), (error = ''))}>Cancel</button>
						</div>
					{:else}
						<button
							class="sum {t.side}"
							aria-expanded={picked === t.id}
							onclick={() => (picked = picked === t.id ? undefined : t.id)}
						>
							<span>
								<b>{t.symbol.replace('.JK', '')}</b>
								<span class="muted">{t.side === 'buy' ? 'bought' : 'sold'}</span>
								<small class="muted">{fmt.format(t.lot)} lot @ {fmt.format(t.price)}</small>
							</span>
							<span class="r">
								{#if r === undefined}
									{fmt.format(Math.round(amount(t)))}
									<small class="muted">fee {t.fee}%</small>
								{:else}
									<span class:up={r > 0} class:down={r < 0}
										>{sgn(r)}{fmt.format(Math.round(r))}</span
									>
									<small class="muted">{fmt.format(Math.round(amount(t)))}</small>
								{/if}
							</span>
						</button>
						{#if picked === t.id}
							<div class="btns">
								<button onclick={() => edit(t)}>✎ Edit</button>
								<button class="del" onclick={() => (error = onremove(t.id) ?? '')}>Delete</button>
							</div>
						{/if}
					{/if}
				</div>
			{/each}
		{/each}
	</div>
</section>

<style>
	h2 {
		margin: 1.6rem 0 0.6rem;
		font-size: 0.8rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted);
	}
	.err {
		color: var(--down);
		font-size: 0.8rem;
	}
	.card {
		overflow-x: auto;
		padding: 0.5rem 1.2rem;
		background: var(--card);
		border-radius: 10px;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font:
			0.85rem 'Geist Mono',
			monospace;
		font-variant-numeric: tabular-nums;
	}
	th {
		padding: 0.5rem;
		font-size: 0.7rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--muted);
	}
	th,
	td {
		text-align: right;
		white-space: nowrap;
		border-bottom: 1px solid var(--line);
	}
	td {
		padding: 0.55rem 0.5rem;
	}
	tr:last-child td {
		border-bottom: 0;
	}
	th:nth-child(-n + 3),
	td:nth-child(-n + 3) {
		text-align: left;
	}
	.tag {
		padding: 0.1rem 0.45rem;
		border: 1px solid;
		border-radius: 4px;
		font:
			600 0.7rem Geist,
			sans-serif;
	}
	.buy,
	.up {
		color: var(--up);
	}
	.sell,
	.down {
		color: var(--down);
	}
	button {
		background: none;
		border: 0;
		color: var(--muted);
		font-size: 1rem;
		cursor: pointer;
	}
	button:hover {
		color: var(--text);
	}
	.del:hover {
		color: var(--down);
	}
	.acts button + button {
		margin-left: 0.4rem;
	}
	.editing button {
		font:
			500 0.8rem Geist,
			sans-serif;
	}
	.acts .save {
		font-weight: 600;
		color: var(--text);
	}
	input,
	select {
		width: 6.5rem;
		padding: 0.25rem 0.4rem;
		font: inherit;
		color: var(--text);
		background: var(--board);
		border: 1px solid var(--line);
		border-radius: 6px;
		text-align: inherit;
	}
	.timeline {
		display: none;
		font:
			0.9rem 'Geist Mono',
			monospace;
		font-variant-numeric: tabular-nums;
	}
	h3 {
		margin: 1rem 0 0.3rem;
		font-size: 0.72rem;
		font-weight: 400;
		color: var(--muted);
	}
	h3:first-child {
		margin-top: 0;
	}
	.item {
		border-radius: 8px;
	}
	.item.open {
		background: var(--card);
	}
	.timeline button {
		font: inherit;
		color: var(--text);
	}
	.sum {
		width: 100%;
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.6rem 0.5rem 0.6rem 0.9rem;
		text-align: left;
		/* side rail */
		border-left: 3px solid currentColor;
		border-radius: 2px;
	}
	.sum.buy {
		border-left-color: var(--up);
	}
	.sum.sell {
		border-left-color: var(--down);
	}
	.sum small {
		display: block;
		margin-top: 0.2rem;
		font-size: 0.78rem;
	}
	.sum .r {
		text-align: right;
	}
	.btns {
		display: flex;
		gap: 0.5rem;
		padding: 0 0.5rem 0.6rem 0.9rem;
	}
	.timeline .btns button {
		flex: 1;
		margin: 0;
		padding: 0.45rem;
		font-size: 0.8rem;
		border: 1px solid var(--line);
		border-radius: 6px;
	}
	.timeline .btns .del {
		color: var(--down);
	}
	.form {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 0.5rem 0.6rem 0.9rem;
	}
	@media (max-width: 720px) {
		.card {
			display: none;
		}
		.timeline {
			display: block;
		}
	}
	input[type='date'] {
		width: 8.5rem;
	}
	select,
	input.lot {
		width: 4.5rem;
	}
</style>
