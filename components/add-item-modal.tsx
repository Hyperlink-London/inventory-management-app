import { createItem, createTag } from '@/lib/actions';
import { supabase } from '@/lib/supabase';
import { uploadItemImage } from '@/lib/uploadImage';
import { notifyTeamItemAdded } from '@/lib/team-push';
import { useAuthContext } from '@/hooks/use-auth-context';
import { useDataRefresh } from '@/providers/data-refresh-provider';
import { TagSelector } from '@/components/tag-selector';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';

type Tag = { id: string; name: string };

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function AddItemModal({ visible, onClose, onSuccess }: Props) {
  const { session, profile } = useAuthContext();
  const { refresh } = useDataRefresh();
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

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to take a photo.');
      return;
    }
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err) {
      const message =
        err instanceof Error && err.message?.toLowerCase().includes('simulator')
          ? "Camera isn't available on simulator. Use a device or choose from library."
          : 'Camera is not available. Try choosing from library instead.';
      Alert.alert('Camera unavailable', message, [
        { text: 'OK' },
        { text: 'Choose from library', onPress: chooseFromLibrary },
      ]);
    }
  };

  const chooseFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access is required to choose an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const showImageOptions = () => {
    if (Platform.OS === 'web') {
      chooseFromLibrary();
      return;
    }
    Alert.alert('Add photo', 'Take a picture or choose from your library', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Take photo', onPress: takePhoto },
      { text: 'Choose from library', onPress: chooseFromLibrary },
    ]);
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
        try {
          imageUrl = await uploadItemImage(imageUri);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to upload image';
          Alert.alert('Error', message);
          setSubmitting(false);
          return;
        }
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

      // Notify teammates so everyone in the team sees "X added Y"
      const adderName = profile?.full_name || profile?.username || 'A teammate';
      await notifyTeamItemAdded(adderName, trimmed);

      setName('');
      setQuantity('');
      setNotes('');
      setTags([]);
      setImageUri(null);
      // Trigger refresh across all screens
      refresh('all');
      onSuccess();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to add item');
    } finally {
      setSubmitting(false);
    }
  }, [session, profile, name, quantity, notes, tags, imageUri, availableTags, onSuccess]);

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
            {imageUri ? (
              <View style={styles.imagePreviewWrap}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} contentFit="cover" />
                <Pressable onPress={showImageOptions} style={styles.imageChangeBtn}>
                  <Text style={styles.imageButtonText}>Change photo</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={showImageOptions} style={styles.imageButton}>
                <Text style={styles.imageButtonText}>Take photo or choose from library</Text>
              </Pressable>
            )}

            <TagSelector
              selectedTags={tags}
              availableTags={availableTags}
              onTagsChange={setTags}
            />

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
  imagePreviewWrap: { marginBottom: 16 },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  imageChangeBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
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
