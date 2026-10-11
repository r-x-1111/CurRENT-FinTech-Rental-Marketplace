import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Redirect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Badge,
  Button,
  Card,
  Empty,
  Field,
  Notice,
  PhotoPicker,
  Row,
  Screen,
  Section,
  s,
} from "../../components/ui";
import { useMarketplace } from "../../context/Marketplace";
import { riskFor } from "../../services/booking";
import { colors } from "../../constants/theme";
import { RiskGauge } from "../../components/RiskGauge";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import { signOutAuthenticatedAccount } from "../../services/auth";

export default function ProfileScreen() {
  const { state, user, act } = useMarketplace();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  // Presentation state only: no real document, camera, SMS, or biometric data.
  const [demoDoc, setDemoDoc] = useState<"MyKad" | "Passport">("MyKad");
  const [demoFront, setDemoFront] = useState(false);
  const [demoBack, setDemoBack] = useState(false);
  const [demoPassport, setDemoPassport] = useState(false);
  const [demoScanning, setDemoScanning] = useState(false);
  const [demoFaceDone, setDemoFaceDone] = useState(false);

  if (!user) {
    return <Redirect href="/auth" />;
  }

  const risk = riskFor(state, user);
  const reviews = state.reviews.filter((r) => r.recipientId === user.id);
  const completed = state.bookings.filter(
    (b) => b.renterId === user.id && b.status === "completed",
  ).length;
  const cleanPoints = (user.riskHistory || []).reduce(
    (acc, item) => acc + (item.effectiveAdjustment === 2 ? 2 : 0),
    0,
  );
  const netPoints = (user.riskHistory || []).reduce(
    (acc, item) => acc + item.effectiveAdjustment,
    0,
  );

  function verify(status: "pending" | "verified" | "failed") {
    try {
      act({ type: "verify", status });
      setError("");
      setSuccess(`Verification updated to ${status}.`);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Screen
      title="Renter Dashboard"
      subtitle={`Welcome back, ${user.name} · CurRENT Renter Mode`}
    >
      {/* Account warnings */}
      {user.isBanned && (
        <Notice
          text="Account Banned: This account is restricted from booking or publishing due to confirmed fraudulent activity."
          error
        />
      )}
      {user.hasOverdueObligation && (
        <Notice
          text="Overdue Damage Settlement: A confirmed damage obligation is overdue by more than 7 days. Direct rental checkout is restricted."
          error
        />
      )}
      {!!error && <Notice text={error} error />}
      {!!success && <Notice text={success} />}

      {/* Profile Overview Card */}
      <Card>
        <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
          {user.avatar ? (
            <Image
              source={{ uri: user.avatar }}
              style={{ width: 64, height: 64, borderRadius: 32 }}
            />
          ) : (
            <View
              style={{
                backgroundColor: colors.softBlue,
                padding: 20,
                borderRadius: 32,
              }}
            >
              <Text style={s.h2}>{user.name[0]}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={s.h2}>{user.name}</Text>
            <Text style={s.caption}>{user.email}</Text>
            <Badge
              text={
                user.verification === "verified"
                  ? "Verified"
                  : user.verification
              }
              green={user.verification === "verified"}
            />
          </View>
        </View>
        {state.mode === "admin_demo" && (
          <Text style={[s.caption, { marginTop: 8 }]}>
            Fictional account data for demonstration
          </Text>
        )}
        <Button
          secondary
          onPress={() => {
            setEditing(!editing);
            setName(user.name);
            setPhotos(user.avatar ? [user.avatar] : []);
          }}
        >
          Edit profile
        </Button>
        {editing && (
          <>
            <Field label="Full name" value={name} onChangeText={setName} />
            <PhotoPicker photos={photos} onChange={setPhotos} single />
            <Button
              onPress={() => {
                try {
                  act({ type: "profile", name, avatar: photos[0] });
                  setEditing(false);
                  setError("");
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Save profile
            </Button>
          </>
        )}
      </Card>

      {user.hasOverdueObligation && (
        <Card>
          <Text style={[s.bold, { color: "#C53030", fontSize: 15 }]}>
            ⚠️ Confirmed Damage Obligation (Overdue 7+ Days)
          </Text>
          <Text style={[s.caption, { color: "#9B2C2C", marginTop: 4 }]}>
            In accordance with Section 15, renters with an outstanding confirmed
            damage liability unpaid after 7 days are restricted from creating
            new rentals, regardless of risk score.
          </Text>
          <Button
            onPress={() => {
              act({ type: "settleOverdueObligation", userId: user.id });
              setSuccess(
                "Simulated damage obligation settled in full! Booking privileges restored.",
              );
            }}
          >
            Simulate Full Settlement (Clear Obligation & Lift Restriction)
          </Button>
        </Card>
      )}

      <Button onPress={() => router.push("/owner")}>Lender Mode</Button>


      {/* Visible fictional eKYC presentation for BOTH completed and new users. */}
      <Section title="Identity Verification (Demo eKYC)" />
      <Card>
        <Notice text="Classroom demonstration only — no real identity document, camera, biometric processing or government verification." />
        {user.verification === "verified" ? (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 10 }}>
              <Ionicons name="checkmark-circle" size={24} color={colors.green} />
              <Text style={s.bold}>Identity document sample — Completed (Demo)</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 10 }}>
              <Ionicons name="scan-outline" size={24} color={colors.green} />
              <Text style={s.bold}>Facial scan animation — Completed (Demo)</Text>
            </View>
            <Text style={s.caption}>These are fictional completed demo steps, not real identity verification. No re-verification required.</Text>
          </>
        ) : (
          <>
            <Text style={s.h2}>1. MyKad or Passport (Demo)</Text>
            <View style={{ flexDirection: "row", gap: 10, marginVertical: 12 }}>
              {(["MyKad", "Passport"] as const).map((choice) => (
                <Pressable key={choice} accessibilityRole="button"
                  accessibilityState={{ selected: demoDoc === choice }}
                  onPress={() => { setDemoDoc(choice); setDemoFaceDone(false); }}
                  style={{ flex: 1, borderWidth: 1, borderColor: demoDoc === choice ? colors.blue : colors.border,
                    borderRadius: 12, padding: 12, alignItems: "center",
                    backgroundColor: demoDoc === choice ? colors.paleBlue : "white" }}>
                  <Text style={s.bold}>{choice}</Text>
                </Pressable>
              ))}
            </View>
            {(demoDoc === "MyKad"
              ? [
                { title: "Front of MyKad", selected: demoFront, press: () => setDemoFront(!demoFront) },
                { title: "Back of MyKad", selected: demoBack, press: () => setDemoBack(!demoBack) },
              ]
              : [
                { title: "Passport Photo Page", selected: demoPassport, press: () => setDemoPassport(!demoPassport) },
              ]
            ).map((tile) => (
              <Pressable accessibilityRole="button" key={tile.title} onPress={tile.press}
                accessibilityLabel={`Use fictional sample image for ${tile.title}`}
                style={{ borderWidth: 1, borderStyle: "dashed", borderColor: colors.border,
                  borderRadius: 12, padding: 18, alignItems: "center", gap: 8, marginVertical: 7 }}>
                <Ionicons name={tile.selected ? "checkmark-circle" : "camera-outline"}
                  size={28} color={tile.selected ? colors.green : colors.blue} />
                <Text style={s.bold}>{tile.title}</Text>
                <Text style={s.caption}>{tile.selected ? "Sample image selected (Demo)" : "Tap to use a fictional sample photo"}</Text>
              </Pressable>
            ))}
            <View style={{ marginTop: 15, gap: 10 }}>
              <Text style={s.h2}>2. Face Verification (Demo)</Text>
              <View style={{ alignItems: "center", gap: 12, paddingVertical: 10 }}>
                <Ionicons name="scan-outline" size={60} color={colors.blue} />
                <Text style={s.caption}>Animation only — no real facial recognition.</Text>
              </View>
              <Button secondary
                disabled={demoScanning || demoFaceDone || !(demoDoc === "MyKad" ? demoFront && demoBack : demoPassport)}
                onPress={() => {
                  setDemoScanning(true);
                  setTimeout(() => {
                    setDemoScanning(false);
                    setDemoFaceDone(true);
                  }, 850);
                }}>
                {demoScanning ? "Scanning... (Demo)" : demoFaceDone ? "Demo Face Check Complete" : "Start Demo Face Scan"}
              </Button>
              <Button disabled={!demoFaceDone} onPress={() => {
                try {
                  if (user.verification !== "pending") act({ type: "verify", status: "pending" });
                  act({ type: "verify", status: "verified" });
                  setError("");
                  setSuccess("Demo verification complete. No real identity check was performed.");
                } catch (e) { setError((e as Error).message); }
              }}>
                Complete Demo Verification
              </Button>
            </View>
          </>
        )}
      </Card>

      {/* Rental Risk Score Section */}
      <Section title="Rental Risk Score" />
      <Card>
        <View style={{ alignItems: "center", paddingVertical: 8 }}>
          <RiskGauge score={risk.score} label={risk.label} />
        </View>
        <Text style={s.caption}>
          CurRENT Rental Risk Score is a platform reliability metric, NOT a
          consumer credit score. It transparently determines your refundable
          security deposit tier and booking permissions.
        </Text>
        <Row label="Initial verified score" value="80 (Low Risk)" />
        <Row
          label="Deposit basis"
          value={
            risk.score === null
              ? "N/A"
              : risk.score >= 80
                ? "5% (capped at RM500)"
                : risk.score >= 40
                  ? "10% (capped at RM1,000)"
                  : risk.score >= 30
                    ? "15% (capped at RM1,500)"
                    : "Platform assessment required"
          }
        />
        <Row
          label={`${completed} completed rentals`}
          value={`+${netPoints} points`}
        />
        <View style={styles.rulesContainer}>
          <Text style={styles.rulesHeading}>What You Should Know</Text>
          <Text style={styles.rulesSubheading}>Deposit & Booking Rules</Text>
          <Text style={styles.rulesBullet}>
            • Low Risk (80–100): 5% deposit, capped at RM500 (Direct checkout)
          </Text>
          <Text style={styles.rulesBullet}>
            • Medium Risk (40–79): 10% deposit, capped at RM1,000 (Direct
            checkout)
          </Text>
          <Text style={styles.rulesBullet}>
            • High Risk (30–39): 15% deposit, capped at RM1,500 (Direct
            checkout)
          </Text>
          <Text style={styles.rulesBullet}>
            • Very High Risk (0–29): CurRENT Platform Review request (Pending
            only, no checkout)
          </Text>
          <Text style={styles.rulesSubheading}>How Your Score Changes</Text>
          <Text style={styles.rulesBullet}>
            • +2 points: Complete a rental on time with no issues.
          </Text>
          <Text style={styles.rulesBullet}>
            • Late return: If the item is returned later than the scheduled
            return delivery time, 5 points will be deducted from your Rental
            Risk Score.
          </Text>
          <Text style={styles.rulesBullet}>
            • −10 points: Confirmed minor damage.
          </Text>
          <Text style={styles.rulesBullet}>
            • −30 points: Confirmed serious damage or accidental loss.
          </Text>
          <Text style={styles.rulesBullet}>
            • Confirmed intentional theft or fraud: Permanent ban, not an
            additional numerical penalty.
          </Text>
          <Text style={styles.rulesNote}>
            Only one final outcome applies per rental. If multiple issues occur,
            the most serious confirmed outcome applies; pending reports do not
            change your score. Successful appeals correct the original outcome.
          </Text>
        </View>
      </Card>

      {/* Risk Score History */}
      <Section title="Risk Score History" />
      <Card>
        <Text style={s.caption}>
          Single Winning Incident Rule: When multiple violations occur on the
          same physical rental chain, only the single most serious penalty is
          applied. Secondary incidents are recorded in audit history but not
          stacked.
        </Text>
        {user.riskHistory && user.riskHistory.length > 0 ? (
          user.riskHistory.map((item) => (
            <View
              key={item.id}
              style={{
                backgroundColor: colors.paleBlue,
                borderWidth: 1,
                borderColor: colors.softBlue,
                padding: 12,
                borderRadius: 10,
                marginTop: 8,
                gap: 4,
              }}
            >
              <View style={s.row}>
                <Text style={s.bold}>{item.itemTitle}</Text>
                <Text style={s.caption}>{item.date}</Text>
              </View>
              {item.incidents.map((inc, i) => (
                <View key={i} style={s.row}>
                  <Text style={[s.caption, { color: colors.navy }]}>
                    • {inc.description}
                  </Text>
                  <Badge
                    text={
                      inc.isWinning
                        ? `${inc.penalty >= 0 ? "+" : ""}${inc.penalty} (Applied)`
                        : "Recorded"
                    }
                    green={inc.isWinning && inc.penalty > 0}
                  />
                </View>
              ))}
              <Row
                label="Score impact"
                value={`${item.scoreBefore} → ${item.scoreAfter} (${item.effectiveAdjustment >= 0 ? "+" : ""}${item.effectiveAdjustment})`}
                strong
              />
            </View>
          ))
        ) : (
          <Text style={[s.caption, { marginVertical: 8 }]}>
            No incident records. Clean rental history established with initial
            verified score of 80.
          </Text>
        )}
      </Card>

      {/* Trust and Support */}
      <Section title="Trust and Support" />
      <View style={{ gap: 10, marginBottom: 16 }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/how-it-works")}
          style={styles.supportNavCard}
        >
          <View style={styles.supportNavIconWrap}>
            <Ionicons name="bulb-outline" size={20} color={colors.blue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.supportNavTitle}>How CurRENT Works</Text>
            <Text style={styles.supportNavDesc}>
              A simple 4-step way to rent peer-to-peer
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/trust")}
          style={styles.supportNavCard}
        >
          <View style={styles.supportNavIconWrap}>
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color={colors.blue}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.supportNavTitle}>Trust</Text>
            <Text style={styles.supportNavDesc}>
              Confidence and protection built into the journey
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/faq")}
          style={styles.supportNavCard}
        >
          <View style={styles.supportNavIconWrap}>
            <Ionicons
              name="help-circle-outline"
              size={20}
              color={colors.blue}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.supportNavTitle}>FAQ</Text>
            <Text style={styles.supportNavDesc}>
              Frequently asked questions and answers
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/support/customer-service")}
          style={styles.supportNavCard}
        >
          <View style={styles.supportNavIconWrap}>
            <Ionicons name="headset-outline" size={20} color={colors.blue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.supportNavTitle}>Customer Service</Text>
            <Text style={styles.supportNavDesc}>
              CurRENT Assistant · Automated Support & Human Handoff
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
      </View>

      {/* Sign Out */}
      <Button
        secondary
        danger
        accessibilityLabel="Sign out"
        onPress={async () => {
          try {
            if (isSupabaseConfigured && supabase) {
              await signOutAuthenticatedAccount(supabase.auth);
            }
            act({ type: "login", userId: null });
            router.replace("/auth");
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        Sign Out
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rulesContainer: {
    marginTop: 14,
    padding: 14,
    backgroundColor: colors.paleBlue,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.softBlue,
    gap: 6,
  },
  rulesHeading: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.navy,
  },
  rulesSubheading: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.navy,
    marginTop: 4,
  },
  rulesBullet: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.slate,
  },
  rulesNote: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.slate,
    fontStyle: "italic",
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderColor: colors.softBlue,
  },
  supportNavCard: {
    backgroundColor: "white",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  supportNavIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.paleBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  supportNavTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.navy,
  },
  supportNavDesc: {
    fontSize: 12,
    color: colors.slate,
  },
});
