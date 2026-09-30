import React, { useState, useRef, useEffect } from 'react';
import './ChatPanel.css';

/**
 * In-Game Text Chat Panel (Phase 3)
 * Allows players to send and receive real-time room chat messages.
 * Matches UNO ARENA dark gaming/glass visual identity.
 * 
 * @param {{
 *   messages: Array<{
 *     id: string,
 *     senderId: string,
 *     senderName: string,
 *     senderAvatar?: string,
 *     message: string,
 *     timestamp: number,
 *   }>,
 *   currentUserId: string,
 *   onSendMessage: (text: string, callback?: (res: { success: boolean, error?: string }) => void) => void,
 *   onSendEmote?: (emote: string) => void,
 *   emotes?: string[],
 *   isMobile?: boolean,
 *   onClose?: () => void,
 * }} props
 */
export function ChatPanel({
  messages = [],
  currentUserId,
  onSendMessage,
  onSendEmote,
  emotes = ['😂', '😎', '🔥', '😱', '👏', '😈', '🤯', '💀', '❤️', '👀'],
  isMobile = false,
  onClose,
}) {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isSending) return;

    if (trimmed.length > 200) {
      setErrorMessage('Message cannot exceed 200 characters.');
      return;
    }

    setIsSending(true);
    setErrorMessage('');

    onSendMessage(trimmed, (res) => {
      setIsSending(false);
      if (res && res.success) {
        setInputText('');
        inputRef.current?.focus();
      } else {
        setErrorMessage(res?.error || 'Failed to send message. Please wait.');
        setTimeout(() => setErrorMessage(''), 3500);
      }
    });
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    try {
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className={`arena-chat-panel ${isMobile ? 'is-mobile' : ''}`}>
      {/* Optional Mobile Header */}
      {isMobile && (
        <div className="chat-mobile-header">
          <div className="chat-header-title">
            <span className="chat-title-icon">💬</span>
            <span className="chat-title-text">ARENA CHAT</span>
          </div>
          {onClose && (
            <button
              type="button"
              className="chat-close-btn"
              onClick={onClose}
              aria-label="Close chat"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Messages Stream */}
      <div className="chat-messages-stream" role="log" aria-live="polite">
        {messages.length === 0 ? (
          <div className="chat-empty-state">
            <span className="empty-chat-icon">💬</span>
            <p className="empty-chat-title">No messages yet</p>
            <p className="empty-chat-sub">Say hi to your contenders!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            return (
              <div
                key={msg.id}
                className={`chat-message-row ${isMe ? 'msg-outgoing' : 'msg-incoming'}`}
              >
                {!isMe && (
                  <span className="msg-sender-avatar" title={msg.senderName}>
                    {msg.senderAvatar || '🦊'}
                  </span>
                )}

                <div className="msg-bubble-wrapper">
                  <div className="msg-meta-header">
                    <span className="msg-sender-name">
                      {isMe ? 'You' : msg.senderName}
                    </span>
                    <span className="msg-timestamp">{formatTime(msg.timestamp)}</span>
                  </div>

                  <div className="msg-bubble-content">
                    <span className="msg-text-content">{msg.message}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating error notification */}
      {errorMessage && (
        <div className="chat-error-notice" role="alert">
          <span>⚠️ {errorMessage}</span>
        </div>
      )}

      {/* Quick Emote Reaction Bar */}
      {onSendEmote && emotes && emotes.length > 0 && (
        <div className="chat-quick-emotes" aria-label="Quick Emotes">
          {emotes.map((emote) => (
            <button
              key={emote}
              type="button"
              className="chat-emote-btn"
              onClick={() => onSendEmote(emote)}
              title={`React with ${emote}`}
            >
              {emote}
            </button>
          ))}
        </div>
      )}

      {/* Chat Input Form */}
      <form className="chat-input-form" onSubmit={handleFormSubmit}>
        <input
          ref={inputRef}
          type="text"
          className="chat-input-field"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message... (Enter to send)"
          maxLength={200}
          disabled={isSending}
          aria-label="Chat message"
        />

        <button
          type="submit"
          className="chat-send-btn"
          disabled={!inputText.trim() || isSending}
          aria-label="Send message"
          title="Send message"
        >
          {isSending ? (
            <span className="chat-send-spinner" aria-hidden="true" />
          ) : (
            <span>➤</span>
          )}
        </button>
      </form>
    </div>
  );
}
