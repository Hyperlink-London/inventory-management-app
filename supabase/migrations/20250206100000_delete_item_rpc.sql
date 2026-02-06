-- delete_item RPC: soft-delete an item and related itemtags/itemsignouts.
-- Only the item creator can delete. Matches software-inventory-management behavior.

CREATE OR REPLACE FUNCTION public.delete_item(p_item_id uuid)
RETURNS TABLE(success boolean, deleted_at timestamptz, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_profile_id uuid;
  v_item_created_by uuid;
  v_deleted_at timestamptz;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::timestamptz, 'User must be authenticated'::text;
    RETURN;
  END IF;

  SELECT p.id INTO v_profile_id
  FROM public.profiles p
  WHERE p.supabase_uid = v_user_id AND p.deleted_at IS NULL;

  IF v_profile_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::timestamptz, 'User profile not found'::text;
    RETURN;
  END IF;

  SELECT i.created_by INTO v_item_created_by
  FROM public.items i
  WHERE i.id = p_item_id AND i.deleted_at IS NULL;

  IF v_item_created_by IS NULL THEN
    RETURN QUERY SELECT false, NULL::timestamptz, 'Item not found'::text;
    RETURN;
  END IF;

  IF v_item_created_by != v_profile_id THEN
    RETURN QUERY SELECT false, NULL::timestamptz, 'You can only delete items you created'::text;
    RETURN;
  END IF;

  v_deleted_at := now();

  UPDATE public.itemtags it
  SET deleted_at = v_deleted_at
  WHERE it.item_id = p_item_id AND it.deleted_at IS NULL;

  UPDATE public.itemsignouts io
  SET deleted_at = v_deleted_at
  WHERE io.item_id = p_item_id AND io.deleted_at IS NULL;

  UPDATE public.items
  SET deleted_at = v_deleted_at, "image_URL" = NULL
  WHERE id = p_item_id;

  RETURN QUERY SELECT true, v_deleted_at, 'Item deleted successfully'::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_item(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_item(uuid) TO service_role;

COMMENT ON FUNCTION public.delete_item(uuid) IS 'Soft-delete item and related itemtags/itemsignouts; only item creator can delete';
