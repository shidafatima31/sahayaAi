import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Activity, 
  AlertTriangle, 
  ShieldCheck, 
  ShieldAlert,
  Clock, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Volume2, 
  MessageSquare, 
  PhoneCall, 
  UserCheck, 
  Scale, 
  Lock,
  Trash2,
  Send,
  Sparkles,
  ExternalLink,
  HelpCircle
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { api } from '../services/api.ts';
import { CaseRecord, FollowUpSchedule, ActionType, RiskLevel, CaseStatus } from '../types/index.ts';

export const CaseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null);
  const [followUps, setFollowUps] = useState<FollowUpSchedule[]>([]);
  const [docketStatus, setDocketStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Counsellor Human Decision State
  const [assignedActions, setAssignedActions] = useState<ActionType[]>([]);
  const [counsellorNotes, setCounsellorNotes] = useState('');
  const [newStatus, setNewStatus] = useState<CaseStatus>('In Progress');
  const [savingDecision, setSavingDecision] = useState(false);
  const [decisionSuccessMsg, setDecisionSuccessMsg] = useState<string | null>(null);

  // Risk Override State
  const [overrideRisk, setOverrideRisk] = useState<RiskLevel>('Moderate');
  const [overrideReason, setOverrideReason] = useState('');
  const [savingOverride, setSavingOverride] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);

  // DPDP Erasure State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) loadCase();
  }, [id]);

  const loadCase = async () => {
    setLoading(true);
    try {
      const res = await api.getCaseDetail(id!);
      setCaseRecord(res.case);
      setFollowUps(res.followUps);
      setDocketStatus(res.docketStatus);

      // Pre-fill existing decision if any
      if (res.case.counsellorDecision) {
        setAssignedActions(res.case.counsellorDecision.assignedActions || []);
        setCounsellorNotes(res.case.counsellorDecision.actionNotes || '');
        setNewStatus(res.case.counsellorDecision.status || 'In Progress');
      } else {
        // Pre-select recommended actions as suggestions
        const suggested = res.case.recommendedActions.map(r => r.action);
        setAssignedActions(suggested);
        setNewStatus(res.case.status);
      }
      setOverrideRisk(res.case.riskLevel);
    } catch (err: any) {
      console.error('Failed to load case:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSavingDecision(true);
    setDecisionSuccessMsg(null);
    try {
      const res = await api.recordDecision(id, {
        assignedActions,
        actionNotes: counsellorNotes,
        status: newStatus,
        acceptedRecommendations: assignedActions
      });
      setDecisionSuccessMsg('Human counsellor decision recorded into official NHAA docket!');
      loadCase();
      setTimeout(() => setDecisionSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('Save decision failed:', err);
      alert('Failed to record decision: ' + err.message);
    } finally {
      setSavingDecision(false);
    }
  };

  const handleOverrideRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !overrideReason.trim()) return;
    setSavingOverride(true);
    try {
      await api.overrideRisk(id, overrideRisk, overrideReason);
      setShowOverrideModal(false);
      loadCase();
    } catch (err: any) {
      console.error('Override failed:', err);
      alert('Override error: ' + err.message);
    } finally {
      setSavingOverride(false);
    }
  };

  const handleDeleteData = async () => {
    if (!id || !deleteReason.trim()) return;
    setDeleting(true);
    try {
      await api.deleteCitizenData(id, deleteReason);
      setShowDeleteModal(false);
      alert('Citizen data anonymized and scrubbed under DPDP Act 2023.');
      navigate('/queue');
    } catch (err: any) {
      console.error('Delete data failed:', err);
      alert('Erasure failed: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const toggleAction = (act: ActionType) => {
    if (assignedActions.includes(act)) {
      setAssignedActions(prev => prev.filter(a => a !== act));
    } else {
      setAssignedActions(prev => [...prev, act]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex items-center gap-2 text-sm text-teal-800">
          <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading confidential case file...</span>
        </div>
      </div>
    );
  }

  if (!caseRecord) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 text-center">
        <h2 className="text-lg font-bold text-slate-800">Case Not Found</h2>
        <Link to="/queue" className="text-teal-600 text-xs mt-2 inline-block">Back to Queue</Link>
      </div>
    );
  }

  // Radar chart data for 4 sub-scores
  const radarData = [
    { subject: 'Voice Stress', A: caseRecord.subScores.voiceStress, fullMark: 100 },
    { subject: 'Text Emotion', A: caseRecord.subScores.textEmotion, fullMark: 100 },
    { subject: 'Red Flags', A: caseRecord.subScores.redFlags, fullMark: 100 },
    { subject: 'Historical Context', A: caseRecord.subScores.context, fullMark: 100 },
  ];

  // SVI Trend data over time (Intake + Completed Checkins)
  const trendData = [
    { name: 'Intake', score: caseRecord.sviScore }
  ];
  for (const fu of followUps) {
    if (fu.status === 'completed' && fu.responseScore !== undefined) {
      trendData.push({
        name: `Day ${fu.dayNumber}`,
        score: fu.responseScore
      });
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Back Link & Quick Actions */}
        <div className="flex items-center justify-between">
          <Link
            to="/queue"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Counsellor Queue</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowOverrideModal(true)}
              className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Override Risk Level</span>
            </button>

            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>DPDP Erase PII</span>
            </button>
          </div>
        </div>

        {/* Top Case Identity Bar */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {caseRecord.docketNumber}
                </span>
                <span className="font-extrabold text-xl text-slate-900">{caseRecord.citizenName}</span>
                <span className="font-mono text-xs text-slate-500 font-semibold">{caseRecord.phoneMasked}</span>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-600">{caseRecord.district}</span>
              </div>
              <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                <span>Language: <strong>{caseRecord.language}</strong></span>
                <span>Channel: <strong>{caseRecord.channel.toUpperCase()}</strong></span>
                <span>Created: {new Date(caseRecord.createdAt).toLocaleString()}</span>
                {caseRecord.repeatCaller && (
                  <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold text-[10px]">
                    Repeat Caller ({caseRecord.priorCaseCount} prior incidents)
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* SVI Big Pill */}
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-slate-400">Stress Index (SVI)</div>
                <div className="text-3xl font-black text-slate-900">
                  {caseRecord.optedOutOfAI ? 'Opted Out' : caseRecord.sviScore}
                  <span className="text-xs font-normal text-slate-400"> /100</span>
                </div>
              </div>

              {/* Risk Badge */}
              <div className={`px-4 py-2 rounded-xl text-sm font-extrabold border ${
                caseRecord.riskLevel === 'Critical' ? 'bg-red-600 text-white border-red-700' :
                caseRecord.riskLevel === 'High' ? 'bg-orange-500 text-white border-orange-600' :
                caseRecord.riskLevel === 'Moderate' ? 'bg-amber-500 text-white border-amber-600' :
                'bg-emerald-600 text-white border-emerald-700'
              }`}>
                {caseRecord.riskLevel} Risk
              </div>
            </div>

          </div>

          {/* Active Pattern Alerts Banner if any */}
          {caseRecord.patternFlags && caseRecord.patternFlags.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 space-y-2">
              <div className="text-xs font-bold text-amber-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Active Longitudinal Pattern Flags Detected (Flagged for Human Review):</span>
              </div>
              <div className="space-y-1">
                {caseRecord.patternFlags.map((f, i) => (
                  <div key={i} className="text-xs text-amber-800 bg-white/80 p-2 rounded-lg border border-amber-200">
                    <strong>{f.label}:</strong> {f.reason}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Safety Rule Override Notice */}
          {caseRecord.explanation?.safetyRuleApplied && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-xl text-xs text-red-800 font-medium flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
              <span>{caseRecord.explanation.safetyRuleApplied}</span>
            </div>
          )}

          {/* Legacy Counsellor Override Record if present */}
          {caseRecord.counsellorDecision?.riskOverride && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-start gap-2">
              <Scale className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <strong>Manual Risk Override Applied:</strong> Changed from {caseRecord.counsellorDecision.riskOverride.originalRisk} to {caseRecord.counsellorDecision.riskOverride.newRisk}.
                <div className="text-slate-600 mt-0.5">Reason: "{caseRecord.counsellorDecision.riskOverride.overrideReason}"</div>
              </div>
            </div>
          )}
        </div>

        {/* 2-Column Grid: Left Analytics & Explanations, Right Human Decision Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT 2 COLUMNS: Charts, Why this score, Voice features, Transcript, Timeline */}
          <div className="lg:col-span-2 space-y-6">

            {/* SVI Trend and Sub-score Radar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Radar Chart: Subscores */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Sub-Score Breakdown</h4>
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#475569' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                      <Radar name="Score" dataKey="A" stroke="#0d9488" fill="#14b8a6" fillOpacity={0.5} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Line Chart: Longitudinal SVI Trajectory */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Longitudinal SVI Trajectory</h4>
                  <span className="text-[10px] text-slate-400">Day 0 to Day 30</span>
                </div>
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      <Line type="monotone" dataKey="score" stroke="#0d9488" strokeWidth={2.5} dot={{ r: 4, fill: '#0d9488' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* "Why This Score" Explanation Panel */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <span>Clinical "Why This Score" Transparency Matrix</span>
                </h4>
                <span className="text-xs font-mono text-slate-500">
                  Confidence: {((caseRecord.confidence || 0.8) * 100).toFixed(0)}%
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="font-semibold text-slate-700 block mb-1">Top Driving Factors:</span>
                  <ul className="list-disc list-inside space-y-1 text-slate-600">
                    {caseRecord.explanation?.topFactors?.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>

                {caseRecord.explanation?.matchedKeywords && caseRecord.explanation.matchedKeywords.length > 0 && (
                  <div>
                    <span className="font-semibold text-slate-700 block mb-1.5">Matched Multilingual Keywords & Threat Cues:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {caseRecord.explanation.matchedKeywords.map((kw, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 font-mono text-[11px]">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {caseRecord.explanation?.audioCues && caseRecord.explanation.audioCues.length > 0 && (
                  <div>
                    <span className="font-semibold text-slate-700 block mb-1">Acoustic Observations:</span>
                    <ul className="list-disc list-inside space-y-1 text-slate-600">
                      {caseRecord.explanation.audioCues.map((ac, i) => (
                        <li key={i}>{ac}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Extracted Voice Features (if available) */}
            {caseRecord.voiceFeatures && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-teal-600" />
                    <span>Extracted Acoustic Features (DPDP Minimised Vector)</span>
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {caseRecord.voiceFeatures.audioDurationSec}s audio analysed
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Pitch F0</div>
                    <div className="text-base font-bold font-mono text-slate-900">{caseRecord.voiceFeatures.avgPitchHz} Hz</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Pitch Variance</div>
                    <div className="text-base font-bold font-mono text-slate-900">{caseRecord.voiceFeatures.pitchVariance}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Speech Hesitation</div>
                    <div className="text-base font-bold font-mono text-slate-900">{(caseRecord.voiceFeatures.pauseRatio * 100).toFixed(0)}%</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Vocal Tremor</div>
                    <div className="text-base font-bold font-mono text-slate-900">
                      {caseRecord.voiceFeatures.tremorModulationHz > 0 ? `${caseRecord.voiceFeatures.tremorModulationHz} Hz` : 'None'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Transcript / Dialogue History */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-teal-600" />
                <span>Transcript & Intake Dialogue</span>
              </h4>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap">
                {caseRecord.transcript || 'No transcript text available.'}
              </div>
            </div>

            {/* Follow-up Timeline (Day 0, 1, 7, 30) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-teal-600" />
                  <span>30-Day Follow-up & Check-in Schedule</span>
                </h4>
                <Link to="/outbox" className="text-teal-600 text-xs font-semibold hover:underline flex items-center gap-1">
                  <span>View SMS Outbox</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              <div className="space-y-3">
                {followUps.map((fu) => (
                  <div key={fu.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-slate-900">
                        Day {fu.dayNumber}: {fu.question}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        fu.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                        fu.status === 'overdue' ? 'bg-red-100 text-red-800' :
                        'bg-slate-200 text-slate-700'
                      }`}>
                        {fu.status.toUpperCase()}
                      </span>
                    </div>

                    {fu.status === 'completed' && (
                      <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Citizen Response:</span>
                          <span className="font-mono text-teal-700 font-semibold">
                            Assessed Score: {fu.responseScore} ({fu.responseRisk}) | Safety: {fu.safetyRating}/5
                          </span>
                        </div>
                        <p className="text-slate-700 italic">"{fu.response}"</p>
                      </div>
                    )}

                    {fu.status !== 'completed' && (
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>Scheduled: {new Date(fu.scheduledDate).toLocaleDateString()}</span>
                        <Link 
                          to={`/checkin/${fu.token}`} 
                          target="_blank" 
                          className="text-teal-600 hover:underline font-semibold"
                        >
                          Simulate Citizen Response →
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: AI Recommendations & Human Decision Panel */}
          <div className="space-y-6">

            {/* AI Recommendations (Suggestions only) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div>
                <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">AI Prioritization Module</span>
                <h4 className="text-base font-extrabold text-slate-900">Recommended Interventions</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Algorithm recommendations based on SVI, flags, and contextual patterns. A certified counsellor must approve.
                </p>
              </div>

              <div className="space-y-2.5">
                {caseRecord.recommendedActions.map((rec, i) => (
                  <div key={i} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{rec.label}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        rec.priority === 'Immediate' ? 'bg-red-100 text-red-800' :
                        rec.priority === 'Within 24h' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-200 text-slate-700'
                      }`}>
                        {rec.priority}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">{rec.reason}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* MANDATORY HUMAN DECISION PANEL */}
            <div className="bg-gradient-to-b from-slate-900 to-indigo-950 text-white p-6 rounded-2xl border border-slate-800 shadow-md space-y-5">
              
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-teal-400" />
                  <h4 className="text-base font-bold text-white">Human Decision Panel</h4>
                </div>
                <p className="text-xs text-slate-300">
                  "AI prioritizes. Humans decide." Select the actions you authorize. No automated dispatch occurs without your signature.
                </p>
              </div>

              {decisionSuccessMsg && (
                <div className="p-3 bg-teal-900/60 border border-teal-500/50 rounded-xl text-xs text-teal-200 font-medium">
                  {decisionSuccessMsg}
                </div>
              )}

              <form onSubmit={handleSaveDecision} className="space-y-4">
                
                {/* Action Checklist */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                    Assigned Interventions (Click to toggle)
                  </label>
                  
                  <div className="space-y-2">
                    {[
                      { id: 'counselling' as ActionType, label: 'Crisis Trauma Counselling' },
                      { id: 'legal_aid' as ActionType, label: 'Legal Aid / Protection Order' },
                      { id: 'medical_assistance' as ActionType, label: 'Medical / EMT Assistance' },
                      { id: 'police_intervention' as ActionType, label: 'Police Dispatch / Patrol Alert' },
                      { id: 'witness_protection' as ActionType, label: 'Safe Shelter / Witness Protection' }
                    ].map(act => {
                      const checked = assignedActions.includes(act.id);
                      return (
                        <button
                          key={act.id}
                          type="button"
                          onClick={() => toggleAction(act.id)}
                          className={`w-full p-2.5 rounded-xl border text-xs font-semibold text-left flex items-center justify-between transition-all cursor-pointer ${
                            checked 
                              ? 'border-teal-500 bg-teal-500/20 text-teal-200 shadow-sm' 
                              : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <span>{act.label}</span>
                          {checked ? <CheckCircle2 className="w-4 h-4 text-teal-400" /> : <div className="w-4 h-4 rounded border border-slate-700" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Counsellor Notes */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                    Counsellor Clinical Notes & Directives
                  </label>
                  <textarea
                    rows={3}
                    value={counsellorNotes}
                    onChange={(e) => setCounsellorNotes(e.target.value)}
                    placeholder="Enter counsellor intake observations, police station notified, shelter address..."
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Case Status */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                    Update Case Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as CaseStatus)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Escalated">Escalated</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={savingDecision}
                  className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  {savingDecision ? (
                    <span>Recording Decision...</span>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>Record & Authorize Human Decision</span>
                    </>
                  )}
                </button>
              </form>

            </div>

          </div>

        </div>

      </div>

      {/* RISK OVERRIDE MODAL */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-slate-900">
              <Scale className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-bold">Manual Risk Level Override</h3>
            </div>
            <p className="text-xs text-slate-600">
              As a certified counsellor, you have statutory authority to override the AI-computed risk tier. A detailed clinical reason is mandatory and will be logged in the public audit trail.
            </p>

            <form onSubmit={handleOverrideRisk} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">New Risk Level</label>
                <select
                  value={overrideRisk}
                  onChange={(e) => setOverrideRisk(e.target.value as RiskLevel)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  <option value="Low">Low Risk</option>
                  <option value="Moderate">Moderate Risk</option>
                  <option value="High">High Risk</option>
                  <option value="Critical">Critical Risk</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mandatory Override Justification</label>
                <textarea
                  rows={3}
                  required
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Explain why the algorithmic score under/overestimated risk..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 text-xs font-semibold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingOverride || !overrideReason.trim()}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                >
                  {savingOverride ? 'Logging...' : 'Confirm Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DPDP DATA ERASURE MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              <h3 className="text-base font-bold">DPDP Act 2023 - Right to Erasure</h3>
            </div>
            <p className="text-xs text-slate-600">
              Permanently scrubs the citizen's name, phone, raw transcripts, and extracted acoustic feature vectors. The docket number is anonymized for legal auditing.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase">Reason for Erasure Request</label>
              <textarea
                rows={2}
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Citizen statutory request or retention policy expiry..."
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 text-xs font-semibold hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting || !deleteReason.trim()}
                onClick={handleDeleteData}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
              >
                {deleting ? 'Scrubbing Data...' : 'Permanently Erase PII'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
