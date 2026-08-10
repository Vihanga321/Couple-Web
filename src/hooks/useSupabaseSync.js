import { useEffect } from 'react';
import {
  consumeOAuthIntent,
  getSupabaseProfile,
  isSupabaseConfigured,
  setMyAccountRole,
  supabase,
} from '../lib/supabase';

function mapListing(row) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    businessName: row.name,
    name: row.name,
    category: row.category,
    location: row.location,
    address: row.address,
    description: row.description,
    price: row.price_text,
    estimatedCost: Number(row.estimated_cost || 0),
    phone: row.phone,
    hours: row.opening_hours || 'Contact venue for hours',
    image: row.cover_image_url || '',
    adPlan: row.ad_plan,
    status: row.status,
    paymentStatus: row.payment_status,
    featuredUntil: row.featured_until,
    createdAt: row.created_at,
    views: 0,
  };
}

function mapReview(row) {
  return {
    id: row.id,
    placeId: row.place_ref,
    userId: row.user_id,
    userName: 'Twonara user',
    rating: Number(row.rating),
    comment: row.comment,
    createdAt: row.created_at,
  };
}

function mapPlan(row, ownerId) {
  const orderedItems = [...(row.date_plan_items || [])].sort((a, b) => a.position - b.position);
  return {
    id: row.id,
    ownerId,
    name: row.name,
    date: row.plan_date || '',
    location: row.location,
    items: orderedItems.map((item) => item.place_ref),
    times: Object.fromEntries(orderedItems.filter((item) => item.visit_time).map((item) => [item.place_ref, String(item.visit_time).slice(0, 5)])),
    estimatedTotal: Number(row.estimated_total || 0),
    createdAt: row.created_at,
  };
}

export function useSupabaseSync({
  session,
  setSession,
  setListings,
  setReviews,
  setSavedItems,
  setSavedPlans,
  setUsers,
}) {
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return undefined;

    let active = true;

    const applyAuthUser = async (authUser) => {
      if (!active) return;
      if (!authUser) {
        setSession(null);
        return;
      }

      let profile = await getSupabaseProfile(authUser);
      if (!active || !profile) return;

      const oauthIntent = consumeOAuthIntent();
      if (oauthIntent === 'business' && profile.role === 'customer') {
        try {
          await setMyAccountRole('business');
          profile = await getSupabaseProfile(authUser);
        } catch (error) {
          console.error('Could not switch Google account to business role:', error);
        }
      }

      if (!active || !profile) return;

      if (profile.status === 'suspended') {
        await supabase.auth.signOut();
        if (active) setSession(null);
        return;
      }

      setSession(profile);
    };

    supabase.auth.getSession().then(({ data }) => applyAuthUser(data.session?.user || null));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      window.setTimeout(() => applyAuthUser(nextSession?.user || null), 0);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [setSession]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return undefined;

    let active = true;

    const loadPublicData = async () => {
      const [listingResult, reviewResult] = await Promise.all([
        supabase.from('listings').select('*').order('created_at', { ascending: false }),
        supabase.from('reviews').select('*').order('created_at', { ascending: false }),
      ]);

      if (!active) return;
      if (!listingResult.error) setListings((listingResult.data || []).map(mapListing));
      if (!reviewResult.error) setReviews((reviewResult.data || []).map(mapReview));
    };

    loadPublicData();
    return () => { active = false; };
  }, [session?.id, setListings, setReviews]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !session?.id) {
      if (isSupabaseConfigured) {
        setSavedItems([]);
        setSavedPlans([]);
      }
      return undefined;
    }

    let active = true;

    const loadPrivateData = async () => {
      const [favoriteResult, planResult] = await Promise.all([
        supabase.from('favorites').select('place_ref').eq('user_id', session.id),
        supabase
          .from('date_plans')
          .select('id, name, plan_date, location, estimated_total, created_at, date_plan_items(place_ref, position, visit_time)')
          .eq('user_id', session.id)
          .order('created_at', { ascending: false }),
      ]);

      if (!active) return;
      if (!favoriteResult.error) setSavedItems((favoriteResult.data || []).map((item) => item.place_ref));
      if (!planResult.error) setSavedPlans((planResult.data || []).map((row) => mapPlan(row, session.id)));

      if (session.role === 'admin') {
        const { data, error } = await supabase.from('profiles').select('id, name, role, status, created_at').order('created_at', { ascending: false });
        if (active && !error) setUsers((data || []).map((profileRow) => ({ ...profileRow, email: 'Private' })));
      }
    };

    loadPrivateData();
    return () => { active = false; };
  }, [session?.id, session?.role, setSavedItems, setSavedPlans, setUsers]);
}

export async function persistFavorite({ session, placeId, currentlySaved }) {
  if (!isSupabaseConfigured || !supabase || !session?.id) return;

  if (currentlySaved) {
    const { error } = await supabase.from('favorites').delete().eq('user_id', session.id).eq('place_ref', placeId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('favorites').insert({ user_id: session.id, place_ref: placeId });
    if (error) throw error;
  }
}
