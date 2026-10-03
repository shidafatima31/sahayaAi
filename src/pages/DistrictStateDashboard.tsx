import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Download, 
  ShieldAlert, 
  Activity, 
  CheckCircle2, 
  Clock, 
  Users, 
  TrendingUp, 
  Filter,
  FileSpreadsheet
} from 'lucide-react';
import { api, getStoredToken } from '../services/api.ts';
import { User } from '../types/index.ts';

interface DistrictDashboardProps {
  currentUser: User | null;
}

export const DistrictStateDashboard: React.FC<DistrictDashboardProps> = ({ currentUser }) => {
  const [kpis, setKpis] = useState<any>(null);
  const [districts, setDistricts] = useState<any[]>([]);
  const [trends, setTrends] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const isDistrictAdmin = currentUser?.role === 'district_admin';

  useEffect(() => {
    loadAnalytics();
  }, [currentUser]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [kpiRes, distRes, trendRes] = await Promise.all([
        api.getKpis(),
        api.getDistrictAnalytics(),
        api.getTrends()
      ]);
      setKpis(kpiRes);
      setDistricts(distRes.districts);
      setTrends(trendRes);
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadCsv = async (type: 'cases' | 'audit') => {
    const token = getStoredToken();
    try {
      const res = await fetch(`/api/export/csv?type=${type}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sahara_${type}_export.csv`;
      a.click();
    } catch (e) {
      console.error('Download CSV failed', e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex items-center gap-2 text-sm text-teal-800">
          <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <span>Generating high-level administrative KPI dashboards...</span>
        </div>
      </div>
    );
  }

  const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#10b981'];

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Dashboard Title & CSV Export */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold text-[10px] tracking-wide uppercase">
                {isDistrictAdmin ? `${currentUser?.district} District Directorate` : 'State-Wide NHAA Administrative Directorate'}
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 mt-1">Helpline Analytics & Incident Density</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time aggregation across {districts.length} jurisdictions, response SLA tracking, and 30-day follow-up completion rates.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadCsv('cases')}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Cases CSV</span>
            </button>
            <button
              onClick={() => downloadCsv('audit')}
              className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Audit Log CSV</span>
            </button>
          </div>
        </div>

        {/* KPI Cards Row */}
        {kpis && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400">Total Cases Logged</div>
              <div className="text-2xl font-black text-slate-900">{kpis.totalCases}</div>
              <div className="text-[11px] text-teal-600 font-medium">100% indexed by SVI</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-red-200 shadow-2xs space-y-1">
              <div className="text-[10px] uppercase font-bold text-red-500">Critical Open Cases</div>
              <div className="text-2xl font-black text-red-600">{kpis.criticalOpen}</div>
              <div className="text-[11px] text-red-500 font-medium">Under active intervention</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400">Average SVI Score</div>
              <div className="text-2xl font-black text-slate-900">{kpis.avgSvi} <span className="text-xs font-normal text-slate-400">/ 100</span></div>
              <div className="text-[11px] text-slate-500">Multimodal stress average</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400">Avg Response Time</div>
              <div className="text-2xl font-black text-slate-900">{kpis.avgResponseTimeMin} <span className="text-xs font-normal text-slate-400">min</span></div>
              <div className="text-[11px] text-emerald-600 font-medium">Within 15-min SLA</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-2xs space-y-1 col-span-2 lg:col-span-1">
              <div className="text-[10px] uppercase font-bold text-amber-700">Follow-up Completion</div>
              <div className="text-2xl font-black text-amber-600">{kpis.fuCompletionRate}%</div>
              <div className="text-[11px] text-amber-700 font-medium">Day 0-30 check-ins answered</div>
            </div>

          </div>
        )}

        {/* Charts Row: Risk Distribution & Escalation Reasons */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Risk Distribution Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Risk Band Categorization</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends?.riskDistribution || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
                  <XAxis dataKey="risk_level" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Bar dataKey="count" fill="#0d9488" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Reasons for Escalation / Pattern Flags */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Top Drivers of Escalation & Pattern Flags</h3>
            <div className="space-y-2 text-xs">
              {trends?.escalationReasons?.map((r: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-semibold text-slate-800">{r.reason}</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 font-bold font-mono">
                    {r.count} cases
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* District-wise Heat Table */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">District Incident & Vulnerability Heat Table</h3>
              <p className="text-xs text-slate-500">Cross-district breakdown of active caseloads, critical cases, and flagged follow-up cases.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3">District</th>
                  <th className="p-3">Total Cases</th>
                  <th className="p-3 text-red-600">Critical</th>
                  <th className="p-3 text-orange-600">High</th>
                  <th className="p-3 text-amber-600">Moderate</th>
                  <th className="p-3 text-emerald-600">Low</th>
                  <th className="p-3">Average SVI</th>
                  <th className="p-3 text-amber-700">Flagged for Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {districts.map((d, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-bold text-slate-900">{d.district}</td>
                    <td className="p-3 font-semibold font-mono text-slate-700">{d.total}</td>
                    <td className="p-3 font-bold font-mono text-red-600">{d.critical}</td>
                    <td className="p-3 font-semibold font-mono text-orange-600">{d.high}</td>
                    <td className="p-3 font-semibold font-mono text-amber-600">{d.moderate}</td>
                    <td className="p-3 font-semibold font-mono text-emerald-600">{d.low}</td>
                    <td className="p-3 font-mono font-bold text-slate-900">{d.avgSvi}</td>
                    <td className="p-3 font-bold font-mono text-amber-600">
                      {d.flagged > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          {d.flagged} flagged
                        </span>
                      ) : (
                        '0'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
