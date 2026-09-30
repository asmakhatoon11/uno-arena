import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import './ProfileModal.css';

const DEFAULT_ACHIEVEMENTS = [
  { id: 'first_win', icon: '🏆', name: 'First Win', desc: 'Claim your first victory in UNO Arena' },
  { id: 'uno_master', icon: '🔥', name: 'UNO Master', desc: 'Successfully shout UNO and win' },
  { id: 'comeback', icon: '⚡', name: 'Comeback Kid', desc: 'Win with over 4 opponents' },
  { id: 'speed_player', icon: '⏱️', name: 'Speed Player', desc: 'Play 3 cards under 5 seconds' },
  { id: 'perfect_round', icon: '👑', name: 'Perfect Round', desc: 'Score over 100 points in one match' },
];

/**
 * ProfileModal Component (Phase 6)
 * Displays lightweight player profile, lifetime stats, and achievement badges.
 * 
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 * }} props
 */
export function ProfileModal({ isOpen, onClose }) {
  const [profile, setProfile] = useState({
    name: 'Champion',
    avatar: '🦁',
    wins: 0,
    gamesPlayed: 0,
    totalPoints: 0,
    unlockedAchievements: [],
  });

  useEffect(() => {
    const savedName = localStorage.getItem('uno_player_name') || 'Champion';
    const savedAvatar = localStorage.getItem('uno_player_avatar') || '🦁';
    const savedWins = parseInt(localStorage.getItem('uno_stats_wins') || '0', 10);
    const savedGames = parseInt(localStorage.getItem('uno_stats_games') || '0', 10);
    const savedPoints = parseInt(localStorage.getItem('uno_stats_points') || '0', 10);

    let unlocked = [];
    try {
      const stored = localStorage.getItem('uno_stats_achievements');
      if (stored) {
        unlocked = JSON.parse(stored);
      }
    } catch {
      unlocked = [];
    }
    if (!Array.isArray(unlocked)) {
      unlocked = [];
    }

    // Only unlock badges if legitimately earned
    if (savedWins >= 1 && !unlocked.includes('first_win')) {
      unlocked.push('first_win');
    }
    if (savedPoints >= 100 && !unlocked.includes('perfect_round')) {
      unlocked.push('perfect_round');
    }

    setProfile({
      name: savedName,
      avatar: savedAvatar,
      wins: Number.isFinite(savedWins) ? Math.max(0, savedWins) : 0,
      gamesPlayed: Number.isFinite(savedGames) ? Math.max(0, savedGames) : 0,
      totalPoints: Number.isFinite(savedPoints) ? Math.max(0, savedPoints) : 0,
      unlockedAchievements: unlocked,
    });
  }, [isOpen]);

  const winRate = profile.gamesPlayed > 0
    ? Math.round((profile.wins / profile.gamesPlayed) * 100)
    : 0;

  const rankTag = profile.wins >= 5
    ? 'Gold Contender'
    : profile.wins >= 1
    ? 'Silver Contender'
    : 'Novice Contender';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="CONTENDER PROFILE">
      <div className="profile-body">
        {/* Profile Card */}
        <div className="profile-hero">
          <div className="profile-avatar-large">{profile.avatar}</div>
          <div className="profile-details">
            <h3>{profile.name}</h3>
            <span className="profile-tag">Rank: {rankTag}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="profile-stats-grid">
          <div className="stat-box">
            <div className="stat-number">{profile.wins}</div>
            <div className="stat-label">Victories</div>
          </div>
          <div className="stat-box">
            <div className="stat-number">{winRate}%</div>
            <div className="stat-label">Win Rate</div>
          </div>
          <div className="stat-box">
            <div className="stat-number">{profile.totalPoints}</div>
            <div className="stat-label">Total Points</div>
          </div>
        </div>

        {/* Achievements */}
        <div>
          <h4 className="section-subtitle">
            <span>🎖️</span>
            <span>ARENA BADGES & ACHIEVEMENTS</span>
          </h4>
          <div className="achievements-grid">
            {DEFAULT_ACHIEVEMENTS.map((ach) => {
              const isUnlocked = profile.unlockedAchievements.includes(ach.id);
              return (
                <div
                  key={ach.id}
                  className={`achievement-card ${isUnlocked ? 'unlocked' : ''}`}
                >
                  <div className="ach-icon">{ach.icon}</div>
                  <div className="ach-name">{ach.name}</div>
                  <div className="ach-desc">{ach.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
