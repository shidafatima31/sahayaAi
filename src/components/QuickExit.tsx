import React from 'react';
import { ShieldAlert, ExternalLink } from 'lucide-react';

interface QuickExitProps {
  label?: string;
  className?: string;
}

export const QuickExit: React.FC<QuickExitProps> = ({ 
  label = 'Quick Safety Exit',
  className = ''
}) => {
  const handleExit = () => {
    // 1. Immediately replace current history state
    sessionStorage.clear();
    // 2. Redirect to a neutral, everyday website
    window.location.replace('https://weather.com');
  };

  return (
    <button
      onClick={handleExit}
      type="button"
      title="Instantly exit this portal and redirect to a weather page"
      aria-label="Quick Safety Exit"
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium text-xs md:text-sm shadow-md transition-all active:scale-95 cursor-pointer ${className}`}
    >
      <ShieldAlert className="w-4 h-4 text-white animate-pulse" />
      <span>{label}</span>
      <ExternalLink className="w-3.5 h-3.5 opacity-80" />
    </button>
  );
};
