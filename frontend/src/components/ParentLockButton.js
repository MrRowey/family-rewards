import React from 'react';
import { motion } from 'framer-motion';

export default function ParentLockButton({ onPress }) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onPress}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 18px', borderRadius: 12,
        background: 'rgba(255,255,255,0.07)',
        border: '1.5px solid rgba(255,255,255,0.15)',
        color: 'rgba(255,255,255,0.7)',
        fontSize: 15, fontWeight: 700,
        cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
      }}
    >
      🔒 Parent Mode
    </motion.button>
  );
}
