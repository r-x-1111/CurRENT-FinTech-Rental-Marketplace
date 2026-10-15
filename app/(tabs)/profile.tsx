import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Badge,
  Button,
  Card,
  Chips,
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
  const { section } = useLocalSearchParams<{ section?: string }>();
  const { state, user, act, actAndPersist, closeAuthenticatedWorkspace } = useMarketplace();
  const isMobile = useWindowDimensions().width <= 430;
  const [ekycY, setEkycY] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [documentType, setDocumentType] = useState("MyKad");
  const [sampledDocuments, setSampledDocuments] = useState<string[]>([]);
  const [scanningFace, setScanningFace] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!user) {
    return <Screen title="Profile" subtitle="Welcome to CurRENT">
      <Card>
        <Text style={s.h2}>Your CurRENT account</Text>
        <Text style={[s.body, { marginVertical: 14 }]}>Log in or create an account to manage your rentals, bookings and profile.</Text>
        <Button onPress={() => router.push({ pathname: "/auth", params: { returnTo: "/(tabs)/profile" } })}>Log In</Button>
        <View style={{ height: 10 }} />
        <Button secondary onPress={() => router.push({ pathname: "/auth", params: { mode: "Create account", returnTo: "/(tabs)/profile" } })}>Sign Up</Button>
      </Card>
    </Screen>;
  }

  const risk = riskFor(state, user);
  const completed = state.bookings.filter(
    (b) => b.renterId === user.id && b.status === "completed",
  ).length;
  const netPoints = (user.riskHistory || []).reduce(
    (acc, item) => acc + item.effectiveAdjustment,
    0,
  );

  async function verify(status: "pending" | "verified" | "failed") {
    try {
      if (status === "verified" && user?.verification !== "pending") {
        await actAndPersist({ type: "verify", status: "pending" });
      }
      await actAndPersist({ type: "verify", status });
      setError("");
      setSuccess(
        status === "verified"
          ? "Demo Verification Successful. Your initial verified score is 80 (Low)."
          : `Verification updated to ${status}.`,
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Screen
      title="Renter Dashboard"
      subtitle={`Welcome back, ${user.name} · CurRENT Renter Mode`}
      scrollToY={section === "ekyc" ? ekycY : null}
      contentStyle={isMobile ? styles.mobileContent : styles.desktopContent}
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
      <Card style={styles.profileCard}>
        <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
          {user.avatar ? (
            <Image
              source={{ uri: user.avatar }}
              style={{ width: isMobile ? 54 : 64, height: isMobile ? 54 : 64, borderRadius: 32 }}
            />
          ) : (
            <View
              style={{
                backgroundColor: colors.softBlue,
                padding: isMobile ? 16 : 20,
                borderRadius: 32,
              }}
            >
              <Text style={s.h2}>{user.name[0]}</Text>
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[s.h2, isMobile && styles.profileName]}>{user.name}</Text>
            <Text style={[s.caption, styles.profileEmail]}>{user.email}</Text>
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

      <View style={styles.lenderButton}><Button onPress={() => router.push("/owner")}>Lender Mode</Button></View>

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

      <View onLayout={(event) => setEkycY(Math.max(0, event.nativeEvent.layout.y - 16))}>
        <Section title="Identity Verification (Demo eKYC)" compact />
      </View>
      <Card style={styles.compactCard}>
        {user.verification === "verified" ? (
          <>
            <Text style={s.caption}>Simulated eKYC — Demo Only</Text>
            <View style={styles.verificationStage}>
              <Ionicons name="checkmark-circle" size={20} color={colors.green} />
              <Text style={styles.verificationStageText}>
                Identity Document — Completed
              </Text>
            </View>
            <View style={styles.verificationStage}>
              <Ionicons name="checkmark-circle" size={20} color={colors.green} />
              <Text style={styles.verificationStageText}>
                Face Verification — Completed
              </Text>
            </View>
          </>
        ) : (
          <>
            <Text style={s.caption}>
              Simulated eKYC — Demo Only. No real identity documents or
              biometric data are collected.
            </Text>
            <Chips
              options={["MyKad", "Passport"]}
              selected={documentType}
              onSelect={(value) => {
                setDocumentType(value);
                setSampledDocuments([]);
              }}
            />
            {(documentType === "MyKad"
              ? ["Front", "Back"]
              : ["Photo Page"]
            ).map((side) => {
              const key = `${documentType} ${side}`;
              const selected = sampledDocuments.includes(key);
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityLabel={`Select fictional ${key} sample photo`}
                  accessibilityState={{ selected }}
                  onPress={() =>
                    setSampledDocuments((current) =>
                      current.includes(key) ? current : [...current, key],
                    )
                  }
                  style={styles.samplePhotoTile}
                >
                  <Ionicons
                    name={selected ? "checkmark-circle" : "camera-outline"}
                    size={24}
                    color={selected ? colors.green : colors.blue}
                  />
                  <Text style={styles.verificationStageText}>
                    {documentType === "MyKad"
                      ? `${side} of MyKad`
                      : "Passport Photo Page"}
                  </Text>
                  <Text style={s.caption}>
                    {selected ? "Sample photo added (Demo)" : "Tap to select sample"}
                  </Text>
                </Pressable>
              );
            })}
            <View style={styles.verificationStage}>
              <Ionicons name="scan-outline" size={22} color={colors.blue} />
              <Text style={styles.verificationStageText}>
                Face Verification — Simulated face scan
              </Text>
            </View>
            {(() => {
              const requiredSamples =
                documentType === "MyKad"
                  ? ["MyKad Front", "MyKad Back"]
                  : ["Passport Photo Page"];
              const documentsReady = requiredSamples.every((item) =>
                sampledDocuments.includes(item),
              );
              return (
                <Button
                  disabled={!documentsReady || scanningFace}
                  onPress={async () => {
                    setScanningFace(true);
                    try {
                      await new Promise((resolve) => setTimeout(resolve, 900));
                      await verify("verified");
                    } finally {
                      setScanningFace(false);
                    }
                  }}
                >
                  {scanningFace
                    ? "Scanning…"
                    : "Start Demo Face Scan"}
                </Button>
              );
            })()}
          </>
        )}
      </Card>

      {/* Rental Risk Score Section */}
      <Section title="Rental Risk Score" compact />
      <Card style={[styles.compactCard, styles.riskCard]}>
        <View style={{ alignItems: "center", paddingVertical: 2 }}>
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
      </Card>

      {/* Trust and Support */}
      <Section title="Trust and Support" compact />
      <View style={{ gap: 10, marginBottom: 16 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="What You Should Know" onPress={() => router.push("/what-you-should-know")} style={({ pressed, hovered }) => [styles.supportNavCard, styles.supportNavFeatured, hovered && styles.supportNavHovered, pressed && styles.supportNavPressed]}>
          <View style={styles.supportNavIconWrap}><Ionicons name="information-circle-outline" size={20} color={colors.blue} /></View>
          <View style={{ flex: 1 }}><Text style={styles.supportNavTitle}>What You Should Know</Text><Text style={styles.supportNavDesc}>Deposit rules and score changes</Text></View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Risk Score History" onPress={() => router.push("/risk-score-history")} style={({ pressed, hovered }) => [styles.supportNavCard, styles.supportNavFeatured, hovered && styles.supportNavHovered, pressed && styles.supportNavPressed]}>
          <View style={styles.supportNavIconWrap}><Ionicons name="time-outline" size={20} color={colors.blue} /></View>
          <View style={{ flex: 1 }}><Text style={styles.supportNavTitle}>Risk Score History</Text><Text style={styles.supportNavDesc}>View past score updates and incidents</Text></View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/how-it-works")}
          style={({ hovered, pressed }) => [styles.supportNavCard, hovered && styles.supportNavHovered, pressed && styles.supportNavPressed]}
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
          style={({ hovered, pressed }) => [styles.supportNavCard, hovered && styles.supportNavHovered, pressed && styles.supportNavPressed]}
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
          style={({ hovered, pressed }) => [styles.supportNavCard, hovered && styles.supportNavHovered, pressed && styles.supportNavPressed]}
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
          style={({ hovered, pressed }) => [styles.supportNavCard, hovered && styles.supportNavHovered, pressed && styles.supportNavPressed]}
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
      <View style={styles.signOutWrap}><Button
        secondary
        danger
        accessibilityLabel="Sign out"
        onPress={async () => {
          try {
            await closeAuthenticatedWorkspace();
            if (isSupabaseConfigured && supabase) {
              await signOutAuthenticatedAccount(supabase.auth);
            }
            act({ type: "login", userId: null });
            router.replace("/(tabs)");
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        Sign Out
      </Button></View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mobileContent: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 100 },
  desktopContent: { maxWidth: 860, paddingBottom: 68 },
  profileCard: { padding: 18, gap: 12, marginBottom: 14, backgroundColor: colors.paleBlue, borderColor: colors.softBlue, borderLeftWidth: 3, borderLeftColor: colors.blue },
  profileName: { fontSize: 18, lineHeight: 23 },
  profileEmail: { fontSize: 13, lineHeight: 18, flexShrink: 1 },
  lenderButton: { marginBottom: 4 },
  compactCard: { padding: 16, gap: 8, marginBottom: 12 },
  riskCard: { backgroundColor: colors.paleBlue, borderColor: colors.softBlue, borderTopWidth: 3, borderTopColor: colors.blue },
  signOutWrap: { marginTop: 14, marginBottom: 16 },
  verificationStage: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 5,
  },
  verificationStageText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  samplePhotoTile: {
    minHeight: 76,
    marginTop: 10,
    padding: 12,
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.blue,
    backgroundColor: colors.paleBlue,
    borderRadius: 12,
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
    cursor: "pointer",
  },
  supportNavFeatured: { backgroundColor: colors.paleBlue, borderColor: colors.softBlue },
  supportNavHovered: { backgroundColor: colors.softBlue, borderColor: colors.blue },
  supportNavPressed: { opacity: 0.82 },
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
