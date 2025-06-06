import { fs } from '$lib/fs';
import type { DirectoryEntry } from '$lib/fs';
import { connectWallet } from '$lib/web3';
import { browser } from '$app/environment';

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

async function editFile(filePath: string): Promise<string> {
    try {
        let content = '';
        try {
            content = await fs.readFile(filePath);
        } catch {
            // File doesn't exist, will be created
        }
        return JSON.stringify({
            type: 'editor',
            filePath,
            content
        }, null, 2);
        // return JSON.stringify({
        //     success: true,
        //     message: 'File saved successfully'
        // })
    } catch (error: any) {
        return JSON.stringify({ error: error?.message || 'Unknown error' }, null, 2);
    }
}

async function searchToken(symbol: string): Promise<string> {
    try {
        // First search for the token by symbol
        const searchResponse = await fetch(`https://eth.blockscout.com/api/v2/search?q=${encodeURIComponent(symbol)}`);
        const searchData = await searchResponse.json();

        // Find the first token result
        const token = searchData.items?.find((item: any) =>
            item.type === 'token' &&
            item.symbol?.toLowerCase() === symbol.toLowerCase()
        );

        console.log({ token });

        if (!token?.address) {
            return JSON.stringify({ error: `Token '${symbol}' not found` }, null, 2);
        }

        // Get detailed token info
        const tokenResponse = await fetch(`https://eth.blockscout.com/api/v2/tokens/${token.address}`);
        const tokenData = await tokenResponse.json();

        console.log({ tokenData });

        return JSON.stringify({
            type: 'token',
            data: {
                name: tokenData.name,
                symbol: tokenData.symbol,
                address: tokenData.address,
                totalSupply: tokenData.total_supply,
                decimals: tokenData.decimals,
                holders: tokenData.holders,
                type: tokenData.type,
                exchangeRate: tokenData.exchange_rate
            }
        }, null, 2);
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
                        { name: 'edit', args: '<path>', desc: 'Create or edit a file' },
                        { name: 'token', args: '<symbol>', desc: 'Get token information' },
                        { name: 'search', args: '<query>', desc: 'Search Blockscout' },
                        { name: 'login', args: '', desc: 'Show current login time' },
                        { name: 'wallet new', args: '', desc: 'Create a new wallet' },
                        { name: 'wallet ls', args: '', desc: 'List all wallets' }
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
        case 'edit':
            if (!args[0]) {
                return {
                    in: trimmed,
                    out: JSON.stringify({ error: 'File path is required' }, null, 2)
                };
            }
            const editResult = await editFile(args[0]);
            return {
                in: trimmed,
                out: editResult
            };
        case 'token':
            if (!args[0]) {
                return {
                    in: trimmed,
                    out: JSON.stringify({ error: 'Token symbol is required' }, null, 2)
                };
            }
            const tokenResult = await searchToken(args[0]);
            return {
                in: trimmed,
                out: tokenResult
            };
        case 'search':
            const searchResult = await searchBlockscout(args.join(' '));
            return {
                in: trimmed,
                out: searchResult
            };
        case 'passwd':
            if (!args[0]) {
                return {
                    in: trimmed,
                    out: JSON.stringify({ error: 'Password text is required' }, null, 2)
                };
            }
            try {
                // Check if we're in a browser environment
                if (!browser) {
                    return {
                        in: trimmed,
                        out: JSON.stringify({ error: 'Password commands only available in browser' }, null, 2)
                    };
                }

                // set only if it doesnt exist or empty
                if (!localStorage.getItem('PASSWD')) {
                    localStorage.setItem('PASSWD', args[0]);
                    return {
                        in: trimmed,
                        out: JSON.stringify({ success: true, message: 'Password saved successfully' }, null, 2)
                    };
                }
                return {
                    in: trimmed,
                    out: JSON.stringify({ success: false, message: 'Password already exists. Not updated' }, null, 2)
                };

            } catch (error: any) {
                return {
                    in: trimmed,
                    out: JSON.stringify({ error: error?.message || 'Failed to save password' }, null, 2)
                };
            }
        case 'login':
            const conn = await connectWallet()
            return {
                in: trimmed,
                out: JSON.stringify({
                    success: true,
                    message: `Connected to Ethereum. ${new Date().toLocaleString()}`
                }, null, 2)
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
