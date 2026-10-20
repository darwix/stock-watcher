<script lang="ts">
	import { page } from '$app/state';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const title = 'IDX watchlist · live Indonesia stock prices';
	const description =
		'Track IDX (Bursa Efek Indonesia) stocks live: add BBCA, TLKM, BBRI and more, see price and daily change, and calculate P/L and break-even after broker fees.';
	// social crawlers need absolute URLs
	const url = $derived(page.url.origin + page.url.pathname);
	const image = $derived(page.url.origin + '/og.png');
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={url} />
	<meta name="theme-color" content="#0e0f11" />

	<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<link rel="manifest" href="/manifest.webmanifest" />

	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="IDX watchlist" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={url} />
	<meta property="og:image" content={image} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:locale" content="id_ID" />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={image} />
</svelte:head>

{@render children()}
