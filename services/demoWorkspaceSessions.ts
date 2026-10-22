import { createSeed } from "../data/seed";
import type { Marketplace } from "../types/marketplace";
import { withoutRemovedSeedListings, withoutRetiredDemoBookings, withRefreshedCatalogueShippingData } from "./catalogue";
import { repairDemoDeliveryPayments } from "./repairDemoDeliveryPayments";
import { normalizeDefaultDeliveryAddress } from "./deliveryAddresses";

// Demo accounts have no Supabase row of their own, so this is their only durable store.
// Everything the workspace holds (bookings, addresses, delivery history, disputes, evidence, ...)
// is kept as ONE snapshot under this key so there is a single source of truth per account.
// sessionStorage/in-memory below are just a same-tab cache in front of it, never a second store.
const WORKSPACE_PREFIX = "current:demo-workspace:";
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

function browserLocalStorage(): Storage | null {
  try {
    return typeof globalThis.localStorage === "undefined"
      ? null
      : globalThis.localStorage;
  } catch {
    return null;
  }
}

function key(accountId: string) {
  return `${STORAGE_PREFIX}${accountId}`;
}

function workspaceKey(accountId: string) {
  return `${WORKSPACE_PREFIX}${accountId}`;
}

function readDurableWorkspace(accountId: string): Marketplace | null {
  try {
    const raw = browserLocalStorage()?.getItem(workspaceKey(accountId));
    if (!raw) return null;
    const state: unknown = JSON.parse(raw);
    return isMarketplaceSnapshot(state) ? state : null;
  } catch {
    return null;
  }
}

function withNormalizedAddresses(state: Marketplace): Marketplace {
  return { ...state, profiles: state.profiles.map((profile) =>
    profile.id === state.currentUserId ? normalizeDefaultDeliveryAddress(profile) : profile) };
}

function sanitize(state: Marketplace): Marketplace {
  return withNormalizedAddresses(
    repairDemoDeliveryPayments(
      withRefreshedCatalogueShippingData(withoutRetiredDemoBookings(withoutRemovedSeedListings(state))),
    ),
  );
}

export function loadDemoWorkspaceSession(accountId: string): Marketplace {
  const storage = browserSessionStorage();
  const serialized = storage?.getItem(key(accountId));
  if (serialized) {
    try {
      const state: unknown = JSON.parse(serialized);
      if (isMarketplaceSnapshot(state)) return sanitize(state);
    } catch {
      storage?.removeItem(key(accountId));
    }
  }

  const memoryState = memorySessions.get(accountId);
  if (memoryState && isMarketplaceSnapshot(memoryState)) return sanitize(memoryState);

  const durable = readDurableWorkspace(accountId);
  if (durable) {
    const restored = sanitize(durable);
    saveDemoWorkspaceSession(accountId, restored);
    return restored;
  }

  const fresh = sanitize(createSeed("admin_demo"));
  saveDemoWorkspaceSession(accountId, fresh);
  return fresh;
}

// Explicitly resets the demo account back to its seed data, discarding anything saved before it.
// Only ever call this when the user actually wants a fresh demo, never as part of ordinary login.
export function startDemoWorkspaceSession(accountId: string): Marketplace {
  const fresh = sanitize(createSeed("admin_demo"));
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
  try {
    browserLocalStorage()?.setItem(workspaceKey(accountId), JSON.stringify(copy));
  } catch { /* The session remains usable for this tab without durable browser storage. */ }
}

// Ends the active tab session only. The durable per-account workspace in localStorage is left
// intact so bookings, addresses, and everything else are there the next time this account signs in.
export function closeDemoWorkspaceSession(accountId: string): void {
  memorySessions.delete(accountId);
  browserSessionStorage()?.removeItem(key(accountId));
}
