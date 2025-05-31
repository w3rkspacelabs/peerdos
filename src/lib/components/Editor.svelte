<script lang="ts">
	import { fs } from '$lib/fs';
	import { onMount } from 'svelte';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher<{
		save: { success: boolean; filePath: string };
	}>();

	export let filePath: string;
	export let content: string = '';
	export let onClose: () => void;

	let editor: HTMLTextAreaElement;
	let isSaving = false;
	let saveMessage = '';
	let saveMessageTimeout: ReturnType<typeof setTimeout>;
	let hasUnsavedChanges = false;

	async function handleSave() {
		if (isSaving) return;
		isSaving = true;
		try {
			await fs.writeFile(filePath, editor.value);
			saveMessage = '✅ File saved successfully';
			hasUnsavedChanges = false;
			dispatch('save', { success: true, filePath });
		} catch (error) {
			saveMessage = '❌ Failed to save file';
			console.error('Failed to save file:', error);
			dispatch('save', { success: false, filePath });
		}
		isSaving = false;

		if (saveMessageTimeout) {
			clearTimeout(saveMessageTimeout);
		}
		saveMessageTimeout = setTimeout(() => {
			saveMessage = '';
		}, 3000);
	}

	function handleKeyDown(e: KeyboardEvent) {
		// Save on Ctrl+S or Cmd+S
		if ((e.ctrlKey || e.metaKey) && e.key === 's') {
			e.preventDefault();
			handleSave();
		}
		// Close on Escape
		if (e.key === 'Escape') {
			e.preventDefault();
			closeEditor();
		}
	}

	function handleInput() {
		hasUnsavedChanges = true;
	}

	async function closeEditor() {
		if (hasUnsavedChanges) {
			const shouldSave = confirm(
				'You have unsaved changes. Would you like to save before closing?'
			);
			if (shouldSave) {
				await handleSave();
			}
		}
		const event = new CustomEvent('close');
		window.dispatchEvent(event);
	}

	onMount(() => {
		editor.focus();
		// Add global event listener for closing
		window.addEventListener('close-editor', closeEditor);
		return () => {
			window.removeEventListener('close-editor', closeEditor);
		};
	});
</script>

<div class="editor-overlay" on:click={closeEditor}>
	<div class="editor-container" on:click|stopPropagation>
		<div class="editor-header">
			<span class="file-path">📄 {filePath}</span>
			<div class="actions">
				{#if saveMessage}
					<span class="save-message">{saveMessage}</span>
				{/if}
				{#if hasUnsavedChanges}
					<span class="unsaved-indicator">●</span>
				{/if}
				<button class="save-btn" on:click={handleSave} disabled={isSaving}>
					{isSaving ? 'Saving...' : 'Save (Ctrl+S)'}
				</button>
				<button class="close-btn" on:click={closeEditor}>Close (Esc)</button>
			</div>
		</div>
		<textarea
			bind:this={editor}
			class="editor"
			spellcheck="false"
			on:keydown={handleKeyDown}
			on:input={handleInput}
			value={content}
		></textarea>
	</div>
</div>

<style>
	.editor-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
		padding: 2rem;
	}

	.editor-container {
		background: #1e1e1e;
		border: 1px solid #333;
		border-radius: 4px;
		width: 90%;
		max-width: 1200px;
		height: 80vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
	}

	.editor-header {
		background: #252525;
		padding: 0.75rem 1rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1px solid #333;
	}

	.file-path {
		color: #ddd;
		font-family: monospace;
		font-size: 1rem;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.save-message {
		color: #ddd;
		font-size: 0.9rem;
	}

	.save-btn,
	.close-btn {
		border: none;
		border-radius: 4px;
		padding: 0.5rem 1rem;
		cursor: pointer;
		font-size: 0.9rem;
		transition: background-color 0.2s;
	}

	.save-btn {
		background: #4a9eff;
		color: white;
	}

	.save-btn:hover {
		background: #3a8eef;
	}

	.save-btn:disabled {
		background: #666;
		cursor: not-allowed;
	}

	.close-btn {
		background: #444;
		color: #ddd;
	}

	.close-btn:hover {
		background: #555;
	}

	.editor {
		flex: 1;
		width: 100%;
		padding: 1rem;
		background: #1e1e1e;
		color: #ddd;
		border: none;
		font-family: monospace;
		font-size: 14px;
		line-height: 1.5;
		resize: none;
	}

	.editor:focus {
		outline: none;
	}

	.unsaved-indicator {
		color: #ffa726;
		font-size: 1.2rem;
		margin-right: 0.5rem;
	}
</style>
