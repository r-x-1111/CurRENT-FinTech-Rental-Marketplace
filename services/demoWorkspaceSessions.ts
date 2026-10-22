import { createSeed } from "../data/seed";
import type { Marketplace } from "../types/marketplace";
import { withoutRemovedSeedListings, withoutRetiredDemoBookings, withRefreshedCatalogueShippingData } from "./catalogue";
import { repairDemoDeliveryPayments } from "./repairDemoDeliveryPayments";
import { normalizeDefaultDeliveryAddress } from "./deliveryAddresses";

const STORAGE_PREFIX = "current:demo-session:";
const DELIVERY_PREFIX = "current:demo-delivery-history:";
const ADDRESS_PREFIX = "current:demo-saved-addresses:";
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

function savedDeliveryHistory(accountId: string): NonNullable<Marketplace["deliveryHistory"]> {
  try {
    const raw = globalThis.localStorage?.getItem(`${DELIVERY_PREFIX}${accountId}`);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((entry) => entry && typeof entry.id === "string" && entry.status === "paid_demo") : [];
  } catch { return []; }
}

function withPersistentDeliveryHistory(accountId: string, state: Marketplace): Marketplace {
  const existing = state.deliveryHistory || [];
  const ids = new Set(existing.map((entry) => entry.id));
  return repairDemoDeliveryPayments({ ...state, deliveryHistory: [...existing, ...savedDeliveryHistory(accountId).filter((entry) => !ids.has(entry.id))]
    .sort((a, b) => b.paidAt.localeCompare(a.paidAt)) });
}

function withPersistentAddresses(accountId: string, state: Marketplace): Marketplace {
  try {
    const raw = globalThis.localStorage?.getItem(`${ADDRESS_PREFIX}${accountId}`);
    if (raw === null || raw === undefined) return state;
    const saved: unknown = JSON.parse(raw);
    if (!saved || typeof saved !== "object") return state;
    const record = saved as { addresses?: unknown; selectedIndex?: unknown };
    if (!Array.isArray(record.addresses) || !record.addresses.every((address) =>
      address && typeof address === "object" &&
      ["recipientName", "phone", "addressLine1", "addressLine2", "postcode", "city", "state", "instructions"]
        .every((field) => typeof address[field] === "string"))) return state;
    const profile = state.profiles.find((entry) => entry.id === state.currentUserId);
    if (!profile) return state;
    const selectedIndex = typeof record.selectedIndex === "number" &&
      Number.isInteger(record.selectedIndex) && record.selectedIndex >= 0 &&
      record.selectedIndex < record.addresses.length ? record.selectedIndex : 0;
    profile.savedDeliveryAddresses = record.addresses;
    profile.defaultDeliveryAddressIndex = record.addresses.length ? selectedIndex : undefined;
    profile.savedDeliveryAddress = record.addresses[selectedIndex];
  } catch { /* Keep the workspace usable if browser storage is unavailable. */ }
  return state;
}

function restoreDemoHistory(accountId: string, state: Marketplace): Marketplace {
  const restored = withPersistentAddresses(accountId, withPersistentDeliveryHistory(accountId, state));
  return { ...restored, profiles: restored.profiles.map((profile) =>
    profile.id === restored.currentUserId ? normalizeDefaultDeliveryAddress(profile) : profile) };
}

export function loadDemoWorkspaceSession(accountId: string): Marketplace {
  const storage = browserSessionStorage();
  const serialized = storage?.getItem(key(accountId));
  if (serialized) {
    try {
      const state: unknown = JSON.parse(serialized);
      if (isMarketplaceSnapshot(state)) return restoreDemoHistory(accountId, withRefreshedCatalogueShippingData(withoutRetiredDemoBookings(withoutRemovedSeedListings(state))));
    } catch {
      storage?.removeItem(key(accountId));
    }
  }

  const memoryState = memorySessions.get(accountId);
  if (memoryState && isMarketplaceSnapshot(memoryState)) return restoreDemoHistory(accountId, withRefreshedCatalogueShippingData(withoutRetiredDemoBookings(withoutRemovedSeedListings(memoryState))));

  const fresh = restoreDemoHistory(accountId, createSeed("admin_demo"));
  saveDemoWorkspaceSession(accountId, fresh);
  return fresh;
}

export function startDemoWorkspaceSession(accountId: string): Marketplace {
  const fresh = restoreDemoHistory(accountId, createSeed("admin_demo"));
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
  try { globalThis.localStorage?.setItem(`${DELIVERY_PREFIX}${accountId}`, JSON.stringify(copy.deliveryHistory || [])); } catch { /* Session remains usable without durable browser storage. */ }
  const profile = copy.profiles.find((entry) => entry.id === copy.currentUserId);
  if (profile) {
    try {
      globalThis.localStorage?.setItem(`${ADDRESS_PREFIX}${accountId}`, JSON.stringify({
        addresses: profile.savedDeliveryAddresses || [],
        selectedIndex: profile.defaultDeliveryAddressIndex,
      }));
    } catch { /* Session storage still preserves addresses for this tab. */ }
  }
}

export function closeDemoWorkspaceSession(accountId: string): void {
  memorySessions.delete(accountId);
  browserSessionStorage()?.removeItem(key(accountId));
}
