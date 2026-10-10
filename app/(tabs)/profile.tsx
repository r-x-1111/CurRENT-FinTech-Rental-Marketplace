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

export default function ProfileScreen() {
  const { state, user, act } = useMarketplace();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!user) {
    return <Redirect href="/auth" />;
  }

  const risk = riskFor(state, user);
  const reviews = state.reviews.filter((r) => r.recipientId === user.id);
  const completed = state.bookings.filter(
    (b) => b.renterId === user.id && b.status === "completed",
  ).length;

  function verify(status: "pending" | "verified" | "failed") {
    try {
      act({ type: "verify", status });
      setError("");
      setSuccess(`Verification updated to ${status}.`);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function simulateOutcome(
    itemTitle: string,
    rawIncidents: {
      type: "on_time_success" | "late_return" | "minor_damage" | "serious_damage" | "theft_fraud";
      hoursLate?: number;
      confirmed?: boolean;
      description?: string;
    }[],
  ) {
    if (!user) return;
    try {
      act({
        type: "recordRentalOutcome",
        renterId: user.id,
        itemTitle,
        rawIncidents,
      });
      setError("");
      setSuccess(`Simulated outcome recorded for ${itemTitle}.`);
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
              text={`${user.verification} · demo`}
              green={user.verification === "verified"}
            />
          </View>
        </View>
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
            In accordance with Section 15, renters with an outstanding confirmed damage liability unpaid after 7 days are restricted from creating new rentals, regardless of risk score.
          </Text>
          <Button
            onPress={() => {
              act({ type: "settleOverdueObligation", userId: user.id });
              setSuccess("Simulated damage obligation settled in full! Booking privileges restored.");
            }}
          >
            Simulate Full Settlement (Clear Obligation & Lift Restriction)
          </Button>
        </Card>
      )}

      <Button onPress={() => router.push("/owner")}>
        Open Owner Mode (Lender Workspace) →
      </Button>

      {/* Identity Verification (Demo eKYC) */}
      <Section title="Identity Verification (Demo eKYC)" />
      <Card>
        <Badge
          text={user.verification === "verified" ? "✓ Verified Renter (Demo eKYC Passed)" : `${user.verification} · demo`}
          green={user.verification === "verified"}
        />
        <Text style={s.caption}>
          Simulate an external eKYC identity provider. In this classroom demo, no real identity documents or biometrics are collected.
          Upon successful verification, every newly verified renter begins at strictly 75/100 (Medium Risk).
        </Text>
        {["not_verified", "failed"].includes(user.verification) && (
          <Button onPress={() => verify("pending")}>
            {user.verification === "failed"
              ? "Retry demo verification"
              : "Start demo verification"}
          </Button>
        )}
        {user.verification === "pending" && (
          <>
            <Notice text="Verification pending. Choose a simulated provider response to test either outcome." />
            <Button onPress={() => verify("verified")}>
              Simulate verified result (Initial Score 75 · Medium)
            </Button>
            <Button secondary onPress={() => verify("failed")}>
              Simulate failed result
            </Button>
          </>
        )}
      </Card>

      {/* Rental Risk Score Section */}
      <Section title="Rental Risk Score" />
      <Card>
        <View style={{ alignItems: "center", paddingVertical: 8 }}>
          <RiskGauge score={risk.score} label={risk.label} />
        </View>
        <View style={s.row}>
          <Text style={[s.title, { fontSize: 32 }]}>
            {risk.score !== null ? `${risk.score} / 100` : "N/A"}
          </Text>
          <Badge text={risk.label} green={risk.level === "low"} />
        </View>
        <Text style={s.caption}>
          CurRENT Rental Risk Score is a platform reliability metric, NOT a consumer credit score.
          It transparently determines your refundable security deposit tier and booking permissions.
        </Text>
        <Row label="Initial verified score" value="75 (Medium Risk)" />
        <Row
          label="Verification status"
          value={user.verification === "verified" ? "Verified (Demo eKYC)" : "Not verified (N/A)"}
        />
        <Row
          label="Booking route"
          value={
            risk.score === null
              ? "Blocked (eKYC Required)"
              : risk.score >= 30
              ? "Direct Demo Checkout"
              : "Pending Platform Review Only"
          }
        />
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
          value={`+${completed * 2} points`}
        />
        <View style={styles.rulesContainer}>
          <Text style={styles.rulesHeading}>What You Should Know</Text>
          <Text style={styles.rulesSubheading}>Deposit & Booking Rules</Text>
          <Text style={styles.rulesBullet}>• Low Risk (80–100): 5% deposit, capped at RM500 (Direct checkout)</Text>
          <Text style={styles.rulesBullet}>• Medium Risk (40–79): 10% deposit, capped at RM1,000 (Direct checkout)</Text>
          <Text style={styles.rulesBullet}>• High Risk (30–39): 15% deposit, capped at RM1,500 (Direct checkout)</Text>
          <Text style={styles.rulesBullet}>• Very High Risk (0–29): CurRENT Platform Review request (Pending only, no checkout)</Text>
          <Text style={styles.rulesSubheading}>How Your Score Changes</Text>
          <Text style={styles.rulesBullet}>• +2 points: Complete a rental on time with no issues.</Text>
          <Text style={styles.rulesBullet}>• Late return: More than 2 hours late: −1 point for each additional hour or part of an hour, maximum −5, only when actual lateness is supported by return-time evidence.</Text>
          <Text style={styles.rulesBullet}>• −10 points: Confirmed minor damage.</Text>
          <Text style={styles.rulesBullet}>• −30 points: Confirmed serious damage or accidental loss.</Text>
          <Text style={styles.rulesBullet}>• Confirmed intentional theft or fraud: Permanent ban, not an additional numerical penalty.</Text>
          <Text style={styles.rulesNote}>
            Only one final outcome applies per rental. If multiple issues occur, the most serious confirmed outcome applies; pending reports do not change your score. Successful appeals correct the original outcome.
          </Text>
        </View>
      </Card>

      {/* Risk Score History */}
      <Section title="Risk Score History" />
      <Card>
        <Text style={s.caption}>
          Single Winning Incident Rule: When multiple violations occur on the same physical rental chain, only the single most serious
          penalty is applied. Secondary incidents are recorded in audit history but not stacked.
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
                  <Text style={[s.caption, { color: colors.navy }]}>• {inc.description}</Text>
                  <Badge
                    text={inc.isWinning ? `${inc.penalty >= 0 ? "+" : ""}${inc.penalty} (Applied)` : "Recorded"}
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
            No incident records. Clean rental history established with initial verified score of 75.
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
            <Text style={styles.supportNavDesc}>A simple 4-step way to rent peer-to-peer</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/trust")}
          style={styles.supportNavCard}
        >
          <View style={styles.supportNavIconWrap}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.blue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.supportNavTitle}>Trust</Text>
            <Text style={styles.supportNavDesc}>Confidence and protection built into the journey</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/faq")}
          style={styles.supportNavCard}
        >
          <View style={styles.supportNavIconWrap}>
            <Ionicons name="help-circle-outline" size={20} color={colors.blue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.supportNavTitle}>FAQ</Text>
            <Text style={styles.supportNavDesc}>Frequently asked questions and answers</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
      </View>

      {/* Sign Out */}
      <Button
        secondary
        danger
        accessibilityLabel="Sign out"
        onPress={() => {
          act({ type: "login", userId: null });
          router.replace("/auth");
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
