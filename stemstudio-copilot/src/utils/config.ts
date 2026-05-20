/**
 * Centralized configuration for the Studio API base URL.
 * In Docker/K8s the copilot calls itself via pod DNS or service URL,
 * not localhost. STUDIO_API_HOST env var allows overriding.
 */

const PORT = process.env.PORT || 3000;
const HOST = process.env.STUDIO_API_HOST || `http://localhost:${PORT}`;

export const STUDIO_API_BASE = `${HOST}/api/studio/scene`;

export const getUserFolder = (uid: string) => {
    const parentFolder = process.env.CLAUDE_USER_FOLDER || "/private/tmp/studio-agent/users";
    return `${parentFolder}/${uid}`;
}

export const getProjectFolderName = (uid: string) => {
    return getUserFolder(uid).replaceAll("/", "-");
}

export const getProjectFolderPath = (uid: string) => {
    const claudeConfigFolder = process.env.CLAUDE_CONFIG_FOLDER || `${process.env.HOME}/.claude`;
    return `${claudeConfigFolder}/projects/${getProjectFolderName(uid)}`;
}

export const BACKUP_FS_ENABLED = process.env.BACKUP_FS_ENABLED === 'true';

export const BACKUP_FS_PATH = process.env.BACKUP_FS_PATH ?? '';

export const BACKUP_INTERVAL_MS = parseInt(process.env.BACKUP_INTERVAL_MS ?? '300000', 10);

export function validateBackupConfig(): void {
    console.log(`Validating backup config: BACKUP_FS_ENABLED=${BACKUP_FS_ENABLED}, BACKUP_FS_PATH=${BACKUP_FS_PATH}, BACKUP_INTERVAL_MS=${BACKUP_INTERVAL_MS}`);
  if (BACKUP_FS_ENABLED && !BACKUP_FS_PATH) {
    throw new Error('BACKUP_FS_ENABLED=true but BACKUP_FS_PATH is not set');
  }
  if (isNaN(BACKUP_INTERVAL_MS) || BACKUP_INTERVAL_MS < 1000) {
    throw new Error(`BACKUP_INTERVAL_MS must be a number >= 1000, got: ${process.env.BACKUP_INTERVAL_MS}`);
  }
}