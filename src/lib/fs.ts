import FS from '@isomorphic-git/lightning-fs';
import { browser } from '$app/environment';

// Initialize the filesystem
const lfs = browser ? new FS('peerdos-fs') : null;
const pfs = lfs?.promises || null;

export interface FSError {
    code: string;
    message: string;
}

export interface Stats {
    type: 'file' | 'dir';
    size: number;
    mode: number;
    ino: number;
    mtimeMs: number;
    ctimeMs: number;
    uid: number;
    gid: number;
}

export interface DirectoryEntry {
    name: string;
    type: 'file' | 'dir';
    size?: number;
}

export class FileSystem {
    private static instance: FileSystem;
    private currentDir: string = '/';

    private constructor() { }

    static getInstance(): FileSystem {
        if (!FileSystem.instance) {
            FileSystem.instance = new FileSystem();
        }
        return FileSystem.instance;
    }

    async pwd(): Promise<string> {
        return this.currentDir;
    }

    async cd(path: string): Promise<void> {
        if (!browser || !pfs) return;

        const resolvedPath = this.resolvePath(path);
        try {
            const stats = await pfs.stat(resolvedPath);
            if (stats.type !== 'dir') {
                throw new Error('Not a directory');
            }
            this.currentDir = resolvedPath;
        } catch (error) {
            throw new Error(`cd: ${path}: No such directory`);
        }
    }

    async ls(path?: string): Promise<DirectoryEntry[]> {
        if (!browser || !pfs) return [];

        const targetPath = path ? this.resolvePath(path) : this.currentDir;
        try {
            const files = await pfs.readdir(targetPath);
            const entries: DirectoryEntry[] = [];

            for (const file of files) {
                const stats = await pfs.stat(`${targetPath}/${file}`);
                entries.push({
                    name: file,
                    type: stats.type,
                    size: stats.size
                });
            }

            return entries;
        } catch (error) {
            throw new Error(`ls: ${path}: No such directory`);
        }
    }

    async mkdir(path: string): Promise<void> {
        if (!browser || !pfs) return;

        const resolvedPath = this.resolvePath(path);
        try {
            await pfs.mkdir(resolvedPath);
        } catch (error) {
            throw new Error(`mkdir: Cannot create directory '${path}'`);
        }
    }

    async writeFile(path: string, content: string): Promise<void> {
        if (!browser || !pfs) return;

        const resolvedPath = this.resolvePath(path);
        try {
            await pfs.writeFile(resolvedPath, content, 'utf8');
        } catch (error) {
            throw new Error(`writeFile: Cannot write to '${path}'`);
        }
    }

    async readFile(path: string): Promise<string> {
        if (!browser || !pfs) return '';

        const resolvedPath = this.resolvePath(path);
        try {
            const content = await pfs.readFile(resolvedPath, 'utf8');
            return content;
        } catch (error) {
            throw new Error(`readFile: Cannot read '${path}'`);
        }
    }

    async rm(path: string): Promise<void> {
        if (!browser || !pfs) return;

        const resolvedPath = this.resolvePath(path);
        try {
            const stats = await pfs.stat(resolvedPath);
            if (stats.type === 'dir') {
                throw new Error('Is a directory, use rmdir');
            }
            await pfs.unlink(resolvedPath);
        } catch (error) {
            throw new Error(`rm: Cannot remove '${path}'`);
        }
    }

    async rmdir(path: string): Promise<void> {
        if (!browser || !pfs) return;

        const resolvedPath = this.resolvePath(path);
        try {
            await pfs.rmdir(resolvedPath);
        } catch (error) {
            throw new Error(`rmdir: Cannot remove directory '${path}'`);
        }
    }

    private resolvePath(path: string): string {
        if (path.startsWith('/')) {
            return path;
        }
        return `${this.currentDir}/${path}`.replace(/\/+/g, '/');
    }
}

// Export a singleton instance
export const fs = FileSystem.getInstance(); 