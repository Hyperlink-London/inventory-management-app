import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { AddItemModal } from './add-item-modal';

type Props = { onSuccess?: () => void };

export function AddItemButton({ onSuccess }: Props) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  const handleSuccess = () => {
    setVisible(false);
    onSuccess?.();
  };

  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Feather name="plus" size={18} color="#fff" />
        <Text style={styles.text}>Add Item</Text>
      </Pressable>
      <AddItemModal
        visible={visible}
        onClose={() => setVisible(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  pressed: { opacity: 0.9 },
  text: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
