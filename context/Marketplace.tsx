import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { ActivityIndicator, Text, View } from "react-native";
import type { Marketplace } from "../types/marketplace";
import { createSeed } from "../data/seed";
import { transition, type Action } from "../services/marketplace";
import {
  DEMO_ACCOUNT_EMAIL,
  type AuthenticatedMarketplaceAccount,
  type MarketplaceAccountKind,
} from "../services/auth";
import {
  createNormalAccountWorkspace,
  loadMarketplaceWorkspace,
  saveMarketplaceWorkspace,
} from "../services/marketplacePersistence";
import {
  closeDemoWorkspaceSession,
  loadDemoWorkspaceSession,
  saveDemoWorkspaceSession,
  startDemoWorkspaceSession,
} from "../services/demoWorkspaceSessions";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { fetchOwnChatListings, fetchPublishedChatListings, publishChatListing, unpublishChatListing } from "../services/chat";

async function includeSharedListings(workspace: Marketplace, ownerId: string): Promise<Marketplace> {
  const [own, published] = await Promise.all([fetchOwnChatListings(ownerId), fetchPublishedChatListings()]);
  const remote = [...published.filter((entry) => entry.owner_id !== ownerId), ...own];
  const listings = [...workspace.listings];
  const profiles = [...workspace.profiles];
  for (const entry of remote) {
    const listingIndex = listings.findIndex((listing) => listing.id === entry.listing_id);
    if (listingIndex < 0) listings.push(entry.listing_data);
    else listings[listingIndex] = entry.listing_data;
    const profileIndex = profiles.findIndex((profile) => profile.id === entry.owner_id);
    if (profileIndex < 0) profiles.push({
      id: entry.owner_id, name: entry.owner_name, email: "", verification: "verified", favourites: [],
    });
    else if (entry.owner_id !== ownerId) profiles[profileIndex] = { ...profiles[profileIndex], name: entry.owner_name };
  }
  return { ...workspace, listings, profiles };
}

function createLoggedOutState(): Marketplace {
  const seed = createSeed();
  seed.currentUserId = null;
  seed.profiles = seed.profiles
    .filter((profile) => seed.listings.some((listing) => listing.ownerId === profile.id))
    .map((profile) => ({ id: profile.id, name: profile.name, email: "", verification: profile.verification, favourites: [] }));
  seed.bookings = [];
  seed.messages = [];
  seed.notifications = [];
  seed.evidence = [];
  seed.disputes = [];
  seed.reviews = [];
  return seed;
}

async function loadGuestBrowseState(): Promise<Marketplace> {
  const guest = createLoggedOutState();
  if (!isSupabaseConfigured || !supabase) return guest;
  try {
    const remote = await fetchPublishedChatListings();
    for (const entry of remote) {
      const index = guest.listings.findIndex((listing) => listing.id === entry.listing_id);
      if (index < 0) guest.listings.push(entry.listing_data);
      else guest.listings[index] = entry.listing_data;
      if (!guest.profiles.some((profile) => profile.id === entry.owner_id)) guest.profiles.push({
        id: entry.owner_id, name: entry.owner_name, email: "", verification: "verified", favourites: [],
      });
    }
  } catch {
    // Public seed listings remain browsable if the catalog is unavailable.
  }
  return guest;
}

const Context = createContext<{
  state: Marketplace;
  act: (action: Action) => void;
  actAndPersist: (action: Action) => Promise<void>;
  activateAuthenticatedWorkspace: (
    account: AuthenticatedMarketplaceAccount,
  ) => Promise<void>;
  closeAuthenticatedWorkspace: () => Promise<void>;
  refreshSharedListings: () => Promise<void>;
  storageError: string;
}>(null!);

function accountFromSession(user: {
  id: string;
  email?: string;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
}): AuthenticatedMarketplaceAccount | null {
  const email = user.email;
  if (!email) return null;
  const normalizedEmail = email.toLowerCase();
  const metadata = user.app_metadata;
  if (metadata.account_kind === "demo") {
    if (
      normalizedEmail !== DEMO_ACCOUNT_EMAIL ||
      metadata.verified_demo !== true
    ) {
      return null;
    }
    return {
      accountKind: "demo",
      id: user.id,
      email,
      name:
        typeof user.user_metadata.full_name === "string"
          ? user.user_metadata.full_name
          : "Alex Tan",
      phone:
        typeof user.user_metadata.phone === "string"
          ? user.user_metadata.phone
          : undefined,
      verified: true,
    };
  }
  if (
    normalizedEmail === DEMO_ACCOUNT_EMAIL ||
    (metadata.account_kind !== undefined && metadata.account_kind !== "normal")
  ) {
    return null;
  }
  return {
    accountKind: "normal",
    id: user.id,
    email,
    name:
      typeof user.user_metadata.full_name === "string"
        ? user.user_metadata.full_name
        : email.split("@")[0],
    phone:
      typeof user.user_metadata.phone === "string"
        ? user.user_metadata.phone
        : undefined,
    verified: metadata.verification_status === "verified",
  };
}

export function MarketplaceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<Marketplace>(createLoggedOutState);
  const current = useRef(state);
  const writes = useRef(Promise.resolve());
  const authOwnerId = useRef<string | null>(null);
  const authAccountKind = useRef<MarketplaceAccountKind | null>(null);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function initialize() {
      try {
        let restored: Marketplace;
        if (isSupabaseConfigured && supabase) {
          const {
            data: { session },
            error,
          } = await supabase.auth.getSession();
          if (error) {
            throw new Error(
              "Could not restore the Supabase session. Please sign in again.",
            );
          }
          const account = session?.user
            ? accountFromSession(session.user)
            : null;
          if (account) {
            if (account.accountKind === "demo") {
              restored = loadDemoWorkspaceSession(account.id);
            } else {
              const workspace = await loadMarketplaceWorkspace(
                supabase,
                account.id,
                account.accountKind,
              );
              // Never eagerly persist a freshly-built empty workspace here: if `loadMarketplaceWorkspace`
              // ever returns null for an account that actually has a saved row (e.g. a transient
              // RLS/claim mismatch), writing immediately would silently overwrite — and permanently
              // lose — that account's real bookings. The empty fallback is only ever used in memory for
              // this session; it gets persisted naturally (merged with whatever the user does next) the
              // first time an actual action saves, via act()/actAndPersist(), never as a blind upsert here.
              restored = workspace ?? createNormalAccountWorkspace(account);
              restored = await includeSharedListings(restored, account.id);
            }
            authOwnerId.current = account.id;
            authAccountKind.current = account.accountKind;
          } else {
            if (session) await supabase.auth.signOut();
            restored = await loadGuestBrowseState();
          }
        } else {
          restored = await loadGuestBrowseState();
        }
        if (mounted) {
          current.current = restored;
          setState(restored);
        }
      } catch {
        if (mounted) {
          const loggedOut = createLoggedOutState();
          current.current = loggedOut;
          setState(loggedOut);
          setStorageError(
            isSupabaseConfigured
              ? "Supabase account data could not be loaded. Please sign in again."
              : "Saved data or authentication session could not be read. Please sign in again.",
          );
        }
      } finally {
        if (mounted) setReady(true);
      }
    }
    void initialize();
    return () => {
      mounted = false;
    };
  }, []);

  async function activateAuthenticatedWorkspace(
    account: AuthenticatedMarketplaceAccount,
  ) {
    if (!supabase || !isSupabaseConfigured) {
      throw new Error("Supabase authentication is not configured.");
    }
    let authenticatedState: Marketplace;
    if (account.accountKind === "demo") {
      authenticatedState = startDemoWorkspaceSession(account.id);
    } else {
      const workspace = await loadMarketplaceWorkspace(
        supabase,
        account.id,
        account.accountKind,
      );
      // Same reasoning as the app-start restore above: never blindly upsert an empty workspace
      // just because this read came back with no row — that would risk overwriting a real,
      // previously-saved account the moment it's reached by a flaky/mismatched read.
      authenticatedState =
        workspace ?? createNormalAccountWorkspace(account);
      authenticatedState = await includeSharedListings(authenticatedState, account.id);
    }
    authOwnerId.current = account.id;
    authAccountKind.current = account.accountKind;
    current.current = authenticatedState;
    setState(authenticatedState);
    setStorageError("");
  }

  function act(action: Action) {
    const next = action.type === "login" && action.userId === null
      ? createLoggedOutState() : transition(current.current, action);
    current.current = next;
    setState(next);

    if (action.type === "login" && action.userId === null) {
      authOwnerId.current = null;
      authAccountKind.current = null;
      void loadGuestBrowseState().then((guest) => {
        if (authOwnerId.current === null && current.current === next) {
          current.current = guest;
          setState(guest);
        }
      });
    }

    const ownerId = authOwnerId.current;
    const accountKind = authAccountKind.current;
    if (ownerId && accountKind && supabase) {
      writes.current = writes.current
        .then(() => {
          if (accountKind === "demo") {
            saveDemoWorkspaceSession(ownerId, next);
            return;
          }
          return saveMarketplaceWorkspace(supabase!, ownerId, accountKind, next).then(async () => {
            if (action.type === "saveListing") await publishChatListing(action.listing, next.profiles.find((p) => p.id === ownerId)?.name || "Owner");
            if (action.type === "deleteListing") await unpublishChatListing(action.id);
          });
        })
        .then(() => setStorageError(""))
        .catch(() =>
          setStorageError(
            accountKind === "demo"
              ? "Demo changes could not be saved in this browser session."
              : "Changes are in memory, but could not be saved to Supabase.",
          ),
        );
    }
  }

  async function actAndPersist(action: Action) {
    const previous = current.current;
    const next = transition(previous, action);
    current.current = next;
    setState(next);

    const ownerId = authOwnerId.current;
    const accountKind = authAccountKind.current;
    const client = supabase;
    if (!ownerId || !accountKind || !client) {
      current.current = previous;
      setState(previous);
      throw new Error(
        "Your authenticated Supabase workspace is unavailable. The change was not saved.",
      );
    }

    const save = writes.current.then(() => {
      if (accountKind === "demo") {
        saveDemoWorkspaceSession(ownerId, next);
        return;
      }
      return saveMarketplaceWorkspace(client, ownerId, accountKind, next).then(async () => {
        if (action.type === "saveListing") await publishChatListing(action.listing, next.profiles.find((p) => p.id === ownerId)?.name || "Owner");
        if (action.type === "deleteListing") await unpublishChatListing(action.id);
      });
    });
    writes.current = save.then(
      () => undefined,
      () => undefined,
    );
    try {
      await save;
      setStorageError("");
    } catch {
      if (current.current === next) {
        current.current = previous;
        setState(previous);
      }

      setStorageError(
        accountKind === "demo"
          ? "The Demo change could not be saved in this browser session."
          : "The change could not be saved to Supabase.",
      );
      throw new Error(
        action.type === "booking"
          ? "Cancellation could not be saved. Your booking has been restored; please try again."
          : action.type === "instantBook"
            ? "Booking could not be saved. No booking was confirmed; please try again."
            : "The change could not be saved. Please try again.",
      );
    }
  }

  async function closeAuthenticatedWorkspace() {
    const ownerId = authOwnerId.current;
    // Wait for any save already in flight (e.g. a just-clicked Save Address) to actually
    // reach Supabase/the demo session store before this screen navigates away — act()'s
    // writes already capture the correct ownerId/account in closure regardless, but
    // waiting here means logout never races ahead of a pending persistence write.
    await writes.current;
    if (authAccountKind.current === "demo" && ownerId) {
      closeDemoWorkspaceSession(ownerId);
    }
    authOwnerId.current = null;
    authAccountKind.current = null;
  }

  async function refreshSharedListings() {
    const ownerId = authOwnerId.current;
    if (!ownerId || authAccountKind.current !== "normal") return;
    await writes.current;
    const merged = await includeSharedListings(current.current, ownerId);
    if (authOwnerId.current === ownerId) {
      current.current = merged;
      setState(merged);
    }
  }

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          gap: 16,
        }}
      >
        <ActivityIndicator color="#2463FF" />
        <Text>Opening CurRENT…</Text>
      </View>
    );
  }
  return (
    <Context.Provider
      value={{
        state,
        act,
        actAndPersist,
        activateAuthenticatedWorkspace,
        closeAuthenticatedWorkspace,
        refreshSharedListings,
        storageError,
      }}
    >
      <View style={{ flex: 1 }}>
        {storageError ? (
          <Text
            accessibilityRole="alert"
            style={{
              backgroundColor: "#FDECEC",
              color: "#8A1C1C",
              paddingHorizontal: 16,
              paddingVertical: 10,
            }}
          >
            {storageError}
          </Text>
        ) : null}
        {children}
      </View>
    </Context.Provider>
  );
}

export function useMarketplace() {
  const context = useContext(Context);
  return {
    ...context,
    user: context.state.profiles.find(
      (profile) => profile.id === context.state.currentUserId,
    ),
  };
}
