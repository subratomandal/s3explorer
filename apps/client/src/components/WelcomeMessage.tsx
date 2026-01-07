import { useState, useEffect } from 'react';
import { X, Settings } from 'lucide-react';

interface WelcomeMessageProps {
  onConfigure: () => void;
}

export function WelcomeMessage({ onConfigure }: WelcomeMessageProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user has dismissed before
    const hasDismissed = localStorage.getItem('s3-explorer-welcome-dismissed');
    if (hasDismissed) {
      setDismissed(true);
      return;
    }

    // Show after a short delay for better UX
    const timer = setTimeout(() => setVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem('s3-explorer-welcome-dismissed', 'true');
    setTimeout(() => setDismissed(true), 300);
  };

  const handleConfigure = () => {
    handleDismiss();
    onConfigure();
  };

  if (dismissed) return null;

  return (
    <div
      className={`fixed bottom-3 sm:bottom-5 left-3 right-3 sm:left-auto sm:right-5 z-50 sm:max-w-sm transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <div className="bg-background-secondary border border-dashed border-border rounded-xl p-3 sm:p-4 shadow-xl">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 sm:top-3 sm:right-3 p-1.5 text-foreground-muted hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5 sm:w-4 sm:h-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 hidden sm:block">
            <img
              src="/logo.svg"
              alt="S3 Explorer"
              className="w-10 h-10 invert"
            />
          </div>
          <div className="flex-1 min-w-0 pr-6 sm:pr-4">
            <h4 className="text-sm font-medium text-foreground mb-1">
              Welcome to S3 Explorer
            </h4>
            <p className="text-xs text-foreground-muted leading-relaxed mb-3">
              Get started by connecting your S3-compatible storage.
            </p>
            <button
              onClick={handleConfigure}
              className="inline-flex items-center gap-2 px-4 py-2.5 sm:py-2 rounded-lg border border-dashed border-border text-foreground-secondary hover:text-foreground hover:border-border-hover hover:bg-background-hover transition-all text-sm font-medium min-h-[44px] sm:min-h-0"
            >
              <Settings className="w-4 h-4" />
              Configure
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
