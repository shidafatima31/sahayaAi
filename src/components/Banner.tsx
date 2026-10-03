import React from 'react';
import { Scale, ShieldCheck, HeartHandshake } from 'lucide-react';

interface BannerProps {
  className?: string;
  compact?: boolean;
}

export const Banner: React.FC<BannerProps> = ({ className = '', compact = false }) => {
  if (compact) {
    return (
      <div className={`flex items-center gap-2 bg-slate-900 text-teal-400 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border border-teal-500/30 ${className}`}>
        <Scale className="w-3.5 h-3.5 text-teal-400" />
        <span>AI prioritizes. Humans decide.</span>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 text-white border-y border-teal-500/20 py-2.5 px-4 shadow-sm ${className}`}>
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs md:text-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-teal-500/20 flex items-center justify-center border border-teal-400/40 text-teal-300">
            <Scale className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-bold text-teal-300 tracking-wide uppercase text-xs mr-2">Core Mandate:</span>
            <span className="font-semibold text-slate-100">"AI prioritizes. Humans decide."</span>
            <span className="text-slate-400 hidden sm:inline ml-2">— Algorithmic triage only recommends; certified human counsellors verify all interventions.</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-300">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            DPDP Act 2023 Compliant
          </span>
          <span className="hidden md:flex items-center gap-1.5 text-blue-300">
            <HeartHandshake className="w-3.5 h-3.5" />
            SIH 2026 Code 2 Care
          </span>
        </div>
      </div>
    </div>
  );
};
