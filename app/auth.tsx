import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import * as Crypto from "expo-crypto";
import { Ionicons } from "@expo/vector-icons";
import {
  Button,
  Card,
  Field,
  Notice,
  Screen,
  s,
} from "../components/ui";
import { useMarketplace } from "../context/Marketplace";
import { colors } from "../constants/theme";
import { newId } from "../services/marketplace";

export default function Auth() {
  const { state, act } = useMarketplace();
  const [mode, setMode] = useState("Sign in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [infoNotice, setInfoNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!state.currentUserId) {
      setEmail("");
      setPassword("");
      setName("");
      setMode("Sign in");
      setError("");
      setInfoNotice("");
    }
  }, [state.currentUserId]);

  async function submit() {
    setBusy(true);
    setError("");
    setInfoNotice("");
    try {
      const address = email.trim().toLowerCase();
      if (!address) {
        throw new Error("Enter your email address to continue.");
      }

      if (mode === "Create account") {
        if (!name.trim()) {
          throw new Error("Enter your full name.");
        }
        if (password.length < 8) {
          throw new Error("Choose a password of at least 8 characters.");
        }
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
        // Sign In
        if (!password) {
          throw new Error("Enter your password.");
        }

        // Check ordinary hashed accounts
        const profile = state.profiles.find(
          (p) => p.email.toLowerCase() === address && p.passwordHash,
        );
        if (
          !profile ||
          (await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            `${profile.salt}:${password}`,
          )) !== profile.passwordHash
        ) {
          throw new Error("Email or password is incorrect.");
        }
        act({ type: "login", userId: profile.id });
      }
      router.replace("/(tabs)/profile");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function handleForgotPassword() {
    setInfoNotice(
      "Password reset link simulated. In production, an expiring reset email is dispatched to your registered address.",
    );
  }

  return (
    <Screen>
      <View style={styles.authContainer}>
        <Card>
          <View style={styles.headerArea}>
            <Text style={styles.wordmark}>CurRENT</Text>
            <Text style={styles.heading}>
              {mode === "Sign in" ? "Welcome back" : "Create your account"}
            </Text>
            <Text style={styles.tagline}>Rent Smarter. Own Less. Live More.</Text>
          </View>

          {mode === "Create account" && (
            <Field
              label="Full name"
              value={name}
              onChangeText={setName}
              autoComplete="name"
              placeholder="Enter your full name"
            />
          )}

          <Field
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholder="Enter your email address"
          />

          <View style={styles.passwordContainer}>
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete={mode === "Sign in" ? "current-password" : "new-password"}
              placeholder="Enter your password"
            />
            <TouchableOpacity
              style={styles.eyeToggle}
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={colors.muted}
              />
            </TouchableOpacity>
          </View>

          {mode === "Sign in" && (
            <TouchableOpacity
              style={styles.forgotPasswordWrap}
              onPress={handleForgotPassword}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          )}

          {!!error && <Notice text={error} error />}
          {!!infoNotice && <Notice text={infoNotice} />}

          <View style={{ marginTop: 8 }}>
            <Button disabled={busy} onPress={submit}>
              {busy ? "Please wait…" : mode === "Sign in" ? "Sign In" : "Create Account"}
            </Button>
          </View>

          <View style={styles.switchPromptWrap}>
            <Text style={styles.switchPromptText}>
              {mode === "Sign in"
                ? "Don't have an account? "
                : "Already have an account? "}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setMode(mode === "Sign in" ? "Create account" : "Sign in");
                setError("");
                setInfoNotice("");
              }}
            >
              <Text style={styles.switchPromptLink}>
                {mode === "Sign in" ? "Sign Up" : "Sign In"}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  authContainer: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
  },
  headerArea: {
    alignItems: "center",
    marginBottom: 16,
    gap: 4,
  },
  wordmark: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.navy,
    letterSpacing: -0.5,
  },
  heading: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.navy,
  },
  tagline: {
    fontSize: 13,
    color: colors.muted,
  },
  passwordContainer: {
    position: "relative",
  },
  eyeToggle: {
    position: "absolute",
    right: 14,
    top: 38,
    zIndex: 2,
  },
  forgotPasswordWrap: {
    alignSelf: "flex-end",
    marginTop: -4,
    marginBottom: 8,
  },
  forgotPasswordText: {
    fontSize: 12,
    color: colors.linkBlue,
    fontWeight: "700",
  },
  switchPromptWrap: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,
  },
  switchPromptText: {
    fontSize: 13,
    color: colors.muted,
  },
  switchPromptLink: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.linkBlue,
  },
});
