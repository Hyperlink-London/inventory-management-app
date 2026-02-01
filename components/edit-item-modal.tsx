import { deleteItem, updateItem, createTag } from '@/lib/actions';
import { supabase } from '@/lib/supabase';
import { compressImageForUpload } from '@/lib/compressImage';
import type { ItemWithTags } from '@/types';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

type Props = {
  visible: boolean;
  item: ItemWithTags;
  onClose: () => void;
  onSuccess: (updated?: ItemWithTags) => void;
  onDeleted: () => void;
};

export function EditItemModal({
  visible,
  item,
  onClose,
  onSuccess,
  onDeleted,
}: Props) {
  const [name, setName] = useState(item.item_name);
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [notes, setNotes] = useState(item.notes || '');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(item.item_name);
      setQuantity(String(item.quantity));
      setNotes(item.notes || '');
      setImageUri(null);
    }
  }, [visible, item]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Error', 'Enter an item name');
      return;
    }
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 0) {
      Alert.alert('Error', 'Enter a valid quantity');
      return;
    }

    setSubmitting(true);
    try {
      let imageUrl: string | null = item.image_URL;

      if (imageUri) {
        if (item.image_URL) {
          try {
            await supabase.rpc('delete_image_from_storage', {
              p_image_url: item.image_URL,
            });
          } catch {}
        }
        const compressed = await compressImageForUpload(imageUri);
        const ext = compressed.uri.split('.').pop() || 'jpg';
        const fileName = `${crypto.randomUUID()}.${ext}`;
        let blob: Blob;
        try {
          const response = await fetch(compressed.uri);
          blob = await response.blob();
        } catch {
          const FileSystem = await import('expo-file-system');
          const base64 = await FileSystem.readAsStringAsync(compressed.uri, {
            encoding: 'base64',
          });
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          blob = new Blob([bytes], { type: compressed.type });
        }
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('item-images')
          .upload(fileName, blob, { contentType: compressed.type });
        if (uploadError) throw new Error('Upload failed');
        const { data: urlData } = supabase.storage
          .from('item-images')
          .getPublicUrl(uploadData.path);
        imageUrl = urlData.publicUrl;
      }

      await updateItem(item.id, {
        name: trimmed,
        quantity: qty,
        notes: notes.trim() || null,
        image_url: imageUrl,
      });

      const { data: itemData } = await supabase
        .from('items')
        .select(
          `
          id,
          item_name,
          quantity,
          notes,
          image_URL,
          created_by,
          creator:profiles!items_created_by_fkey(full_name, username),
          itemtags(tags(id,name))
        `
        )
        .eq('id', item.id)
        .single();

      if (itemData) {
        const { data: activeCheckouts } = await supabase
          .from('itemsignouts')
          .select('quantity')
          .eq('item_id', item.id)
          .is('returned_date', null)
          .is('deleted_at', null);
        const checkedOut = activeCheckouts?.reduce((s, c) => s + c.quantity, 0) || 0;
        const updated: ItemWithTags = {
          id: itemData.id,
          item_name: itemData.item_name,
          quantity: itemData.quantity,
          checked_out_quantity: checkedOut,
          notes: itemData.notes,
          image_URL: itemData.image_URL,
          created_by: itemData.created_by,
          created_by_name: (itemData as any).creator?.full_name || (itemData as any).creator?.username || null,
          tags: (itemData.itemtags || [])
            .filter((it: any) => it.tags)
            .map((it: any) => ({ id: it.tags.id, name: it.tags.name })),
        };
        onSuccess(updated);
      } else {
        onSuccess();
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSubmitting(false);
    }
  }, [item, name, quantity, notes, imageUri, onSuccess]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Item',
      `Delete "${item.item_name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              await deleteItem(item.id);
              onClose();
              onDeleted();
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Delete failed');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Edit Item</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.form}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Item name"
            />

            <Text style={styles.label}>Quantity</Text>
            <TextInput
              style={styles.input}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="number-pad"
              placeholder="0"
            />

            <Text style={styles.label}>Image</Text>
            <Pressable onPress={pickImage} style={styles.imageBtn}>
              <Text style={styles.imageBtnText}>
                {imageUri ? 'Change image' : 'Select new image'}
              </Text>
            </Pressable>

            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notes]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Notes..."
              multiline
            />
          </ScrollView>

          <Pressable
            onPress={handleDelete}
            disabled={submitting}
            style={[styles.deleteBtn, submitting && styles.btnDisabled]}
          >
            <Text style={styles.deleteBtnText}>Delete Item</Text>
          </Pressable>

          <Pressable
            onPress={handleSave}
            disabled={submitting}
            style={[styles.submit, submitting && styles.btnDisabled]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Save</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%',
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111' },
  cancel: { fontSize: 16, color: '#666' },
  form: { maxHeight: 350, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  notes: { minHeight: 80, textAlignVertical: 'top' },
  imageBtn: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  imageBtnText: { fontSize: 16, color: '#666' },
  deleteBtn: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dc2626',
    marginBottom: 8,
  },
  deleteBtnText: { fontSize: 16, color: '#dc2626', fontWeight: '600' },
  submit: {
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
