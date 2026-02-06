import { useAuthContext } from '@/hooks/use-auth-context';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { supabase } from '@/lib/supabase';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export function ProfileMenu() {
  const colors = useThemeColors();
  const router = useRouter();
  const { profile } = useAuthContext();
  const [menuVisible, setMenuVisible] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const handleSettings = () => {
    closeMenu();
    router.push('/settings');
  };

  const handleNotifications = () => {
    closeMenu();
    router.push('/notifications');
  };

  const handleSignOut = () => {
    closeMenu();
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          await supabase.auth.signOut();
          setSigningOut(false);
          setTimeout(() => router.replace('/login'), 100);
        },
      },
    ]);
  };

  const displayName = profile?.full_name || profile?.username || 'Profile';

  return (
    <>
      <Pressable
        onPress={openMenu}
        disabled={signingOut}
        style={({ pressed }) => [
          styles.trigger,
          { backgroundColor: colors.muted },
          pressed && styles.triggerPressed,
        ]}
        accessibilityLabel="Profile menu"
      >
        <View style={styles.avatar}>
          <Feather name="user" size={22} color={colors.tint} />
        </View>
      </Pressable>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <Pressable style={styles.overlay} onPress={closeMenu}>
          <View style={styles.menuContainer}>
            <Pressable
              style={[styles.menu, { backgroundColor: colors.card }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={[styles.menuHeader, { borderBottomColor: colors.border }]}>
                <View style={[styles.avatarLarge, { backgroundColor: colors.muted }]}>
                  <Feather name="user" size={28} color={colors.tint} />
                </View>
                <Text style={[styles.menuName, { color: colors.text }]} numberOfLines={1}>
                  {displayName}
                </Text>
              </View>
              <Pressable
                onPress={handleNotifications}
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && { backgroundColor: colors.muted },
                ]}
              >
                <Feather name="bell" size={20} color={colors.mutedForeground} />
                <Text style={[styles.menuItemText, { color: colors.text }]}>Notifications</Text>
              </Pressable>
              <Pressable
                onPress={handleSettings}
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && { backgroundColor: colors.muted },
                ]}
              >
                <Feather name="settings" size={20} color={colors.mutedForeground} />
                <Text style={[styles.menuItemText, { color: colors.text }]}>Settings</Text>
              </Pressable>
              <Pressable
                onPress={handleSignOut}
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && { backgroundColor: colors.muted },
                ]}
              >
                <Feather name="log-out" size={20} color={colors.destructive} />
                <Text style={[styles.menuItemText, styles.signOutText, { color: colors.destructive }]}>
                  Sign out
                </Text>
              </Pressable>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  triggerPressed: { opacity: 0.8 },
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 56,
    paddingRight: 16,
  },
  menuContainer: {
    minWidth: 220,
  },
  menu: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarLarge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  menuItemText: { fontSize: 16 },
  signOutText: { fontWeight: '500' },
});
