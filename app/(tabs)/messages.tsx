import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../../constants/theme';

const conversations = [
  { name: 'Aiman R.', item: 'Sony A7 III', message: '3 PM collection works for me.', unread: 2 },
  { name: 'Sarah L.', item: 'PlayStation 5', message: 'Thanks, your request has been approved.', unread: 0 }
];

export default function MessagesScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.caption}>Keep rental communication on CurRENT.</Text>
        {conversations.map((conversation) => (
          <View key={`${conversation.name}-${conversation.item}`} style={styles.card}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{conversation.name[0]}</Text></View>
            <View style={styles.body}>
              <View style={styles.row}>
                <Text style={styles.name}>{conversation.name}</Text>
                {conversation.unread > 0 ? <Text style={styles.unread}>{conversation.unread}</Text> : null}
              </View>
              <Text style={styles.item}>{conversation.item}</Text>
              <Text style={styles.message} numberOfLines={1}>{conversation.message}</Text>
            </View>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.offWhite },
  content: { padding: spacing.md },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  caption: { color: colors.muted, marginTop: spacing.xs, marginBottom: spacing.lg },
  card: { flexDirection: 'row', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.softBlue, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  avatarText: { color: colors.navy, fontWeight: '800' },
  body: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { color: colors.text, fontWeight: '800' },
  unread: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.blue, color: colors.white, textAlign: 'center', lineHeight: 20, fontSize: 11, fontWeight: '800' },
  item: { color: colors.blue, fontSize: 12, marginTop: 2 },
  message: { color: colors.muted, marginTop: spacing.xs }
});
