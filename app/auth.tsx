import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, Field, Notice, Screen, s } from "../components/ui";
import { useMarketplace } from "../context/Marketplace";
import { colors } from "../constants/theme";
import {
  authenticateWithPassword,
  describeSupabaseAuthError,
} from "../services/auth";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

export default function Auth() {
  const { state, activateAuthenticatedWorkspace } = useMarketplace();
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
      if (!isSupabaseConfigured || !supabase) {
        throw new Error(
          "Sign in is unavailable because the Supabase Auth service is not configured.",
        );
      }
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
        const { data, error } = await supabase.auth.signUp({
          email: address,
          password,
          options: { data: { full_name: name.trim() } },
        });
        if (error) {
          throw new Error(describeSupabaseAuthError(error, "sign-up"));
        }
        if (data.user && data.user.identities?.length === 0) {
          throw new Error(
            "Supabase did not create a new account for this address. If you already registered, sign in or request a password reset.",
          );
        }
        if (!data.session) {
          setInfoNotice(
            "Registration accepted. Check your inbox (and spam folder) for the Supabase confirmation email. Confirm your address, then sign in.",
          );
          return;
        }
        const account = await authenticateWithPassword(
          supabase.auth,
          address,
          password,
        );
        await activateAuthenticatedWorkspace(account);
        router.replace("/(tabs)/profile");
        return;
      } else {
        // Sign In
        if (!password) {
          throw new Error("Enter your password.");
        }

        const account = await authenticateWithPassword(
          supabase.auth,
          address,
          password,
        );
        await activateAuthenticatedWorkspace(account);
      }
      router.replace("/(tabs)/profile");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotPassword() {
    if (!isSupabaseConfigured || !supabase) {
      setError("Password reset is unavailable until Supabase is configured.");
      return;
    }
    const address = email.trim().toLowerCase();
    if (!address) {
      setError("Enter your email address to request a password reset.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(address);
    if (error) {
      setError(describeSupabaseAuthError(error, "password reset"));
      return;
    }
    setError("");
    setInfoNotice(
      "If an account exists for that address, a password reset link has been sent.",
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
            <Text style={styles.tagline}>
              Rent Smarter. Own Less. Live More.
            </Text>
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
              autoComplete={
                mode === "Sign in" ? "current-password" : "new-password"
              }
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
              onPress={() => void handleForgotPassword()}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          )}

          {!!error && <Notice text={error} error />}
          {!!infoNotice && <Notice text={infoNotice} />}

          <View style={{ marginTop: 8 }}>
            <Button disabled={busy} onPress={submit}>
              {busy
                ? "Please wait…"
                : mode === "Sign in"
                  ? "Sign In"
                  : "Create Account"}
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
