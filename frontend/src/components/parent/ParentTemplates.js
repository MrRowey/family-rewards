// ─── ParentTemplates.js ─────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { getTemplates, createTemplate, deleteTemplate } from '../../api';

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const TASK_ICONS = ['✅','🦷','🛏️','📚','🧹','📖','🐶','🧸','🍽️','🌱','🏃','🎨','🎵','🌙'];

export default function ParentTemplates() {
  const { children } = useApp();
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState({ child_id: '', name: '', points: 10, icon: '✅', days: [1,2,3,4,5] });
  const [saving, setSaving] = useState(false);

  const load = () => getTemplates().then(setTemplates);
  useEffect(() => { load(); }, []);

  const toggleDay = (d) => setForm(f => ({
    ...f,
    days: f.days.includes(d) ? f.days.filter(x => x !== d) : [...f.days, d],
  }));

  const save = async () => {
    if (!form.child_id || !form.name.trim()) return;
    setSaving(true);
    try {
      await createTemplate({ ...form, days_of_week: form.days.join(',') });
      setForm(f => ({ ...f, name: '', icon: '✅', days: [1,2,3,4,5] }));
      await load();
    } finally { setSaving(false); }
  };

  const remove = async (id) => { await deleteTemplate(id); await load(); };

  return (
    <div style={s.root}>
      <h2 style={s.heading}>Weekly Task Templates</h2>

      <div style={s.formCard}>
        <div style={s.row2}>
          <select style={s.select} value={form.child_id} onChange={e => setForm(f => ({ ...f, child_id: e.target.value }))}>
            <option value="">Select child…</option>
            {children.map(c => <option key={c.id} value={c.id}>{c.avatar} {c.name}</option>)}
          </select>
          <input style={s.input} placeholder="Task name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <input style={{ ...s.input, width: 80 }} type="number" min={1} max={100} placeholder="Pts" value={form.points} onChange={e => setForm(f => ({ ...f, points: Number(e.target.value) }))} />
        </div>

        <div style={s.pickerRow}>
          <label style={s.lbl}>Icon</label>
          <div style={s.iconGrid}>
            {TASK_ICONS.map(icon => (
              <button key={icon} onClick={() => setForm(f => ({ ...f, icon }))}
                style={{ ...s.iconBtn, background: form.icon === icon ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.04)', border: form.icon === icon ? '2px solid #FFD700' : '2px solid transparent' }}>
                {icon}
              </button>
            ))}
          </div>
        </div>

        <div style={s.pickerRow}>
          <label style={s.lbl}>Days</label>
          <div style={s.daysRow}>
            {DAYS.map((d, i) => (
              <button key={i} onClick={() => toggleDay(i)}
                style={{ ...s.dayBtn, background: form.days.includes(i) ? '#FFD700' : 'rgba(255,255,255,0.06)', color: form.days.includes(i) ? '#000' : 'rgba(255,255,255,0.5)' }}>
                {d}
              </button>
            ))}
          </div>
        </div>

        <button style={s.saveBtn} onClick={save} disabled={saving}>{saving ? 'Saving…' : '+ Add Template'}</button>
      </div>

      <div style={s.list}>
        {templates.map(t => {
          const child = children.find(c => c.id === t.child_id);
          const days = t.days_of_week.split(',').map(Number).map(d => DAYS[d]).join(', ');
          return (
            <div key={t.id} style={s.row}>
              <span style={{ fontSize: 24 }}>{t.icon}</span>
              <div style={s.tInfo}>
                <span style={s.tName}>{t.name}</span>
                <span style={s.tMeta}>{child?.name} · {days} · ⭐{t.points}</span>
              </div>
              <button style={s.delBtn} onClick={() => remove(t.id)}>🗑️</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const s = {
  root: { height: '100%', overflowY: 'auto', paddingRight: 8 },
  heading: { fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 16, fontFamily: 'Fredoka One, cursive' },
  formCard: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20, marginBottom: 20 },
  row2: { display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  input: { flex: 1, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontFamily: 'Nunito, sans-serif', fontSize: 14 },
  select: { flex: 1, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontFamily: 'Nunito, sans-serif', fontSize: 14 },
  pickerRow: { marginBottom: 12 },
  lbl: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 700, display: 'block', marginBottom: 6 },
  iconGrid: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  iconBtn: { width: 36, height: 36, borderRadius: 8, fontSize: 18, cursor: 'pointer' },
  daysRow: { display: 'flex', gap: 6 },
  dayBtn: { padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 800, border: 'none', cursor: 'pointer', fontFamily: 'Nunito, sans-serif' },
  saveBtn: { padding: '10px 20px', borderRadius: 10, border: 'none', background: '#FFD700', color: '#000', fontWeight: 800, fontFamily: 'Nunito, sans-serif', fontSize: 14, cursor: 'pointer' },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  row: { display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 14px' },
  tInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  tName: { fontSize: 15, fontWeight: 800, color: '#fff' },
  tMeta: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600 },
  delBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 },
};
