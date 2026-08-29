import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { createChild, updateChild, deleteChild, adjustPoints } from '../../api';

const AVATARS = ['⭐','🦄','🦖','🌸','🐉','🦊','🐬','🦁','🐼','🦋','🚀','🌈'];
const COLORS  = ['#FF6B9D','#4ECDC4','#FFD93D','#6BCB77','#4D96FF','#FF6B6B','#C77DFF','#FF9F1C'];

export default function ParentChildren() {
  const { children, refresh } = useApp();
  const [form, setForm] = useState({ name: '', avatar: '⭐', color: '#FF6B9D' });
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [adjusting, setAdjusting] = useState(null); // { childId, delta }

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await updateChild(editing, form);
      } else {
        await createChild(form);
      }
      setForm({ name: '', avatar: '⭐', color: '#FF6B9D' });
      setEditing(null);
      await refresh();
    } finally { setSaving(false); }
  };

  const startEdit = (c) => {
    setEditing(c.id);
    setForm({ name: c.name, avatar: c.avatar, color: c.color });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this child? This will delete all their tasks and history.')) return;
    await deleteChild(id);
    await refresh();
  };

  const doAdjust = async (childId, delta) => {
    await adjustPoints(childId, { delta, reason: 'manual' });
    await refresh();
  };

  return (
    <div style={s.root}>
      <h2 style={s.heading}>Manage Children</h2>

      {/* Add / Edit form */}
      <div style={s.formCard}>
        <h3 style={s.formTitle}>{editing ? 'Edit Child' : 'Add Child'}</h3>
        <div style={s.row}>
          <input
            style={s.input} placeholder="Child's name"
            value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
        </div>

        <div style={s.pickerRow}>
          <label style={s.pickerLabel}>Avatar</label>
          <div style={s.emojiGrid}>
            {AVATARS.map(a => (
              <button key={a} onClick={() => setForm(f => ({ ...f, avatar: a }))}
                style={{ ...s.emojiBtn, background: form.avatar === a ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.04)', border: form.avatar === a ? '2px solid #FFD700' : '2px solid transparent' }}>
                {a}
              </button>
            ))}
          </div>
        </div>

        <div style={s.pickerRow}>
          <label style={s.pickerLabel}>Colour</label>
          <div style={s.colorRow}>
            {COLORS.map(c => (
              <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                style={{ ...s.colorBtn, background: c, border: form.color === c ? '3px solid #fff' : '3px solid transparent' }} />
            ))}
          </div>
        </div>

        <div style={s.btnRow}>
          {editing && <button style={s.cancelBtn} onClick={() => { setEditing(null); setForm({ name: '', avatar: '⭐', color: '#FF6B9D' }); }}>Cancel</button>}
          <button style={s.saveBtn} onClick={save} disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Update' : 'Add Child'}
          </button>
        </div>
      </div>

      {/* Children list */}
      <div style={s.list}>
        {children.map(c => (
          <div key={c.id} style={{ ...s.childRow, borderLeftColor: c.color }}>
            <span style={{ fontSize: 32 }}>{c.avatar}</span>
            <div style={s.childInfo}>
              <span style={s.childName}>{c.name}</span>
              <span style={s.childMeta}>⭐ {c.points} pts · 🔥 {c.current_streak || 0} day streak</span>
            </div>
            <div style={s.childActions}>
              <button style={s.smBtn} onClick={() => doAdjust(c.id, 10)}>+10⭐</button>
              <button style={s.smBtn} onClick={() => doAdjust(c.id, -10)}>-10⭐</button>
              <button style={s.smBtn} onClick={() => startEdit(c)}>✏️ Edit</button>
              <button style={{ ...s.smBtn, color: '#f87171' }} onClick={() => handleDelete(c.id)}>🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const s = {
  root: { height: '100%', overflowY: 'auto', paddingRight: 8 },
  heading: { fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 16, fontFamily: 'Fredoka One, cursive' },
  formCard: {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16, padding: '20px', marginBottom: 20,
  },
  formTitle: { fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.7)', marginBottom: 14 },
  row: { marginBottom: 12 },
  input: {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff', fontFamily: 'Nunito, sans-serif', fontSize: 15,
  },
  pickerRow: { marginBottom: 12 },
  pickerLabel: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 700, display: 'block', marginBottom: 6 },
  emojiGrid: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  emojiBtn: { width: 40, height: 40, borderRadius: 8, fontSize: 20, cursor: 'pointer' },
  colorRow: { display: 'flex', gap: 8 },
  colorBtn: { width: 28, height: 28, borderRadius: '50%', cursor: 'pointer' },
  btnRow: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 },
  saveBtn: {
    padding: '10px 20px', borderRadius: 10, border: 'none',
    background: '#FFD700', color: '#000', fontWeight: 800,
    fontFamily: 'Nunito, sans-serif', fontSize: 14, cursor: 'pointer',
  },
  cancelBtn: {
    padding: '10px 16px', borderRadius: 10,
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
    color: 'rgba(255,255,255,0.6)', fontWeight: 700, cursor: 'pointer',
    fontFamily: 'Nunito, sans-serif', fontSize: 14,
  },
  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  childRow: {
    display: 'flex', alignItems: 'center', gap: 14,
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
    borderLeft: '4px solid', borderRadius: 12, padding: '12px 16px',
  },
  childInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: 3 },
  childName: { fontSize: 17, fontWeight: 900, color: '#fff' },
  childMeta: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 700 },
  childActions: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  smBtn: {
    padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 800,
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
  },
};
