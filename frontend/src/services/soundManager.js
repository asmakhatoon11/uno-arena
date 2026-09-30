/**
 * UNO ARENA — Centralized Web Audio Sound Manager
 * Pure Web Audio API synthesizers for zero-dependency, ultra-low latency sound effects.
 * Complies with browser autoplay policies: unlocks on user gesture.
 */

class SoundManager {
  constructor() {
    this.ctx = null;
    this.soundEnabled = typeof window !== 'undefined'
      ? localStorage.getItem('uno_sound_enabled') !== 'false'
      : true;
    this.musicEnabled = typeof window !== 'undefined'
      ? localStorage.getItem('uno_music_enabled') !== 'false'
      : true;
    this.lastHoverTime = 0;
    this.unlocked = false;

    // Attach one-time unlock listener on window
    if (typeof window !== 'undefined') {
      const unlockListener = () => {
        this.unlock();
        window.removeEventListener('pointerdown', unlockListener);
        window.removeEventListener('keydown', unlockListener);
      };
      window.addEventListener('pointerdown', unlockListener, { once: true });
      window.addEventListener('keydown', unlockListener, { once: true });
    }
  }

  /**
   * Initializes or resumes the AudioContext on user interaction
   */
  init() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  /**
   * Explicitly unlocks audio on user gesture (e.g. click create room, join, ready, start)
   */
  unlock() {
    this.init();
    this.unlocked = true;
  }

  setSoundEnabled(enabled) {
    this.soundEnabled = !!enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('uno_sound_enabled', this.soundEnabled ? 'true' : 'false');
    }
  }

  isSoundEnabled() {
    return this.soundEnabled;
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = !!enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('uno_music_enabled', this.musicEnabled ? 'true' : 'false');
    }
  }

  isMusicEnabled() {
    return this.musicEnabled;
  }

  /**
   * Helper to play a synthesized frequency tone with exponential decay
   */
  playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.1, delay = 0) {
    if (!this.soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;

      const startTime = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(gainVal, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    } catch (e) {
      // Audio autoplay policy catch
    }
  }

  /**
   * Helper to play frequency sweep (swoosh, slide, impact)
   */
  playSweep(startFreq, endFreq, type = 'sine', duration = 0.15, gainVal = 0.1, delay = 0) {
    if (!this.soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;

      const startTime = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(startFreq, startTime);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), startTime + duration);

      gain.gain.setValueAtTime(gainVal, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    } catch (e) {
      // Audio autoplay policy catch
    }
  }

  /**
   * 1. Card Hover (subtle micro-click, rate-limited to avoid buzz)
   */
  cardHover() {
    const now = Date.now();
    if (now - this.lastHoverTime < 70) return; // throttle hover sounds
    this.lastHoverTime = now;
    this.playTone(1100, 'sine', 0.025, 0.02);
  }

  /**
   * 2. Card Selection (soft click)
   */
  cardSelect() {
    this.playTone(750, 'sine', 0.04, 0.05);
  }

  /**
   * 3. Card Play (crisp swoosh + card slap on table)
   */
  cardPlay() {
    this.playSweep(520, 220, 'triangle', 0.09, 0.12);
    this.playTone(280, 'sine', 0.06, 0.1, 0.04);
  }

  /**
   * 4. Card Draw (card slide sound)
   */
  cardDraw() {
    this.playSweep(260, 480, 'sine', 0.12, 0.09);
  }

  /**
   * 5. Shuffle (multi-card ruffle flutter)
   */
  shuffle() {
    if (!this.soundEnabled) return;
    const ruffles = [380, 460, 420, 510, 480, 540];
    ruffles.forEach((freq, idx) => {
      this.playTone(freq, 'triangle', 0.05, 0.06, idx * 0.055);
    });
  }

  /**
   * 6. Turn Start (two gentle ascending pings)
   */
  turnStart() {
    if (!this.soundEnabled) return;
    this.playTone(523.25, 'sine', 0.12, 0.12); // C5
    this.playTone(659.25, 'sine', 0.18, 0.12, 0.1); // E5
  }

  /**
   * 7. Timer Warning (subtle tick at 10s)
   */
  timerTick() {
    this.playTone(950, 'sine', 0.04, 0.05);
  }

  /**
   * 8. Time Running Out (urgent double tick under 5s)
   */
  warning() {
    this.playTone(880, 'triangle', 0.06, 0.1);
    this.playTone(880, 'triangle', 0.06, 0.1, 0.1);
  }

  /**
   * 9. Skip Card (whoosh / stamp)
   */
  skip() {
    this.playSweep(650, 180, 'sawtooth', 0.18, 0.15);
  }

  /**
   * 10. Reverse Card (rotation swoosh)
   */
  reverse() {
    this.playSweep(280, 620, 'sine', 0.12, 0.12);
    this.playSweep(620, 320, 'sine', 0.14, 0.12, 0.1);
  }

  /**
   * 11. Draw Two (+2 impact)
   */
  drawTwo() {
    this.playSweep(350, 90, 'triangle', 0.22, 0.22);
    this.playTone(180, 'sine', 0.15, 0.15, 0.05);
  }

  /**
   * 12. Wild Card (color sparkle arpeggio)
   */
  wild() {
    if (!this.soundEnabled) return;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      this.playTone(freq, 'sine', 0.12, 0.1, idx * 0.06);
    });
  }

  /**
   * 13. Wild Draw Four (+4 impact + sparkle)
   */
  wildDrawFour() {
    this.drawTwo();
    setTimeout(() => this.wild(), 120);
  }

  /**
   * 14. Shout UNO (triumphant brass fanfare)
   */
  unoCall() {
    if (!this.soundEnabled) return;
    this.playTone(440, 'square', 0.12, 0.2);
    this.playTone(554.37, 'square', 0.14, 0.22, 0.11);
    this.playTone(659.25, 'square', 0.35, 0.26, 0.22);
  }

  /**
   * 15. Player Join (pleasant greeting ping)
   */
  playerJoin() {
    this.playTone(440, 'sine', 0.1, 0.08);
    this.playTone(660, 'sine', 0.15, 0.08, 0.08);
  }

  /**
   * 16. Player Leave (soft descending tone)
   */
  playerLeave() {
    this.playTone(600, 'sine', 0.1, 0.07);
    this.playTone(380, 'sine', 0.15, 0.07, 0.08);
  }

  /**
   * 17. Winner Celebration Fanfare
   */
  winner() {
    if (!this.soundEnabled) return;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C5, E5, G5, C6, E6
    notes.forEach((freq, idx) => {
      this.playTone(freq, 'triangle', 0.28, 0.22, idx * 0.13);
    });
  }

  /**
   * 18. Invalid move / Error buzz
   */
  error() {
    this.playTone(200, 'sawtooth', 0.15, 0.12);
    this.playTone(170, 'sawtooth', 0.18, 0.12, 0.1);
  }

  /**
   * Button click
   */
  buttonClick() {
    this.playTone(620, 'sine', 0.04, 0.06);
  }

  /**
   * Chat message
   */
  chatMessage() {
    this.playTone(720, 'sine', 0.07, 0.06);
  }

  /**
   * Emote reaction pop
   */
  emote() {
    this.playTone(560, 'triangle', 0.1, 0.08);
  }
}

export const soundManager = new SoundManager();
