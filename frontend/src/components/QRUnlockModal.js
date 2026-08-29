import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';
import { unlockParent } from '../api';
import { useApp } from '../context/AppContext';

export default function QRUnlockModal({ onClose }) {
  const { loginParent } = useApp();
  const scannerRef = useRef(null);
  const [status, setStatus] = useState('scanning'); // scanning | success | error
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const qr = new Html5Qrcode('qr-reader');
    scannerRef.current = qr;

    qr.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 220, height: 220 } },
      async (decoded) => {
        try {
          await qr.stop();
          const session = await unlockParent(decoded);
          loginParent(session);
          setStatus('success');
          setTimeout(onClose, 1200);
        } catch {
          setStatus('error');
          setErrorMsg('Invalid QR code. Try again.');
          setTimeout(() => { setStatus('scanning'); startScanner(qr); }, 2000);
        }
      },
      () => {}
    ).catch(err => {
      console.error('QR start error', err);
      setStatus('error');
      setErrorMsg('Camera not available. Check permissions.');
    });

    return () => { qr.stop().catch(() => {}); };
  }, []);

  function startScanner(qr) {
    qr.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 220, height: 220 } },
      async (decoded) => {
        try {
          await qr.stop();
          const session = await unlockParent(decoded);
          loginParent(session);
          setStatus('success');
          setTimeout(onClose, 1200);
        } catch {
          setStatus('error');
          setErrorMsg('Invalid QR code.');
        }
      },
      () => {}
    ).catch(() => {});
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={styles.overlay}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        style={styles.modal}
      >
        <h2 style={styles.title}>🔒 Parent Unlock</h2>
        <p style={styles.subtitle}>Scan your parent QR code to unlock settings</p>

        {status === 'success' && (
          <div style={styles.successBox}>✅ Unlocked! Welcome, Parent.</div>
        )}

        {status === 'error' && (
          <div style={styles.errorBox}>❌ {errorMsg}</div>
        )}

        <div
          id="qr-reader"
          style={{
            width: 280, height: 280,
            borderRadius: 16, overflow: 'hidden',
            margin: '16px auto',
            border: status === 'success' ? '3px solid #4ade80' : '3px solid rgba(255,255,255,0.2)',
          }}
        />

        <p style={styles.hint}>Point the camera at your QR code</p>

        <button style={styles.closeBtn} onClick={onClose}>Cancel</button>
      </motion.div>
    </motion.div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.75)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#1a1a2e',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 24, padding: '32px 28px',
    minWidth: 340, textAlign: 'center',
  },
  title: { fontSize: 24, fontWeight: 900, color: '#fff', fontFamily: 'Fredoka One, cursive' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 6 },
  hint: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 8 },
  successBox: {
    background: 'rgba(74,222,128,0.15)', border: '1px solid #4ade80',
    borderRadius: 10, padding: '10px 16px', color: '#4ade80',
    fontWeight: 700, marginTop: 12,
  },
  errorBox: {
    background: 'rgba(248,113,113,0.15)', border: '1px solid #f87171',
    borderRadius: 10, padding: '10px 16px', color: '#f87171',
    fontWeight: 700, marginTop: 12,
  },
  closeBtn: {
    marginTop: 16, padding: '10px 24px', borderRadius: 10,
    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
    color: 'rgba(255,255,255,0.7)', fontWeight: 700, cursor: 'pointer',
    fontFamily: 'Nunito, sans-serif', fontSize: 15,
  },
};
