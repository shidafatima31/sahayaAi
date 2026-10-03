// Shared types for Sahara AI
export type Role = 'citizen' | 'counsellor' | 'district_admin' | 'state_admin';

export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Critical';

export type IntentType = 'Inquiry' | 'Incident' | 'Distress';

export type ChannelType = 'chat' | 'voice' | 'ivrs' | 'direct';

export type ActionType = 
  | 'counselling' 
  | 'legal_aid' 
  | 'medical_assistance' 
  | 'police_intervention' 
  | 'witness_protection';

export type CaseStatus = 'Open' | 'In Progress' | 'Escalated' | 'Resolved' | 'Closed';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  district?: string;
}

export interface VoiceFeatures {
  avgPitchHz: number;
  pitchVariance: number;
  pauseRatio: number;
  pauseDurationSec: number;
  speechRateProxy: number;
  rmsAmplitude: number;
  tremorModulationHz: number;
  audioDurationSec: number;
}

export interface SubScores {
  voiceStress: number;   // 0 - 100
  textEmotion: number;   // 0 - 100
  redFlags: number;      // 0 - 100
  context: number;       // 0 - 100
}

export interface ScoreExplanation {
  topFactors: string[];
  matchedKeywords: string[];
  audioCues: string[];
  safetyRuleApplied?: string;
  breakdownSummary: string;
}

export interface RecommendedAction {
  action: ActionType;
  label: string;
  priority: 'Immediate' | 'Within 24h' | 'Within 48h' | 'Routine';
  reason: string;
}

export interface PatternFlag {
  code: 'RISING_SVI' | 'CONSECUTIVE_SILENCE' | 'NEW_THREAT' | 'SUPPORT_NOT_RECEIVED';
  label: string;
  severity: 'warning' | 'critical';
  reason: string;
  detectedAt: string;
}

export interface FollowUpSchedule {
  id: string;
  caseId: string;
  dayNumber: number; // 0, 1, 7, 30
  question: string;
  scheduledDate: string;
  completedDate?: string;
  status: 'pending' | 'completed' | 'overdue' | 'missed';
  token: string;
  response?: string;
  responseScore?: number;
  responseRisk?: RiskLevel;
  safetyRating?: number; // 1-5 rating of how safe they feel
}

export interface CounsellorDecision {
  decidedBy: string;
  decidedAt: string;
  assignedActions: ActionType[];
  actionNotes: string;
  status: CaseStatus;
  riskOverride?: {
    originalRisk: RiskLevel;
    newRisk: RiskLevel;
    overrideReason: string;
  };
  recommendationsAccepted: string[];
  recommendationsRejected: string[];
}

export interface CaseRecord {
  id: string;
  docketNumber: string;
  citizenName: string;
  phoneEncrypted: string;
  phoneMasked: string;
  district: string;
  language: string;
  channel: ChannelType;
  intent: IntentType;
  consentGiven: boolean;
  optedOutOfAI: boolean;
  
  // SVI and scoring
  sviScore: number; // 0 - 100
  riskLevel: RiskLevel;
  confidence: number; // 0.0 - 1.0
  subScores: SubScores;
  explanation: ScoreExplanation;
  recommendedActions: RecommendedAction[];
  
  // Audio details (features stored, raw discarded under DPDP)
  voiceFeatures?: VoiceFeatures;
  rawAudioStored: boolean;
  
  // Content
  transcript: string;
  messages: Array<{
    sender: 'citizen' | 'bot' | 'agent';
    text: string;
    timestamp: string;
  }>;
  
  // State
  status: CaseStatus;
  counsellorDecision?: CounsellorDecision;
  patternFlags: PatternFlag[];
  isFlaggedForReview: boolean;
  repeatCaller: boolean;
  priorCaseCount: number;
  
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: Role;
  action: string;
  caseId?: string;
  details: string;
  ipAddress?: string;
}

export interface SystemSettings {
  weights: {
    voice: number;
    text: number;
    redFlags: number;
    context: number;
  };
  thresholds: {
    moderate: number;
    high: number;
    critical: number;
  };
  retentionDays: number;
  simulatedCurrentDate?: string;
}

export interface OutboxMessage {
  id: string;
  caseId: string;
  recipientPhone: string;
  channel: 'SMS' | 'WhatsApp';
  body: string;
  link: string;
  sentAt: string;
  status: 'delivered' | 'read' | 'pending';
}
