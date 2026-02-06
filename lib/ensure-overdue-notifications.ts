import { supabase } from './supabase';

/**
 * Ensure overdue and due-tomorrow notifications exist for the user's checkouts.
 * Call when loading notifications or checkouts. Deduplicates by checkout_id + type.
 */
export async function ensureOverdueNotifications(profileId: string | null): Promise<void> {
  if (!profileId) return;

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const { data: checkouts } = await supabase
    .from('itemsignouts')
    .select(
      `
      id,
      item_id,
      expected_return_date,
      items!inner(item_name, deleted_at)
    `
    )
    .eq('recipient_id', profileId)
    .is('returned_date', null)
    .not('expected_return_date', 'is', null)
    .is('deleted_at', null);

  const validCheckouts = (checkouts || []).filter(
    (c: any) => c.items && !c.items.deleted_at
  );

  const toInsert: { type: 'overdue' | 'due_tomorrow'; checkout: any }[] = [];

  for (const c of validCheckouts) {
    const expected = c.expected_return_date;
    const itemName = c.items?.item_name ?? 'Item';

    if (expected < todayStr) {
      const { data: existing } = await supabase
        .from('notification_messages')
        .select('id')
        .eq('recipient_profile_id', profileId)
        .eq('type', 'overdue')
        .eq('metadata->>checkout_id', c.id)
        .limit(1);

      if (!existing || existing.length === 0) {
        toInsert.push({ type: 'overdue', checkout: { ...c, item_name: itemName } });
      }
    } else if (expected === tomorrowStr) {
      const { data: existing } = await supabase
        .from('notification_messages')
        .select('id')
        .eq('recipient_profile_id', profileId)
        .eq('type', 'due_tomorrow')
        .eq('metadata->>checkout_id', c.id)
        .limit(1);

      if (!existing || existing.length === 0) {
        toInsert.push({ type: 'due_tomorrow', checkout: { ...c, item_name: itemName } });
      }
    }
  }

  if (toInsert.length === 0) return;

  const rows = toInsert.map(({ type, checkout }) => ({
    recipient_profile_id: profileId,
    sender_profile_id: null,
    type,
    title: type === 'overdue' ? 'Overdue' : 'Due tomorrow',
    body:
      type === 'overdue'
        ? `"${checkout.item_name}" was due back and is now overdue.`
        : `"${checkout.item_name}" is due back tomorrow.`,
    metadata: { checkout_id: checkout.id, item_id: checkout.item_id },
  }));

  await supabase.from('notification_messages').insert(rows);
}
