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

const STORAGE_KEY = "current-marketplace-v1";
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
  const [state, setState] = useState<Marketplace>(createSeed);
  const current = useRef(state);
  const writes = useRef(Promise.resolve());
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!mounted || !raw) return;
        const saved = JSON.parse(raw) as Marketplace;
        if (
          saved.version !== 1 ||
          !Array.isArray(saved.profiles) ||
          !Array.isArray(saved.bookings) ||
          !Array.isArray(saved.listings) ||
          !Array.isArray(saved.messages) ||
          !Array.isArray(saved.evidence) ||
          !Array.isArray(saved.reviews) ||
          !Array.isArray(saved.notifications) ||
          !Array.isArray(saved.disputes)
        )
          throw new Error("Unrecognised saved data.");
        current.current = saved;
        setState(saved);
      })
      .catch(() => {
        if (mounted)
          setStorageError(
            "Saved data could not be read. This session is running with fresh demo data.",
          );
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
