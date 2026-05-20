import fs from "node:fs/promises";

export async function isFile(path: string) {
    try {
        // Check if the file exists and the Node.js process can access it
        await fs.access(path);
        return true;
    } catch {
        // An error is thrown if the file doesn't exist or permissions are insufficient
        return false;
    }
}

export async function isDirectory(path: string) {
    try {
        const stats = await fs.stat(path);
        return stats.isDirectory();
    } catch (error: any) {
        return false;
    }
}