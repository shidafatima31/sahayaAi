import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Heart, 
  Phone, 
  Globe, 
  ShieldCheck, 
  LayoutDashboard, 
  Inbox, 
  Settings, 
  FileText, 
  LogOut, 
  User as UserIcon,
  PhoneCall
} from 'lucide-react';
import { QuickExit } from './QuickExit.tsx';
import { User } from '../types/index.ts';

interface NavbarProps {
  currentUser: User | null;
  selectedLanguage: string;
  onLanguageChange: (lang: string) => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  currentUser, 
  selectedLanguage, 
  onLanguageChange,
  onLogout 
}) => {
  const location = useLocation();
  const path = location.pathname;

  const languages = ['English', 'Hindi', 'Kannada', 'Marathi', 'Tamil', 'Telugu', 'Bengali'];

  const isCitizen = !currentUser || currentUser.role === 'citizen';
  const isCounsellor = currentUser?.role === 'counsellor';
  const isAdmin = currentUser?.role === 'district_admin' || currentUser?.role === 'state_admin';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Logo & National Helpline Brand */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-teal-500/20 group-hover:scale-105 transition-all">
                <Heart className="w-5 h-5 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-slate-900 tracking-tight text-lg">Sahaya<span className="text-teal-600">AI</span></span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">14566</span>
                </div>
                <div className="text-[10px] text-slate-500 tracking-tight font-medium hidden sm:flex items-center gap-1">
                  <span>National Distress Helpline Triage & Follow-up</span>
                  <span className="text-slate-300">•</span>
                  <span className="font-semibold text-teal-600">by Code 2 Care</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 text-sm font-medium text-slate-600">
            <Link 
              to="/" 
              className={`px-3 py-1.5 rounded-lg transition-colors ${path === '/' ? 'text-teal-700 bg-teal-50 font-semibold' : 'hover:text-slate-900 hover:bg-slate-50'}`}
            >
              Overview
            </Link>

            <Link 
              to="/portal" 
              className={`px-3 py-1.5 rounded-lg transition-colors ${path.startsWith('/portal') ? 'text-teal-700 bg-teal-50 font-semibold' : 'hover:text-slate-900 hover:bg-slate-50'}`}
            >
              Citizen Help Portal
            </Link>

            {/* Counsellor links */}
            {(isCounsellor || isAdmin) && (
              <Link 
                to="/queue" 
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${path === '/queue' ? 'text-teal-700 bg-teal-50 font-semibold' : 'hover:text-slate-900 hover:bg-slate-50'}`}
              >
                <span>Counsellor Queue</span>
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              </Link>
            )}

            {/* Admin / State Dashboard */}
            {isAdmin && (
              <Link 
                to="/analytics" 
                className={`px-3 py-1.5 rounded-lg transition-colors ${path === '/analytics' ? 'text-teal-700 bg-teal-50 font-semibold' : 'hover:text-slate-900 hover:bg-slate-50'}`}
              >
                State & District KPIs
              </Link>
            )}

            {/* Outbox / SMS Simulator */}
            <Link 
              to="/outbox" 
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${path === '/outbox' ? 'text-teal-700 bg-teal-50 font-semibold' : 'hover:text-slate-900 hover:bg-slate-50'}`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>SMS Outbox</span>
            </Link>

            {/* Settings & DPDP */}
            {isAdmin && (
              <Link 
                to="/admin/settings" 
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${path.startsWith('/admin') ? 'text-teal-700 bg-teal-50 font-semibold' : 'hover:text-slate-900 hover:bg-slate-50'}`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>DPDP & Settings</span>
              </Link>
            )}
          </nav>

          {/* Right Action Cluster: Helpline 14566, Language, Quick Exit */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick 14566 Call Button */}
            <Link
              to="/portal?channel=ivrs"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold hover:bg-teal-100 transition-all cursor-pointer"
            >
              <PhoneCall className="w-3.5 h-3.5 text-teal-600" />
              <span>14566 IVRS</span>
            </Link>

            {/* Language Selector */}
            <div className="relative flex items-center">
              <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-2 pointer-events-none" />
              <select
                value={selectedLanguage}
                onChange={(e) => onLanguageChange(e.target.value)}
                aria-label="Select Language"
                className="pl-7 pr-2 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer shadow-2xs"
              >
                {languages.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            {/* Quick Safety Exit Button */}
            <QuickExit />

            {/* User profile / Logout */}
            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-bold text-slate-800 truncate max-w-[120px]">{currentUser.name}</div>
                  <div className="text-[10px] text-teal-600 font-semibold uppercase">{currentUser.role.replace('_', ' ')}</div>
                </div>
                <button
                  onClick={onLogout}
                  title="Logout"
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all"
              >
                Official Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
