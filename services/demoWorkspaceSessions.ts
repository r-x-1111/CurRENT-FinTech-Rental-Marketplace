import { createSeed } from "../data/seed";
import type { Marketplace } from "../types/marketplace";

const STORAGE_PREFIX = "current:demo-session:";
const memorySessions = new Map<string, Marketplace>();

function isMarketplaceSnapshot(value: unknown): value is Marketplace {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<Marketplace>;
  if (
    state.version !== 1 ||
    state.mode !== "admin_demo" ||
    !Array.isArray(state.profiles) ||
    !Array.isArray(state.listings) ||
    !Array.isArray(state.bookings) ||
    !Array.isArray(state.messages) ||
    !Array.isArray(state.evidence) ||
    !Array.isArray(state.reviews) ||
    !Array.isArray(state.notifications) ||
    !Array.isArray(state.disputes)
  ) {
    return false;
  }
  return true;
}

function browserSessionStorage(): Storage | null {
  try {
    return typeof globalThis.sessionStorage === "undefined"
      ? null
      : globalThis.sessionStorage;
  } catch {
    return null;
  }
}

function key(accountId: string) {
  return `${STORAGE_PREFIX}${accountId}`;
}

export function loadDemoWorkspaceSession(accountId: string): Marketplace {
  const storage = browserSessionStorage();
  const serialized = storage?.getItem(key(accountId));
  if (serialized) {
    try {
      const state: unknown = JSON.parse(serialized);
      if (isMarketplaceSnapshot(state)) return state;
    } catch {
      storage?.removeItem(key(accountId));
    }
  }

  const memoryState = memorySessions.get(accountId);
  if (memoryState && isMarketplaceSnapshot(memoryState)) return memoryState;

  const fresh = createSeed("admin_demo");
  saveDemoWorkspaceSession(accountId, fresh);
  return fresh;
}

export function startDemoWorkspaceSession(accountId: string): Marketplace {
  const fresh = createSeed("admin_demo");
  saveDemoWorkspaceSession(accountId, fresh);
  return fresh;
}

export function saveDemoWorkspaceSession(
  accountId: string,
  state: Marketplace,
): void {
  if (!isMarketplaceSnapshot(state)) {
    throw new Error("The Demo workspace state is invalid.");
  }
  const copy: Marketplace = JSON.parse(JSON.stringify(state));
  memorySessions.set(accountId, copy);
  browserSessionStorage()?.setItem(key(accountId), JSON.stringify(copy));
}

export function closeDemoWorkspaceSession(accountId: string): void {
  memorySessions.delete(accountId);
  browserSessionStorage()?.removeItem(key(accountId));
}
