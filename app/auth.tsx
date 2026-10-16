import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, Field, Notice, Screen, s } from "../components/ui";
import { useMarketplace } from "../context/Marketplace";
import { colors } from "../constants/theme";
import {
  authenticateWithPassword,
  DEMO_OTP_CODE,
  describeSupabaseAuthError,
  normalizeMalaysianPhone,
} from "../services/auth";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

export default function Auth() {
  const { state, activateAuthenticatedWorkspace } = useMarketplace();
  const params = useLocalSearchParams<{ mode?: string; returnTo?: string }>();
  const returnTo = params.returnTo?.startsWith("/listing/") || params.returnTo?.startsWith("/(tabs)/") ||
    params.returnTo?.startsWith("/owner") || params.returnTo?.startsWith("/rental/")
    ? params.returnTo : "/(tabs)";
  const [mode, setMode] = useState(
    params.mode === "Create account" ? "Create account" : "Sign in",
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [demoOtp, setDemoOtp] = useState("");
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
      setPhone("");
      setDemoOtp("");
      setError("");
      setInfoNotice("");
    }
  }, [state.currentUserId]);

  async function submit() {
    if (busy) return;
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
        const normalizedPhone = normalizeMalaysianPhone(phone);
        if (password.length < 8) {
          throw new Error("Choose a password of at least 8 characters.");
        }
        if (demoOtp !== DEMO_OTP_CODE) {
          throw new Error(`Enter the displayed Demo OTP code ${DEMO_OTP_CODE}.`);
        }
        const { data, error } = await supabase.auth.signUp({
          email: address,
          password,
          options: {
            data: { full_name: name.trim(), phone: normalizedPhone },
          },
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
        if (!data.user) throw new Error("Supabase did not return the newly created account.");
        await activateAuthenticatedWorkspace({
          accountKind: "normal", id: data.user.id, email: data.user.email || address,
          name: name.trim(), phone: normalizedPhone, verified: false,
        });
        router.replace(returnTo as never);
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
      router.replace(returnTo as never);
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
            <>
              <Field
                label="Full Name"
                value={name}
                onChangeText={setName}
                autoComplete="name"
                placeholder="Enter your full name"
              />
            </>
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

          {mode === "Create account" && (
            <View style={styles.phoneRow}>
              <View style={styles.phonePrefixBox}>
                <Text style={styles.phonePrefixText}>+60</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Mobile Number"
                  value={phone}
                  onChangeText={setPhone}
                  autoCapitalize="none"
                  keyboardType="phone-pad"
                  autoComplete="tel-national"
                  placeholder="12 345 6789"
                />
              </View>
            </View>
          )}

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
              placeholder={
                mode === "Sign in"
                  ? "Enter your password"
                  : "Create a strong password"
              }
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

          {mode === "Create account" && (
            <>
              <Text style={styles.demoCode}>
                Demo code (no SMS): {DEMO_OTP_CODE}
              </Text>
              <Field
                label="Demo OTP"
                value={demoOtp}
                onChangeText={(value) =>
                  setDemoOtp(value.replace(/\D/g, "").slice(0, 6))
                }
                keyboardType="number-pad"
                maxLength={6}
                placeholder="Enter the 6-digit demo code"
              />
              <Text style={styles.demoDisclosure}>
                Simulated OTP — no SMS sent; this does not verify phone
                ownership.
              </Text>
            </>
          )}

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
          <Button secondary onPress={() => router.replace(returnTo as never)}>Continue browsing</Button>
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
  phoneRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  phonePrefixBox: {
    height: 48,
    paddingHorizontal: 14,
    marginBottom: 14,
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.paleBlue,
  },
  phonePrefixText: {
    color: colors.navy,
    fontWeight: "700",
  },
  demoCode: {
    marginTop: 4,
    marginBottom: 6,
    color: colors.navy,
    fontWeight: "700",
  },
  demoDisclosure: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: -4,
    marginBottom: 10,
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
