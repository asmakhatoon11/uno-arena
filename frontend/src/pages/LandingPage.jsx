import React, { useState } from 'react';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import './LandingPage.css';

/**
 * Landing Page for UNO Arena (Phase 1)
 * 
 * @param {{
 *   onNavigate: (page: string) => void
 * }} props
 */
export function LandingPage({ onNavigate, onOpenTutorial }) {
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);

  return (
    <div className="landing-page">
      <div className="landing-content">
        {/* Decorative Badge */}
        <div className="hero-pill">
          <span className="pill-dot" />
          <span>Real-Time Multiplayer Card Arena</span>
        </div>

        {/* Hero Title */}
        <h1 className="hero-title">
          UNO <span className="text-gradient">ARENA</span>
        </h1>

        {/* Hero Tagline */}
        <p className="hero-tagline">
          PLAY. MATCH. SHOUT UNO.
        </p>

        <p className="hero-description">
          Experience the classic high-stakes card game in a competitive,
          real-time multiplayer environment built for modern web browsers.
        </p>

        {/* Main Action Buttons */}
        <div className="hero-actions">
          <Button
            variant="primary"
            size="lg"
            onClick={() => onNavigate('create')}
            className="action-btn"
          >
            CREATE ROOM
          </Button>

          <Button
            variant="secondary"
            size="lg"
            onClick={() => onNavigate('join')}
            className="action-btn"
          >
            JOIN ROOM
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={onOpenTutorial || (() => setIsHowToPlayOpen(true))}
            className="action-btn"
          >
            HOW TO PLAY
          </Button>
        </div>

        {/* Mini Feature Highlights */}
        <div className="feature-grid">
          <div className="feature-item">
            <div className="feature-icon red-accent">⚡</div>
            <div className="feature-title">Real-Time Sync</div>
            <div className="feature-text">Low-latency Socket.IO card synchronization</div>
          </div>
          <div className="feature-item">
            <div className="feature-icon blue-accent">👥</div>
            <div className="feature-title">Multiplayer Rooms</div>
            <div className="feature-text">Create private lobbies or join friends via code</div>
          </div>
          <div className="feature-item">
            <div className="feature-icon green-accent">🏆</div>
            <div className="feature-title">Ranked Scoring</div>
            <div className="feature-text">Authentic UNO rules, action cards, and points</div>
          </div>
        </div>
      </div>

      {/* How to Play Modal */}
      <Modal
        isOpen={isHowToPlayOpen}
        onClose={() => setIsHowToPlayOpen(false)}
        title="How to Play UNO Arena"
      >
        <div className="rules-content">
          <h4>Objective</h4>
          <p>
            Be the first player to play all cards from your hand by matching color or number with the top discard card.
          </p>

          <h4>Action Cards</h4>
          <ul>
            <li><strong>Skip:</strong> Skips the next player's turn.</li>
            <li><strong>Reverse:</strong> Reverses the direction of play.</li>
            <li><strong>Draw Two (+2):</strong> Next player draws 2 cards and misses their turn.</li>
            <li><strong>Wild:</strong> Play on any card and declare the new active color.</li>
            <li><strong>Wild Draw Four (+4):</strong> Declare active color and next player draws 4 cards.</li>
          </ul>

          <h4>Don't Forget to Shout UNO!</h4>
          <p>
            When you have only one card left in your hand, hit the <strong>UNO!</strong> button before another player catches you, or draw penalty cards!
          </p>
        </div>
      </Modal>
    </div>
  );
}
