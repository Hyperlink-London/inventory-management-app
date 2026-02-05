import { supabase } from './supabase';

export async function createItem(input: {
  name: string;
  quantity: number;
  notes?: string | null;
  image_url?: string | null;
}) {
  const { data, error } = await supabase.rpc('create_item', {
    p_item_name: input.name,
    p_quantity: input.quantity,
    p_notes: input.notes || null,
    p_image_url: input.image_url || null,
  });

  if (error) throw new Error(error.message);
  const item = Array.isArray(data) ? data[0] : data;
  if (!item?.id) throw new Error('Failed to create item');
  return item;
}

export async function createTag(name: string) {
  const { data, error } = await supabase.rpc('create_tag', { p_name: name });
  if (error) throw new Error(error.message);
  const tagId = data;
  const { data: tag, error: fetchError } = await supabase
    .from('tags')
    .select('*')
    .eq('id', tagId)
    .single();
  if (fetchError || !tag) throw new Error('Failed to fetch tag');
  return tag;
}

export async function updateItem(
  id: string,
  input: {
    name: string;
    quantity: number;
    notes?: string | null;
    image_url?: string | null;
  }
) {
  const { error } = await supabase.rpc('update_item', {
    p_item_id: id,
    p_item_name: input.name,
    p_quantity: input.quantity,
    p_notes: input.notes || null,
    p_image_url: input.image_url || null,
    p_verify_ownership: false,
  });
  if (error) throw new Error(error.message);
}

export async function deleteItem(id: string) {
  try {
    // Verify session is valid
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('You must be logged in to delete an item');
    }

    // Get the item to retrieve its image URL
    const { data: itemData, error: fetchError } = await supabase
      .from('items')
      .select('image_URL')
      .eq('id', id)
      .single();

    if (fetchError) {
      throw new Error('Item not found');
    }

    // Delete image from storage if it exists using RPC (same as update flow)
    if (itemData?.image_URL) {
      try {
        const { data: deleteResult, error: deleteError } = await supabase.rpc('delete_image_from_storage', {
          p_image_url: itemData.image_URL,
        });
        
        // Continue with item deletion even if image deletion fails
        void deleteError;
        void deleteResult;
      } catch {
        // Continue with item deletion even if image deletion fails
      }
    }

    // Soft delete the item and clear image URL
    const { error: deleteError } = await supabase
      .from('items')
      .update({ deleted_at: new Date().toISOString(), image_URL: null })
      .eq('id', id);

    if (deleteError) {
      throw new Error(`Failed to delete item: ${deleteError.message}`);
    }

    // Soft delete related itemtags
    const { error: tagDeleteError } = await supabase
      .from('itemtags')
      .update({ deleted_at: new Date().toISOString() })
      .eq('item_id', id)
      .is('deleted_at', null);

    // Don't fail the entire deletion if tags deletion fails
    void tagDeleteError;

    // Soft delete related itemsignouts
    const { error: signoutDeleteError } = await supabase
      .from('itemsignouts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('item_id', id)
      .is('deleted_at', null);

    // Don't fail the entire deletion if signouts deletion fails
    void signoutDeleteError;

    return { id, deleted: true } as const;
  } catch (error) {
    throw new Error(`Failed to delete item: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function checkoutItem(input: {
  item_id: string;
  quantity: number;
  expected_return_date: string;
}) {
  const { data, error } = await supabase.rpc('checkout_item', {
    p_item_id: input.item_id,
    p_quantity: input.quantity,
    p_expected_return_date: input.expected_return_date,
  });
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? data[0] : data;
}

export async function checkInItem(checkoutId: string) {
  const { data, error } = await supabase.rpc('checkin_item', {
    p_checkout_id: checkoutId,
  });
  if (error) throw new Error(error.message);
  const result = Array.isArray(data) ? data[0] : data;
  return { success: result?.success, returned_date: result?.returned_date };
}
