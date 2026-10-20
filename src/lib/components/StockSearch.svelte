<script lang="ts">
	import type { SearchResult } from '#lib/models/stock.ts';

	let { onpick }: { onpick: (symbol: string) => void } = $props();

	let q = $state('');
	let results = $state<SearchResult[]>([]);
	let failed = $state(false);
	let timer: ReturnType<typeof setTimeout>;

	function oninput() {
		clearTimeout(timer);
		timer = setTimeout(async () => {
			if (!q.trim()) return (results = []);
			try {
				const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
				if (!res.ok) throw new Error();
				results = await res.json();
				failed = false;
			} catch {
				failed = true;
			}
		}, 250);
	}

	function pick(symbol: string) {
		onpick(symbol);
		q = '';
		results = [];
	}
</script>

<div class="search">
	<input
		type="search"
		placeholder="Add stock: BBCA, Telkom…"
		aria-label="Search IDX stocks"
		bind:value={q}
		{oninput}
		onkeydown={(e) => e.key === 'Enter' && results[0] && pick(results[0].symbol)}
	/>
	{#if failed}<p class="muted">Search unavailable, try again.</p>{/if}
	{#if results.length}
		<ul>
			{#each results as r (r.symbol)}
				<li>
					<button onclick={() => pick(r.symbol)}>
						<b>{r.symbol.replace('.JK', '')}</b> <span class="muted">{r.name}</span>
					</button>
				</li>
			{/each}
		</ul>
	{:else if q.trim() && !failed}
		<p class="muted">No IDX match.</p>
	{/if}
</div>

<style>
	.search {
		position: relative;
	}
	input {
		width: 100%;
		padding: 0.6rem 0.8rem;
		font: inherit;
		border: 1px solid var(--line);
		border-radius: 6px;
		background: var(--card);
		color: inherit;
	}
	ul {
		position: absolute;
		z-index: 1;
		inset: 100% 0 auto;
		margin: 4px 0 0;
		padding: 0;
		list-style: none;
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: 6px;
	}
	li button {
		width: 100%;
		text-align: left;
		padding: 0.5rem 0.8rem;
		border: 0;
		background: none;
		color: inherit;
		font: inherit;
		cursor: pointer;
	}
	li button:hover {
		background: var(--line);
	}
</style>
