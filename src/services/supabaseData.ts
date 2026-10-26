import { supabase } from '../supabaseClient';
import { CartItem, Order, OrderStatus, LowStockItem } from '../types';

export interface ProfileRecord {
  id?: string;
  user_id?: string;
  full_name: string;
  email: string;
  phone: string;
  city_code: string;
  address: string;
  dietary_notes: string;
  uploaded_files: Array<{
    name: string;
    size: number;
    type: string;
    dataUrl?: string;
  }>;
  role?: string;
}

export interface CustomCakeRecord {
  id?: string;
  user_id?: string;
  tiers: number;
  sponge_flavor: string;
  filling: string;
  exterior_finish: string;
  accents: string[];
  inscription: string;
  event_date: string;
  estimated_price: number;
}

// Helper to get the currently authenticated user ID
export const getAuthenticatedUserId = async (): Promise<string | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
};

// ============================================================================
// 1. PROFILES CRUD (Load, Create / Update, Delete)
// ============================================================================

export const fetchUserProfile = async () => {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { data: null, error: null };

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  return { data: data as ProfileRecord | null, error };
};

export const upsertUserProfile = async (profile: ProfileRecord) => {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { data: null, error: new Error('Not authenticated') };

  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        user_id: userId,
        full_name: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        city_code: profile.city_code,
        address: profile.address,
        dietary_notes: profile.dietary_notes,
        uploaded_files: profile.uploaded_files,
        role: profile.role || 'VIP Member',
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  return { data: data as ProfileRecord | null, error };
};

export const deleteUserProfile = async () => {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { error: new Error('Not authenticated') };

  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('user_id', userId);

  return { error };
};

// ============================================================================
// 2. CART ITEMS CRUD (Load, Create, Update, Delete)
// ============================================================================

export const fetchCartItems = async (): Promise<{ data: CartItem[]; error: any }> => {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { data: [], error: null };

  const { data, error } = await supabase
    .from('cart_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error || !data) {
    return { data: [], error };
  }

  const mapped: CartItem[] = data.map((row: any) => ({
    id: row.id,
    cakeId: row.cake_id || undefined,
    name: row.name,
    price: Number(row.price),
    quantity: Number(row.quantity),
    image: row.image,
    details: row.details || undefined,
  }));

  return { data: mapped, error: null };
};

export const addCartItemToDb = async (item: Omit<CartItem, 'id'>): Promise<{ data: CartItem | null; error: any }> => {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { data: null, error: new Error('Not authenticated') };

  // Check if item with same cake_id already exists for this user
  if (item.cakeId) {
    const { data: existing } = await supabase
      .from('cart_items')
      .select('*')
      .eq('user_id', userId)
      .eq('cake_id', item.cakeId)
      .maybeSingle();

    if (existing) {
      const newQuantity = Number(existing.quantity) + item.quantity;
      const { data: updated, error: updateError } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', existing.id)
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError || !updated) return { data: null, error: updateError };

      return {
        data: {
          id: updated.id,
          cakeId: updated.cake_id || undefined,
          name: updated.name,
          price: Number(updated.price),
          quantity: Number(updated.quantity),
          image: updated.image,
          details: updated.details || undefined,
        },
        error: null,
      };
    }
  }

  const { data, error } = await supabase
    .from('cart_items')
    .insert({
      user_id: userId,
      cake_id: item.cakeId || null,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image: item.image,
      details: item.details || '',
    })
    .select()
    .single();

  if (error || !data) return { data: null, error };

  return {
    data: {
      id: data.id,
      cakeId: data.cake_id || undefined,
      name: data.name,
      price: Number(data.price),
      quantity: Number(data.quantity),
      image: data.image,
      details: data.details || undefined,
    },
    error: null,
  };
};

export const updateCartItemQuantityInDb = async (id: string, quantity: number) => {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { error: new Error('Not authenticated') };

  if (quantity <= 0) {
    return deleteCartItemFromDb(id);
  }

  const { data, error } = await supabase
    .from('cart_items')
    .update({ quantity })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  return { data, error };
};

export const deleteCartItemFromDb = async (id: string) => {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { error: new Error('Not authenticated') };

  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  return { error };
};

export const clearUserCartInDb = async () => {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { error: new Error('Not authenticated') };

  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', userId);

  return { error };
};

// ============================================================================
// 3. ORDERS CRUD (Load, Create, Update, Delete)
// ============================================================================

export const fetchOrders = async (): Promise<{ data: Order[]; error: any }> => {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { data: [], error: null };

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return { data: [], error };
  }

  const mapped: Order[] = data.map((row: any) => ({
    id: row.order_code || row.id,
    customer: row.customer,
    cakeItem: row.cake_item,
    date: new Date(row.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    status: (row.status as OrderStatus) || 'Pending',
    amount: Number(row.amount),
  }));

  return { data: mapped, error: null };
};

export const createOrderInDb = async (params: {
  customer: string;
  items: CartItem[];
  specialInstructions?: string;
  amount: number;
}) => {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { data: null, error: new Error('Not authenticated') };

  const orderCode = `#CZ-${Math.floor(1000 + Math.random() * 9000)}`;
  const cakeSummary = params.items.map((i) => `${i.quantity}x ${i.name}`).join(', ');

  const { data, error } = await supabase
    .from('orders')
    .insert({
      user_id: userId,
      order_code: orderCode,
      customer: params.customer,
      cake_item: cakeSummary || 'Artisanal Cake Order',
      items: params.items,
      special_instructions: params.specialInstructions || '',
      status: 'Pending',
      amount: Number(params.amount.toFixed(2)),
    })
    .select()
    .single();

  return { data, orderCode, error };
};

export const updateOrderStatusInDb = async (orderIdOrCode: string, status: OrderStatus) => {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { data: null, error: new Error('Not authenticated') };

  const column = orderIdOrCode.startsWith('#CZ-') ? 'order_code' : 'id';

  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq(column, orderIdOrCode)
    .eq('user_id', userId)
    .select()
    .maybeSingle();

  return { data, error };
};

export const deleteOrderFromDb = async (orderIdOrCode: string) => {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { error: new Error('Not authenticated') };

  const column = orderIdOrCode.startsWith('#CZ-') ? 'order_code' : 'id';

  const { error } = await supabase
    .from('orders')
    .delete()
    .eq(column, orderIdOrCode)
    .eq('user_id', userId);

  return { error };
};

// ============================================================================
// 4. CUSTOM CAKES CRUD (Load, Create, Update, Delete)
// ============================================================================

export const fetchCustomCakes = async () => {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { data: [], error: null };

  const { data, error } = await supabase
    .from('custom_cakes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return { data: (data as CustomCakeRecord[]) || [], error };
};

export const createCustomCakeInDb = async (cake: CustomCakeRecord) => {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { data: null, error: new Error('Not authenticated') };

  const { data, error } = await supabase
    .from('custom_cakes')
    .insert({
      user_id: userId,
      tiers: cake.tiers,
      sponge_flavor: cake.sponge_flavor,
      filling: cake.filling,
      exterior_finish: cake.exterior_finish,
      accents: cake.accents,
      inscription: cake.inscription,
      event_date: cake.event_date || null,
      estimated_price: cake.estimated_price,
    })
    .select()
    .single();

  return { data, error };
};

export const deleteCustomCakeFromDb = async (id: string) => {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { error: new Error('Not authenticated') };

  const { error } = await supabase
    .from('custom_cakes')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  return { error };
};

// ============================================================================
// 5. INVENTORY ITEMS CRUD (Load, Create, Update, Delete)
// ============================================================================

export const fetchInventoryItems = async (): Promise<{ data: LowStockItem[]; error: any }> => {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { data: [], error: null };

  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error || !data) {
    return { data: [], error };
  }

  const mapped: LowStockItem[] = data.map((row: any) => ({
    id: row.id,
    name: row.name,
    remaining: row.remaining,
    count: Number(row.count),
    unit: row.unit,
    icon: row.icon || 'inventory_2',
    isRestocked: Boolean(row.is_restocked),
  }));

  return { data: mapped, error: null };
};

export const createInventoryItemInDb = async (item: Omit<LowStockItem, 'id'>) => {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { data: null, error: new Error('Not authenticated') };

  const { data, error } = await supabase
    .from('inventory_items')
    .insert({
      user_id: userId,
      name: item.name,
      remaining: item.remaining,
      count: item.count,
      unit: item.unit,
      icon: item.icon,
      is_restocked: Boolean(item.isRestocked),
    })
    .select()
    .single();

  return { data, error };
};

export const updateInventoryItemInDb = async (
  id: string,
  updates: { isRestocked?: boolean; remaining?: string; count?: number }
) => {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { data: null, error: new Error('Not authenticated') };

  const payload: Record<string, any> = {};
  if (typeof updates.isRestocked === 'boolean') payload.is_restocked = updates.isRestocked;
  if (typeof updates.remaining === 'string') payload.remaining = updates.remaining;
  if (typeof updates.count === 'number') payload.count = updates.count;

  const { data, error } = await supabase
    .from('inventory_items')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .maybeSingle();

  return { data, error };
};

export const deleteInventoryItemFromDb = async (id: string) => {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { error: new Error('Not authenticated') };

  const { error } = await supabase
    .from('inventory_items')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  return { error };
};
