import { useState } from "react";
import { Image, Text, View } from "react-native";
import { router } from "expo-router";
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
export default function ProfileScreen() {
  const { state, user, act } = useMarketplace();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState("");
  if (!user)
    return (
      <Screen title="Make yourself at home">
        <Empty
          title="Join the CurRENT community"
          text="Create a demo account, or try a ready-made renter or owner profile."
          action="Sign in or create account"
          onPress={() => router.push("/auth")}
        />
      </Screen>
    );
  const risk = riskFor(state, user);
  const reviews = state.reviews.filter((r) => r.recipientId === user.id);
  const completed = state.bookings.filter(
    (b) => b.renterId === user.id && b.status === "completed",
  ).length;
  function verify(status: "pending" | "verified" | "failed") {
    try {
      act({ type: "verify", status });
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Screen
      title="Your corner of CurRENT"
      subtitle="A little trust goes a long way."
    >
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
      {!!error && <Notice text={error} error />}
      <Button onPress={() => router.push("/owner")}>Open Owner Mode →</Button>
      <Section title="Rental Risk Score" />
      <Card>
        <View style={s.row}>
          <Text style={[s.title, { fontSize: 46 }]}>
            {risk.score}
            <Text style={s.caption}> / 100</Text>
          </Text>
          <Badge text={`${risk.level} risk`} green={risk.level === "low"} />
        </View>
        <View
          style={{
            height: 8,
            backgroundColor: colors.paleBlue,
            borderRadius: 6,
          }}
        >
          <View
            style={{
              height: 8,
              backgroundColor: colors.blue,
              width: `${risk.score}%`,
              borderRadius: 6,
            }}
          />
        </View>
        <Text style={s.caption}>
          Transparent prototype rules, not a credit score. Higher scores mean
          lower estimated security deposits.
        </Text>
        <Row label="Starting score" value="50" />
        <Row
          label="Identity verified"
          value={user.verification === "verified" ? "+15" : "+0"}
        />
        <Row
          label={`${completed} completed rentals`}
          value={`+${Math.min(20, completed * 2)}`}
        />
        <Row
          label="Community rating"
          value={
            reviews.length
              ? `${(reviews.reduce((n, r) => n + r.rating, 0) / reviews.length).toFixed(1)} / 5`
              : "No reviews yet"
          }
        />
        <Text style={s.caption}>
          Ratings of 4.5+ add 10 points. Open disputes subtract 20; resolved
          disputes subtract 5. Deposit rates: low risk 10%, standard 20%, higher
          30% of item value. Late-return and transaction-provider signals are
          not automated in this demo.
        </Text>
      </Card>
      <Section title="Identity verification" />
      <Card>
        <Badge
          text={user.verification}
          green={user.verification === "verified"}
        />
        <Text style={s.caption}>
          Simulate an external eKYC provider. No identity documents are
          collected.
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
            <Notice text="Verification pending. Choose a provider response to test either outcome." />
            <Button onPress={() => verify("verified")}>
              Simulate verified result
            </Button>
            <Button secondary onPress={() => verify("failed")}>
              Simulate failed result
            </Button>
          </>
        )}
      </Card>
      <Section title="Your activity" />
      <View style={{ gap: 10 }}>
        <Button
          secondary
          onPress={() =>
            router.push({ pathname: "/(tabs)/explore", params: { saved: "1" } })
          }
        >{`Saved items · ${user.favourites.length}`}</Button>
        <Button secondary onPress={() => router.push("/transactions")}>
          Payment & transaction history
        </Button>
        <Button secondary onPress={() => router.push("/notifications")}>
          Notifications
        </Button>
        <Button secondary onPress={() => router.push("/(tabs)/rentals")}>
          Rental history
        </Button>
      </View>
      <Section title="Community reviews" />
      {reviews.length ? (
        reviews.map((r) => (
          <Card key={r.id}>
            <Text style={s.bold}>
              {"★".repeat(r.rating)} ·{" "}
              {state.profiles.find((p) => p.id === r.authorId)?.name}
            </Text>
            <Text style={s.body}>{r.text || "Review submitted."}</Text>
          </Card>
        ))
      ) : (
        <Text style={s.caption}>
          Complete a rental to receive your first review.
        </Text>
      )}
      <Section title="Demo accounts" />
      <Card>
        <Text style={s.caption}>
          The renter and owner share this device’s demo data. Switch accounts to
          approve requests, arrange handovers and reply to messages.
        </Text>
        {state.profiles
          .filter((p) => !p.passwordHash)
          .map((p) => (
            <Button
              secondary
              key={p.id}
              disabled={user.id === p.id}
              onPress={() => {
                act({ type: "login", userId: p.id });
                setEditing(false);
              }}
            >{`${p.name}${user.id === p.id ? " · current account" : ""}`}</Button>
          ))}
        <Button secondary onPress={() => router.push("/auth")}>
          Sign in or create another account
        </Button>
        <Button
          danger
          onPress={() => {
            act({ type: "login", userId: null });
            setEditing(false);
          }}
        >
          Sign out
        </Button>
      </Card>
    </Screen>
  );
}
