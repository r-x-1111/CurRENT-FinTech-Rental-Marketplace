import { Modal, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Button, Card, Screen, s } from "./ui";
import { colors } from "../constants/theme";

function auth(mode: "Sign in" | "Create account", returnTo: string) {
  router.push({ pathname: "/auth", params: { mode, returnTo } });
}

export function GuestAuthGate({ title, returnTo }: { title: string; returnTo: string }) {
  return <Screen title={title}><Card>
    <Text style={s.h2}>Log in to continue</Text>
    <Text style={[s.body, { marginVertical: 14 }]}>Log in or create an account to access your {title.toLowerCase()}.</Text>
    <Button onPress={() => auth("Sign in", returnTo)}>Log In</Button>
    <View style={{ height: 10 }} /><Button secondary onPress={() => auth("Create account", returnTo)}>Sign Up</Button>
    <View style={{ height: 10 }} /><Button secondary onPress={() => router.replace("/(tabs)")}>Cancel</Button>
  </Card></Screen>;
}

export function GuestAuthPrompt({ visible, onClose, returnTo }: { visible: boolean; onClose: () => void; returnTo: string }) {
  return <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
    <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "#0008", justifyContent: "center", padding: 20 }}>
      <Pressable onPress={() => {}} style={{ width: "100%", maxWidth: 420, alignSelf: "center", backgroundColor: "white", borderRadius: 18, padding: 22 }}>
        <Text style={[s.h2, { color: colors.navy }]}>Log in to continue</Text>
        <Text style={[s.body, { marginVertical: 14 }]}>Log in or create an account to use this feature. You can return here afterward.</Text>
        <Button onPress={() => { onClose(); auth("Sign in", returnTo); }}>Log In</Button>
        <View style={{ height: 10 }} /><Button secondary onPress={() => { onClose(); auth("Create account", returnTo); }}>Sign Up</Button>
        <View style={{ height: 10 }} /><Button secondary onPress={onClose}>Cancel</Button>
      </Pressable>
    </Pressable>
  </Modal>;
}
