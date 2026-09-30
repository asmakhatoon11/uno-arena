import React, { useState } from 'react';
import { Modal } from './Modal';
import { soundManager } from '../../services/soundManager';
import './SettingsModal.css';

/**
 * SettingsModal Component (Phase 5 + Gameplay UX Polish)
 * Controls sound effects, music, animations, reduced motion, and turn timer.
 * Persists all preferences in localStorage and updates document classes.
 * 
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 * }} props
 */
export function SettingsModal({ isOpen, onClose }) {
  const [soundEnabled, setSoundEnabled] = useState(() => soundManager.isSoundEnabled());
  const [musicEnabled, setMusicEnabled] = useState(() => soundManager.isMusicEnabled());
  const [animationsEnabled, setAnimationsEnabled] = useState(() => {
    return localStorage.getItem('uno_animations_enabled') !== 'false';
  });
  const [turnTimerSetting, setTurnTimerSetting] = useState(() => {
    return localStorage.getItem('uno_timer_setting') || '30';
  });
  const [reducedMotion, setReducedMotion] = useState(() => {
    return localStorage.getItem('uno_reduced_motion') === 'true';
  });

  const handleSoundToggle = (val) => {
    setSoundEnabled(val);
    soundManager.setSoundEnabled(val);
    if (val) soundManager.buttonClick();
  };

  const handleMusicToggle = (val) => {
    setMusicEnabled(val);
    soundManager.setMusicEnabled(val);
    if (val) soundManager.buttonClick();
  };

  const handleAnimationsToggle = (val) => {
    setAnimationsEnabled(val);
    localStorage.setItem('uno_animations_enabled', val ? 'true' : 'false');
    if (!val) {
      document.body.classList.add('no-animations');
    } else {
      document.body.classList.remove('no-animations');
    }
  };

  const handleTimerChange = (val) => {
    setTurnTimerSetting(val);
    localStorage.setItem('uno_timer_setting', val);
  };

  const handleReducedMotionToggle = (val) => {
    setReducedMotion(val);
    localStorage.setItem('uno_reduced_motion', val ? 'true' : 'false');
    if (val) {
      document.body.classList.add('reduce-motion');
    } else {
      document.body.classList.remove('reduce-motion');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="GAME SETTINGS">
      <div className="settings-body">
        {/* Sound Effects */}
        <div className="settings-group">
          <div className="setting-info">
            <span className="setting-title">Sound Effects</span>
            <span className="setting-description">Audio feedback for card plays, draws, timer, and turns</span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => handleSoundToggle(e.target.checked)}
            />
            <span className="toggle-slider" />
          </label>
        </div>

        {/* Music / Audio Atmosphere */}
        <div className="settings-group">
          <div className="setting-info">
            <span className="setting-title">Music & Ambience</span>
            <span className="setting-description">Arena background acoustics and musical fanfares</span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={musicEnabled}
              onChange={(e) => handleMusicToggle(e.target.checked)}
            />
            <span className="toggle-slider" />
          </label>
        </div>

        {/* Animations */}
        <div className="settings-group">
          <div className="setting-info">
            <span className="setting-title">Card Motion & Effects</span>
            <span className="setting-description">Smooth card lifts, draw travel, and play animations</span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={animationsEnabled}
              onChange={(e) => handleAnimationsToggle(e.target.checked)}
            />
            <span className="toggle-slider" />
          </label>
        </div>

        {/* Reduced Motion */}
        <div className="settings-group">
          <div className="setting-info">
            <span className="setting-title">Reduced Motion Mode</span>
            <span className="setting-description">Disable screen travel, floating cards, and pulses</span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(e) => handleReducedMotionToggle(e.target.checked)}
            />
            <span className="toggle-slider" />
          </label>
        </div>

        {/* Turn Timer Length */}
        <div className="settings-group">
          <div className="setting-info">
            <span className="setting-title">Default Turn Timer</span>
            <span className="setting-description">Seconds allocated per contender move</span>
          </div>
          <select
            className="settings-select"
            value={turnTimerSetting}
            onChange={(e) => handleTimerChange(e.target.value)}
          >
            <option value="15">15 Seconds (Blitz)</option>
            <option value="30">30 Seconds (Standard)</option>
            <option value="45">45 Seconds (Relaxed)</option>
            <option value="60">60 Seconds (Extended)</option>
            <option value="0">Off (Unlimited)</option>
          </select>
        </div>
      </div>
    </Modal>
  );
}
