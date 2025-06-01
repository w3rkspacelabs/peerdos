<script lang="ts">
	import { HEADING, PREFIX } from '$lib/constants';
	import { onMount } from 'svelte';
	import { tick } from 'svelte';
	import { processCommand, type CommandOutput } from '$lib/commands';
	import FormattedOutput from '$lib/components/FormattedOutput.svelte';
	import { fs } from '$lib/fs';
	import Editor from '$lib/components/Editor.svelte';
	import {
		connectWallet,
		decryptSecret,
		disconnectWallet,
		encryptAndSaveSecret,
		saveWallet,
		generatePK,
		getSavedSecrets,
		getWallets
	} from '$lib/web3';
	import { getBalances } from '$lib/utils';

	let promptEl: HTMLDivElement;
	let scrollEnd: HTMLDivElement;
	let output: CommandOutput[] = $state([]);
	let PWD = $state('');
	let USER = $state('');
	let loading = $state(false);
	let editingFile: string | null = $state(null);
	let isPasswordInput = $state(false);
	let actualPasswordValue = $state('');
	let account: any = $state('guest');

	async function handleCommand(cmd: string) {
		if (cmd == 'login') {
			const conn = await connectWallet();
			account = conn?.accounts[0];
			console.log({ conn, account });
			output.push({
				in: 'login',
				out: JSON.stringify(
					{
						success: true,
						message: `Connected to eth:${account}`
					},
					null,
					2
				)
			});
			return;
		} else if (cmd == 'logout') {
			disconnectWallet().then(() => {
				account = 'guest';
				output.push({
					in: 'logout',
					out: JSON.stringify({ success: true, message: 'Disconnected from Ethereum' }, null, 2)
				});
			});
			return;
		} else if (cmd == 'user') {
			output.push({
				in: 'user',
				out: JSON.stringify({ success: account !== 'guest', message: account })
			});
			return;
		} else if (cmd == 'balances') {
			const balances = await getBalances(account);
			output.push({
				in: 'balances',
				out: JSON.stringify(balances)
			});
			return;
		} else if (cmd == 'wallet new') {
			let dres = await getSavedSecrets();
			console.log({ dres });
			let pass = await decryptSecret(dres[account]);
			if (!pass) {
				const pk = generatePK();
				console.log({ pk });
				const res = await encryptAndSaveSecret(pk, account);
				console.log({ res });
				dres = await getSavedSecrets();
				pass = await decryptSecret(dres[account]);
			}
			let pk = generatePK();
			console.log({ pk, pass });
			if (!pass) return;
			saveWallet(pk, pass, account);

			output.push({
				in: 'wallet new',
				out: JSON.stringify({ success: true, message: 'Wallet created' }, null, 2)
			});
			return;
		} else if (cmd == 'wallet ls') {
			const secrets = await getSavedSecrets();
			console.log({ secrets });
			const wallets = await getWallets();
			output.push({
				in: 'wallet ls',
				out: JSON.stringify({ wallets: wallets[account] }, null, 2)
			});
			return;
		}
		console.log({ cmd, isPasswordInput, actualPasswordValue });
		const result = await processCommand(isPasswordInput ? `passwd ${actualPasswordValue}` : cmd);
		if (result.action === 'CLEAR') {
			output = [];
		} else if (result.in) {
			console.log({ result });
			if (result.in.startsWith('passwd ')) {
				let hiddenOutput = Object.assign({}, result);
				hiddenOutput.in = 'passwd ***';
				output.push(hiddenOutput);
			} else {
				output.push(result);
			}

			// Check if this is an edit action
			try {
				const parsed = JSON.parse(result.out);
				if (parsed.action === 'EDIT') {
					editingFile = parsed.path;
				}
			} catch {}
		}
		isPasswordInput = false;
		actualPasswordValue = '';
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

	function onKeyPress(e: KeyboardEvent) {
		const currentValue = promptEl.innerText;

		// Check if we're starting password input
		if (currentValue.startsWith('passwd ')) {
			isPasswordInput = true;
			e.preventDefault();
			// return;
			promptEl.innerText = `${currentValue}*`;
			actualPasswordValue = `${actualPasswordValue}${e.key}`;
			console.log({ password: e.key, currentValue, actualPasswordValue });
		}

		// If we're in password input mode
		// if (isPasswordInput) {
		// 	e.preventDefault();
		// 	if (e.key.length === 1) {
		// 		// Only handle printable characters
		// 		actualPasswordValue += e.key;
		// 		promptEl.innerText = 'passwd ' + '*'.repeat(actualPasswordValue.length);
		// 	}
		// }
	}

	async function onKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			const cmd = isPasswordInput ? actualPasswordValue : promptEl.innerText;
			loading = true;
			handleCommand(cmd).then(() => {
				promptEl.innerText = '';
				loading = false;
				focus();
			});
			await tick();
			focus();
		} else if (isPasswordInput && e.key === 'Backspace') {
			e.preventDefault();
			actualPasswordValue = actualPasswordValue.slice(0, -1);
			promptEl.innerText = 'passwd ' + '*'.repeat(actualPasswordValue.length);
		}
	}
</script>

<div class="terminal-container">
	<pre id="banner">{HEADING}</pre>
	<span id="user">{account}</span>
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
			onkeypress={onKeyPress}
		></div>
		{#if loading}
			<span class="spinner">⏳</span>
		{/if}
		<span id="cursor"></span>
	</div>
</div>

{#if editingFile}
	<Editor filePath={editingFile} onClose={() => (editingFile = null)} />
{/if}

<style>
	#user {
		background-color: darkgreen;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		margin-right: 0.5rem;
		display: inline-block;
		position: absolute;
		right: 1rem;
		top: 1rem;
	}

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
