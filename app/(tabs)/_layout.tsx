import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { HeaderLogo } from '@/components/header-logo';
import { ProfileMenu } from '@/components/profile-menu';
import { AddItemModalProvider, useAddItemModal } from '@/providers/add-item-modal-provider';
import { useThemeColors } from '@/hooks/use-theme-colors';

function PlusTabButton() {
  const { openAddItemModal } = useAddItemModal();
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={openAddItemModal}
      style={({ pressed }) => [
        styles.addTabButton,
        { backgroundColor: colors.primary },
        pressed && styles.addTabPressed,
      ]}
    >
      <Feather name="plus" size={28} color={colors.primaryForeground} />
    </Pressable>
  );
}

export default function TabLayout() {
  const colors = useThemeColors();
  return (
    <AddItemModalProvider>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.tabIconSelected,
          tabBarInactiveTintColor: colors.tabIconDefault,
          headerShown: true,
          headerTitle: () => <HeaderLogo />,
          headerTitleAlign: 'left',
          headerRight: () => <ProfileMenu />,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarLabel: 'Home',
            tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="items"
          options={{
            title: 'Inventory',
            tabBarLabel: 'Inventory',
            tabBarIcon: ({ color, size }) => <Feather name="package" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="checkouts"
          options={{
            title: 'Checkouts',
            tabBarLabel: 'Checkouts',
            tabBarIcon: ({ color, size }) => <Feather name="shopping-cart" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="add"
          options={{
            title: 'Add Item',
            tabBarLabel: () => null,
            tabBarIcon: () => null,
            headerShown: false,
            tabBarButton: () => (
              <View style={styles.addTabWrap}>
                <PlusTabButton />
              </View>
            ),
          }}
        />
      </Tabs>
    </AddItemModalProvider>
  );
}

const styles = StyleSheet.create({
  addTabWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addTabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  addTabPressed: { opacity: 0.9 },
});
