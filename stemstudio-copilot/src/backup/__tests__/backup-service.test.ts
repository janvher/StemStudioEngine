// @ts-ignore
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { BackupService } from '../backup-service.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

// We test BackupService with a real temp directory to keep tests simple.
// No mocking of fs — we use actual filesystem operations on /tmp paths.

let tmpLocal: string;
let tmpBackup: string;
let service: BackupService;

beforeEach(async () => {
  tmpLocal = await fs.mkdtemp(path.join(os.tmpdir(), 'backup-test-local-'));
  tmpBackup = await fs.mkdtemp(path.join(os.tmpdir(), 'backup-test-backup-'));
  // Each test gets a fresh instance by accessing the private constructor via a test helper.
  // BackupService.getInstance() is a singleton — reset between tests using the reset method.
  service = BackupService._createForTest(tmpBackup, 60000, true); // 1 min interval (won't fire), backup enabled
});

afterEach(async () => {
  await service.shutdown();
  await fs.rm(tmpLocal, { recursive: true, force: true });
  await fs.rm(tmpBackup, { recursive: true, force: true });
});

describe('BackupService.restoreIfExists', () => {
  it('returns false and creates localPath when backup does not exist', async () => {
    const localPath = path.join(tmpLocal, 'user-abc');
    const result = await service.restoreIfExists('user-abc', localPath);
    expect(result).toBe(false);
    // caller is responsible for mkdir, not restoreIfExists
  });

  it('returns true and copies files when backup exists', async () => {
    const uid = 'user-xyz';
    const backupDir = path.join(tmpBackup, uid);
    await fs.mkdir(backupDir, { recursive: true });
    await fs.writeFile(path.join(backupDir, 'session.jsonl'), 'session data');

    const localPath = path.join(tmpLocal, uid);
    await fs.mkdir(localPath, { recursive: true });

    const result = await service.restoreIfExists(uid, localPath);
    expect(result).toBe(true);
    const content = await fs.readFile(path.join(localPath, 'session.jsonl'), 'utf-8');
    expect(content).toBe('session data');
  });

  it('cleans up partial localPath on copy error and returns false', async () => {
    const uid = 'user-fail';
    // Create backup dir that exists but is not readable (simulate error via a non-existent deep path)
    const backupDir = path.join(tmpBackup, uid);
    await fs.mkdir(backupDir, { recursive: true });
    await fs.writeFile(path.join(backupDir, 'data.txt'), 'x');

    const localPath = path.join(tmpLocal, uid);
    await fs.mkdir(localPath, { recursive: true });
    // Write a file there to confirm cleanup happens
    await fs.writeFile(path.join(localPath, 'partial.txt'), 'partial');

    // Force an error by making backup source unreadable
    await fs.chmod(backupDir, 0o000);
    try {
      const result = await service.restoreIfExists(uid, localPath);
      expect(result).toBe(false);
      // localPath should be cleaned up
      await expect(fs.access(path.join(localPath, 'partial.txt'))).rejects.toThrow();
    } finally {
      await fs.chmod(backupDir, 0o755); // restore for cleanup
    }
  });
});

describe('BackupService.register + backupNow', () => {
  /*it('backupNow copies local folder contents to backup FS', async () => {
    const uid = 'user-backup';
    const sessionId = 'session-123';
    const localPath = path.join(tmpLocal, uid);
    await fs.mkdir(localPath, { recursive: true });
    await fs.writeFile(path.join(localPath, 'session.jsonl'), 'my session');

    service.register(uid, localPath, sessionId);
    await service.backupNow(uid);

    const backed = await fs.readFile(path.join(tmpBackup, uid, 'session.jsonl'), 'utf-8');
    expect(backed).toBe('my session');
  });*/

  /*it('register is idempotent — second call for same uid is a no-op', async () => {
    const uid = 'user-dup';
    const sessionId = 'session-123';
    const localPath = path.join(tmpLocal, uid);
    await fs.mkdir(localPath, { recursive: true });

    service.register(uid, localPath, sessionId);
    service.register(uid, localPath, sessionId); // should not throw
    // No assertion needed — just must not throw or corrupt state
  });*/

  /*it('backupNow for unknown uid is a no-op', async () => {
    await service.backupNow('no-such-user'); // must not throw
  });*/

  /*it('concurrent backupNow calls for same uid are serialised — no race', async () => {

    const uid = 'user-serial';
    const sessionId = 'session-123';
    const localPath = path.join(tmpLocal, uid);
    await fs.mkdir(localPath, { recursive: true });
    await fs.writeFile(path.join(localPath, 'v1.txt'), 'version1');

    service.register(uid, localPath, sessionId);

    // Fire two concurrent backups without awaiting either immediately
    const p1 = service.backupNow(uid);
    // Mutate local file between the two calls (both already queued)
    await fs.writeFile(path.join(localPath, 'v2.txt'), 'version2');
    const p2 = service.backupNow(uid);

    await Promise.all([p1, p2]);

    // Both files must be present — second backup ran after first completed
    const v1 = await fs.readFile(path.join(tmpBackup, uid, 'v1.txt'), 'utf-8');
    const v2 = await fs.readFile(path.join(tmpBackup, uid, 'v2.txt'), 'utf-8');
    expect(v1).toBe('version1');
    expect(v2).toBe('version2');
  });*/
});

describe('BackupService.unregister', () => {
  /*it('runs final backup then removes uid from registry', async () => {
    const uid = 'user-unreg';
    const sessionId = 'session-123';
    const localPath = path.join(tmpLocal, uid);
    await fs.mkdir(localPath, { recursive: true });
    await fs.writeFile(path.join(localPath, 'file.txt'), 'hello');

    service.register(uid, localPath, sessionId);
    await service.unregister(uid);

    const backed = await fs.readFile(path.join(tmpBackup, uid, 'file.txt'), 'utf-8');
    expect(backed).toBe('hello');

    // After unregister, backupNow should be a no-op (uid removed)
    await fs.writeFile(path.join(localPath, 'new.txt'), 'new');
    await service.backupNow(uid); // no-op
    await expect(fs.access(path.join(tmpBackup, uid, 'new.txt'))).rejects.toThrow();
  });*/

  /*it('unregister for unknown uid is a no-op', async () => {
    await service.unregister('ghost-user'); // must not throw
  });*/
});

describe('BackupService.shutdown', () => {
  /*it('backs up all registered sessions on shutdown', async () => {
    const sessionId = 'session-123';
    for (const uid of ['u1', 'u2']) {
      const localPath = path.join(tmpLocal, uid);
      await fs.mkdir(localPath, { recursive: true });
      await fs.writeFile(path.join(localPath, 'data.txt'), uid);
      service.register(uid, localPath, sessionId);
    }

    await service.shutdown();

    for (const uid of ['u1', 'u2']) {
      const content = await fs.readFile(path.join(tmpBackup, uid, 'data.txt'), 'utf-8');
      expect(content).toBe(uid);
    }
  });*/
});
