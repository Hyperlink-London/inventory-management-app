import { deleteItem, updateItem, createTag } from '@/lib/actions';
import { supabase } from '@/lib/supabase';
import { uploadItemImage } from '@/lib/uploadImage';
import { useDataRefresh } from '@/providers/data-refresh-provider';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { TagSelector } from '@/components/tag-selector';
import type { ItemWithTags } from '@/types';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
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
  const colors = useThemeColors();
  const { refresh } = useDataRefresh();
  const [name, setName] = useState(item.item_name);
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [notes, setNotes] = useState(item.notes || '');
  const [tags, setTags] = useState<Tag[]>(item.tags);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(item.item_name);
      setQuantity(String(item.quantity));
      setNotes(item.notes || '');
      setTags(item.tags);
      setImageUri(null);
      // Load available tags (match add-item-modal query)
      supabase
        .from('tags')
        .select('id, name')
        .then(({ data }) => {
          setAvailableTags((data as Tag[]) || []);
        });
    }
  }, [visible, item]);

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
    Alert.alert('Change photo', 'Take a picture or choose from your library', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Take photo', onPress: takePhoto },
      { text: 'Choose from library', onPress: chooseFromLibrary },
    ]);
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
        imageUrl = await uploadItemImage(imageUri);
      }

      await updateItem(item.id, {
        name: trimmed,
        quantity: qty,
        notes: notes.trim() || null,
        image_url: imageUrl,
      });

      // Update tags: delete existing, then insert new ones
      await supabase.from('itemtags').delete().eq('item_id', item.id);
      
      for (const tag of tags) {
        const existing = availableTags.find((t) => t.id === tag.id || t.name === tag.name);
        let tagId = existing?.id;
        if (!tagId) {
          // Create new tag if it doesn't exist
          const created = await createTag(tag.name);
          tagId = created.id;
        }
        await supabase.from('itemtags').insert({ item_id: item.id, tag_id: tagId });
      }

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
        // Trigger refresh across all screens
        refresh('all');
        onSuccess(updated);
      } else {
        // Trigger refresh across all screens
        refresh('all');
        onSuccess();
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSubmitting(false);
    }
  }, [item, name, quantity, notes, tags, imageUri, availableTags, onSuccess]);

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
              // Trigger refresh across all screens
              refresh('all');
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
      <Pressable style={styles.overlay} onPress={Keyboard.dismiss}>
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={[styles.cancel, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.title, { color: colors.text }]}>Edit Item</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            style={styles.form}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.label, { color: colors.text }]}>Name</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              value={name}
              onChangeText={setName}
              placeholder="Item name"
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={[styles.label, { color: colors.text }]}>Quantity</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={[styles.label, { color: colors.text }]}>Image</Text>
            {(imageUri || item.image_URL) ? (
              <View style={styles.imagePreviewWrap}>
                <Image
                  source={{ uri: imageUri ?? item.image_URL ?? undefined }}
                  style={styles.imagePreview}
                  contentFit="cover"
                />
                <View style={styles.imageButtonRow}>
                  <Pressable onPress={showImageOptions} style={styles.imageChangeBtn}>
                    <Text style={[styles.imageBtnText, { color: colors.mutedForeground }]}>Change photo</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setImageUri(null)}
                    style={styles.imageRemoveBtn}
                  >
                    <Text style={[styles.imageRemoveText, { color: colors.destructive }]}>Remove photo</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable onPress={showImageOptions} style={[styles.imageBtn, { borderColor: colors.border }]}>
                <Text style={[styles.imageBtnText, { color: colors.mutedForeground }]}>Take photo or choose from library</Text>
              </Pressable>
            )}

            <TagSelector
              selectedTags={tags}
              availableTags={availableTags}
              onTagsChange={setTags}
            />

            <Text style={[styles.label, { color: colors.text }]}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notes, { borderColor: colors.border, color: colors.text }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Notes..."
              placeholderTextColor={colors.mutedForeground}
              multiline
            />
          </ScrollView>

          <Pressable
            onPress={handleDelete}
            disabled={submitting}
            style={[styles.deleteBtn, { borderColor: colors.destructive }, submitting && styles.btnDisabled]}
          >
            <Text style={[styles.deleteBtnText, { color: colors.destructive }]}>Delete Item</Text>
          </Pressable>

          <Pressable
            onPress={handleSave}
            disabled={submitting}
            style={[styles.submit, { backgroundColor: colors.primary }, submitting && styles.btnDisabled]}
          >
            {submitting ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.submitText, { color: colors.primaryForeground }]}>Save</Text>
            )}
          </Pressable>
        </View>
      </Pressable>
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
  title: { fontSize: 18, fontWeight: '700' },
  cancel: { fontSize: 16 },
  headerSpacer: { width: 60 },
  form: { maxHeight: 350, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  notes: { minHeight: 80, textAlignVertical: 'top' },
  imageBtn: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  imageBtnText: { fontSize: 16 },
  imagePreviewWrap: { marginBottom: 16 },
  imageButtonRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  imageRemoveBtn: { paddingVertical: 8 },
  imageRemoveText: { fontSize: 14 },
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
  deleteBtn: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 8,
  },
  deleteBtnText: { fontSize: 16, fontWeight: '600' },
  submit: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  submitText: { fontSize: 16, fontWeight: '600' },
});
