// ModeExitCleaner.ts
// Utility providing managed setTimeout / setInterval that are automatically
// cleared whenever the application leaves the current mode (edit ↔ play).
// This prevents timer callbacks from firing after objects/helpers have been
// disposed, eliminating a whole class of subtle runtime errors.

import global from "../global";

/** Internal registries */
const timeouts = new Set<number>();
const intervals = new Set<number>();
let listenerAttached = false;

/**
 *
 */
function attachModeExitListener() {
  if (listenerAttached) return;
  const app = global.app;
  if (!app || !app.on) return; // Wait until Application is fully constructed
  app.on("appModeExited.ModeExitCleaner", () => {
    timeouts.forEach(id => clearTimeout(id));
    intervals.forEach(id => clearInterval(id));
    timeouts.clear();
    intervals.clear();
  });
  listenerAttached = true;
}

/**
 *
 * @param handler
 * @param timeout
 * @param {...any} args
 */
export function setManagedTimeout(handler: (...args: unknown[]) => void, timeout?: number, ...args: unknown[]): ReturnType<typeof setTimeout> {
  const id = window.setTimeout(handler, timeout, ...args);
  timeouts.add(id);
  attachModeExitListener();
  return id as unknown as ReturnType<typeof setTimeout>;
}

/**
 *
 * @param id
 */
export function clearManagedTimeout(id: number): void {
  clearTimeout(id);
  timeouts.delete(id);
}

/**
 *
 * @param handler
 * @param timeout
 * @param {...any} args
 */
export function setManagedInterval(handler: (...args: unknown[]) => void, timeout?: number, ...args: unknown[]): ReturnType<typeof setInterval> {
  const id = window.setInterval(handler, timeout, ...args);
  intervals.add(id);
  attachModeExitListener();
  return id as unknown as ReturnType<typeof setInterval>;
}

/**
 *
 * @param id
 */
export function clearManagedInterval(id: number): void {
  clearInterval(id);
  intervals.delete(id);
} 