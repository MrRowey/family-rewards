// Web Audio API Sound Synthesizer for Kiosk Micro-Interactions

class SoundManager {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Play a single synthesized tone with gentle ADSR envelope
  private playTone(freq: number, type: OscillatorType, duration: number, delay = 0, gainLevel = 0.15) {
    const ctx = this.getContext();
    if (!ctx) return;

    const startTime = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(gainLevel, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  // Pleasant ascending chime when completing a chore step or whole task
  playSuccessChime() {
    this.playTone(523.25, "sine", 0.12, 0);       // C5
    this.playTone(659.25, "sine", 0.12, 0.08);    // E5
    this.playTone(783.99, "sine", 0.18, 0.16);    // G5
    this.playTone(1046.5, "triangle", 0.28, 0.24); // C6
  }

  // Celebratory fanfare when redeeming a prize in the shop
  playFanfare() {
    this.playTone(587.33, "triangle", 0.12, 0);     // D5
    this.playTone(587.33, "triangle", 0.12, 0.1);   // D5
    this.playTone(587.33, "triangle", 0.12, 0.2);   // D5
    this.playTone(783.99, "triangle", 0.45, 0.3);   // G5
    this.playTone(987.77, "triangle", 0.55, 0.48);  // B5
  }

  // Soft low pop when tapping checkboxes or switching tabs
  playPop() {
    this.playTone(440, "sine", 0.05, 0, 0.08);
  }

  // Dull double-buzz when tapping locked items
  playLockedBuzz() {
    this.playTone(180, "sawtooth", 0.08, 0, 0.06);
    this.playTone(140, "sawtooth", 0.12, 0.09, 0.06);
  }
}

export const sounds = new SoundManager();