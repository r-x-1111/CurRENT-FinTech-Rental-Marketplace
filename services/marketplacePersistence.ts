import type { SupabaseClient } from "@supabase/supabase-js";
import { createSeed } from "../data/seed";
import type { Marketplace } from "../types/marketplace";
import type { MarketplaceAccountKind } from "./auth";
import { withoutRemovedSeedListings, withRefreshedCatalogueShippingData } from "./catalogue";
import { normalizeDefaultDeliveryAddress } from "./deliveryAddresses";

const WORKSPACE_TABLE = "marketplace_workspaces";

function isMarketplaceSnapshot(value: unknown): value is Marketplace {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Marketplace>;
  return (
    candidate.version === 1 &&
    (candidate.mode === "normal" || candidate.mode === "admin_demo") &&
    Array.isArray(candidate.profiles) &&
    Array.isArray(candidate.listings) &&
    Array.isArray(candidate.bookings) &&
    Array.isArray(candidate.messages) &&
    Array.isArray(candidate.evidence) &&
    Array.isArray(candidate.reviews) &&
    Array.isArray(candidate.notifications) &&
    Array.isArray(candidate.disputes)
  );
}

export function createNormalAccountWorkspace(account: {
  id: string;
  email: string;
  name: string;
  phone?: string;
  verified: boolean;
}): Marketplace {
  const state = createSeed("normal");
  state.profiles = state.profiles.filter((profile) =>
    profile.id.startsWith("owner-"),
  );
  state.profiles.push({
    id: account.id,
    name: account.name,
    email: account.email,
    ...(account.phone ? { phone: account.phone } : {}),
    verification: account.verified ? "verified" : "not_verified",
    favourites: [],
    riskScore: account.verified ? 80 : null,
    riskLevel: account.verified ? "low" : "unverified",
    riskHistory: [],
  });
  state.currentUserId = account.id;
  state.bookings = [];
  state.messages = [];
  state.evidence = [];
  state.reviews = [];
  state.disputes = [];
  state.notifications = [];
  state.platformReviewRequests = [];
  state.supportMessages = [];
  state.supportCases = [];
  return state;
}

export async function loadMarketplaceWorkspace(
  client: SupabaseClient,
  ownerId: string,
  accountKind: MarketplaceAccountKind,
): Promise<Marketplace | null> {
  const { data, error } = await client
    .from(WORKSPACE_TABLE)
    .select("account_kind, state")
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) {
    throw new Error(
      "Could not load account data from Supabase. Check that the database migrations have been applied.",
    );
  }
  if (!data) return null;
  if (
    data.account_kind !== accountKind ||
    !isMarketplaceSnapshot(data.state) ||
    (accountKind === "demo" && data.state.mode !== "admin_demo") ||
    (accountKind === "normal" && data.state.mode !== "normal")
  ) {
    throw new Error(
      "The saved account workspace is invalid or does not match this account.",
    );
  }
  const workspace = withRefreshedCatalogueShippingData(withoutRemovedSeedListings(data.state));
  return { ...workspace, profiles: workspace.profiles.map((profile) =>
    profile.id === ownerId ? normalizeDefaultDeliveryAddress(profile) : profile) };
}

export async function saveMarketplaceWorkspace(
  client: SupabaseClient,
  ownerId: string,
  accountKind: MarketplaceAccountKind,
  state: Marketplace,
): Promise<void> {
  const { error } = await client.from(WORKSPACE_TABLE).upsert(
    {
      owner_id: ownerId,
      account_kind: accountKind,
      state,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "owner_id" },
  );
  if (error) {
    throw new Error(
      "Could not save account data to Supabase. Check the workspace RLS policy and database migration.",
    );
  }
}
