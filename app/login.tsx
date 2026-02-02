import { GitHubSignInButton } from '@/components/github-sign-in-button';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { StyleSheet, Text, View } from 'react-native';

export default function LoginScreen() {
  const colors = useThemeColors();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Inventory Management</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Sign in to manage your inventory
      </Text>
      <GitHubSignInButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
  },
});
