import { useAuthContext } from '@/hooks/use-auth-context';
import { Feather } from '@expo/vector-icons';
import { ScrollView, View, Text, StyleSheet, ActivityIndicator } from 'react-native';

export default function SettingsScreen() {
  const { profile, isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const displayName = profile?.full_name || profile?.username || null;
  const hasUsername = !!profile?.username;
  const showUsernameRow = hasUsername && (!!profile?.full_name || displayName !== profile?.username);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <View style={[styles.row, !showUsernameRow && styles.rowLast]}>
            <Feather name="user" size={20} color="#666" />
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>
              {displayName ?? 'Not set'}
            </Text>
          </View>
          {showUsernameRow && (
            <View style={[styles.row, styles.rowLast]}>
              <Feather name="at-sign" size={20} color="#666" />
              <Text style={styles.label}>Username</Text>
              <Text style={styles.value}>{profile?.username ?? '—'}</Text>
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
  container: { flexGrow: 1, padding: 16, paddingBottom: 32, backgroundColor: '#f8f9fa' },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rowLast: { borderBottomWidth: 0 },
  label: { fontSize: 15, color: '#666', flex: 1 },
  value: { fontSize: 15, color: '#111', fontWeight: '500' },
});
