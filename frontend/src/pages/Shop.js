import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { getRewards, buyReward } from '../api';

export default function Shop() {
  const { childId } = useParams();
  const { children, refresh } = useApp();
  const navigate = useNavigate();
  const child = children.find(c => c.id === childId);

  const [rewards, setRewards] = useState([]);
  const [buying, setBuying] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    getRewards().then(setRewards);
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleBuy = async (reward) => {
    if (!child || child.points < reward.points_cost) return;
    setBuying(reward.id);
    try {
      const result = await buyReward({ child_id: childId, reward_id: reward.id });
      await refresh();
      if (result.requiresApproval) {
        showToast(`${reward.name} requested! Waiting for parent approval 👀`);
      } else {
        showToast(`You got ${reward.name}! 🎉`);
      }
    } catch (e) {
      showToast(e.response?.data?.error || 'Could not buy that right now', 'error');
    } finally {
      setBuying(null);
    }
  };

  if (!child) return null;

  const accentColor = child.color || '#FF6B6B';
  const canAfford = (r) => child.points >= r.points_cost;
  const outOfStock = (r) => r.stock !== null && r.stock <= 0;

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={{ ...styles.header, borderBottomColor: accentColor + '40' }}>
        <button style={styles.backBtn} onClick={() => navigate('/')}>← Back</button>
        <div style={styles.headerCenter}>
          <span style={{ fontSize: 32 }}>{child.avatar}</span>
          <h1 style={{ ...styles.childName, color: accentColor }}>{child.name}'s Shop</h1>
        </div>
        <div style={styles.balance}>
          <span style={styles.balanceEmoji}>⭐</span>
          <span style={{ ...styles.balanceNum, color: accentColor }}>{child.points}</span>
          <span style={styles.balanceLbl}>pts</span>
        </div>
      </div>

      {/* Rewards grid */}
      <div style={styles.grid}>
        {rewards.map(reward => {
          const affordable = canAfford(reward);
          const oos = outOfStock(reward);
          const disabled = !affordable || oos || buying === reward.id;

          return (
            <motion.div
              key={reward.id}
              whileTap={disabled ? {} : { scale: 0.96 }}
              style={{
                ...styles.card,
                borderColor: affordable && !oos ? accentColor + '60' : 'rgba(255,255,255,0.08)',
                opacity: oos ? 0.5 : 1,
              }}
            >
              <div style={styles.rewardIcon}>{reward.icon}</div>
              <h3 style={styles.rewardName}>{reward.name}</h3>
              {reward.description && (
                <p style={styles.rewardDesc}>{reward.description}</p>
              )}
              {reward.requires_approval === 1 && (
                <span style={styles.approvalBadge}>👀 Needs parent OK</span>
              )}
              {reward.stock !== null && (
                <span style={styles.stockBadge}>📦 {reward.stock} left</span>
              )}
              <div style={styles.cardFooter}>
                <span style={{ ...styles.cost, color: affordable ? accentColor : '#888' }}>
                  ⭐ {reward.points_cost}
                </span>
                <button
                  disabled={disabled}
                  onClick={() => handleBuy(reward)}
                  style={{
                    ...styles.buyBtn,
                    background: affordable && !oos ? accentColor : 'rgba(255,255,255,0.1)',
                    color: affordable && !oos ? '#000' : '#555',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                  }}
                >
                  {buying === reward.id ? '…' : oos ? 'Sold out' : !affordable ? 'Save up!' : 'Get it!'}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            style={{
              ...styles.toast,
              background: toast.type === 'error' ? 'rgba(248,113,113,0.9)' : 'rgba(74,222,128,0.9)',
            }}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const styles = {
  root: {
    width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column',
    background: 'linear-gradient(135deg, #0f0e17 0%, #1a1a2e 100%)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 24px', borderBottom: '1px solid',
    flexShrink: 0,
  },
  backBtn: {
    padding: '8px 16px', borderRadius: 10,
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
    color: 'rgba(255,255,255,0.8)', fontWeight: 700, cursor: 'pointer',
    fontFamily: 'Nunito, sans-serif', fontSize: 14,
  },
  headerCenter: { display: 'flex', alignItems: 'center', gap: 12 },
  childName: { fontSize: 26, fontFamily: 'Fredoka One, cursive' },
  balance: { display: 'flex', alignItems: 'center', gap: 4 },
  balanceEmoji: { fontSize: 18 },
  balanceNum: { fontSize: 28, fontFamily: 'Fredoka One, cursive', fontWeight: 900 },
  balanceLbl: { fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 600 },
  grid: {
    flex: 1, overflowY: 'auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: 14, padding: 20,
    alignContent: 'start',
  },
  card: {
    background: 'rgba(255,255,255,0.04)',
    border: '1.5px solid', borderRadius: 16,
    padding: '16px 14px',
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  rewardIcon: { fontSize: 40, textAlign: 'center' },
  rewardName: { fontSize: 15, fontWeight: 800, color: '#fff', textAlign: 'center' },
  rewardDesc: { fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center' },
  approvalBadge: {
    fontSize: 11, color: '#FFA500', fontWeight: 700,
    background: 'rgba(255,165,0,0.1)', borderRadius: 6, padding: '2px 6px',
    textAlign: 'center',
  },
  stockBadge: {
    fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 700,
    textAlign: 'center',
  },
  cardFooter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 8 },
  cost: { fontSize: 16, fontWeight: 900, fontFamily: 'Fredoka One, cursive' },
  buyBtn: {
    padding: '8px 14px', borderRadius: 10,
    border: 'none', fontWeight: 800, fontSize: 13,
    fontFamily: 'Nunito, sans-serif',
    transition: 'opacity 0.2s',
  },
  toast: {
    position: 'fixed', bottom: 24, left: '50%',
    transform: 'translateX(-50%)',
    borderRadius: 12, padding: '14px 24px',
    fontWeight: 800, fontSize: 15, color: '#000',
    zIndex: 999, maxWidth: '80vw', textAlign: 'center',
  },
};
