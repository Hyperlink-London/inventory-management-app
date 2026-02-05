import { log } from './logger';
import { supabase } from './supabase';
import type { CheckoutItem, ItemWithTags } from '@/types';

export async function fetchItems(): Promise<ItemWithTags[]> {
  log.data('fetchItems: start');
  const { data: itemsData, error: itemsError } = await supabase
    .from('items')
    .select(
      `
      id,
      item_name,
      quantity,
      notes,
      image_URL,
      created_by,
      creator:profiles!items_created_by_fkey(
        full_name,
        username
      ),
      itemtags(
        tags(
          id,
          name
        )
      )
    `
    )
    .is('deleted_at', null)
    .order('item_name', { ascending: true });

  if (itemsError || !itemsData) {
    log.data('fetchItems: error or empty', itemsError?.message ?? 'no data');
    return [];
  }
  log.data('fetchItems: got', itemsData.length, 'items');

  const { data: activeCheckouts } = await supabase
    .from('itemsignouts')
    .select('item_id, quantity')
    .is('returned_date', null)
    .is('deleted_at', null);

  const checkedOutMap = new Map<string, number>();
  activeCheckouts?.forEach((c) => {
    checkedOutMap.set(c.item_id, (checkedOutMap.get(c.item_id) || 0) + c.quantity);
  });

  return itemsData.map((item: any) => ({
    id: item.id,
    item_name: item.item_name,
    quantity: item.quantity,
    checked_out_quantity: checkedOutMap.get(item.id) || 0,
    notes: item.notes,
    image_URL: item.image_URL,
    created_by: item.created_by,
    created_by_name: (item.creator as any)?.full_name || (item.creator as any)?.username || null,
    tags: (item.itemtags || [])
      .filter((it: any) => it.tags && !it.tags.deleted_at && !it.deleted_at)
      .map((it: any) => ({ id: it.tags.id, name: it.tags.name })),
  }));
}

export async function fetchItemById(id: string): Promise<ItemWithTags | null> {
  log.data('fetchItemById: start', id);
  const { data, error } = await supabase
    .from('items')
    .select(
      `
      id,
      item_name,
      quantity,
      notes,
      image_URL,
      created_by,
      creator:profiles!items_created_by_fkey(
        full_name,
        username
      ),
      itemtags(
        tags(
          id,
          name,
          deleted_at
        ),
        deleted_at
      )
    `
    )
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error || !data) {
    log.data('fetchItemById: error or not found', error?.message);
    return null;
  }

  const { data: activeCheckouts } = await supabase
    .from('itemsignouts')
    .select('quantity')
    .eq('item_id', id)
    .is('returned_date', null)
    .is('deleted_at', null);

  const checkedOutQuantity = activeCheckouts?.reduce((s, c) => s + c.quantity, 0) || 0;

  return {
    id: data.id,
    item_name: data.item_name,
    quantity: data.quantity,
    checked_out_quantity: checkedOutQuantity,
    notes: data.notes,
    image_URL: data.image_URL,
    created_by: data.created_by,
    created_by_name: (data as any).creator?.full_name || (data as any).creator?.username || null,
    tags: (data.itemtags || [])
      .filter((it: any) => it.tags && !it.tags.deleted_at && !it.deleted_at)
      .map((it: any) => ({ id: it.tags.id, name: it.tags.name })),
  };
}

export async function fetchCheckouts(params: {
  view: 'yours' | 'everyone' | 'returned';
  userProfileId: string | null;
  from: number;
  to: number;
}): Promise<{ checkouts: CheckoutItem[]; count: number }> {
  const { view, userProfileId, from, to } = params;
  log.data('fetchCheckouts: start', { view, userProfileId, from, to });

  let query = supabase
    .from('itemsignouts')
    .select(
      `
      id,
      item_id,
      quantity,
      sign_out_date,
      expected_return_date,
      returned_date,
      recipient_id,
      items!inner(
        item_name,
        image_URL
      ),
      profiles(
        full_name,
        username,
        teams
      )
    `,
      { count: 'exact' }
    )
    .is('deleted_at', null);

  if (view === 'yours' && userProfileId) {
    query = query.eq('recipient_id', userProfileId).is('returned_date', null);
  } else if (view === 'everyone') {
    query = query.is('returned_date', null);
  } else if (view === 'returned') {
    query = query.not('returned_date', 'is', null);
  }

  const orderCol = view === 'returned' ? 'returned_date' : 'sign_out_date';
  const { data, error, count } = await query
    .order(orderCol, { ascending: view === 'returned' })
    .range(from, to);

  if (error) {
    log.data('fetchCheckouts: error', error.message);
    return { checkouts: [], count: 0 };
  }
  log.data('fetchCheckouts: got', (data || []).length, 'checkouts, count', count);

  const checkouts: CheckoutItem[] = (data || []).map((c: any) => ({
    id: c.id,
    item_id: c.item_id,
    item_name: c.items?.item_name || 'Unknown',
    image_URL: c.items?.image_URL || null,
    quantity: c.quantity,
    sign_out_date: c.sign_out_date,
    expected_return_date: c.expected_return_date,
    returned_date: c.returned_date,
    recipient_full_name: c.profiles?.full_name || c.profiles?.username || 'Unknown',
    recipient_id: c.recipient_id,
    recipient_teams: c.profiles?.teams || [],
  }));

  return { checkouts, count: count ?? 0 };
}

export async function fetchCheckoutCounts(userProfileId: string | null): Promise<{
  active: number;
  overdue: number;
}> {
  log.data('fetchCheckoutCounts: start', userProfileId);
  const now = new Date().toISOString();

  const { count: nonReturned } = await supabase
    .from('itemsignouts')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)
    .is('returned_date', null);

  const { count: overdueCount } = await supabase
    .from('itemsignouts')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)
    .is('returned_date', null)
    .not('expected_return_date', 'is', null)
    .lt('expected_return_date', now);

  const result = {
    active: Math.max(0, (nonReturned ?? 0) - (overdueCount ?? 0)),
    overdue: overdueCount ?? 0,
  };
  log.data('fetchCheckoutCounts: result', result);
  return result;
}

export async function fetchCheckoutsForItem(itemId: string): Promise<CheckoutItem[]> {
  log.data('fetchCheckoutsForItem: start', itemId);
  
  // Try with teams first
  let query = supabase
    .from('itemsignouts')
    .select(
      `
      id,
      item_id,
      quantity,
      sign_out_date,
      expected_return_date,
      returned_date,
      recipient_id,
      items!inner(
        item_name,
        image_URL
      ),
      profiles(
        full_name,
        username,
        teams
      )
    `
    )
    .eq('item_id', itemId)
    .is('deleted_at', null)
    .order('sign_out_date', { ascending: false });

  const { data, error } = await query;

  // If error is about teams column, try without it
  if (error && error.message?.includes('column') && error.message?.includes('teams')) {
    const { data: dataWithoutTeams, error: errorWithoutTeams } = await supabase
      .from('itemsignouts')
      .select(
        `
        id,
        item_id,
        quantity,
        sign_out_date,
        expected_return_date,
        returned_date,
        recipient_id,
        items!inner(
          item_name,
          image_URL
        ),
        profiles(
          full_name,
          username
        )
      `
      )
      .eq('item_id', itemId)
      .is('deleted_at', null)
      .order('sign_out_date', { ascending: false });

    if (errorWithoutTeams) {
      log.data('fetchCheckoutsForItem: error', errorWithoutTeams.message);
      return [];
    }

    const checkouts: CheckoutItem[] = (dataWithoutTeams || []).map((c: any) => ({
      id: c.id,
      item_id: c.item_id,
      item_name: c.items?.item_name || 'Unknown',
      image_URL: c.items?.image_URL || null,
      quantity: c.quantity,
      sign_out_date: c.sign_out_date,
      expected_return_date: c.expected_return_date,
      returned_date: c.returned_date,
      recipient_full_name: c.profiles?.full_name || c.profiles?.username || 'Unknown',
      recipient_id: c.recipient_id,
      recipient_teams: [],
    }));

    log.data('fetchCheckoutsForItem: got', checkouts.length, 'checkouts');
    return checkouts;
  }

  if (error) {
    log.data('fetchCheckoutsForItem: error', error.message);
    return [];
  }

  const checkouts: CheckoutItem[] = (data || []).map((c: any) => ({
    id: c.id,
    item_id: c.item_id,
    item_name: c.items?.item_name || 'Unknown',
    image_URL: c.items?.image_URL || null,
    quantity: c.quantity,
    sign_out_date: c.sign_out_date,
    expected_return_date: c.expected_return_date,
    returned_date: c.returned_date,
    recipient_full_name: c.profiles?.full_name || c.profiles?.username || 'Unknown',
    recipient_id: c.recipient_id,
    recipient_teams: c.profiles?.teams || [],
  }));

  log.data('fetchCheckoutsForItem: got', checkouts.length, 'checkouts');
  return checkouts;
}
