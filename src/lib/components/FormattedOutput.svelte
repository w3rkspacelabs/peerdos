<!-- FormattedOutput.svelte -->
<script lang="ts">
	import hljs from 'highlight.js/lib/core';
	import json from 'highlight.js/lib/languages/json';
	import 'highlight.js/styles/github-dark.css';
	import { onMount } from 'svelte';

	hljs.registerLanguage('json', json);

	export let data: any;
	let parsed: any;

	$: {
		try {
			parsed = typeof data === 'string' ? JSON.parse(data) : data;
		} catch {
			parsed = data;
		}
	}

	function isCommandHelp(data: any): boolean {
		return data?.commands && Array.isArray(data.commands);
	}

	function isSearchResult(data: any): boolean {
		return data?.items && Array.isArray(data.items);
	}

	onMount(() => {
		document.querySelectorAll('pre code').forEach((block) => {
			hljs.highlightElement(block as HTMLElement);
		});
	});
</script>

{#if isCommandHelp(parsed)}
	<div class="help-output">
		<div class="commands">
			Available commands:
			{#each parsed.commands as cmd}
				<span class="command">{cmd}</span>
			{/each}
		</div>
		{#if parsed.note}
			<div class="note">{parsed.note}</div>
		{/if}
	</div>
{:else if isSearchResult(parsed)}
	<div class="search-results">
		{#each parsed.items as item}
			<div class="result-item">
				{#if item.name}
					<div class="name">{item.name}</div>
				{/if}
				{#if item.address}
					<div class="address">
						<span class="label">Address:</span>
						<span class="value">{item.address}</span>
					</div>
				{/if}
				{#if item.token_type}
					<div class="token-type">
						<span class="label">Type:</span>
						<span class="value">{item.token_type}</span>
					</div>
				{/if}
			</div>
		{/each}
	</div>
{:else}
	<pre><code class="language-json">{JSON.stringify(parsed, null, 2)}</code></pre>
{/if}

<style>
	.help-output {
		padding: 0.5rem 0;
	}
	.commands {
		margin-bottom: 0.5rem;
	}
	.command {
		background: #2a2a2a;
		padding: 0.2rem 0.5rem;
		border-radius: 3px;
		margin-right: 0.5rem;
		color: #fff;
	}
	.note {
		color: #888;
		font-style: italic;
	}
	.search-results {
		padding: 0.5rem 0;
	}
	.result-item {
		background: #2a2a2a;
		padding: 1rem;
		border-radius: 4px;
		margin-bottom: 0.5rem;
	}
	.name {
		font-size: 1.1em;
		font-weight: bold;
		margin-bottom: 0.5rem;
		color: #fff;
	}
	.address,
	.token-type {
		margin: 0.25rem 0;
	}
	.label {
		color: #888;
		margin-right: 0.5rem;
	}
	.value {
		color: #4a9eff;
		font-family: monospace;
	}
	pre code {
		font-family: 'Courier New', Courier, monospace;
		padding: 1rem;
		border-radius: 4px;
		margin: 0.5rem 0;
	}
</style>
