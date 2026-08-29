import React, { useState, useEffect } from 'react';
import { getPurchases, approvePurchase, rejectPurchase, redeemPurchase } from '../../api';

export default function ParentApprovals() {
  const [purchases, setPurchases] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [working, setWorking] = useState(null);

  const load = () => getPurchases({ status: filter }).then(setPurchases);
  useEffect(() => { load(); }, [filter]);

  const act = async (fn, id) => {
    setWorking(id);
    try { await fn(id, {}); await load(); }
    finally { setWorking(null); }
  };

  const STATUS_COLORS = { pending: '#FFA500', approved: '#4ade80', rejected: '#f87171', redeemed: '#818cf8' };

  return (
    <div style={s.root}>
      <h2 style={s.heading}>Reward Approvals</h2>

      <div style={s.filterRow}>
        {['pending','approved','rejected','redeemed'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ ...s.filterBtn, background: filter === f ? 'rgba(255,215,0,0.15)' : 'transparent', color: filter === f ? '#FFD700' : 'rgba(255,255,255,0.5)', borderColor: filter === f ? '#FFD700' : 'transparent' }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'pending' && purchases.filter(p => p.status === 'pending').length > 0 && filter !== 'pending'
              ? ` 🔴` : ''}
          </button>
        ))}
      </div>

      {purchases.length === 0 ? (
        <div style={s.empty}>Nothing here yet ✨</div>
      ) : (
        <div style={s.list}>
          {purchases.map(p => (
            <div key={p.id} style={s.card}>
              <div style={s.cardTop}>
                <span style={{ fontSize: 28 }}>{p.reward_icon}</span>
                <div style={s.pInfo}>
                  <span style={s.pName}>{p.reward_name}</span>
                  <span style={s.pMeta}>{p.child_name} · ⭐{p.points_spent} pts · {new Date(p.created_at).toLocaleDateString('en-GB')}</span>
                </div>
                <span style={{ ...s.statusBadge, color: STATUS_COLORS[p.status], borderColor: STATUS_COLORS[p.status] + '40', background: STATUS_COLORS[p.status] + '15' }}>
                  {p.status}
                </span>
              </div>

              {p.status === 'pending' && (
                <div style={s.actions}>
                  <button style={{ ...s.actBtn, background: 'rgba(74,222,128,0.15)', color: '#4ade80', borderColor: 'rgba(74,222,128,0.3)' }}
                    disabled={working === p.id} onClick={() => act(approvePurchase, p.id)}>
                    ✅ Approve
                  </button>
                  <button style={{ ...s.actBtn, background: 'rgba(248,113,113,0.15)', color: '#f87171', borderColor: 'rgba(248,113,113,0.3)' }}
                    disabled={working === p.id} onClick={() => act(rejectPurchase, p.id)}>
                    ❌ Reject & Refund
                  </button>
                </div>
              )}

              {p.status === 'approved' && (
                <div style={s.actions}>
                  <button style={{ ...s.actBtn, background: 'rgba(129,140,248,0.15)', color: '#818cf8', borderColor: 'rgba(129,140,248,0.3)' }}
                    disabled={working === p.id} onClick={() => act(redeemPurchase, p.id)}>
                    🎁 Mark as Redeemed
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const s = {
  root: { height: '100%', overflowY: 'auto', paddingRight: 8 },
  heading: { fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 16, fontFamily: 'Fredoka One, cursive' },
  filterRow: { display: 'flex', gap: 8, marginBottom: 20 },
  filterBtn: { padding: '8px 16px', borderRadius: 10, border: '1px solid', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'Nunito, sans-serif' },
  empty: { color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: 40, fontSize: 16 },
  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  card: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px 16px' },
  cardTop: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 },
  pInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: 3 },
  pName: { fontSize: 16, fontWeight: 800, color: '#fff' },
  pMeta: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600 },
  statusBadge: { padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 800, border: '1px solid' },
  actions: { display: 'flex', gap: 8 },
  actBtn: { padding: '8px 14px', borderRadius: 10, border: '1px solid', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'Nunito, sans-serif' },
};
