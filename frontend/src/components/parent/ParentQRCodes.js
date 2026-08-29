import React, { useState, useEffect } from 'react';
import { getQRCodes } from '../../api';

export default function ParentQRCodes() {
  const [qrs, setQrs] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getQRCodes()
      .then(setQrs)
      .catch(() => setError('Could not load QR codes. Check your backend is running.'));
  }, []);

  const printQR = (type) => {
    const win = window.open('', '_blank');
    const img = type === 'admin' ? qrs.admin : qrs.approval;
    win.document.write(`
      <html><body style="text-align:center;font-family:sans-serif;padding:40px">
        <h2>${type === 'admin' ? '👑 Admin QR Code' : '✅ Approval QR Code'}</h2>
        <p style="color:#666">Family Rewards Dashboard — Parent Unlock</p>
        <img src="${img}" style="width:300px;height:300px;margin:20px auto;display:block" />
        <p style="font-size:12px;color:#999">Keep this QR code secure. Scan to unlock ${type} mode.</p>
      </body></html>
    `);
    win.print();
  };

  return (
    <div style={s.root}>
      <h2 style={s.heading}>Parent QR Codes</h2>

      <div style={s.infoBox}>
        <p style={s.infoText}>
          🔒 These QR codes unlock Parent Mode when scanned from the dashboard.
          Print them and keep them somewhere safe — away from the children!
        </p>
        <ul style={s.infoList}>
          <li><strong style={{ color: '#FFD700' }}>Admin QR</strong> — Full control: manage children, tasks, rewards, settings</li>
          <li><strong style={{ color: '#4ade80' }}>Approval QR</strong> — Limited: only approve/reject reward requests</li>
        </ul>
        <p style={{ ...s.infoText, color: '#f87171', marginTop: 8 }}>
          ⚠️ Change the QR secrets in your <code style={s.code}>.env</code> file before going live.
          Anyone with these QRs can access parent mode.
        </p>
      </div>

      {error && <div style={s.error}>{error}</div>}

      {!qrs && !error && <div style={s.loading}>Generating QR codes…</div>}

      {qrs && (
        <div style={s.qrGrid}>
          {/* Admin QR */}
          <div style={{ ...s.qrCard, borderColor: 'rgba(255,215,0,0.3)' }}>
            <h3 style={{ color: '#FFD700', fontFamily: 'Fredoka One, cursive', fontSize: 20 }}>👑 Admin</h3>
            <p style={s.qrDesc}>Full parent control</p>
            <div style={s.qrImgWrap}>
              <img src={qrs.admin} alt="Admin QR" style={s.qrImg} />
            </div>
            <div style={s.qrActions}>
              <button style={{ ...s.qrBtn, borderColor: 'rgba(255,215,0,0.4)', color: '#FFD700' }}
                onClick={() => printQR('admin')}>🖨️ Print</button>
            </div>
          </div>

          {/* Approval QR */}
          <div style={{ ...s.qrCard, borderColor: 'rgba(74,222,128,0.3)' }}>
            <h3 style={{ color: '#4ade80', fontFamily: 'Fredoka One, cursive', fontSize: 20 }}>✅ Approver</h3>
            <p style={s.qrDesc}>Approve rewards only</p>
            <div style={s.qrImgWrap}>
              <img src={qrs.approval} alt="Approval QR" style={s.qrImg} />
            </div>
            <div style={s.qrActions}>
              <button style={{ ...s.qrBtn, borderColor: 'rgba(74,222,128,0.4)', color: '#4ade80' }}
                onClick={() => printQR('approval')}>🖨️ Print</button>
            </div>
          </div>
        </div>
      )}

      <div style={s.envBox}>
        <p style={s.envTitle}>🔧 Customise QR secrets in your <code style={s.code}>.env</code> file:</p>
        <pre style={s.pre}>{`ADMIN_QR_SECRET=your-secret-admin-key
APPROVAL_QR_SECRET=your-secret-approval-key
PARENT_SESSION_DURATION=300  # seconds`}</pre>
      </div>
    </div>
  );
}

const s = {
  root: { height: '100%', overflowY: 'auto', paddingRight: 8 },
  heading: { fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 16, fontFamily: 'Fredoka One, cursive' },
  infoBox: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '16px 18px', marginBottom: 20 },
  infoText: { fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: 8 },
  infoList: { paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 },
  code: { background: 'rgba(255,255,255,0.1)', borderRadius: 4, padding: '1px 6px', fontFamily: 'monospace', fontSize: 12 },
  error: { background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 10, padding: '12px 16px', color: '#f87171', fontWeight: 700, marginBottom: 16 },
  loading: { color: 'rgba(255,255,255,0.4)', padding: 20 },
  qrGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 },
  qrCard: { background: 'rgba(255,255,255,0.04)', border: '1.5px solid', borderRadius: 16, padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 },
  qrDesc: { fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 600 },
  qrImgWrap: { background: '#fff', borderRadius: 12, padding: 10 },
  qrImg: { width: 200, height: 200, display: 'block' },
  qrActions: { display: 'flex', gap: 8 },
  qrBtn: { padding: '8px 16px', borderRadius: 10, background: 'transparent', border: '1.5px solid', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'Nunito, sans-serif' },
  envBox: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 16px' },
  envTitle: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 700, marginBottom: 8 },
  pre: { background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#4ade80', fontFamily: 'monospace', overflowX: 'auto', lineHeight: 1.8 },
};
