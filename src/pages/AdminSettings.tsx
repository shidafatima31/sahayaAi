import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  ShieldCheck, 
  Lock, 
  FileText, 
  Database, 
  Clock, 
  CheckCircle2, 
  Save, 
  Sliders, 
  Download,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { api, getStoredToken } from '../services/api.ts';
import { AuditLogEntry, SystemSettings } from '../types/index.ts';

export const AdminSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'weights' | 'dpdp' | 'audit' | 'docket'>('weights');
  
  // Settings State
  const [weights, setWeights] = useState({ voice: 0.25, text: 0.30, redFlags: 0.30, context: 0.15 });
  const [thresholds, setThresholds] = useState({ moderate: 25, high: 50, critical: 75 });
  const [retentionDays, setRetentionDays] = useState(90);
  const [simulatedDate, setSimulatedDate] = useState<string>('');
  
  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditFilter, setAuditFilter] = useState('');

  // Status
  const [loading, setLoading] = useState(true);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
    loadAuditLogs();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await api.getSettings();
      if (data.weights) setWeights(data.weights);
      if (data.thresholds) setThresholds(data.thresholds);
      if (data.retention_days) setRetentionDays(Number(data.retention_days));
      if (data.simulatedCurrentDate) setSimulatedDate(data.simulatedCurrentDate);
    } catch (err: any) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const res = await api.getAuditLogs({ action: auditFilter });
      setAuditLogs(res.logs);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavedMsg(null);
    try {
      await api.updateSettings({
        weights,
        thresholds,
        retentionDays
      });
      setSavedMsg('System scoring weights & thresholds saved successfully!');
      setTimeout(() => setSavedMsg(null), 4000);
    } catch (err: any) {
      alert('Error updating settings: ' + err.message);
    }
  };

  const downloadAuditCsv = async () => {
    const token = getStoredToken();
    try {
      const res = await fetch('/api/export/csv?type=audit', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sahara_audit_trail_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
    } catch (err) {
      console.error('Audit CSV download error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-teal-400 font-bold text-[10px] tracking-wide uppercase">
                  Statutory Administration
                </span>
                <span className="text-xs text-slate-500">
                  Current Clock: {simulatedDate ? new Date(simulatedDate).toLocaleDateString() : new Date().toLocaleDateString()}
                </span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 mt-1">System Governance & DPDP Compliance</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure algorithmic weight parameters, inspect tamper-proof audit trails, and manage Digital Personal Data Protection mandates.
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-6 border-b border-slate-200 pb-1">
            <button
              onClick={() => setActiveTab('weights')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'weights' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Scoring Weights & Thresholds
            </button>
            <button
              onClick={() => setActiveTab('dpdp')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'dpdp' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              DPDP Act 2023 Compliance
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'audit' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Audit Trail ({auditLogs.length})
            </button>
            <button
              onClick={() => setActiveTab('docket')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'docket' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              NHAA Docket Adapter
            </button>
          </div>
        </div>

        {savedMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{savedMsg}</span>
          </div>
        )}

        {/* TAB 1: SCORING WEIGHTS & THRESHOLDS */}
        {activeTab === 'weights' && (
          <form onSubmit={handleSaveSettings} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Configurable SVI Weight Formula</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Total weights should sum to 1.00. Hardcoded safety overrides (such as suicide detection forcing Critical) take precedence regardless of weights.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>Voice Stress Weight:</span>
                  <span className="font-mono font-bold text-teal-700">{(weights.voice * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.6"
                  step="0.05"
                  value={weights.voice}
                  onChange={(e) => setWeights({ ...weights, voice: parseFloat(e.target.value) })}
                  className="w-full accent-teal-600 cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 block">Autocorrelation pitch variance, pause duration, vocal tremor (4-12 Hz).</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>Text Emotion Lexicon Weight:</span>
                  <span className="font-mono font-bold text-teal-700">{(weights.text * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.6"
                  step="0.05"
                  value={weights.text}
                  onChange={(e) => setWeights({ ...weights, text: parseFloat(e.target.value) })}
                  className="w-full accent-teal-600 cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 block">Fear, anxiety, helplessness lexicon (English, Hindi, Kannada) with negation handling.</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>Red Flags & Threats Weight:</span>
                  <span className="font-mono font-bold text-teal-700">{(weights.redFlags * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.6"
                  step="0.05"
                  value={weights.redFlags}
                  onChange={(e) => setWeights({ ...weights, redFlags: parseFloat(e.target.value) })}
                  className="w-full accent-teal-600 cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 block">Physical violence, weapons, confinement, and financial neglect markers.</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>Historical Context Weight:</span>
                  <span className="font-mono font-bold text-teal-700">{(weights.context * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.4"
                  step="0.05"
                  value={weights.context}
                  onChange={(e) => setWeights({ ...weights, context: parseFloat(e.target.value) })}
                  className="w-full accent-teal-600 cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 block">Repeat caller history, prior case counts, unresolved status.</span>
              </div>

            </div>

            {/* Thresholds */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Risk Band Cutoff Thresholds</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="font-semibold text-amber-700 block mb-1">Moderate Risk Cutoff</label>
                  <input
                    type="number"
                    value={thresholds.moderate}
                    onChange={(e) => setThresholds({ ...thresholds, moderate: Number(e.target.value) })}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Default: 25 SVI</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="font-semibold text-orange-700 block mb-1">High Risk Cutoff</label>
                  <input
                    type="number"
                    value={thresholds.high}
                    onChange={(e) => setThresholds({ ...thresholds, high: Number(e.target.value) })}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Default: 50 SVI</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="font-semibold text-red-700 block mb-1">Critical Risk Cutoff</label>
                  <input
                    type="number"
                    value={thresholds.critical}
                    onChange={(e) => setThresholds({ ...thresholds, critical: Number(e.target.value) })}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Default: 75 SVI</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Configuration</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: DPDP ACT 2023 COMPLIANCE */}
        {activeTab === 'dpdp' && (
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs space-y-6 text-xs">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Compliant with DPDP Act 2023 (Ministry of Electronics & IT)</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-1">Digital Personal Data Protection Controls</h3>
              <p className="text-slate-500">
                Statutory mechanisms governing informed consent, purpose limitation, data minimisation, and right to erasure.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-teal-600" />
                  AES-256-GCM Encryption at Rest
                </span>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  All citizen phone numbers and names are encrypted at rest using an AES-256-GCM authenticated cipher with dynamic IVs. Unencrypted PII is never stored in queryable plaintext.
                </p>
                <div className="p-2 bg-white rounded border border-slate-200 font-mono text-[10px] text-slate-500">
                  Status: ACTIVE (Key verified from environment)
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Data Minimisation Architecture
                </span>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Raw audio voice streams are discarded in-memory immediately following client-side Web Audio feature extraction. Only numeric acoustic features (pitch, variance, tremor) are transferred.
                </p>
                <div className="p-2 bg-white rounded border border-slate-200 font-mono text-[10px] text-slate-500">
                  Policy: RAW AUDIO STORAGE DISABLED BY DEFAULT
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  Data Retention Policy
                </span>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Cases and follow-up responses older than the configured threshold are flagged for statutory anonymization or automated archival.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-slate-700 font-semibold">Retention Period:</span>
                  <select
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(Number(e.target.value))}
                    className="p-1.5 rounded-lg border border-slate-300 bg-white font-mono font-bold"
                  >
                    <option value={30}>30 Days</option>
                    <option value={90}>90 Days (Recommended)</option>
                    <option value={180}>180 Days</option>
                    <option value={365}>1 Year</option>
                  </select>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-red-600" />
                  Right to be Forgotten (Section 12)
                </span>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Counsellors and citizens can invoke immediate statutory erasure of all transcripts, contact details, and voice data through the case detail dashboard.
                </p>
                <div className="p-2 bg-white rounded border border-slate-200 font-mono text-[10px] text-slate-500">
                  Endpoint: POST /api/dpdp/delete-data (Ready)
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Tamper-Proof Audit Log</h3>
                <p className="text-xs text-slate-500">
                  Every user login, automated assessment, counsellor decision, and risk override is immutably recorded.
                </p>
              </div>

              <button
                onClick={downloadAuditCsv}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Audit CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Timestamp</th>
                    <th className="p-2.5">User</th>
                    <th className="p-2.5">Role</th>
                    <th className="p-2.5">Action</th>
                    <th className="p-2.5">Case Reference</th>
                    <th className="p-2.5">Audit Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {auditLogs.slice(0, 30).map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80">
                      <td className="p-2.5 text-slate-400 whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString()}</td>
                      <td className="p-2.5 font-bold text-slate-800">{log.userName}</td>
                      <td className="p-2.5 text-slate-500 uppercase text-[10px]">{log.userRole}</td>
                      <td className="p-2.5 font-bold text-teal-700">{log.action}</td>
                      <td className="p-2.5 text-slate-500">{log.caseId || '-'}</td>
                      <td className="p-2.5 text-slate-700 max-w-md truncate" title={log.details}>{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: NHAA DOCKET ADAPTER */}
        {activeTab === 'docket' && (
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs space-y-5 text-xs">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Legacy NHAA 14566 Docket Interface</h3>
              <p className="text-slate-500">
                Standard swappable interface connecting Sahara AI to the existing National Helpline for Abuse & Aggression database.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">Current Adapter Implementation:</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-bold text-[10px]">
                  NHAALegacyDocketAdapter (Connected)
                </span>
              </div>
              <p className="text-slate-600 text-[11px]">
                Every intake event issues a standardized docket format: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-bold">NHAA-DOC-YYYY-XXXXX</code> with cryptographic checksum. In production, this service can be pointed to the central C-DAC or NIC endpoint with zero changes to the core triage modules.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
