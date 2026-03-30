import React, { useRef, useEffect, useCallback } from 'react';
import './HamburgerMenuDropdown.css';

export type DashboardView = 'none' | 'history' | 'live' | 'pending' | 'profile';

interface HamburgerMenuDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectView: (view: DashboardView) => void;
  onNewMatch: () => void;
  pendingCount: number;
  liveCount: number;
}

const HamburgerMenuDropdown: React.FC<HamburgerMenuDropdownProps> = ({
  isOpen,
  onClose,
  onSelectView,
  onNewMatch,
  pendingCount,
  liveCount,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  const handleOutsideClick = useCallback(
    (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, handleOutsideClick]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="hamburger-dropdown"
      role="menu"
      aria-label="Menu principal"
      data-testid="hamburger-dropdown"
    >
      {/* Nova Partida */}
      <button
        role="menuitem"
        className="hamburger-dropdown__item"
        data-testid="menu-new-match"
        onClick={() => {
          onClose();
          onNewMatch();
        }}
      >
        <span className="hamburger-dropdown__icon">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </span>
        <span className="hamburger-dropdown__label">Nova Partida</span>
      </button>

      <div className="hamburger-dropdown__divider" role="separator" />

      {/* Histórico */}
      <button
        role="menuitem"
        className="hamburger-dropdown__item"
        data-testid="menu-history"
        onClick={() => {
          onClose();
          onSelectView('history');
        }}
      >
        <span className="hamburger-dropdown__icon">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </span>
        <span className="hamburger-dropdown__label">Histórico</span>
      </button>

      <div className="hamburger-dropdown__divider" role="separator" />

      {/* Partidas ao Vivo */}
      <button
        role="menuitem"
        className="hamburger-dropdown__item"
        data-testid="menu-live"
        onClick={() => {
          onClose();
          onSelectView('live');
        }}
      >
        <span className="hamburger-dropdown__icon">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </span>
        <span className="hamburger-dropdown__label">Partidas ao Vivo</span>
        {liveCount > 0 && (
          <span
            className="hamburger-dropdown__badge hamburger-dropdown__badge--live"
            data-testid="menu-live-badge"
          >
            {liveCount > 99 ? '99+' : liveCount}
          </span>
        )}
      </button>

      <div className="hamburger-dropdown__divider" role="separator" />

      {/* Partidas aguardando anotador */}
      <button
        role="menuitem"
        className="hamburger-dropdown__item"
        data-testid="menu-pending"
        onClick={() => {
          onClose();
          onSelectView('pending');
        }}
      >
        <span className="hamburger-dropdown__icon">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </span>
        <span className="hamburger-dropdown__label">Aguardando Anotador</span>
        {pendingCount > 0 && (
          <span className="hamburger-dropdown__badge" data-testid="menu-pending-badge">
            {pendingCount > 99 ? '99+' : pendingCount}
          </span>
        )}
      </button>

      <div className="hamburger-dropdown__divider" role="separator" />

      {/* Perfil */}
      <button
        role="menuitem"
        className="hamburger-dropdown__item"
        data-testid="menu-profile"
        onClick={() => {
          onClose();
          onSelectView('profile');
        }}
      >
        <span className="hamburger-dropdown__icon">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </span>
        <span className="hamburger-dropdown__label">Perfil</span>
      </button>
    </div>
  );
};

export default HamburgerMenuDropdown;
