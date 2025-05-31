import { fs } from '$lib/fs';
import type { DirectoryEntry } from '$lib/fs';

export interface CommandOutput {
    in: string;
    out: string;
    action?: 'CLEAR';
}

async function searchBlockscout(query: string): Promise<string> {
    try {
        const response = await fetch(`https://eth.blockscout.com/api/v2/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        return JSON.stringify(data, null, 2);
    } catch (error: any) {
        return JSON.stringify({ error: error?.message || 'Unknown error' }, null, 2);
    }
}

async function listDirectory(dirPath: string = '.'): Promise<string> {
    try {
        const entries = await fs.ls(dirPath);
        const fileStats = entries.map((entry: DirectoryEntry) => ({
            name: entry.name,
            isDirectory: entry.type === 'dir',
            size: entry.size || 0,
            type: entry.type
        }));
        return JSON.stringify(fileStats, null, 2);
    } catch (error: any) {
        return JSON.stringify({ error: error?.message || 'Unknown error' }, null, 2);
    }
}

async function createDirectory(dirPath: string): Promise<string> {
    try {
        await fs.mkdir(dirPath);
        return JSON.stringify({ success: true, message: `Directory '${dirPath}' created` }, null, 2);
    } catch (error: any) {
        return JSON.stringify({ error: error?.message || 'Unknown error' }, null, 2);
    }
}

async function createFile(filePath: string): Promise<string> {
    try {
        await fs.writeFile(filePath, '');
        return JSON.stringify({ success: true, message: `File '${filePath}' created` }, null, 2);
    } catch (error: any) {
        return JSON.stringify({ error: error?.message || 'Unknown error' }, null, 2);
    }
}

export async function processCommand(cmd: string): Promise<CommandOutput> {
    const trimmed = cmd.trim();

    if (!trimmed) {
        return { in: '', out: '' };
    }

    // Split command and arguments
    const [command, ...args] = trimmed.split(' ');

    switch (command) {
        case 'help':
            return {
                in: trimmed,
                out: JSON.stringify({
                    type: 'table',
                    headers: ['Command', 'Args', 'Description'],
                    rows: [
                        { name: 'help', args: '', desc: 'Show this help message' },
                        { name: 'clear', args: '', desc: 'Clear the terminal' },
                        { name: 'ls', args: '[path]', desc: 'List directory contents' },
                        { name: 'mkdir', args: '<path>', desc: 'Create a directory' },
                        { name: 'touch', args: '<path>', desc: 'Create a file' },
                        { name: 'search', args: '<query>', desc: 'Search Blockscout' }
                    ],
                    note: 'Any other input will be treated as a search query'
                }, null, 2)
            };
        case 'clear':
            return {
                in: trimmed,
                out: '',
                action: 'CLEAR'
            };
        case 'ls':
            const path = args[0] || '.';
            const listing = await listDirectory(path);
            return {
                in: trimmed,
                out: listing
            };
        case 'mkdir':
            if (!args[0]) {
                return {
                    in: trimmed,
                    out: JSON.stringify({ error: 'Directory path is required' }, null, 2)
                };
            }
            const mkdirResult = await createDirectory(args[0]);
            return {
                in: trimmed,
                out: mkdirResult
            };
        case 'touch':
            if (!args[0]) {
                return {
                    in: trimmed,
                    out: JSON.stringify({ error: 'File path is required' }, null, 2)
                };
            }
            const touchResult = await createFile(args[0]);
            return {
                in: trimmed,
                out: touchResult
            };
        case 'search':
            const searchResult = await searchBlockscout(args.join(' '));
            return {
                in: trimmed,
                out: searchResult
            };
        default:
            // Treat as a search query by default
            const defaultSearchResult = await searchBlockscout(trimmed);
            return {
                in: trimmed,
                out: defaultSearchResult
            };
    }
}
