import React from 'react';

export default function VoiceOrb({ isListening, isSpeaking, onClick, disabled }) {
  const getState = () => {
    if (isSpeaking) return 'speaking';
    if (isListening) return 'listening';
    return 'idle';
  };

  return (
    <button
      className={`voice-orb orb-${getState()}`}
      onClick={onClick}
      disabled={disabled}
    >
      <div className="orb-rings">
        <div className="orb-ring ring-1" />
        <div className="orb-ring ring-2" />
        <div className="orb-ring ring-3" />
      </div>
      <div className="orb-core">
        {isSpeaking ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <rect x="3" y="6" width="3" height="12" rx="1.5"/>
            <rect x="8.5" y="3" width="3" height="18" rx="1.5"/>
            <rect x="14" y="7" width="3" height="10" rx="1.5"/>
            <rect x="19.5" y="5" width="3" height="14" rx="1.5"/>
          </svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
          </svg>
        )}
      </div>
    </button>
  );
}