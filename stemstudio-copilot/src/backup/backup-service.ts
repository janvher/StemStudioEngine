import { cp, rm, access, mkdir } from 'node:fs/promises';
import * as path from 'node:path';
import { createLogger } from '../utils/logger.js';
import { BACKUP_FS_ENABLED, BACKUP_FS_PATH, BACKUP_INTERVAL_MS } from '../utils/config.js';
import {isDirectory, isFile} from "../utils/fs/fsutils";

const log = createLogger('backup');

export class BackupService {
  private registry = new Map<string, { localPath: string, sessionId: string }>(); // uid → localPath
  private inFlight = new Map<string, Promise<void>>(); // uid → serialised promise chain
  private timer: ReturnType<typeof setInterval> | null = null;
  private backupFsPath: string;
  private enabled: boolean;

  // Singleton instance
  private static instance: BackupService | null = null;

  private constructor(backupFsPath: string, intervalMs: number, enabled = BACKUP_FS_ENABLED) {
    this.backupFsPath = backupFsPath;
    this.enabled = enabled;
    this.timer = setInterval(() => {
      this._tickAll().catch(err => log.error('Backup timer error', { error: String(err) }));
    }, intervalMs);
    this.timer.unref();
  }

  static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService(BACKUP_FS_PATH, BACKUP_INTERVAL_MS);
    }
    return BackupService.instance;
  }

  /** For tests only — creates an isolated instance without touching the singleton.
   *  Pass enabled=true to force backup on regardless of BACKUP_FS_ENABLED env var. */
  static _createForTest(backupFsPath: string, intervalMs: number, enabled = false): BackupService {
    return new BackupService(backupFsPath, intervalMs, enabled);
  }

  register(uid: string, localPath: string, sessionId: string): void {
    //we're also storing session ID, which may change
    //if (this.registry.has(uid)) return; // idempotent
    //NOTICE: we limit user to a single session
    this.registry.set(uid, {localPath, sessionId});
    log.info('Registered session for backup', { uid, projectPath: localPath, sessionId });
  }

  async unregister(uid: string): Promise<void> {
    if (!this.registry.has(uid)) return;
    await this.backupNow(uid);
    this.registry.delete(uid);
    log.info('Unregistered session from backup', { uid });
  }

  async backupNow(uid: string): Promise<void> {
    const localPathAndSessionId = this.registry.get(uid);
    if (!localPathAndSessionId) return;

    // Chain onto existing in-flight promise to serialise per-UID.
    // .finally() cleans up the resolved promise to prevent inFlight map from growing unbounded.
    const prev = this.inFlight.get(uid) ?? Promise.resolve();
    const next: Promise<void> = prev
      .then(() => this._doBackup(uid, localPathAndSessionId.localPath, localPathAndSessionId.sessionId))
      .finally(() => { if (this.inFlight.get(uid) === next) this.inFlight.delete(uid); });
    this.inFlight.set(uid, next);
    await next;
  }

  private async _doBackup(uid: string, localPath: string, sessionId: string): Promise<void> {
    if (!this.enabled) return;
    const dest = path.join(this.backupFsPath, uid);
    try {
      await mkdir(dest, { recursive: true });
      let file = false, folder = false;
      const jsonlFile = `${path.join(localPath, sessionId)}.jsonl`;
      const destFile = `${path.join(dest, sessionId)}.jsonl`;
      if (await isFile(jsonlFile)) {
          file = true;
          await cp(jsonlFile, destFile, {force: true});
      }
      const sessionFolder = path.join(localPath, sessionId);
      const destFolder = path.join(dest, sessionId);
      if (await isDirectory(sessionFolder)) {
          folder = true;
          await cp(sessionFolder, destFolder, {recursive: true, force: true});
      }
      log.info('Backup complete', { uid, localPath, sessionId, file, folder });
    } catch (err) {
      log.error('Backup failed', { uid, error: String(err) });
      // Do not re-throw — backup errors must not interrupt sessions
    }
  }

  async restoreIfExists(uid: string, localPath: string): Promise<boolean> {
    if (!this.enabled) return false;
    const src = path.join(this.backupFsPath, uid);
    try {
      await access(src);
    } catch {
      // Backup does not exist
      return false;
    }
    try {
      await mkdir(localPath, { recursive: true });
      await cp(src, localPath, { recursive: true, force: true });
      log.info('Restored sessions from backup', { uid, localPath });
      return true;
    } catch (err) {
      log.warn('Restore failed — cleaning up and starting fresh', { uid, error: String(err) });
      await rm(localPath, { recursive: true, force: true });
      return false;
    }
  }

  async shutdown(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    // Parallel across UIDs, serial within each UID (via per-UID chain)
    await Promise.all([...this.registry.keys()].map(uid => this.backupNow(uid)));
    log.info('Shutdown backup complete', { count: this.registry.size });
  }

  private async _tickAll(): Promise<void> {
    if (this.registry.size === 0) return; // no-op when empty
    // Sequential (not parallel) to avoid I/O storms on the mounted S3 filesystem.
    // shutdown() uses Promise.all for speed on graceful exit — that's intentional and different.
    for (const uid of this.registry.keys()) {
      await this.backupNow(uid);
    }
  }
}
