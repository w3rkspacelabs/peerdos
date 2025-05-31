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

export async function processCommand(cmd: string): Promise<CommandOutput> {
    const trimmed = cmd.trim();

    if (!trimmed) {
        return { in: '', out: '' };
    }

    switch (trimmed) {
        case 'help':
            return {
                in: trimmed,
                out: JSON.stringify({
                    commands: ['help', 'clear'],
                    note: 'Any other input will be treated as a search query'
                }, null, 2)
            };
        case 'clear':
            return {
                in: trimmed,
                out: '',
                action: 'CLEAR'
            };
        default:
            const searchResult = await searchBlockscout(trimmed);
            return {
                in: trimmed,
                out: searchResult
            };
    }
} 
