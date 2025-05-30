<script lang="ts">
	import { HEADING, PREFIX } from '$lib/constants';
	import { onMount } from 'svelte';
	import { tick } from 'svelte';
	let promptEl: HTMLDivElement;
	type io = { in: string; out: string };
	let output: io[] = $state([]);

	function handleCommand(cmd: string) {
		const trimmed = cmd.trim();
		console.log({ output });
		if (!trimmed) return;
		if (trimmed === 'help') {
			output.push({ in: trimmed, out: 'Available commands: help' });
		} else {
			output.push({ in: trimmed, out: `Command not found: ${trimmed}` });
		}
	}

	onMount(() => {
		const focusPrompt = (e: MouseEvent) => {
			if (promptEl && document.activeElement !== promptEl) {
				promptEl.focus();
			}
		};
		document.addEventListener('click', focusPrompt);
		return () => document.removeEventListener('click', focusPrompt);
	});

	async function onKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			const cmd = promptEl.innerText;
			handleCommand(cmd);
			promptEl.innerText = '';
			await tick();
			promptEl.focus();
		}
	}
</script>

<pre id="banner">{HEADING}</pre>
<div id="terminal-output">
	{#each output as line}
		<div class="term-output-line">{PREFIX}<span class="in">{line.in}</span></div>
		<div class="term-output-line out">{line.out}</div>
	{/each}
</div>
<div id="prompt">
	<span id="term-prefix">{PREFIX}</span>
	<div id="term-input" bind:this={promptEl} contenteditable on:keydown={onKeyDown}></div>
	<span id="cursor"></span>
</div>

<style>
	.in {
		color: #fff;
		padding-left: 0.25rem;
	}
	.out {
		padding-left: 1rem;
	}
	#prompt {
		display: flex;
		align-items: center;
		position: relative;
		width: 100%;
		height: 1.2em;
	}
	#term-prefix {
		color: limegreen;
		padding-right: 0.25rem;
		font-weight: normal;
	}
	#cursor {
		display: inline-block;
		width: 0.5rem;
		height: 1.2em;
		position: relative;
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
		/* color: #ffa128; */
		font-weight: bold;
		background-color: transparent;
		border: none;
		word-break: break-all;
		white-space: pre-wrap;
		caret-color: transparent;
		padding: 0;
		margin: 0;
	}
	#banner {
		margin-bottom: 2rem;
		font-size: 0.5rem;
		text-shadow:
			0 0 1.1428571429rem #b3df60,
			0 0 1.7142857143rem #d0dc7e;
	}
	#prompt {
		width: 100%;
		background: transparent;
		border: none;
		color: #fff;
		font-weight: bold;
	}
	#prompt:focus {
		outline: none;
		border: none;
	}
	/* #terminal-output {
		color: #fff;
		font-family: 'Courier New', Courier, monospace;
		font-size: 0.8rem;
		margin-bottom: 1rem;
	} */
	.term-output-line {
		/* padding: 0.1rem 0; */
	}
</style>
