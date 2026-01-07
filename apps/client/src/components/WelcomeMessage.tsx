import { useState, useEffect } from 'react';
import { X, ArrowRight } from 'lucide-react';

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
      className={`fixed bottom-3 sm:bottom-5 left-3 right-3 sm:left-auto sm:right-5 z-50 sm:max-w-xs transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <div
        onClick={handleConfigure}
        className="group bg-background-secondary border border-border rounded-xl p-4 shadow-xl cursor-pointer transition-all duration-200 hover:border-accent-purple/50 hover:bg-background-tertiary"
      >
        <button
          onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
          className="absolute top-2 right-2 p-1.5 text-foreground-muted hover:text-foreground transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-purple/10 flex items-center justify-center flex-shrink-0 group-hover:bg-accent-purple/20 transition-colors">
            <img
              src="/logo.svg"
              alt=""
              className="w-6 h-6 invert opacity-80 group-hover:opacity-100 transition-opacity"
            />
          </div>
          <div className="flex-1 min-w-0 pr-4">
            <h4 className="text-sm font-medium text-foreground group-hover:text-accent-purple transition-colors">
              Welcome to S3 Explorer
            </h4>
            <p className="text-xs text-foreground-muted mt-0.5">
              Click to configure your connection
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-foreground-muted group-hover:text-accent-purple group-hover:translate-x-0.5 transition-all flex-shrink-0" />
        </div>
      </div>
    </div>
  );
}
