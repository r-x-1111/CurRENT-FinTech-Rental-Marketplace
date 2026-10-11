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
import { isSupabaseConfigured, supabase } from "../lib/supabase";

function createLoggedOutState(): Marketplace {
  const seed = createSeed();
  seed.currentUserId = null;
  return seed;
}

const Context = createContext<{
  state: Marketplace;
  act: (action: Action) => void;
  activateAuthenticatedWorkspace: (
    account: AuthenticatedMarketplaceAccount,
  ) => Promise<void>;
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
            const workspace = await loadMarketplaceWorkspace(
              supabase,
              account.id,
              account.accountKind,
            );
            restored =
              workspace ??
              (account.accountKind === "demo"
                ? createSeed("admin_demo")
                : createNormalAccountWorkspace(account));
            if (!workspace) {
              await saveMarketplaceWorkspace(
                supabase,
                account.id,
                account.accountKind,
                restored,
              );
            }
            authOwnerId.current = account.id;
            authAccountKind.current = account.accountKind;
          } else {
            if (session) await supabase.auth.signOut();
            restored = createLoggedOutState();
          }
        } else {
          restored = createLoggedOutState();
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
              ? "Supabase account data could not be loaded or saved. Confirm that both SQL migrations are applied and account RLS is enabled."
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
    const workspace = await loadMarketplaceWorkspace(
      supabase,
      account.id,
      account.accountKind,
    );
    const authenticatedState =
      workspace ??
      (account.accountKind === "demo"
        ? createSeed("admin_demo")
        : createNormalAccountWorkspace(account));
    if (!workspace) {
      await saveMarketplaceWorkspace(
        supabase,
        account.id,
        account.accountKind,
        authenticatedState,
      );
    }
    authOwnerId.current = account.id;
    authAccountKind.current = account.accountKind;
    current.current = authenticatedState;
    setState(authenticatedState);
    setStorageError("");
  }

  function act(action: Action) {
    const next = transition(current.current, action);
    current.current = next;
    setState(next);

    if (action.type === "login" && action.userId === null) {
      authOwnerId.current = null;
      authAccountKind.current = null;
    }

    const ownerId = authOwnerId.current;
    const accountKind = authAccountKind.current;
    if (ownerId && accountKind && supabase) {
      writes.current = writes.current
        .then(() =>
          saveMarketplaceWorkspace(supabase!, ownerId, accountKind, next),
        )
        .then(() => setStorageError(""))
        .catch(() =>
          setStorageError(
            "Changes are in memory, but could not be saved to Supabase. Check the workspace migration and RLS policy.",
          ),
        );
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
        <ActivityIndicator color="#2F6BFF" />
        <Text>Opening CurRENT…</Text>
      </View>
    );
  }
  return (
    <Context.Provider
      value={{ state, act, activateAuthenticatedWorkspace, storageError }}
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
