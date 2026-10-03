import React, { useState } from 'react';
import { 
  Sparkles, 
  Users, 
  FastForward, 
  CheckCircle, 
  RotateCcw, 
  AlertTriangle, 
  Activity, 
  HelpCircle,
  Clock,
  PhoneCall
} from 'lucide-react';
import { api, setStoredAuth } from '../services/api.ts';
import { User, Role } from '../types/index.ts';

interface DemoBarProps {
  currentUser: User | null;
  onUserSwitch: (user: User) => void;
  onScenarioLoad?: (scenarioIndex: number) => void;
  onTimeTraveled?: () => void;
}

export const DemoBar: React.FC<DemoBarProps> = ({ 
  currentUser, 
  onUserSwitch, 
  onScenarioLoad,
  onTimeTraveled 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timeTravelMsg, setTimeTravelMsg] = useState<string | null>(null);

  const demoAccounts = [
    { label: 'Citizen Portal', email: 'citizen@demo.in', role: 'citizen', name: 'Citizen Caller' },
    { label: 'Counsellor Queue', email: 'counsellor@demo.in', role: 'counsellor', name: 'Dr. Radhika Sen' },
    { label: 'District Admin', email: 'district@demo.in', role: 'district_admin', name: 'R. K. Verma (DM)' },
    { label: 'State Admin', email: 'state@demo.in', role: 'state_admin', name: 'Dr. Anita Deshmukh' }
  ];

  const scenarios = [
    { id: 1, title: 'Low-Risk Inquiry', icon: HelpCircle, color: 'text-emerald-500', desc: 'Informational queries on protection acts' },
    { id: 2, title: 'Moderate Distress', icon: Activity, color: 'text-amber-500', desc: 'Anxious caller with verbal threats & movement curbs' },
    { id: 3, title: 'Critical Self-Harm Flag', icon: AlertTriangle, color: 'text-red-500', desc: 'Immediate suicide flag overrides score to Critical' },
    { id: 4, title: 'Worsening Case (Day 0-30)', icon: FastForward, color: 'text-purple-500', desc: '+15 pt SVI surge trigger pattern alert' }
  ];

  const handleSwitchAccount = async (email: string) => {
    setLoading(true);
    try {
      const res = await api.login(email, 'Demo@1234');
      onUserSwitch(res.user);
    } catch (err: any) {
      console.error('Demo login failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeTravel = async (days: number, reset = false) => {
    setLoading(true);
    try {
      const res = await api.simulateTimeTravel(days, reset);
      setTimeTravelMsg(
        reset 
          ? 'Reset simulated date to real-world clock.' 
          : `Fast-forwarded +${days} days. Overdue: ${res.markedOverdueCount}, Newly flagged: ${res.newlyFlaggedCount}`
      );
      if (onTimeTraveled) onTimeTraveled();
      setTimeout(() => setTimeTravelMsg(null), 5000);
    } catch (err: any) {
      console.error('Time travel failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border-b border-slate-800 text-white text-xs">
      <div className="max-w-7xl mx-auto px-4 py-1.5 flex flex-wrap items-center justify-between gap-2">
        {/* Left: Quick Switchers */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold uppercase tracking-wider text-[10px] border border-teal-500/30">
            <Sparkles className="w-3 h-3 text-teal-400" />
            SIH 2026 Judge Demo Bar
          </span>

          <span className="text-slate-400 hidden sm:inline">1-Click Role Switch:</span>
          {demoAccounts.map(acc => {
            const isCurrent = currentUser?.email === acc.email;
            return (
              <button
                key={acc.email}
                disabled={loading}
                onClick={() => handleSwitchAccount(acc.email)}
                className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  isCurrent 
                    ? 'bg-teal-500 text-white font-bold shadow' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {acc.label}
              </button>
            );
          })}
        </div>

        {/* Right: Expand Scenarios & Time-travel */}
        <div className="flex items-center gap-2">
          {timeTravelMsg && (
            <span className="text-amber-300 text-[11px] animate-pulse hidden md:inline">
              {timeTravelMsg}
            </span>
          )}

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-600/80 hover:bg-indigo-600 text-white font-medium cursor-pointer shadow-sm"
          >
            <Clock className="w-3 h-3" />
            <span>Time Travel & 4 Scenarios</span>
            <span className="text-[10px] bg-indigo-900/60 px-1 rounded">{isOpen ? '▲' : '▼'}</span>
          </button>
        </div>
      </div>

      {/* Dropdown Panel with Scenarios and Fast-Forward */}
      {isOpen && (
        <div className="bg-slate-950 border-t border-slate-800 py-3 px-4 shadow-inner">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Scenarios */}
            <div className="space-y-2">
              <div className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider flex items-center gap-1">
                <span>Preset Evaluator Scenarios (Jump to Experience)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {scenarios.map(s => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        if (onScenarioLoad) onScenarioLoad(s.id);
                        setIsOpen(false);
                      }}
                      className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-1.5 font-bold text-slate-200 group-hover:text-teal-400">
                        <Icon className={`w-3.5 h-3.5 ${s.color}`} />
                        <span>Scenario {s.id}: {s.title}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{s.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Travel Simulator for Pattern Engine */}
            <div className="space-y-2">
              <div className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider flex items-center gap-1">
                <FastForward className="w-3 h-3 text-amber-400" />
                <span>Follow-up Pattern Time Machine (Day 0, 1, 7, 30 Simulation)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                <p className="text-[11px] text-slate-300">
                  Simulate passing days to test scheduled check-ins, silence patterns (2 missed check-ins), and SVI surges (+15 pts):
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    disabled={loading}
                    onClick={() => handleTimeTravel(1)}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono text-xs cursor-pointer"
                  >
                    +1 Day (Day 1)
                  </button>
                  <button
                    disabled={loading}
                    onClick={() => handleTimeTravel(7)}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono text-xs cursor-pointer"
                  >
                    +7 Days (Day 7)
                  </button>
                  <button
                    disabled={loading}
                    onClick={() => handleTimeTravel(30)}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono text-xs cursor-pointer"
                  >
                    +30 Days (Day 30 Support Deficit)
                  </button>
                  <button
                    disabled={loading}
                    onClick={() => handleTimeTravel(0, true)}
                    className="px-2 py-1 rounded bg-red-950/60 hover:bg-red-900 text-red-300 text-xs flex items-center gap-1 cursor-pointer ml-auto"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset Clock
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
