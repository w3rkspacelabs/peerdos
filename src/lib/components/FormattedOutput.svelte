<!-- FormattedOutput.svelte -->
<script lang="ts">
	import hljs from 'highlight.js/lib/core';
	import json from 'highlight.js/lib/languages/json';
	import 'highlight.js/styles/github-dark.css';
	import { onMount } from 'svelte';
	import Table from './ObjectTable.svelte';
	import ObjectTable from './ObjectTable.svelte';

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

	function hasMessage(parsed: any) {
		return parsed.message;
	}

	function isList(parsed: any) {
		return Array.isArray(parsed);
	}
</script>

{#if parsed?.type === 'table'}
	<div class="help-table">
		<table>
			<thead>
				<tr>
					{#each parsed.headers as header}
						<th>{header}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each parsed.rows as row}
					<tr>
						<td class="command">{row.name}</td>
						<td class="args">{row.args}</td>
						<td class="desc">{row.desc}</td>
					</tr>
				{/each}
			</tbody>
		</table>
		{#if parsed.note}
			<p class="note"><em>{parsed.note}</em></p>
		{/if}
	</div>
{:else if isSearchResult(parsed)}
	<div class="search-results">
		<table>
			<thead>
				<tr>
					<th>Name</th>
					<th>Address</th>
					<th>Type</th>
				</tr>
			</thead>
			<tbody>
				{#if parsed.items.length > 0}
					{#each parsed.items.filter((item) => item.exchange_rate !== null) as item}
						<tr>
							<td>{item.name || '-'}</td>
							<td
								>{#if item.address}<a
										class="address"
										target="_blank"
										href="https://eth.blockscout.com/address/{item.address}">{item.address}</a
									>{:else}-{/if}
							</td>
							<td>{item.token_type || '-'}</td>
						</tr>
					{/each}
				{:else}
					<tr>
						<td colspan="3">No onchain data available for this address</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>
{:else if hasMessage(parsed)}
	<div class="message">
		<p>
			{#if parsed.success}
				<span class="emoji">✅</span>
			{:else}
				<span class="emoji">❌</span>
			{/if}
			{parsed.message}
		</p>
	</div>
{:else if isList(parsed)}
	<div class="file-list">
		<table>
			<thead>
				<tr>
					<th>Name</th>
					<th>Type</th>
					<th>Size</th>
				</tr>
			</thead>
			<tbody>
				{#each parsed as item}
					<tr>
						<td class="name">
							{#if item.isDirectory}
								📁
							{:else}
								📄
							{/if}
							{item.name}
						</td>
						<td>{item.type}</td>
						<td>{item.size} bytes</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{:else if parsed.success && parsed.data}
	<ObjectTable data={parsed.data}></ObjectTable>
{:else}
	<pre><code class="language-json">{JSON.stringify(parsed, null, 2)}</code></pre>
{/if}

<style>
	.help-table {
		margin: 1rem 0;
	}
	table {
		border-collapse: collapse;
		width: 100%;
	}
	th {
		text-align: left;
		padding: 0.5rem;
		border-bottom: 1px solid #666;
	}
	td {
		padding: 0.5rem;
	}
	.command {
		font-weight: bold;
		color: #4caf50;
	}
	.args {
		color: #ffa726;
	}
	.note {
		margin-top: 1rem;
		color: #888;
	}
	.search-results {
		padding: 0.5rem 0;
		overflow-x: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-family: 'Courier New', Courier, monospace;
	}
	th {
		text-align: left;
		padding: 0.5rem;
		border-bottom: 1px solid #444;
		color: #888;
		font-weight: normal;
	}
	td {
		padding: 0.5rem;
		border-bottom: 1px solid #2a2a2a;
		color: #fff;
	}
	.address {
		font-family: monospace;
		color: #4a9eff;
	}
	tr:hover {
		background: #2a2a2a;
	}
</style>
