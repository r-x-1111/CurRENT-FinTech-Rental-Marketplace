import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { isSupabaseConfigured, supabase } from "../lib/supabase";

const STORAGE_KEY = "current-marketplace-v315";
function createLoggedOutState(): Marketplace {
  const seed = createSeed();
  seed.currentUserId = null;
  return seed;
}

const Context = createContext<{
  state: Marketplace;
  act: (action: Action) => void;
  storageError: string;
}>(null!);
export function MarketplaceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<Marketplace>(createLoggedOutState);
  const current = useRef(state);
  const writes = useRef(Promise.resolve());
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(async (raw) => {
        if (!mounted) return;
        let saved: Marketplace | null = null;
        if (raw) {
          const candidate = JSON.parse(raw) as Marketplace;
          if (
            candidate.version !== 1 ||
            !Array.isArray(candidate.profiles) ||
            !Array.isArray(candidate.bookings) ||
            !Array.isArray(candidate.listings) ||
            !Array.isArray(candidate.messages) ||
            !Array.isArray(candidate.evidence) ||
            !Array.isArray(candidate.reviews) ||
            !Array.isArray(candidate.notifications) ||
            !Array.isArray(candidate.disputes)
          ) {
            throw new Error("Unrecognised saved data.");
          }
          saved = candidate;
        }

        let restored = saved || createLoggedOutState();
        if (isSupabaseConfigured && supabase) {
          const {
            data: { session },
            error,
          } = await supabase.auth.getSession();
          if (error) throw error;
          const authUser = session?.user;
          const metadata = authUser?.app_metadata;
          if (
            authUser &&
            metadata?.account_kind === "demo" &&
            metadata.verified_demo === true
          ) {
            restored =
              saved?.mode === "admin_demo" ? saved : createSeed("admin_demo");
            restored.currentUserId = "demo-renter";
          } else if (
            authUser &&
            (metadata?.account_kind === undefined ||
              metadata.account_kind === "normal")
          ) {
            restored = saved || createSeed("normal");
            const email = authUser.email?.toLowerCase() || "";
            let profile = restored.profiles.find(
              (entry) => entry.email.toLowerCase() === email,
            );
            if (!profile && authUser.email) {
              const name =
                typeof authUser.user_metadata.full_name === "string"
                  ? authUser.user_metadata.full_name
                  : authUser.email.split("@")[0];
              profile = {
                id: authUser.id,
                name,
                email: authUser.email,
                verification:
                  metadata?.verification_status === "verified"
                    ? "verified"
                    : "not_verified",
                favourites: [],
                riskScore:
                  metadata?.verification_status === "verified" ? 80 : null,
                riskLevel:
                  metadata?.verification_status === "verified"
                    ? "low"
                    : "unverified",
              };
              restored.profiles.push(profile);
            }
            restored.currentUserId = profile?.id || null;
          } else {
            restored = createLoggedOutState();
          }
        } else {
          const localNormalProfile = saved?.profiles.find(
            (entry) =>
              entry.id === saved.currentUserId && Boolean(entry.passwordHash),
          );
          restored =
            saved?.mode === "normal" && localNormalProfile
              ? saved
              : createLoggedOutState();
        }
        current.current = restored;
        setState(restored);
      })
      .catch(() => {
        if (mounted) {
          const loggedOut = createLoggedOutState();
          current.current = loggedOut;
          setState(loggedOut);
          setStorageError(
            "Saved data or authentication session could not be read. Please sign in again.",
          );
        }
      })
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);
  function act(action: Action) {
    const next = transition(current.current, action);
    current.current = next;
    setState(next);
    const snapshot = JSON.stringify(next);
    writes.current = writes.current
      .then(() => AsyncStorage.setItem(STORAGE_KEY, snapshot))
      .then(() => setStorageError(""))
      .catch(() =>
        setStorageError(
          "Changes are in memory, but could not be saved. Storage may be full.",
        ),
      );
  }
  if (!ready)
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
  return (
    <Context.Provider value={{ state, act, storageError }}>
      {children}
    </Context.Provider>
  );
}
export function useMarketplace() {
  const context = useContext(Context);
  return {
    ...context,
    user: context.state.profiles.find(
      (p) => p.id === context.state.currentUserId,
    ),
  };
}
