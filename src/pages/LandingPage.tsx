import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Activity, 
  PhoneCall, 
  MessageSquare, 
  Mic, 
  Clock, 
  AlertTriangle, 
  Scale, 
  ArrowRight, 
  CheckCircle2, 
  Users, 
  HeartHandshake, 
  FileCheck2,
  Lock,
  Sparkles
} from 'lucide-react';
import { Banner } from '../components/Banner.tsx';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Banner />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-16 md:pb-24 bg-gradient-to-b from-white via-teal-50/20 to-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <div className="max-w-3xl mx-auto text-center space-y-6">
            
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-100/70 border border-teal-200 text-teal-800 text-xs font-semibold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>Smart India Hackathon 2026 | Team: Code 2 Care</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              AI-Assisted Distress Triage for <span className="bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">NHAA 14566</span> Helpline
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 font-normal leading-relaxed max-w-2xl mx-auto">
              Empowering national crisis response with multimodal acoustic distress indexing, rapid risk categorization, and proactive 30-day longitudinal follow-up tracking.
            </p>

            {/* Helpline 14566 Hero Callout */}
            <div className="p-4 rounded-2xl bg-white border border-teal-200/80 shadow-md inline-flex flex-wrap items-center justify-center gap-4 text-left">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm">
                  <PhoneCall className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Toll-Free 24x7 Helpline</div>
                  <div className="text-2xl font-black text-slate-900 tracking-tight">DIAL 14566</div>
                </div>
              </div>
              <div className="h-8 w-px bg-slate-200 hidden sm:block" />
              <div className="text-xs text-slate-600 max-w-xs">
                Integrated with 112, Women Helpline 1091, and state protection units across India.
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                to="/portal"
                className="px-6 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <span>Access Citizen Help Portal</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                to="/portal?channel=ivrs"
                className="px-5 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm border border-slate-300 shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <PhoneCall className="w-4 h-4 text-teal-600" />
                <span>Simulate 14566 IVRS Call</span>
              </Link>

              <Link
                to="/queue"
                className="px-5 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-teal-300 font-semibold text-sm shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <Activity className="w-4 h-4 text-teal-400" />
                <span>Open Counsellor Queue</span>
              </Link>
            </div>

            {/* DPDP and Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-teal-600" />
                AES-256-GCM Encrypted at Rest
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                DPDP Act 2023 Compliant (Audio Discarded)
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-indigo-600" />
                Human-in-the-Loop Always
              </span>
            </div>

          </div>
        </div>
      </section>

      {/* 3 PILLARS SECTION */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <h2 className="text-xs font-bold text-teal-600 uppercase tracking-widest">Architectural Pillars</h2>
            <h3 className="text-3xl font-extrabold text-slate-900">Three-Stage Distress Lifecycle</h3>
            <p className="text-sm text-slate-600">
              Moving helpline triage from passive, delayed logging to active acoustic assessment and persistent follow-up tracking.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Pillar 1: ASSESS (Teal) */}
            <div className="p-8 rounded-2xl bg-teal-50/50 border border-teal-200/80 shadow-xs hover:shadow-md transition-all space-y-4">
              <div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                1
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">Multimodal Intake</span>
                <h4 className="text-xl font-bold text-slate-900">ASSESS: Stress Vulnerability Index (SVI)</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Extracts real acoustic biomarkers (pitch variance, tremor modulation 4-12 Hz, speech pauses) and multilingual text cues (Hindi, Kannada, English) into an objective 0-100 SVI score.
              </p>
              <ul className="space-y-2 text-xs text-slate-700 font-medium">
                <li className="flex items-center gap-2 text-teal-900">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                  Voice stress: pitch autocorrelation & tremor
                </li>
                <li className="flex items-center gap-2 text-teal-900">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                  Red flag threats & self-harm detection
                </li>
                <li className="flex items-center gap-2 text-teal-900">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                  Repeat caller & historical context weight
                </li>
              </ul>
            </div>

            {/* Pillar 2: RESPOND (Blue) */}
            <div className="p-8 rounded-2xl bg-blue-50/50 border border-blue-200/80 shadow-xs hover:shadow-md transition-all space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                2
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Human Decision Support</span>
                <h4 className="text-xl font-bold text-slate-900">RESPOND: Prioritization & Care Pathways</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Categorizes into 4 clinical risk tiers (Low, Moderate, High, Critical) and recommends actionable human services with transparent "Why this score" explanations.
              </p>
              <ul className="space-y-2 text-xs text-slate-700 font-medium">
                <li className="flex items-center gap-2 text-blue-900">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  Emergency Police Dispatch & Witness Protection
                </li>
                <li className="flex items-center gap-2 text-blue-900">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  Trauma Counselling & Legal Injunctions
                </li>
                <li className="flex items-center gap-2 text-blue-900">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  Mandatory human verification and override trail
                </li>
              </ul>
            </div>

            {/* Pillar 3: FOLLOW-UP & TRACK (Orange - Our Key Innovation) */}
            <div className="p-8 rounded-2xl bg-amber-50/60 border border-amber-200/90 shadow-xs hover:shadow-md transition-all space-y-4 relative">
              <div className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold text-[10px] uppercase">
                Key Innovation
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                3
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Proactive Safety Net</span>
                <h4 className="text-xl font-bold text-slate-900">FOLLOW-UP & TRACK: Pattern Detection</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Cases do not end at call closure. Automated, empathetic check-ins at Day 0, Day 1, Day 7, and Day 30 flag deteriorating situations or unfulfilled support.
              </p>
              <ul className="space-y-2 text-xs text-slate-700 font-medium">
                <li className="flex items-center gap-2 text-amber-900">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                  Surge alert: +15 pt SVI escalation
                </li>
                <li className="flex items-center gap-2 text-amber-900">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                  Silence detection: 2 consecutive missed check-ins
                </li>
                <li className="flex items-center gap-2 text-amber-900">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                  Day 30 institutional support deficit audit
                </li>
              </ul>
            </div>

          </div>

        </div>
      </section>

      {/* RISK PALETTE SHOWCASE */}
      <section className="py-12 bg-slate-900 text-white border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Scale className="w-5 h-5 text-teal-400" />
                <span>Standardized Risk Bands & Non-Negotiable Safety Overrides</span>
              </h3>
              <p className="text-xs text-slate-400">
                Formula calculation is strictly constrained by hard-coded clinical safety rules that prevent algorithmic underestimation.
              </p>
            </div>
            <div className="text-xs font-mono text-teal-400 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
              SVI Formula: 0.25 Voice + 0.30 Text + 0.30 Red Flags + 0.15 Context
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-400 text-sm">Low Risk</span>
                <span className="font-mono text-emerald-300">0 - 24 SVI</span>
              </div>
              <p className="text-slate-300 text-[11px]">Informational inquiries, calm vocal tone, no acute flags.</p>
            </div>

            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-400 text-sm">Moderate Risk</span>
                <span className="font-mono text-amber-300">25 - 49 SVI</span>
              </div>
              <p className="text-slate-300 text-[11px]">Anxiety markers, financial coercion, non-lethal domestic disputes.</p>
            </div>

            <div className="p-4 rounded-xl bg-orange-950/40 border border-orange-500/30 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-orange-400 text-sm">High Risk</span>
                <span className="font-mono text-orange-300">50 - 74 SVI</span>
              </div>
              <p className="text-slate-300 text-[11px]">Physical assault, confinement, acoustic tremor, repeat complaints.</p>
            </div>

            <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-red-400 text-sm">Critical Risk</span>
                <span className="font-mono text-red-300">75 - 100 SVI</span>
              </div>
              <p className="text-slate-300 text-[11px]">Immediate threat to life or ANY self-harm trigger (hardcoded override).</p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS STEPPER */}
      <section className="py-16 md:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <span className="text-xs font-bold text-teal-600 uppercase tracking-widest">End-to-End Workflow</span>
            <h3 className="text-3xl font-extrabold text-slate-900">How Sahara AI Protects Citizens</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">1</div>
              <h4 className="font-bold text-slate-900">Multimodal Intake</h4>
              <p className="text-xs text-slate-600">Citizen engages via Chat, Voice Note, or 14566 IVRS with full DPDP consent or optional AI opt-out.</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">2</div>
              <h4 className="font-bold text-slate-900">Algorithmic Scoring</h4>
              <p className="text-xs text-slate-600">Assessment engine analyzes acoustic tremor and text emotion, issuing an SVI score and recommended actions.</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">3</div>
              <h4 className="font-bold text-slate-900">Human Counsellor Review</h4>
              <p className="text-xs text-slate-600">Counsellors view priority queue, inspect "Why this score" factors, accept/edit actions, and log decisions.</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">4</div>
              <h4 className="font-bold text-slate-900">Day 0-30 Persistent Care</h4>
              <p className="text-xs text-slate-600">Automated check-ins track recovery; silence or escalating distress triggers immediate human review alerts.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-slate-900 text-slate-400 py-10 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-white font-bold text-sm">Sahara AI — Smart India Hackathon 2026</div>
            <div>Built by Team Code 2 Care for National Helpline for Abuse & Aggression (NHAA 14566)</div>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/portal" className="hover:text-white transition-colors">Citizen Portal</Link>
            <Link to="/queue" className="hover:text-white transition-colors">Counsellor Queue</Link>
            <Link to="/outbox" className="hover:text-white transition-colors">SMS Outbox</Link>
            <Link to="/admin/settings" className="hover:text-white transition-colors">DPDP & Settings</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
