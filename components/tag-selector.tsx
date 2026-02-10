import { useThemeColors } from '@/hooks/use-theme-colors';
import { Feather } from '@expo/vector-icons';
import { useState, useMemo } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type Tag = { id: string; name: string };

type Props = {
  selectedTags: Tag[];
  availableTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
};

export function TagSelector({ selectedTags, availableTags, onTagsChange }: Props) {
  const colors = useThemeColors();
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) {
      return availableTags.filter((tag) => !selectedTags.some((st) => st.id === tag.id));
    }
    const query = searchQuery.toLowerCase();
    return availableTags.filter(
      (tag) =>
        !selectedTags.some((st) => st.id === tag.id) &&
        tag.name.toLowerCase().includes(query)
    );
  }, [availableTags, selectedTags, searchQuery]);

  const canCreateTag = useMemo(() => {
    const trimmed = searchQuery.trim();
    return (
      trimmed.length > 0 &&
      !selectedTags.some((st) => st.name.toLowerCase() === trimmed.toLowerCase()) &&
      !availableTags.some((tag) => tag.name.toLowerCase() === trimmed.toLowerCase())
    );
  }, [searchQuery, selectedTags, availableTags]);

  const addTag = (tag: Tag) => {
    if (!selectedTags.some((st) => st.id === tag.id)) {
      onTagsChange([...selectedTags, tag]);
    }
    setSearchQuery('');
  };

  const removeTag = (tagId: string) => {
    onTagsChange(selectedTags.filter((t) => t.id !== tagId));
  };

  const createNewTag = () => {
    const trimmed = searchQuery.trim();
    if (canCreateTag) {
      const newTag: Tag = { id: trimmed, name: trimmed };
      addTag(newTag);
      setSearchQuery('');
    }
  };

  return (
    <>
      <View style={styles.container}>
        <Text style={[styles.label, { color: colors.text }]}>Tags</Text>
        <View style={styles.selectedTags}>
          {selectedTags.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No tags selected</Text>
          ) : (
            selectedTags.map((tag) => (
              <View
                key={tag.id}
                style={[styles.tagBadge, { backgroundColor: colors.muted }]}
              >
                <Text style={[styles.tagText, { color: colors.mutedForeground }]}>{tag.name}</Text>
                <Pressable
                  onPress={() => removeTag(tag.id)}
                  hitSlop={8}
                  style={styles.removeButton}
                >
                  <Feather name="x" size={14} color={colors.mutedForeground} />
                </Pressable>
              </View>
            ))
          )}
        </View>
        <Pressable
          onPress={() => setModalVisible(true)}
          style={[styles.addButton, { borderColor: colors.border }]}
        >
          <Feather name="plus" size={16} color={colors.text} />
          <Text style={[styles.addButtonText, { color: colors.text }]}>
            Add tags
          </Text>
        </Pressable>
      </View>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Tags</Text>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={12}>
                <Feather name="x" size={24} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <TextInput
              style={[styles.searchInput, { borderColor: colors.border, color: colors.text }]}
              placeholder="Search or create tag..."
              placeholderTextColor={colors.mutedForeground}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />

            <ScrollView style={styles.tagList}>
              {canCreateTag && (
                <Pressable
                  onPress={createNewTag}
                  style={[styles.tagItem, styles.createTagItem, { borderColor: colors.primary }]}
                >
                  <Feather name="plus-circle" size={18} color={colors.primary} />
                  <Text style={[styles.tagItemText, { color: colors.primary }]}>
                    Create "{searchQuery.trim()}"
                  </Text>
                </Pressable>
              )}

              {filteredTags.length === 0 && !canCreateTag && (
                <Text style={[styles.emptyListText, { color: colors.mutedForeground }]}>
                  No tags found
                </Text>
              )}

              {filteredTags.map((tag) => (
                <Pressable
                  key={tag.id}
                  onPress={() => addTag(tag)}
                  style={[styles.tagItem, { borderColor: colors.border }]}
                >
                  <Feather name="tag" size={18} color={colors.mutedForeground} />
                  <Text style={[styles.tagItemText, { color: colors.text }]}>{tag.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable
              onPress={() => setModalVisible(false)}
              style={[styles.doneButton, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.doneButtonText, { color: colors.primaryForeground }]}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  selectedTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
    minHeight: 32,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  tagText: {
    fontSize: 14,
  },
  removeButton: {
    padding: 2,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  tagList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  createTagItem: {
    borderWidth: 2,
  },
  tagItemText: {
    fontSize: 16,
    flex: 1,
  },
  emptyListText: {
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },
  doneButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
