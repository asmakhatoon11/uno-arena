import React, { useState } from 'react';
import { ConnectionBadge } from '../common/ConnectionBadge';
import './Header.css';

/**
 * Top Navigation Header
 * 
 * @param {{
 *   currentPage: string,
 *   onNavigate: (page: string) => void,
 *   isConnected: boolean,
 *   socketId?: string | null,
 *   roomCode?: string | null,
 *   onOpenSettings?: () => void,
 *   onOpenTutorial?: () => void,
 *   onOpenProfile?: () => void,
 * }} props
 */
export function Header({
  currentPage,
  onNavigate,
  isConnected,
  socketId,
  roomCode,
  onOpenSettings,
  onOpenTutorial,
  onOpenProfile,
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Persistent navigation items only — game states (lobby, game, result) are controlled by flow
  const navItems = [
    { id: 'landing', label: 'Home' },
    { id: 'create', label: 'Create Room' },
    { id: 'join', label: 'Join Room' },
  ];

  const handleNavClick = (pageId) => {
    setIsMobileMenuOpen(false);
    onNavigate(pageId);
  };

  return (
    <header className="arena-header">
      <div className="container header-inner">
        <div className="brand" onClick={() => handleNavClick('landing')} role="button" tabIndex={0}>
          <div className="brand-badge">
            <span className="badge-u">U</span>
            <span className="badge-no">NO</span>
          </div>
          <span className="brand-name">ARENA</span>
          {roomCode ? (
            <span
              className="brand-phase-tag"
              style={{
                background: 'rgba(255, 214, 10, 0.15)',
                borderColor: 'var(--uno-yellow)',
                color: 'var(--uno-yellow)',
              }}
            >
              ROOM #{roomCode}
            </span>
          ) : (
            <span className="brand-phase-tag">MULTIPLAYER</span>
          )}
        </div>

        {/* Desktop Navigation Links */}
        <nav className="header-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-link ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => handleNavClick(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Desktop Header Actions */}
        <div className="header-actions">
          {onOpenTutorial && (
            <button
              type="button"
              className="header-utility-btn"
              onClick={onOpenTutorial}
              title="How to Play & Guide"
              aria-label="How to Play & Guide"
            >
              📖
            </button>
          )}

          {onOpenProfile && (
            <button
              type="button"
              className="header-utility-btn"
              onClick={onOpenProfile}
              title="Contender Profile"
              aria-label="Contender Profile"
            >
              👤
            </button>
          )}

          {onOpenSettings && (
            <button
              type="button"
              className="header-utility-btn"
              onClick={onOpenSettings}
              title="Game Settings"
              aria-label="Game Settings"
            >
              ⚙️
            </button>
          )}

          <ConnectionBadge isConnected={isConnected} socketId={socketId} />

          {/* Mobile Menu Hamburger Toggle */}
          <button
            type="button"
            className={`mobile-menu-toggle ${isMobileMenuOpen ? 'is-open' : ''}`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
          >
            <span className="hamburger-line" />
            <span className="hamburger-line" />
            <span className="hamburger-line" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown */}
      {isMobileMenuOpen && (
        <div className="mobile-nav-drawer" role="navigation" aria-label="Mobile Navigation">
          <div className="mobile-nav-links">
            {navItems.map((item) => (
              <button
                key={item.id}
                className={`mobile-nav-link ${currentPage === item.id ? 'active' : ''}`}
                onClick={() => handleNavClick(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mobile-utility-section">
            <span className="mobile-section-label">QUICK ACTIONS</span>
            <div className="mobile-utility-grid">
              {onOpenTutorial && (
                <button
                  type="button"
                  className="mobile-util-item"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenTutorial();
                  }}
                >
                  <span className="mobile-util-icon">📖</span>
                  <span>Guide</span>
                </button>
              )}
              {onOpenProfile && (
                <button
                  type="button"
                  className="mobile-util-item"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenProfile();
                  }}
                >
                  <span className="mobile-util-icon">👤</span>
                  <span>Profile</span>
                </button>
              )}
              {onOpenSettings && (
                <button
                  type="button"
                  className="mobile-util-item"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenSettings();
                  }}
                >
                  <span className="mobile-util-icon">⚙️</span>
                  <span>Settings</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
