import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, CheckCircle2, KeyRound, MessageCircle, ShieldCheck, Star, Users } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const TRUST_COPY = {
  verified: { label: 'Verified Visit', icon: BadgeCheck, tone: 'verified' },
  contacted: { label: 'Contacted via Twonara', icon: MessageCircle, tone: 'contacted' },
  community: { label: 'Community Review', icon: Users, tone: 'community' },
};

function normalizePhone(phone = '') {
  let digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('0')) digits = `94${digits.slice(1)}`;
  return digits;
}

function TrustBadge({ level = 'community' }) {
  const config = TRUST_COPY[level] || TRUST_COPY.community;
  const Icon = config.icon;
  return <span className={`trust-badge ${config.tone}`}><Icon size={13} /> {config.label}</span>;
}

function TrustedReviews({ place, session, reviews, setReviews, onNeedLogin }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [visitCode, setVisitCode] = useState('');
  const [contacted, setContacted] = useState(false);
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const placeReviews = useMemo(
    () => reviews.filter((review) => review.placeId === place.id),
    [place.id, reviews],
  );

  const counts = useMemo(() => ({
    verified: placeReviews.filter((review) => review.trustLevel === 'verified').length,
    contacted: placeReviews.filter((review) => review.trustLevel === 'contacted').length,
    community: placeReviews.filter((review) => !review.trustLevel || review.trustLevel === 'community').length,
  }), [placeReviews]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !session?.id) {
      setContacted(false);
      setVerified(false);
      return;
    }

    let active = true;
    Promise.all([
      supabase.from('contact_inquiries').select('id').eq('user_id', session.id).eq('place_ref', place.id).eq('channel', 'whatsapp').maybeSingle(),
      supabase.from('review_verifications').select('id').eq('user_id', session.id).eq('place_ref', place.id).maybeSingle(),
    ]).then(([contactResult, verifyResult]) => {
      if (!active) return;
      if (!contactResult.error) setContacted(Boolean(contactResult.data));
      if (!verifyResult.error) setVerified(Boolean(verifyResult.data));
    }).catch(() => {});

    return () => { active = false; };
  }, [place.id, session?.id]);

  const chatOnWhatsApp = async () => {
    if (!session) {
      onNeedLogin();
      return;
    }

    const number = normalizePhone(place.phone);
    if (!number) {
      setMessage('This place has not added a WhatsApp number yet.');
      return;
    }

    setMessage('');
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('contact_inquiries').upsert({
          user_id: session.id,
          place_ref: place.id,
          channel: 'whatsapp',
        }, { onConflict: 'user_id,place_ref,channel' });
        if (error) throw error;
      }
      setContacted(true);
      const text = encodeURIComponent(`Hi, I found ${place.name} on Twonara. I would like to ask about availability and details.`);
      window.open(`https://wa.me/${number}?text=${text}`, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setMessage(error.message || 'Could not record this Twonara contact.');
    }
  };

  const redeemVisitCode = async (event) => {
    event.preventDefault();
    if (!session) {
      onNeedLogin();
      return;
    }
    if (!visitCode.trim()) {
      setMessage('Enter the one-time visit code from the business.');
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      setMessage('Verified Visit codes require the real Supabase database.');
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      const { data, error } = await supabase.rpc('redeem_visit_code', {
        p_place_ref: place.id,
        p_code: visitCode.trim().toUpperCase(),
      });
      if (error) throw error;
      if (!data) throw new Error('That code is invalid, expired or already used.');
      setVerified(true);
      setVisitCode('');
      setMessage('Visit verified. Your next review will show the Verified Visit badge.');
    } catch (error) {
      setMessage(error.message || 'Could not verify this visit code.');
    } finally {
      setBusy(false);
    }
  };

  const submitReview = async (event) => {
    event.preventDefault();
    if (!session) {
      onNeedLogin();
      return;
    }
    if (!comment.trim()) {
      setMessage('Write a short review first.');
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      let reviewId = `review-${Date.now()}`;
      let createdAt = new Date().toISOString();
      let trustLevel = verified ? 'verified' : contacted ? 'contacted' : 'community';

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('reviews')
          .upsert({
            place_ref: place.id,
            user_id: session.id,
            rating,
            comment: comment.trim(),
          }, { onConflict: 'place_ref,user_id' })
          .select('id, created_at, trust_level')
          .single();
        if (error) throw error;
        reviewId = data.id;
        createdAt = data.created_at;
        trustLevel = data.trust_level || 'community';
      }

      const review = {
        id: reviewId,
        placeId: place.id,
        userId: session.id,
        userName: session.name,
        rating,
        comment: comment.trim(),
        trustLevel,
        createdAt,
      };

      setReviews((current) => [review, ...current.filter((item) => !(item.placeId === place.id && item.userId === session.id))]);
      setComment('');
      setMessage(`Review saved as ${TRUST_COPY[trustLevel]?.label || 'Community Review'}.`);
    } catch (error) {
      setMessage(error.message || 'Could not save your review.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="trusted-review-section">
      <div className="review-trust-card">
        <div>
          <span className="mini-label">Twonara Review Trust</span>
          <h2>Reviews with clearer context</h2>
          <p>Clicking WhatsApp proves you contacted the place through Twonara. A one-time code from the business after a real visit unlocks the strongest Verified Visit badge.</p>
        </div>
        <div className="trust-count-grid">
          <div><BadgeCheck size={18} /><strong>{counts.verified}</strong><span>Verified</span></div>
          <div><MessageCircle size={18} /><strong>{counts.contacted}</strong><span>Contacted</span></div>
          <div><Users size={18} /><strong>{counts.community}</strong><span>Community</span></div>
        </div>
        <button className="whatsapp-trust-button" type="button" onClick={chatOnWhatsApp}>
          <MessageCircle size={19} /> {contacted ? 'Open WhatsApp again' : 'Chat on WhatsApp'}
        </button>
        {contacted && <span className="trust-unlocked"><CheckCircle2 size={15} /> Contacted via Twonara unlocked</span>}
      </div>

      <form className="visit-code-card" onSubmit={redeemVisitCode}>
        <div><KeyRound size={20} /><span><strong>Visited this place?</strong><small>Enter the one-time code given by the business after your visit.</small></span></div>
        <div className="visit-code-row">
          <input value={visitCode} onChange={(event) => setVisitCode(event.target.value.toUpperCase())} maxLength={12} placeholder="e.g. TW-82K7" />
          <button type="submit" disabled={busy || verified}>{verified ? 'Verified' : 'Verify visit'}</button>
        </div>
      </form>

      <div className="detail-section-block review-block">
        <span className="mini-label">Reviews</span>
        <h2>What couples say</h2>
        <div className="review-list trusted-review-list">
          {placeReviews.length === 0 ? (
            <p className="muted-copy">No Twonara reviews yet.</p>
          ) : placeReviews.slice(0, 8).map((review) => (
            <article key={review.id}>
              <div className="review-head-row">
                <div><strong>{review.userName || 'Twonara user'}</strong><TrustBadge level={review.trustLevel} /></div>
                <span><Star size={14} fill="currentColor" /> {review.rating}</span>
              </div>
              <p>{review.comment}</p>
              <small>{new Date(review.createdAt).toLocaleDateString()}</small>
            </article>
          ))}
        </div>

        <form className="review-form" onSubmit={submitReview}>
          <span>Your rating</span>
          <div className="star-picker">
            {[1, 2, 3, 4, 5].map((value) => (
              <button key={value} type="button" className={rating >= value ? 'active' : ''} onClick={() => setRating(value)} aria-label={`${value} stars`}>
                <Star size={20} fill={rating >= value ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>
          <textarea rows="3" value={comment} onChange={(event) => setComment(event.target.value)} placeholder={session ? 'Share a helpful and respectful review…' : 'Log in to write a review'} maxLength={1000} />
          <div className="review-level-preview"><ShieldCheck size={15} /> Your review level: <strong>{verified ? 'Verified Visit' : contacted ? 'Contacted via Twonara' : 'Community Review'}</strong></div>
          {message && <div className="form-message">{message}</div>}
          <button className="primary-small-button" type="submit" disabled={busy}>{session ? (busy ? 'Saving…' : 'Post review') : 'Log in to review'}</button>
        </form>
      </div>
    </section>
  );
}

export default TrustedReviews;
