import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Heart, Lock, Mail, ArrowRight, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import { api, setStoredAuth } from '../services/api.ts';
import { User } from '../types/index.ts';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Demo@1234');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const demoPresets = [
    { label: 'Citizen Caller', email: 'citizen@demo.in', role: 'Citizen' },
    { label: 'Senior Counsellor', email: 'counsellor@demo.in', role: 'Counsellor' },
    { label: 'District Magistrate', email: 'district@demo.in', role: 'District Admin' },
    { label: 'State Directorate', email: 'state@demo.in', role: 'State Admin' },
  ];

  const handleLogin = async (loginEmail?: string) => {
    const targetEmail = loginEmail || email;
    if (!targetEmail) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.login(targetEmail, password);
      onLoginSuccess(res.user);
      if (res.user.role === 'counsellor') navigate('/queue');
      else if (res.user.role === 'district_admin' || res.user.role === 'state_admin') navigate('/analytics');
      else navigate('/portal');
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-md p-6 sm:p-8 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white mx-auto flex items-center justify-center shadow-sm">
            <Heart className="w-6 h-6 fill-current" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Sahara AI Helpline</h2>
          <p className="text-xs text-slate-500">
            Official portal login for certified counsellors, district magistrates, and citizens.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
            {errorMsg}
          </div>
        )}

        {/* 1-Click Demo Logins */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block text-center">
            Quick 1-Click Demo Logins
          </span>
          <div className="grid grid-cols-2 gap-2">
            {demoPresets.map((p) => (
              <button
                key={p.email}
                type="button"
                onClick={() => {
                  setEmail(p.email);
                  handleLogin(p.email);
                }}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-teal-50 hover:border-teal-300 text-left transition-all cursor-pointer group"
              >
                <div className="font-bold text-xs text-slate-900 group-hover:text-teal-700">{p.label}</div>
                <div className="text-[10px] text-slate-500 truncate">{p.email}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-200 w-full" />
          <span className="bg-white px-3 text-[10px] uppercase font-bold text-slate-400 absolute">or manual sign in</span>
        </div>

        {/* Form */}
        <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">Official Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@nhaa.gov.in"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>
            <span className="text-[10px] text-slate-400">Default Demo Password: <strong>Demo@1234</strong></span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In to System</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center">
          <Link to="/" className="text-xs text-slate-500 hover:text-teal-700 font-semibold">
            ← Return to Sahara AI Public Home
          </Link>
        </div>

      </div>
    </div>
  );
};
