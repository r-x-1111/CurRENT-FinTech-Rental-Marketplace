import { router } from "expo-router";
import { Text, View } from "react-native";
import { Button, Card, Screen, s } from "../components/ui";
import { colors } from "../constants/theme";

export default function WelcomeScreen() {
  return (
    <Screen>
      <View style={{ width: "100%", maxWidth: 620, alignSelf: "center" }}>
        <Card>
          <View style={{ alignItems: "center", gap: 14, paddingVertical: 24 }}>
            <Text
              style={{ fontSize: 32, fontWeight: "900", color: colors.navy }}
            >
              CurRENT
            </Text>
            <Text style={[s.h2, { textAlign: "center" }]}>
              Rent Smarter. Own Less. Live More.
            </Text>
            <Text style={[s.body, { textAlign: "center", marginBottom: 8 }]}>
              A smarter way to rent what you need and earn from what you own.
            </Text>
            <Button onPress={() => router.push("/auth")}>Sign In</Button>
            <Button
              secondary
              onPress={() =>
                router.push({
                  pathname: "/auth",
                  params: { mode: "Create account" },
                })
              }
            >
              Sign Up
            </Button>
          </View>
        </Card>
      </View>
    </Screen>
  );
}
