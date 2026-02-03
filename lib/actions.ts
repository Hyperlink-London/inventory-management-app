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
  const { data: itemData } = await supabase
    .from('items')
    .select('image_URL')
    .eq('id', id)
    .single();

  if (itemData?.image_URL) {
    try {
      await supabase.rpc('delete_image_from_storage', {
        p_image_url: itemData.image_URL,
      });
    } catch {}
  }

  const { error } = await supabase
    .from('items')
    .update({ deleted_at: new Date().toISOString(), image_URL: null })
    .eq('id', id);
  if (error) throw new Error(error.message);

  await supabase.from('itemtags').update({ deleted_at: new Date().toISOString() }).eq('item_id', id).is('deleted_at', null);
  await supabase.from('itemsignouts').update({ deleted_at: new Date().toISOString() }).eq('item_id', id).is('deleted_at', null);
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
