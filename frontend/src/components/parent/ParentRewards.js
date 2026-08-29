import React, { useState, useEffect } from 'react';
import { getAllRewards, createReward, updateReward, deleteReward } from '../../api';

const ICONS = ['🎁','🍬','📱','🍕','🌙','🎬','📕','🗺️','🎮','🎨','🎵','🏆','🦄','🚀'];

export default function ParentRewards() {
  const [rewards, setRewards] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', points_cost: 25, icon: '🎁', stock: '', requires_approval: 1, is_mystery: 0, weekly_limit: '', daily_limit: '' });
  const [saving, setSaving] = useState(false);

  const load = () => getAllRewards().then(setRewards);
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name.trim() || !form.points_cost) return;
    setSaving(true);
    try {
      await createReward({
        ...form,
        stock: form.stock === '' ? null : Number(form.stock),
        daily_limit: form.daily_limit === '' ? null : Number(form.daily_limit),
        weekly_limit: form.weekly_limit === '' ? null : Number(form.weekly_limit),
      });
      setForm({ name: '', description: '', points_cost: 25, icon: '🎁', stock: '', requires_approval: 1, is_mystery: 0, weekly_limit: '', daily_limit: '' });
      await load();
    } finally { setSaving(false); }
  };

  const toggle = async (r) => { await updateReward(r.id, { is_active: r.is_active ? 0 : 1 }); await load(); };
  const remove = async (id) => { await deleteReward(id); await load(); };

  return (
    <div style={s.root}>
      <h2 style={s.heading}>Rewards Shop</h2>

      <div style={s.formCard}>
        <h3 style={s.subHead}>Add Reward</h3>
        <div style={s.row2}>
          <input style={s.input} placeholder="Reward name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <input style={{ ...s.input, width: 90 }} type="number" min={1} placeholder="Points" value={form.points_cost} onChange={e => setForm(f => ({ ...f, points_cost: Number(e.target.value) }))} />
        </div>
        <input style={{ ...s.input, marginBottom: 10 }} placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />

        <div style={s.pickerRow}>
          <label style={s.lbl}>Icon</label>
          <div style={s.iconGrid}>{ICONS.map(icon => (
            <button key={icon} onClick={() => setForm(f => ({ ...f, icon }))}
              style={{ ...s.iconBtn, background: form.icon === icon ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.04)', border: form.icon === icon ? '2px solid #FFD700' : '2px solid transparent' }}>
              {icon}
            </button>
          ))}</div>
        </div>

        <div style={s.row2}>
          <label style={s.checkLbl}>
            <input type="checkbox" checked={!!form.requires_approval} onChange={e => setForm(f => ({ ...f, requires_approval: e.target.checked ? 1 : 0 }))} />
            Needs parent approval
          </label>
          <label style={s.checkLbl}>
            <input type="checkbox" checked={!!form.is_mystery} onChange={e => setForm(f => ({ ...f, is_mystery: e.target.checked ? 1 : 0 }))} />
            Mystery reward 🎁
          </label>
        </div>
        <div style={s.row2}>
          <input style={{ ...s.input, width: 100 }} type="number" min={0} placeholder="Stock (∞)" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} />
          <input style={{ ...s.input, width: 120 }} type="number" min={0} placeholder="Daily limit" value={form.daily_limit} onChange={e => setForm(f => ({ ...f, daily_limit: e.target.value }))} />
          <input style={{ ...s.input, width: 130 }} type="number" min={0} placeholder="Weekly limit" value={form.weekly_limit} onChange={e => setForm(f => ({ ...f, weekly_limit: e.target.value }))} />
        </div>

        <button style={s.saveBtn} onClick={save} disabled={saving}>{saving ? 'Saving…' : '+ Add Reward'}</button>
      </div>

      <div style={s.list}>
        {rewards.map(r => (
          <div key={r.id} style={{ ...s.rewardRow, opacity: r.is_active ? 1 : 0.45 }}>
            <span style={{ fontSize: 26 }}>{r.icon}</span>
            <div style={s.rInfo}>
              <span style={s.rName}>{r.name} {r.is_mystery ? '🎁' : ''}</span>
              <span style={s.rMeta}>
                ⭐{r.points_cost}
                {r.requires_approval ? ' · 👀 Approval' : ''}
                {r.stock !== null ? ` · 📦 ${r.stock} left` : ''}
                {r.weekly_limit ? ` · ${r.weekly_limit}/wk` : ''}
              </span>
            </div>
            <button style={s.smBtn} onClick={() => toggle(r)}>{r.is_active ? 'Disable' : 'Enable'}</button>
            <button style={{ ...s.smBtn, color: '#f87171' }} onClick={() => remove(r.id)}>🗑️</button>
          </div>
        ))}
      </div>
    </div>
  );
}

const s = {
  root: { height: '100%', overflowY: 'auto', paddingRight: 8 },
  heading: { fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 16, fontFamily: 'Fredoka One, cursive' },
  formCard: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20, marginBottom: 20 },
  subHead: { fontSize: 15, fontWeight: 800, color: 'rgba(255,255,255,0.6)', marginBottom: 12 },
  row2: { display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' },
  input: { flex: 1, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontFamily: 'Nunito, sans-serif', fontSize: 14, width: '100%' },
  pickerRow: { marginBottom: 10 },
  lbl: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 700, display: 'block', marginBottom: 6 },
  iconGrid: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  iconBtn: { width: 36, height: 36, borderRadius: 8, fontSize: 18, cursor: 'pointer' },
  checkLbl: { display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  saveBtn: { padding: '10px 20px', borderRadius: 10, border: 'none', background: '#FFD700', color: '#000', fontWeight: 800, fontFamily: 'Nunito, sans-serif', fontSize: 14, cursor: 'pointer', marginTop: 4 },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  rewardRow: { display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 14px' },
  rInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  rName: { fontSize: 15, fontWeight: 800, color: '#fff' },
  rMeta: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600 },
  smBtn: { padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 800, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontFamily: 'Nunito, sans-serif' },
};
