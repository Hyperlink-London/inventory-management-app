import { createItem, createTag } from '@/lib/actions';
import { supabase } from '@/lib/supabase';
import { compressImageForUpload } from '@/lib/compressImage';
import { useAuthContext } from '@/hooks/use-auth-context';
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

type Tag = { id: string; name: string };

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function AddItemModal({ visible, onClose, onSuccess }: Props) {
  const { session } = useAuthContext();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      supabase.from('tags').select('id, name').then(({ data }) => {
        setAvailableTags((data as Tag[]) || []);
      });
    }
  }, [visible]);

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

  const handleSubmit = useCallback(async () => {
    if (!session?.user) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Error', 'Please enter an item name');
      return;
    }
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    setSubmitting(true);
    try {
      let imageUrl: string | null = null;
      if (imageUri) {
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

        if (uploadError) {
          Alert.alert('Error', 'Failed to upload image');
          setSubmitting(false);
          return;
        }
        const { data: urlData } = supabase.storage.from('item-images').getPublicUrl(uploadData.path);
        imageUrl = urlData.publicUrl;
      }

      const item = await createItem({
        name: trimmed,
        quantity: qty,
        notes: notes.trim() || null,
        image_url: imageUrl,
      });

      for (const tag of tags) {
        const existing = availableTags.find((t) => t.id === tag.id || t.name === tag.name);
        let tagId = existing?.id;
        if (!tagId) {
          const created = await createTag(tag.name);
          tagId = created.id;
        }
        await supabase.from('itemtags').insert({ item_id: item.id, tag_id: tagId });
      }

      setName('');
      setQuantity('');
      setNotes('');
      setTags([]);
      setImageUri(null);
      onSuccess();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to add item');
    } finally {
      setSubmitting(false);
    }
  }, [session, name, quantity, notes, tags, imageUri, availableTags, onSuccess]);

  const addTag = (tag: Tag) => {
    if (!tags.some((t) => t.id === tag.id && t.name === tag.name)) {
      setTags([...tags, tag]);
    }
  };

  const removeTag = (id: string) => setTags(tags.filter((t) => t.id !== id));

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Add Item</Text>
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
              autoCapitalize="words"
            />

            <Text style={styles.label}>Quantity</Text>
            <TextInput
              style={styles.input}
              value={quantity}
              onChangeText={setQuantity}
              placeholder="0"
              keyboardType="number-pad"
            />

            <Text style={styles.label}>Image</Text>
            <Pressable onPress={pickImage} style={styles.imageButton}>
              <Text style={styles.imageButtonText}>{imageUri ? 'Change image' : 'Select image'}</Text>
            </Pressable>

            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notes]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Additional details..."
              multiline
            />
          </ScrollView>

          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={[styles.submit, submitting && styles.submitDisabled]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Add Item</Text>
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
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111' },
  cancel: { fontSize: 16, color: '#666' },
  form: { padding: 16, maxHeight: 400 },
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
  imageButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  imageButtonText: { fontSize: 16, color: '#666' },
  submit: {
    marginHorizontal: 16,
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
