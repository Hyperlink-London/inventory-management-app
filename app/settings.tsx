import { useAuthContext } from '@/hooks/use-auth-context';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { Feather } from '@expo/vector-icons';
import { ScrollView, View, Text, StyleSheet, ActivityIndicator } from 'react-native';

export default function SettingsScreen() {
  const colors = useThemeColors();
  const { profile, isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  const displayName = profile?.full_name || profile?.username || null;
  const hasUsername = !!profile?.username;
  const showUsernameRow = hasUsername && (!!profile?.full_name || displayName !== profile?.username);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Account</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.row, { borderBottomColor: colors.border }, !showUsernameRow && styles.rowLast]}>
            <Feather name="user" size={20} color={colors.mutedForeground} />
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Name</Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {displayName ?? 'Not set'}
            </Text>
          </View>
          {showUsernameRow && (
            <View style={[styles.row, styles.rowLast, { borderBottomColor: colors.border }]}>
              <Feather name="at-sign" size={20} color={colors.mutedForeground} />
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Username</Text>
              <Text style={[styles.value, { color: colors.text }]}>{profile?.username ?? '—'}</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flexGrow: 1, padding: 16, paddingBottom: 32 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
  },
  rowLast: { borderBottomWidth: 0 },
  label: { fontSize: 15, flex: 1 },
  value: { fontSize: 15, fontWeight: '500' },
});
