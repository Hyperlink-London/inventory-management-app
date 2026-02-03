import { AddItemModal } from '@/components/add-item-modal';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

/**
 * Tab screen that shows the Add Item modal. When closed, navigates back to previous tab.
 */
export default function AddItemTabScreen() {
  const router = useRouter();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!visible) {
      router.back();
    }
  }, [visible, router]);

  const handleClose = () => setVisible(false);
  const handleSuccess = () => setVisible(false);

  return (
    <View style={{ flex: 1 }}>
      <AddItemModal visible={visible} onClose={handleClose} onSuccess={handleSuccess} />
    </View>
  );
}
