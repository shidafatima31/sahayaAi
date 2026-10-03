import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Inbox, 
  Send, 
  CheckCheck, 
  ExternalLink, 
  PhoneCall, 
  MessageSquare, 
  Clock, 
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api.ts';
import { OutboxMessage } from '../types/index.ts';

export const OutboxSimulator: React.FC = () => {
  const [messages, setMessages] = useState<OutboxMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOutbox();
  }, []);

  const loadOutbox = async () => {
    setLoading(true);
    try {
      const res = await api.getOutboxMessages();
      setMessages(res.outbox);
    } catch (err: any) {
      console.error('Failed to load outbox:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] tracking-wide uppercase">
                Simulated Gateway (SMS / WhatsApp)
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 mt-1">Automated Follow-up Dispatch Outbox</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulates automated Indian telecommunication SMS & WhatsApp dispatches for Day 0, Day 1, Day 7, and Day 30 safety check-ins.
            </p>
          </div>

          <button
            onClick={loadOutbox}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Outbox</span>
          </button>
        </div>

        {/* Tip for Judges */}
        <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
          <div>
            <strong>Interactive Judge Walkthrough:</strong> Click on any <span className="font-semibold text-teal-800 underline">"Open Citizen Check-in Link →"</span> below to simulate what the victim receives on their phone. Submitting a response will immediately re-score their case and trigger pattern rules in the counsellor dashboard!
          </div>
        </div>

        {/* Message Feed */}
        {loading ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500">Loading simulated dispatch queue...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-2">
            <Inbox className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">No outbound messages dispatched yet</h3>
            <p className="text-xs text-slate-500">File a case in the Citizen Help Portal to trigger automatic check-in scheduling.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => (
              <div 
                key={m.id} 
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-teal-300 transition-all space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                      Recipient: {m.recipientPhone}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="font-mono text-slate-500">Case ID: {m.caseId}</span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                      <CheckCheck className="w-3.5 h-3.5" />
                      {m.status.toUpperCase()}
                    </span>
                    <span>•</span>
                    <span className="font-mono">{new Date(m.sentAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-mono leading-relaxed">
                  {m.body}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="text-[11px] text-slate-400">
                    Channel: <strong>{m.channel} (Gateway: CDAC/Gov.in SMS)</strong>
                  </div>

                  <Link
                    to={m.link}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold transition-all"
                  >
                    <span>Open Citizen Check-in Link</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};
