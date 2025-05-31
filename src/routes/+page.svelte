<script lang="ts">
	import { HEADING, PREFIX } from '$lib/constants';
	import { onMount } from 'svelte';
	import { tick } from 'svelte';
	import { processCommand, type CommandOutput } from '$lib/commands';
	import FormattedOutput from '$lib/components/FormattedOutput.svelte';
	import { fs } from '$lib/fs';
	import Editor from '$lib/components/Editor.svelte';

	let promptEl: HTMLDivElement;
	let scrollEnd: HTMLDivElement;
	let output: CommandOutput[] = $state([]);
	let PWD = $state('');
	let loading = $state(false);
	let editingFile: string | null = $state(null);

	async function handleCommand(cmd: string) {
		const result = await processCommand(cmd);
		if (result.action === 'CLEAR') {
			output = [];
		} else if (result.in) {
			output.push(result);
			// Check if this is an edit action
			try {
				const parsed = JSON.parse(result.out);
				if (parsed.action === 'EDIT') {
					editingFile = parsed.path;
				}
			} catch {}
		}

		await tick();
	}

	function focus() {
		promptEl.focus();
		scrollEnd.scrollIntoView({ behavior: 'smooth' });
	}

	onMount(() => {
		console.log({ PREFIX, PWD, scrollEnd, promptEl });
		let isSelecting = false;
		let selectionTimeout: ReturnType<typeof setTimeout>;

		const onMouseDown = () => {
			isSelecting = false;
			clearTimeout(selectionTimeout);
		};

		const onMouseMove = (e: MouseEvent) => {
			if (e.buttons === 1) {
				// Left mouse button is being held
				isSelecting = true;
			}
		};

		const onMouseUp = () => {
			if (isSelecting) {
				// Keep selection state true for a short time to allow for copy
				clearTimeout(selectionTimeout);
				selectionTimeout = setTimeout(() => {
					isSelecting = false;
				}, 500); // Give 500ms to copy after selection
			}
		};

		const focusPrompt = (e: MouseEvent) => {
			if (promptEl && document.activeElement !== promptEl && !isSelecting) {
				focus();
			}
		};

		const config = { childList: true };

		const callback = function (mutationsList, observer) {
			for (let mutation of mutationsList) {
				if (mutation.type === 'childList') {
					window.scrollTo(0, document.body.scrollHeight);
				}
			}
		};

		const observer = new MutationObserver(callback);
		observer.observe(scrollEnd, config);

		document.addEventListener('mousedown', onMouseDown);
		document.addEventListener('mousemove', onMouseMove);
		document.addEventListener('mouseup', onMouseUp);
		document.addEventListener('click', focusPrompt);
		promptEl?.focus(); // Focus on initial mount

		return () => {
			document.removeEventListener('mousedown', onMouseDown);
			document.removeEventListener('mousemove', onMouseMove);
			document.removeEventListener('mouseup', onMouseUp);
			document.removeEventListener('click', focusPrompt);
			clearTimeout(selectionTimeout);
		};
	});

	async function onKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			const cmd = promptEl.innerText;
			loading = true;
			handleCommand(cmd).then(() => {
				promptEl.innerText = '';
				loading = false;
				focus();
			});
			await tick();
			focus();
		}
	}
</script>

<div class="terminal-container">
	<pre id="banner">{HEADING}</pre>
	<div id="terminal-output">
		{#each output as line}
			<div class="term-output-in">{PREFIX}{PWD}$<span class="in">{line.in}</span></div>
			<div class="term-output-out"><FormattedOutput data={line.out} /></div>
		{/each}
		<div id="scroll-end" bind:this={scrollEnd}>&nbsp;</div>
	</div>
	<div id="prompt">
		<span id="term-prefix">{PREFIX}{PWD}$</span>
		<div
			id="term-input"
			bind:this={promptEl}
			contenteditable
			role="textbox"
			tabindex="0"
			onkeydown={onKeyDown}
		></div>
		{#if loading}
			<span class="spinner">⏳</span>
		{/if}
		<span id="cursor"></span>
	</div>
</div>

{#if editingFile}
	<Editor filePath={editingFile} {fs} onClose={() => (editingFile = null)} />
{/if}

<style>
	.terminal-container {
		height: 100vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		padding: 1rem;
		box-sizing: border-box;
	}

	#banner {
		margin: 0 0 1rem 0;
		font-size: 0.5rem;
		text-shadow:
			0 0 1.1428571429rem #b3df60,
			0 0 1.7142857143rem #d0dc7e;
		flex-shrink: 0;
	}

	#terminal-output {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		margin-bottom: 1rem;
		padding-right: 0.5rem;
		/* Custom scrollbar styles */
		scrollbar-width: thin;
		scrollbar-color: #666 #1e1e1e;
		align-content: flex-end;
	}

	/* Webkit scrollbar styles */
	#terminal-output::-webkit-scrollbar {
		width: 6px;
	}

	#terminal-output::-webkit-scrollbar-track {
		background: #1e1e1e;
	}

	#terminal-output::-webkit-scrollbar-thumb {
		background: #666;
		border-radius: 3px;
	}

	#terminal-output::-webkit-scrollbar-thumb:hover {
		background: #888;
	}

	.term-output-out {
		padding-left: 1rem;
		border-bottom: 1px solid #333;
		margin-bottom: 0.5rem;
	}

	.term-output-in {
		padding-left: 1rem;
		margin-bottom: 0.25rem;
	}

	.in {
		color: #fff;
		padding-left: 0.25rem;
	}

	#prompt {
		display: flex;
		align-items: center;
		position: relative;
		width: 100%;
		min-height: 1.2em;
		padding: 0.5rem;
		background: #0003;
		flex-shrink: 0;
	}

	#term-prefix {
		color: limegreen;
		padding-right: 0.25rem;
		font-weight: normal;
		flex-shrink: 0;
	}

	#cursor {
		display: inline-block;
		width: 0.5rem;
		height: 1.2em;
		position: relative;
		flex-shrink: 0;
	}

	#cursor::before {
		content: '';
		position: absolute;
		background-color: var(--cursor-color, limegreen);
		width: 100%;
		height: 100%;
		animation: blink 1s steps(1, end) infinite;
	}

	@keyframes blink {
		50% {
			opacity: 0;
		}
	}

	#term-input {
		outline: none;
		cursor: none;
		font-weight: bold;
		background-color: transparent;
		border: none;
		word-break: break-all;
		white-space: pre-wrap;
		caret-color: transparent;
		padding: 0;
		margin: 0;
		width: auto;
		min-width: 1ch;
		display: inline-block;
	}

	.spinner {
		display: inline-block;
		animation: spin 2s linear infinite;
		margin-left: 0.5rem;
		flex-shrink: 0;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>
