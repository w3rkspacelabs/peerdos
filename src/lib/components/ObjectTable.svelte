<script lang="ts">
	let { data } = $props<{
		data: Record<string, any>;
	}>();

	function isObject(value: any): boolean {
		return value !== null && typeof value === 'object' && !Array.isArray(value);
	}

	function isSimpleValue(value: any): boolean {
		return (
			value === null ||
			value === undefined ||
			typeof value === 'string' ||
			typeof value === 'number' ||
			typeof value === 'boolean'
		);
	}

	function formatValue(value: any): string {
		if (value === null || value === undefined) return '-';
		if (typeof value === 'object') return JSON.stringify(value);
		return String(value);
	}

	const rows = $derived(
		Object.entries(data || {}).map(([key, value]) => ({
			key,
			value: isSimpleValue(value) ? formatValue(value) : JSON.stringify(value, null, 2)
		}))
	);
</script>

{#if data && Object.keys(data).length > 0}
	<div class="object-table">
		<table>
			<thead>
				<tr>
					<th>Key</th>
					<th>Value</th>
				</tr>
			</thead>
			<tbody>
				{#each rows as row}
					<tr>
						<td class="key">{row.key}</td>
						<td class="value">
							{#if isObject(data[row.key])}
								<pre><code>{row.value}</code></pre>
							{:else}
								{row.value}
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<style>
	.object-table {
		margin: 1rem 0;
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
		vertical-align: top;
	}
	.key {
		font-weight: bold;
		color: #4caf50;
		white-space: nowrap;
	}
	.value {
		font-family: monospace;
	}
	.value pre {
		margin: 0;
		white-space: pre-wrap;
	}
	.value code {
		color: #ffa726;
	}
	tr:hover {
		background: #2a2a2a;
	}
</style>
