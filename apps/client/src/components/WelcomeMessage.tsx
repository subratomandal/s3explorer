import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { STORAGE_KEYS } from '../constants';

interface WelcomeMessageProps {
  onConfigure: () => void;
}

export function WelcomeMessage({ onConfigure }: WelcomeMessageProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user has dismissed before
    const hasDismissed = localStorage.getItem(STORAGE_KEYS.WELCOME_DISMISSED);
    if (hasDismissed) {
      setDismissed(true);
      return;
    }

    // Delay showing the welcome toast so it doesn't flash briefly if the app
    // already has a saved connection and immediately starts loading data.
    const timer = setTimeout(() => setVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  // Two-step dismiss: first fade out via opacity transition (300ms CSS
  // duration matches the class below), then remove from DOM after the
  // transition completes so the element doesn't linger invisibly.
  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEYS.WELCOME_DISMISSED, 'true');
    setTimeout(() => setDismissed(true), 300);
  };

  const handleConfigure = () => {
    handleDismiss();
    onConfigure();
  };

  if (dismissed) return null;

  return (
    <div
      className={`fixed bottom-3 sm:bottom-5 left-3 right-3 sm:left-auto sm:right-5 z-50 mb-safe sm:max-w-xs transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <div
        onClick={handleConfigure}
        className="group relative bg-background-secondary border border-border rounded-lg p-3.5 shadow-xl cursor-pointer transition-all duration-200 hover:border-accent-purple/50 hover:bg-background-tertiary"
      >
        <button
          onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
          className="absolute top-2 right-2 p-1.5 text-foreground-muted hover:text-foreground transition-colors z-10"
          aria-label="Dismiss welcome message"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-purple/10 flex items-center justify-center flex-shrink-0 group-hover:bg-accent-purple/20 transition-colors">
            <img
              src="/logo.svg"
              alt=""
              className="w-6 h-6 logo-themed opacity-80 group-hover:opacity-100 transition-opacity"
            />
          </div>
          {/* Right padding keeps the title clear of the absolutely positioned dismiss button */}
          <div className="flex-1 min-w-0 pr-6">
            <h4 className="text-sm font-medium text-foreground group-hover:text-accent-purple transition-colors truncate">
              Welcome to S3 Explorer
            </h4>
            <p className="text-xs text-foreground-muted mt-0.5">
              Click to configure your connection
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
