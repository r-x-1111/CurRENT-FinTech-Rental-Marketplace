import React, { useState, useRef, useEffect } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../components/ui";
import { useMarketplace } from "../../context/Marketplace";
import { colors } from "../../constants/theme";
import type { SupportMessage } from "../../types/marketplace";

const QUICK_TOPICS = [
  "How to rent",
  "Fees",
  "Deposits",
  "Delivery & return",
  "Risk score",
  "Disputes",
  "How is my risk score calculated?",
  "When will the lender receive rental money?",
];

export default function CustomerServiceScreen() {
  const { state, user, act, storageError } = useMarketplace();
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  const messages: SupportMessage[] = (state.supportMessages || []).filter(
    (message) => message.userId === user?.id,
  );

  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages.length]);

  if (!user) {
    return <Redirect href="/auth" />;
  }

  function handleSend(text?: string) {
    const query = (text || inputText).trim();
    if (!query) return;
    setInputText("");
    act({ type: "supportQuery", text: query });
  }

  function handleHandoff() {
    const query = inputText.trim() || "Talk to a Human";
    setInputText("");
    act({ type: "supportHandoff", query });
  }

  function renderMessageItem({ item }: { item: SupportMessage }) {
    const isUser = item.sender === "user";
    const isHuman = item.sender === "human";

    return (
      <View
        style={[
          styles.messageRow,
          isUser ? styles.messageRowUser : styles.messageRowBot,
        ]}
      >
        {!isUser && (
          <View style={styles.senderHeader}>
            <View
              style={[
                styles.avatarCircle,
                isHuman
                  ? { backgroundColor: "#ECFDF5" }
                  : { backgroundColor: colors.paleBlue },
              ]}
            >
              <Ionicons
                name={
                  isHuman ? "person-circle-outline" : "hardware-chip-outline"
                }
                size={16}
                color={isHuman ? "#059669" : colors.blue}
              />
            </View>
            <Text
              style={[
                styles.senderName,
                isHuman && { color: "#059669", fontWeight: "700" },
              ]}
            >
              {isHuman
                ? "CurRENT Support · Human"
                : "CurRENT Assistant · Automated Support"}
            </Text>
          </View>
        )}

        <View
          style={[
            styles.bubble,
            isUser
              ? styles.bubbleUser
              : isHuman
                ? styles.bubbleHuman
                : styles.bubbleBot,
          ]}
        >
          <Text
            style={[
              styles.bubbleText,
              isUser ? styles.bubbleTextUser : styles.bubbleTextBot,
            ]}
          >
            {item.text}
          </Text>
          <Text
            style={[
              styles.timeText,
              isUser ? styles.timeTextUser : styles.timeTextBot,
            ]}
          >
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <Screen back title="Customer Service" subtitle="Automated support">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.chatContainer}
      >
        {/* Assistant Identity Banner */}
        <View style={styles.assistantBanner}>
          <View style={styles.bannerIconWrap}>
            <Ionicons name="headset-outline" size={24} color={colors.blue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>
              CurRENT Assistant · Automated Support
            </Text>
            <Text style={styles.bannerSubtitle}>
              Answers to approved CurRENT topics
            </Text>
          </View>
        </View>

        {/* Quick Topic Chips */}
        <View style={styles.chipsSection}>
          <Text style={styles.chipsHeading}>Frequently asked topics:</Text>
          <View style={styles.chipsGrid}>
            {QUICK_TOPICS.map((topic) => (
              <Pressable
                key={topic}
                accessibilityRole="button"
                accessibilityLabel={`Ask about ${topic}`}
                onPress={() => handleSend(topic)}
                style={styles.chipButton}
              >
                <Text style={styles.chipButtonText}>{topic}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Talk to a Human support agent"
            onPress={handleHandoff}
            style={styles.talkToHumanButton}
          >
            <Ionicons name="people-outline" size={16} color={colors.blue} />
            <Text style={styles.talkToHumanText}>Talk to a Human</Text>
          </Pressable>
        </View>

        {storageError ? (
          <View style={styles.waitingNotice}>
            <Ionicons name="warning-outline" size={16} color="#B45309" />
            <Text style={styles.waitingNoticeText}>
              {storageError}
            </Text>
          </View>
        ) : null}

        {/* Message Thread */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.greetingBubble}>
              <View style={styles.senderHeader}>
                <View style={styles.avatarCircle}>
                  <Ionicons
                    name="hardware-chip-outline"
                    size={16}
                    color={colors.blue}
                  />
                </View>
                <Text style={styles.senderName}>
                  CurRENT Assistant · Automated Support
                </Text>
              </View>
              <View style={[styles.bubble, styles.bubbleBot]}>
                <Text style={[styles.bubbleText, styles.bubbleTextBot]}>
                  Hi! I'm CurRENT's automated assistant. What can I help you
                  with today?
                </Text>
              </View>
            </View>
          }
        />

        {/* Chat Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your question..."
            placeholderTextColor="#94A3B8"
            onSubmitEditing={() => handleSend()}
            returnKeyType="send"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            onPress={() => handleSend()}
            disabled={!inputText.trim()}
            style={[
              styles.sendButton,
              !inputText.trim() && styles.sendButtonDisabled,
            ]}
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chatContainer: {
    flex: 1,
    minHeight: 520,
    backgroundColor: colors.offWhite,
  },
  assistantBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  bannerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.paleBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.navy,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  chipsSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  chipsHeading: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
    marginBottom: 8,
  },
  chipsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chipButton: {
    backgroundColor: colors.paleBlue,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#DDEAFF",
  },
  chipButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.blue,
  },
  talkToHumanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  talkToHumanText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.blue,
  },
  waitingNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  waitingNoticeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#92400E",
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
    gap: 12,
  },
  greetingBubble: {
    marginBottom: 12,
  },
  messageRow: {
    marginBottom: 10,
    maxWidth: "85%",
  },
  messageRowUser: {
    alignSelf: "flex-end",
  },
  messageRowBot: {
    alignSelf: "flex-start",
  },
  senderHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  avatarCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  senderName: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.navy,
  },
  bubble: {
    borderRadius: 14,
    padding: 12,
  },
  bubbleUser: {
    backgroundColor: colors.blue,
    borderBottomRightRadius: 4,
  },
  bubbleBot: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleHuman: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTextUser: {
    color: "#FFFFFF",
  },
  bubbleTextBot: {
    color: colors.navy,
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  timeTextUser: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  timeTextBot: {
    color: colors.muted,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 8,
  },
  textInput: {
    flex: 1,
    height: 44,
    backgroundColor: colors.offWhite,
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 14,
    color: colors.navy,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#CBD5E1",
  },
});
