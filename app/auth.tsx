import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, Field, Notice, Screen, s } from "../components/ui";
import { useMarketplace } from "../context/Marketplace";
import { colors } from "../constants/theme";
import { authenticateWithPassword } from "../services/auth";
import { checkExampleOtp, DEMO_OTP, normalizeMalaysianMobile } from "../services/signup";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

type Mode = "Sign in" | "Create account";

export default function Auth() {
  const { state, activateAuthenticatedWorkspace } = useMarketplace();
  const [mode, setMode] = useState<Mode>("Sign in");
  const [registrationStep, setRegistrationStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [otp, setOtp] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [infoNotice, setInfoNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!state.currentUserId) {
      setPassword("");
      setConfirmPassword("");
      setError("");
    }
  }, [state.currentUserId]);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => setResendCountdown(n => Math.max(0, n - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  // Resume the fictional onboarding presentation after a real password sign-in.
  useEffect(() => {
    let active = true;
    async function resumePendingRegistration() {
      if (!supabase || state.currentUserId) return;
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (
        !active ||
        !user ||
        user.app_metadata.account_kind === "demo" ||
        user.app_metadata.verification_status === "verified"
      ) return;
      if (user.user_metadata.demo_phone_stage_complete === true) return;
      if (!active) return;
      setMode("Create account");
      setRegistrationStep(2);
      setEmail(user.email || "");
      setName(typeof user.user_metadata.full_name === "string"
        ? user.user_metadata.full_name : "");
      setPhone(typeof user.user_metadata.mobile_e164 === "string"
        ? user.user_metadata.mobile_e164 : "");
      setInfoNotice("Continue your Demo phone verification. Use Resend OTP if you no longer have a code.");
    }
    void resumePendingRegistration();
    return () => { active = false; };
  }, [state.currentUserId]);

  async function requestCode(mobile: string) {
    normalizeMalaysianMobile(mobile);
    setDemoCode(DEMO_OTP);
    setResendCountdown(0);
    setOtp("");
    setError("");
    setInfoNotice("Classroom Demo OTP only — no SMS, random code or phone-owner verification.");
  }

  async function submit() {
    setBusy(true);
    setError("");
    setInfoNotice("");
    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error("Sign Up is unavailable because Supabase Auth is not configured.");
      }
      const address = email.trim().toLowerCase();
      if (!address) throw new Error("Enter your email address.");

      if (mode === "Create account" && registrationStep === 1) {
        if (!name.trim()) throw new Error("Enter your full name.");
        const normalizedPhone = normalizeMalaysianMobile(phone);
        if (password.length < 8) {
          throw new Error("Choose a password of at least 8 characters.");
        }
        if (password !== confirmPassword) {
          throw new Error("The passwords do not match.");
        }
        if (!termsAccepted || !privacyAccepted) {
          throw new Error("Accept the Terms & Conditions and acknowledge the Privacy Policy.");
        }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: address,
          password,
          options: {
            data: { full_name: name.trim(), mobile_e164: normalizedPhone },
          },
        });
        if (signUpError) {
          throw new Error("Could not create the account. Check the details and try again.");
        }
        setRegistrationStep(2);
        setPhone(normalizedPhone);
        if (!data.session) {
          setMode("Sign in");
          setInfoNotice(
            "Account created. Confirm your email if required, then sign in to continue Demo OTP verification.",
          );
          return;
        }
        await requestCode(normalizedPhone);
        return;
      }

      if (mode === "Create account" && registrationStep === 2) {
        checkExampleOtp(otp);
        const updated = await supabase.auth.updateUser({
          data: { demo_phone_stage_complete: true },
        });
        if (updated.error) throw new Error("Could not save demo progress.");
        const { data, error: userError } = await supabase.auth.getUser();
        if (userError || !data.user || !data.user.email) {
          throw new Error("Your session expired. Sign in to resume registration.");
        }
        await activateAuthenticatedWorkspace({
          id: data.user.id,
          email: data.user.email,
          name:
            typeof data.user.user_metadata.full_name === "string"
              ? data.user.user_metadata.full_name
              : data.user.email.split("@")[0],
          accountKind: "normal",
          verified: false,
        });
        setDemoCode("");
        setOtp("");
        router.replace("/(tabs)/profile");
        return;
      }

      if (!password) throw new Error("Enter your password.");
      const account = await authenticateWithPassword(supabase.auth, address, password);
      if (account.accountKind === "normal" && !account.verified) {
        const { data } = await supabase.auth.getUser();
        if (data.user?.user_metadata.demo_phone_stage_complete !== true) {
          const mobile =
            typeof data.user?.user_metadata.mobile_e164 === "string"
              ? data.user.user_metadata.mobile_e164
              : "";
          setName(account.name);
          setPhone(mobile);
          setRegistrationStep(2);
          setMode("Create account");
          setOtp("");
          setDemoCode("");
          setInfoNotice(
            "Phone verification is required before continuing. Request a Demo OTP below.",
          );
          if (mobile) {
            await requestCode(mobile);
          }
          return;
        }
      }
      await activateAuthenticatedWorkspace(account);
      router.replace("/(tabs)/profile");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    setBusy(true);
    try {
      await requestCode(phone);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function switchToSignIn() {
    if (mode === "Create account" && registrationStep === 2 && supabase) {
      await supabase.auth.signOut();
    }
    setMode("Sign in");
    setRegistrationStep(1);
    setError("");
    setInfoNotice("");
    setDemoCode("");
    setResendCountdown(0);
    setOtp("");
    setPassword("");
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
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(address);
    if (resetError) {
      setError("Could not request a password reset. Please try again.");
      return;
    }
    setError("");
    setInfoNotice(
      "If an account exists for that address, a password reset link has been sent.",
    );
  }

  const otpScreen = mode === "Create account" && registrationStep === 2;

  return (
    <Screen>
      <View style={styles.authContainer}>
        <Card>
          <View style={styles.headerArea}>
            <Text style={styles.wordmark}>CurRENT</Text>
            <Text style={styles.heading}>
              {mode === "Sign in"
                ? "Welcome back"
                : otpScreen
                  ? "Step 2 — Phone Verification"
                  : "Create your account"}
            </Text>
            <Text style={styles.tagline}>Rent Smarter. Own Less. Live More.</Text>
            {mode === "Create account" && (
              <Text style={s.caption}>Step {registrationStep} of 5 · Account → OTP → Identity → Result → Complete (Demo)</Text>
            )}
          </View>

          {mode === "Create account" && registrationStep === 1 && (
            <>
              <Field
                label="Full Name"
                value={name}
                onChangeText={setName}
                autoComplete="name"
                placeholder="Enter your full name"
              />
              <Field
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                placeholder="Enter your email address"
              />
              <View style={styles.mobileField}>
                <Text style={s.label}>Mobile Number</Text>
                <View style={styles.mobileRow}>
                  <Text style={styles.prefix}>+60</Text>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="Malaysian mobile number"
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      placeholder="12 345 6789"
                    />
                  </View>
                </View>
              </View>
            </>
          )}

          {!otpScreen && mode === "Sign in" && (
            <Field
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              placeholder="Enter your email address"
            />
          )}

          {!otpScreen && (
            <View style={styles.passwordContainer}>
              <Field
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete={mode === "Sign in" ? "current-password" : "new-password"}
                placeholder={mode === "Sign in" ? "Enter your password" : "Create a strong password"}
              />
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                style={styles.eyeToggle}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={colors.muted}
                />
              </TouchableOpacity>
            </View>
          )}

          {mode === "Create account" && registrationStep === 1 && (
            <>
              <Field
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                placeholder="Re-enter your password"
              />
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: termsAccepted }}
                onPress={() => setTermsAccepted(!termsAccepted)}
                style={styles.consent}
              >
                <Ionicons name={termsAccepted ? "checkbox" : "square-outline"} color={colors.blue} size={20} />
                <Text style={s.body}>I agree to the Terms & Conditions.</Text>
              </Pressable>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: privacyAccepted }}
                onPress={() => setPrivacyAccepted(!privacyAccepted)}
                style={styles.consent}
              >
                <Ionicons name={privacyAccepted ? "checkbox" : "square-outline"} color={colors.blue} size={20} />
                <Text style={s.body}>I have read and acknowledge the Privacy Policy.</Text>
              </Pressable>
            </>
          )}

          {otpScreen && (
            <>
              <Notice text="Simulated OTP — no SMS or real phone verification. Use the example code." />
              <Field
                label="Mobile Number (+60)"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="+60123456789"
              />
              <Button secondary disabled={busy} onPress={() => void resendCode()}>
                Resend OTP (Demo) / Edit number
              </Button>
              {!!demoCode && (
                <Notice text={`Demo code (no SMS): ${demoCode}`} />
              )}
              <Field
                label="Verification Code"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="6-digit Demo OTP"
              />
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
            <Button disabled={busy} onPress={() => void submit()}>
              {busy
                ? "Please wait…"
                : mode === "Sign in"
                  ? "Sign In"
                  : otpScreen
                    ? "Verify OTP"
                    : "Continue"}
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
                if (mode === "Sign in") {
                  setMode("Create account");
                  setRegistrationStep(1);
                  setError("");
                  setInfoNotice("");
                } else {
                  void switchToSignIn();
                }
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
    textAlign: "center",
  },
  tagline: {
    fontSize: 13,
    color: colors.muted,
  },
  passwordContainer: { position: "relative" },
  eyeToggle: {
    position: "absolute",
    right: 14,
    top: 38,
    zIndex: 2,
  },
  mobileField: { marginBottom: 4 },
  mobileRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  prefix: {
    fontSize: 16,
    color: colors.navy,
    fontWeight: "700",
    marginBottom: 16,
  },
  consent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 7,
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
