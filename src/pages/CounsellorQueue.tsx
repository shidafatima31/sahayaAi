import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, 
  Filter, 
  Search, 
  AlertTriangle, 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  Volume2, 
  MessageSquare, 
  PhoneCall, 
  Sparkles,
  ArrowUpDown,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api.ts';
import { CaseRecord, RiskLevel, CaseStatus } from '../types/index.ts';

export const CounsellorQueue: React.FC = () => {
  const navigate = useNavigate();

  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [riskFilter, setRiskFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [languageFilter, setLanguageFilter] = useState<string>('');
  const [districtFilter, setDistrictFilter] = useState<string>('');
  const [flaggedFilter, setFlaggedFilter] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Realtime Live SSE Connection
  useEffect(() => {
    fetchCases();

    const evtSource = new EventSource('/api/realtime/stream');
    evtSource.addEventListener('NEW_CASE', () => {
      fetchCases(false);
    });
    evtSource.addEventListener('CASE_UPDATED', () => {
      fetchCases(false);
    });
    evtSource.addEventListener('CHECKIN_COMPLETED', () => {
      fetchCases(false);
    });
    evtSource.addEventListener('TIME_TRAVEL_TRIGGERED', () => {
      fetchCases(false);
    });

    return () => {
      evtSource.close();
    };
  }, []);

  const fetchCases = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await api.getCases({
        risk: riskFilter,
        status: statusFilter,
        language: languageFilter,
        district: districtFilter,
        flagged: flaggedFilter ? 'true' : undefined,
        search: searchTerm
      });
      setCases(res.cases);
    } catch (err: any) {
      console.error('Failed to load queue cases:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Re-fetch when filters change
  useEffect(() => {
    fetchCases(false);
  }, [riskFilter, statusFilter, languageFilter, districtFilter, flaggedFilter, searchTerm]);

  // Risk Badge helper
  const getRiskBadge = (risk: RiskLevel) => {
    switch (risk) {
      case 'Critical':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />Critical</span>;
      case 'High':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">High Risk</span>;
      case 'Moderate':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">Moderate</span>;
      case 'Low':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Low Risk</span>;
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'voice': return <span title="Voice Note"><Volume2 className="w-3.5 h-3.5 text-teal-600" /></span>;
      case 'ivrs': return <span title="14566 IVRS"><PhoneCall className="w-3.5 h-3.5 text-purple-600" /></span>;
      default: return <span title="Chat"><MessageSquare className="w-3.5 h-3.5 text-blue-600" /></span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold text-[10px] tracking-wide uppercase">
                Live SSE Triage Stream
              </span>
              <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync Active
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 mt-1">Counsellor Priority Triage Queue</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Ranked dynamically by Stress Vulnerability Index (SVI). Hard-coded clinical safety overrides elevate immediate peril.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchCases(true)}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            
            {/* Search */}
            <div className="lg:col-span-2 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search citizen, docket, keyword..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            {/* Risk Filter */}
            <div>
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-teal-500 cursor-pointer"
              >
                <option value="">All Risk Bands</option>
                <option value="Critical">Critical (75-100)</option>
                <option value="High">High (50-74)</option>
                <option value="Moderate">Moderate (25-49)</option>
                <option value="Low">Low (0-24)</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-teal-500 cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Escalated">Escalated</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>

            {/* District Filter */}
            <div>
              <select
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-teal-500 cursor-pointer"
              >
                <option value="">All Districts</option>
                <option value="Bengaluru Urban">Bengaluru Urban</option>
                <option value="Mysuru">Mysuru</option>
                <option value="Belagavi">Belagavi</option>
                <option value="Dakshina Kannada">Dakshina Kannada</option>
                <option value="Kalaburagi">Kalaburagi</option>
                <option value="Hubballi-Dharwad">Hubballi-Dharwad</option>
              </select>
            </div>

            {/* Flagged Only Toggle */}
            <div className="flex items-center">
              <label className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer text-xs font-semibold text-slate-700 w-full justify-center">
                <input
                  type="checkbox"
                  checked={flaggedFilter}
                  onChange={(e) => setFlaggedFilter(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span className="flex items-center gap-1 text-amber-900">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Flagged Only
                </span>
              </label>
            </div>

          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span>Showing {cases.length} cases matching filters</span>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-600" /> Critical</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500" /> High</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Moderate</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Low</span>
            </div>
          </div>
        </div>

        {/* Case Cards Table / List */}
        {loading ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500">Loading live priority queue...</p>
          </div>
        ) : cases.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-teal-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No cases match the selected filters</h3>
            <p className="text-xs text-slate-500">Adjust the filters or clear search query to inspect other triage records.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cases.map((c) => {
              const isFlagged = c.isFlaggedForReview || (c.patternFlags && c.patternFlags.length > 0);
              const flags = c.patternFlags || [];

              return (
                <div
                  key={c.id}
                  onClick={() => navigate(`/cases/${c.id}`)}
                  className={`bg-white p-5 rounded-2xl border transition-all hover:shadow-md cursor-pointer relative ${
                    c.riskLevel === 'Critical'
                      ? 'border-red-300 hover:border-red-400 bg-red-50/10'
                      : isFlagged
                      ? 'border-amber-300 hover:border-amber-400 bg-amber-50/15'
                      : 'border-slate-200 hover:border-teal-300'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    
                    {/* Left: Score Badge & Identity */}
                    <div className="flex items-start gap-4">
                      {/* SVI Circle Score Badge */}
                      <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 text-white shadow-xs shrink-0">
                        <span className="text-[9px] uppercase font-bold text-teal-400 tracking-wider">SVI</span>
                        <span className="text-lg font-black leading-none text-white">{c.optedOutOfAI ? 'N/A' : c.sviScore}</span>
                        <span className="text-[8px] text-slate-400">/ 100</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-500">{c.docketNumber}</span>
                          <span className="text-slate-300">•</span>
                          <span className="font-bold text-sm text-slate-900">{c.citizenName}</span>
                          <span className="text-xs text-slate-400 font-mono">({c.phoneMasked})</span>
                          {getChannelIcon(c.channel)}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span>{c.district}</span>
                          <span>•</span>
                          <span>Language: {c.language}</span>
                          <span>•</span>
                          <span className="capitalize">{c.intent}</span>
                          <span>•</span>
                          <span className="font-mono text-[11px] text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                        </div>

                        {/* Transcript Snippet */}
                        <p className="text-xs text-slate-600 line-clamp-1 italic max-w-2xl mt-1">
                          "{c.transcript}"
                        </p>
                      </div>
                    </div>

                    {/* Right: Risk Badge, Status & Pattern Flags */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex items-center gap-2">
                        {getRiskBadge(c.riskLevel)}
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          c.status === 'Open' ? 'bg-blue-100 text-blue-800' :
                          c.status === 'In Progress' ? 'bg-amber-100 text-amber-800' :
                          c.status === 'Escalated' ? 'bg-red-100 text-red-800' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {c.status}
                        </span>
                      </div>

                      {/* Pattern Alert Badges */}
                      {flags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 justify-end max-w-xs">
                          {flags.map((f, i) => (
                            <span 
                              key={i} 
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1"
                              title={f.reason}
                            >
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>{f.label}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {c.explanation?.safetyRuleApplied && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                          Safety Rule Override Applied
                        </span>
                      )}

                      {c.optedOutOfAI && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                          Citizen Opt-Out: Human-Only Triage
                        </span>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};
