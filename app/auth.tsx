import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import * as Crypto from "expo-crypto";
import {
  Button,
  Card,
  Chips,
  Field,
  Notice,
  Screen,
  s,
} from "../components/ui";
import { useMarketplace } from "../context/Marketplace";
import { newId } from "../services/marketplace";
export default function Auth() {
  const { state, act } = useMarketplace();
  const [mode, setMode] = useState("Sign in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    setError("");
    try {
      const address = email.trim().toLowerCase();
      if (mode === "Create account") {
        if (password.length < 8)
          throw new Error("Choose a demo password of at least 8 characters.");
        const salt = Crypto.randomUUID();
        const passwordHash = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          `${salt}:${password}`,
        );
        act({
          type: "signup",
          profile: {
            id: newId(),
            name: name.trim(),
            email: address,
            verification: "not_verified",
            favourites: [],
            salt,
            passwordHash,
          },
        });
      } else {
        const profile = state.profiles.find(
          (p) => p.email === address && p.passwordHash,
        );
        if (
          !profile ||
          (await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            `${profile.salt}:${password}`,
          )) !== profile.passwordHash
        )
          throw new Error(
            "Email or password is incorrect. Built-in demo accounts use the buttons below.",
          );
        act({ type: "login", userId: profile.id });
      }
      router.replace("/(tabs)/profile");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen
      back
      title="Welcome to CurRENT"
      subtitle="A community for more possibilities and less ownership."
    >
      <View style={{ width: "100%", maxWidth: 520, alignSelf: "center" }}>
        <Card>
          <Chips
            options={["Sign in", "Create account"]}
            selected={mode}
            onSelect={setMode}
          />
          <Notice text="Local academic demo accounts only. Use a made-up email and a unique test password. Accounts and data stay on this device; this is not production authentication." />
          {mode === "Create account" && (
            <Field
              label="Full name"
              value={name}
              onChangeText={setName}
              autoComplete="name"
            />
          )}
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <Field
            label="Demo password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          {!!error && <Notice text={error} error />}
          <Button disabled={busy} onPress={submit}>
            {busy ? "Please wait…" : mode}
          </Button>
        </Card>
        <Card>
          <Text style={s.h2}>Try a demo account</Text>
          <Text style={s.caption}>
            Switch between renter and owner to experience both sides of the same
            booking.
          </Text>
          {state.profiles
            .filter((p) => !p.passwordHash)
            .map((p) => (
              <Button
                key={p.id}
                secondary
                onPress={() => {
                  act({ type: "login", userId: p.id });
                  router.replace("/(tabs)/profile");
                }}
              >{`${p.name}${p.id === "demo-renter" ? " · renter" : " · owner"}`}</Button>
            ))}
        </Card>
      </View>
    </Screen>
  );
}
