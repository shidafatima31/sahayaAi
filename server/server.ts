import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import { createServer as createViteServer } from 'vite';

import { getDb, execute, queryAll, queryOne, saveDb } from './db.ts';
import { seedDatabase } from './seed.ts';
import { assessmentEngine } from './services/assessmentEngine.ts';
import { patternEngine } from './services/patternEngine.ts';
import { encryptField, decryptField, maskPhoneNumber } from './services/encryption.ts';
import { docketAdapter } from './services/docketAdapter.ts';
import { analyzeDistressWithGemini } from './services/geminiService.ts';
import { 
  User, 
  Role, 
  CaseRecord, 
  RiskLevel, 
  FollowUpSchedule, 
  AuditLogEntry, 
  SystemSettings 
} from '../src/types/index.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'sahara-ai-nhaa-jwt-token-secret-key-2026';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Simulated time offset in days
let timeOffsetDays = 0;

export function getSimulatedDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() + timeOffsetDays);
  return d;
}

// Real-time SSE Clients
const sseClients: Response[] = [];

function broadcastRealtimeEvent(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (let i = sseClients.length - 1; i >= 0; i--) {
    try {
      sseClients[i].write(payload);
    } catch (e) {
      sseClients.splice(i, 1);
    }
  }
}

// Log audit entry helper
async function logAudit(
  action: string, 
  details: string, 
  user: { id?: string; name?: string; role?: Role } = {}, 
  caseId?: string,
  req?: Request
) {
  try {
    const db = await getDb();
    const id = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = getSimulatedDate().toISOString();
    const ip = req ? (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress : 'internal';
    
    execute(db, `
      INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, case_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      now,
      user.id || 'ANONYMOUS_SYSTEM',
      user.name || 'System Auto-Log',
      user.role || 'citizen',
      action,
      caseId || null,
      details,
      ip
    ]);
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

// Auth Middleware
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: Role;
    district?: string;
  };
}

function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = decoded;
    next();
  });
}

function optionalToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    jwt.verify(token, JWT_SECRET, (_err, decoded: any) => {
      if (decoded) req.user = decoded;
      next();
    });
  } else {
    next();
  }
}

/* ==========================================================================
   API ROUTES
   ========================================================================== */

// 1. REALTIME SSE STREAM
app.get('/api/realtime/stream', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  res.write(`event: connected\ndata: ${JSON.stringify({ message: 'Connected to Sahara AI live queue stream' })}\n\n`);
  sseClients.push(res);

  req.on('close', () => {
    const idx = sseClients.indexOf(res);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

// 2. AUTHENTICATION
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const db = await getDb();
  const user = queryOne(db, 'SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const tokenUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    district: user.district
  };

  const token = jwt.sign(tokenUser, JWT_SECRET, { expiresIn: '7d' });

  await logAudit('LOGIN', `User ${user.email} (${user.role}) logged in successfully`, tokenUser, undefined, req);

  res.json({ token, user: tokenUser });
});

app.get('/api/auth/me', authenticateToken, (req: AuthRequest, res: Response) => {
  res.json({ user: req.user });
});

// 3. CASE INTAKE (Citizen Help Portal)
app.post('/api/cases/intake', optionalToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const {
      name,
      phone,
      district = 'Bengaluru Urban',
      language = 'English',
      channel = 'chat',
      intent = 'Incident',
      consentGiven = true,
      optedOutOfAI = false,
      transcript,
      messages = [],
      voiceFeatures,
      rawAudioStored = false
    } = req.body;

    const callerName = name && name.trim() ? name.trim() : 'Anonymous Citizen';
    const callerPhone = phone && phone.trim() ? phone.trim() : '9800000000';

    // Check repeat caller in database
    const encryptedPhone = encryptField(callerPhone);
    const maskedPhone = maskPhoneNumber(callerPhone);
    const priorCases = queryAll(db, 'SELECT svi_score FROM cases WHERE phone_masked = ?', [maskedPhone]);
    const repeatCaller = priorCases.length > 0;
    const priorCaseCount = priorCases.length;
    const priorSviScores = priorCases.map(c => c.svi_score);

    // Optional Gemini emotion enhancement
    let geminiAnalysis = null;
    if (!optedOutOfAI && transcript) {
      geminiAnalysis = await analyzeDistressWithGemini(transcript, language);
    }

    // Run Rule-Based Assessment Engine
    const assessment = assessmentEngine.assess({
      text: transcript || '',
      voiceFeatures: voiceFeatures || undefined,
      optedOutOfAI,
      context: {
        repeatCaller,
        priorCaseCount,
        priorSviScores
      }
    });

    // If Gemini detected an even higher urgency, safely blend
    if (geminiAnalysis?.enhancedScore && geminiAnalysis.enhancedScore > assessment.sviScore) {
      assessment.explanation.topFactors.unshift(
        `AI Semantic Model flagged acute distress tone: "${geminiAnalysis.sentimentTone || 'Distress'}"`
      );
      if (geminiAnalysis.urgencyIndicators?.length) {
        assessment.explanation.matchedKeywords.push(
          ...geminiAnalysis.urgencyIndicators.map(i => `[AI Detection] ${i}`)
        );
      }
    }

    // Generate Case ID and docket
    const countRow = queryOne(db, 'SELECT COUNT(*) as cnt FROM cases');
    const seq = (countRow?.cnt || 0) + 1001;
    const caseId = `case_${seq}_${Math.random().toString(36).substring(2, 6)}`;
    
    // Legacy NHAA Docket adapter entry
    const docketRecord = await docketAdapter.createDocketEntry(caseId, district);
    const docketNumber = docketRecord.docketNumber;

    const now = getSimulatedDate();
    const createdAt = now.toISOString();

    // Schedule Day 0, Day 1, Day 7, Day 30 follow-up check-ins
    const schedules = patternEngine.generateSchedules(caseId, now);

    // Save Case Record
    execute(db, `
      INSERT INTO cases (
        id, docket_number, citizen_name, phone_encrypted, phone_masked, district,
        language, channel, intent, consent_given, opted_out_of_ai, svi_score,
        risk_level, confidence, sub_scores_json, explanation_json, recommended_actions_json,
        voice_features_json, raw_audio_stored, transcript, messages_json, status,
        counsellor_decision_json, pattern_flags_json, is_flagged_for_review,
        repeat_caller, prior_case_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      caseId,
      docketNumber,
      callerName,
      encryptedPhone,
      maskedPhone,
      district,
      language,
      channel,
      intent,
      consentGiven ? 1 : 0,
      optedOutOfAI ? 1 : 0,
      assessment.sviScore,
      assessment.riskLevel,
      assessment.confidence,
      JSON.stringify(assessment.subScores),
      JSON.stringify(assessment.explanation),
      JSON.stringify(assessment.recommendedActions),
      voiceFeatures ? JSON.stringify(voiceFeatures) : null,
      rawAudioStored ? 1 : 0,
      transcript || '',
      JSON.stringify(messages),
      'Open',
      null,
      JSON.stringify([]),
      assessment.isFlaggedForReview ? 1 : 0,
      repeatCaller ? 1 : 0,
      priorCaseCount,
      createdAt,
      createdAt
    ]);

    // Save Follow-up Schedules & Outbox
    for (const s of schedules) {
      execute(db, `
        INSERT INTO follow_ups (
          id, case_id, day_number, question, scheduled_date, completed_date,
          status, token, response, response_score, response_risk, safety_rating
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        s.id,
        s.caseId,
        s.dayNumber,
        s.question,
        s.scheduledDate,
        null,
        s.status,
        s.token,
        null,
        null,
        null,
        null
      ]);

      execute(db, `
        INSERT INTO outbox (
          id, case_id, recipient_phone, channel, body, link, sent_at, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        `msg_${s.id}`,
        caseId,
        maskedPhone,
        'SMS',
        `NHAA 14566 Follow-up (Day ${s.dayNumber}): ${s.question} Click to respond safely:`,
        `/checkin/${s.token}`,
        s.scheduledDate,
        s.dayNumber === 0 ? 'delivered' : 'pending'
      ]);
    }

    // Audit Log
    await logAudit(
      'CASE_INTAKE',
      `New case created via ${channel}. SVI: ${assessment.sviScore} (${assessment.riskLevel}). OptedOutAI: ${optedOutOfAI}`,
      req.user || { name: callerName, role: 'citizen' },
      caseId,
      req
    );

    // Broadcast SSE to Counsellors
    broadcastRealtimeEvent('NEW_CASE', {
      caseId,
      docketNumber,
      district,
      sviScore: assessment.sviScore,
      riskLevel: assessment.riskLevel,
      intent,
      channel,
      isFlaggedForReview: assessment.isFlaggedForReview
    });

    res.json({
      success: true,
      caseId,
      docketNumber,
      channel,
      nextCheckIn: {
        day: 0,
        question: schedules[0].question,
        token: schedules[0].token,
        scheduledDate: schedules[0].scheduledDate
      },
      emergencyNumbers: [
        { label: 'National Emergency', number: '112' },
        { label: 'NHAA Distress Helpline', number: '14566' },
        { label: 'Women Helpline', number: '1091' },
        { label: 'Domestic Abuse Cell', number: '181' }
      ]
    });
  } catch (err: any) {
    console.error('Case intake error:', err);
    res.status(500).json({ error: 'Failed to submit intake: ' + err.message });
  }
});

// 4. CASE LIST (Counsellor & Admin Dashboard)
app.get('/api/cases', authenticateToken, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  const { risk, status, language, district, flagged, search } = req.query;

  let query = 'SELECT * FROM cases WHERE 1=1';
  const params: any[] = [];

  // District Admin scoping
  if (req.user?.role === 'district_admin' && req.user.district) {
    query += ' AND district = ?';
    params.push(req.user.district);
  } else if (district) {
    query += ' AND district = ?';
    params.push(district);
  }

  if (risk) {
    query += ' AND risk_level = ?';
    params.push(risk);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (language) {
    query += ' AND language = ?';
    params.push(language);
  }
  if (flagged === 'true') {
    query += ' AND is_flagged_for_review = 1';
  }
  if (search) {
    query += ' AND (citizen_name LIKE ? OR docket_number LIKE ? OR transcript LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  // Priority queue: Critical first, then sorted by SVI descending
  query += ` ORDER BY 
    CASE risk_level 
      WHEN 'Critical' THEN 1 
      WHEN 'High' THEN 2 
      WHEN 'Moderate' THEN 3 
      ELSE 4 
    END ASC, 
    svi_score DESC, 
    created_at DESC`;

  const rows = queryAll(db, query, params);

  const formatted = rows.map(r => ({
    id: r.id,
    docketNumber: r.docket_number,
    citizenName: r.citizen_name,
    phoneMasked: r.phone_masked,
    district: r.district,
    language: r.language,
    channel: r.channel,
    intent: r.intent,
    consentGiven: Boolean(r.consent_given),
    optedOutOfAI: Boolean(r.opted_out_of_ai),
    sviScore: r.svi_score,
    riskLevel: r.risk_level,
    confidence: r.confidence,
    subScores: JSON.parse(r.sub_scores_json || '{}'),
    explanation: JSON.parse(r.explanation_json || '{}'),
    recommendedActions: JSON.parse(r.recommended_actions_json || '[]'),
    status: r.status,
    counsellorDecision: r.counsellor_decision_json ? JSON.parse(r.counsellor_decision_json) : null,
    patternFlags: JSON.parse(r.pattern_flags_json || '[]'),
    isFlaggedForReview: Boolean(r.is_flagged_for_review),
    repeatCaller: Boolean(r.repeat_caller),
    priorCaseCount: r.prior_case_count,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }));

  res.json({ cases: formatted });
});

// 5. CASE DETAIL
app.get('/api/cases/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  const caseId = req.params.id;

  const r = queryOne(db, 'SELECT * FROM cases WHERE id = ?', [caseId]);
  if (!r) {
    return res.status(404).json({ error: 'Case not found' });
  }

  const followUps = queryAll(db, 'SELECT * FROM follow_ups WHERE case_id = ? ORDER BY day_number ASC', [caseId]);
  const docketStatus = await docketAdapter.getDocketStatus(r.docket_number);

  const caseData: CaseRecord = {
    id: r.id,
    docketNumber: r.docket_number,
    citizenName: r.citizen_name,
    phoneEncrypted: r.phone_encrypted,
    phoneMasked: r.phone_masked,
    district: r.district,
    language: r.language,
    channel: r.channel,
    intent: r.intent,
    consentGiven: Boolean(r.consent_given),
    optedOutOfAI: Boolean(r.opted_out_of_ai),
    sviScore: r.svi_score,
    riskLevel: r.risk_level,
    confidence: r.confidence,
    subScores: JSON.parse(r.sub_scores_json || '{}'),
    explanation: JSON.parse(r.explanation_json || '{}'),
    recommendedActions: JSON.parse(r.recommended_actions_json || '[]'),
    voiceFeatures: r.voice_features_json ? JSON.parse(r.voice_features_json) : undefined,
    rawAudioStored: Boolean(r.raw_audio_stored),
    transcript: r.transcript,
    messages: JSON.parse(r.messages_json || '[]'),
    status: r.status,
    counsellorDecision: r.counsellor_decision_json ? JSON.parse(r.counsellor_decision_json) : undefined,
    patternFlags: JSON.parse(r.pattern_flags_json || '[]'),
    isFlaggedForReview: Boolean(r.is_flagged_for_review),
    repeatCaller: Boolean(r.repeat_caller),
    priorCaseCount: r.prior_case_count,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };

  res.json({
    case: caseData,
    followUps: followUps.map(fu => ({
      id: fu.id,
      caseId: fu.case_id,
      dayNumber: fu.day_number,
      question: fu.question,
      scheduledDate: fu.scheduled_date,
      completedDate: fu.completed_date,
      status: fu.status,
      token: fu.token,
      response: fu.response,
      responseScore: fu.response_score,
      responseRisk: fu.response_risk,
      safetyRating: fu.safety_rating
    })),
    docketStatus
  });
});

// 6. COUNSELLOR HUMAN DECISION PANEL
app.post('/api/cases/:id/decision', authenticateToken, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  const caseId = req.params.id;
  const { assignedActions = [], actionNotes = '', status = 'In Progress', acceptedRecommendations = [], rejectedRecommendations = [] } = req.body;

  const existing = queryOne(db, 'SELECT * FROM cases WHERE id = ?', [caseId]);
  if (!existing) {
    return res.status(404).json({ error: 'Case not found' });
  }

  const decision = {
    decidedBy: req.user?.name || 'Authorized Counsellor',
    decidedAt: getSimulatedDate().toISOString(),
    assignedActions,
    actionNotes,
    status,
    recommendationsAccepted: acceptedRecommendations,
    recommendationsRejected: rejectedRecommendations
  };

  const now = getSimulatedDate().toISOString();
  execute(db, `
    UPDATE cases 
    SET counsellor_decision_json = ?, status = ?, updated_at = ?
    WHERE id = ?
  `, [JSON.stringify(decision), status, now, caseId]);

  await logAudit(
    'COUNSELLOR_DECISION',
    `Actions assigned: [${assignedActions.join(', ')}]. Status changed to ${status}. Notes: "${actionNotes}"`,
    req.user,
    caseId,
    req
  );

  broadcastRealtimeEvent('CASE_UPDATED', { caseId, status, decision });

  res.json({ success: true, decision });
});

// 7. COUNSELLOR RISK LEVEL OVERRIDE
app.post('/api/cases/:id/override', authenticateToken, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  const caseId = req.params.id;
  const { newRisk, overrideReason } = req.body;

  if (!newRisk || !overrideReason || !overrideReason.trim()) {
    return res.status(400).json({ error: 'New risk level and mandatory justification reason are required.' });
  }

  const existing = queryOne(db, 'SELECT * FROM cases WHERE id = ?', [caseId]);
  if (!existing) {
    return res.status(404).json({ error: 'Case not found' });
  }

  const originalRisk = existing.risk_level;
  const now = getSimulatedDate().toISOString();

  // Load existing decision or create new
  let decision = existing.counsellor_decision_json ? JSON.parse(existing.counsellor_decision_json) : {
    decidedBy: req.user?.name || 'Authorized Counsellor',
    decidedAt: now,
    assignedActions: [],
    actionNotes: '',
    status: existing.status,
    recommendationsAccepted: [],
    recommendationsRejected: []
  };

  decision.riskOverride = {
    originalRisk,
    newRisk,
    overrideReason
  };

  execute(db, `
    UPDATE cases 
    SET risk_level = ?, counsellor_decision_json = ?, updated_at = ?
    WHERE id = ?
  `, [newRisk, JSON.stringify(decision), now, caseId]);

  await logAudit(
    'RISK_OVERRIDE',
    `Manual risk override from ${originalRisk} -> ${newRisk}. Justification: "${overrideReason}"`,
    req.user,
    caseId,
    req
  );

  broadcastRealtimeEvent('CASE_UPDATED', { caseId, riskLevel: newRisk, override: decision.riskOverride });

  res.json({ success: true, originalRisk, newRisk });
});

// 8. CITIZEN FOLLOW-UP CHECK-IN (By Token)
app.get('/api/checkin/:token', async (req: Request, res: Response) => {
  const db = await getDb();
  const { token } = req.params;

  const fu = queryOne(db, 'SELECT * FROM follow_ups WHERE token = ?', [token]);
  if (!fu) {
    return res.status(404).json({ error: 'Check-in link expired or invalid' });
  }

  const caseRec = queryOne(db, 'SELECT id, docket_number, citizen_name, district, language, status FROM cases WHERE id = ?', [fu.case_id]);

  res.json({
    checkIn: {
      id: fu.id,
      dayNumber: fu.day_number,
      question: fu.question,
      scheduledDate: fu.scheduled_date,
      status: fu.status,
      response: fu.response,
      safetyRating: fu.safety_rating,
      completedDate: fu.completed_date
    },
    caseInfo: {
      docketNumber: caseRec?.docket_number,
      citizenName: caseRec?.citizen_name,
      district: caseRec?.district,
      language: caseRec?.language
    }
  });
});

app.post('/api/checkin/:token', async (req: Request, res: Response) => {
  const db = await getDb();
  const { token } = req.params;
  const { responseText = '', safetyRating = 3 } = req.body;

  const fu = queryOne(db, 'SELECT * FROM follow_ups WHERE token = ?', [token]);
  if (!fu) {
    return res.status(404).json({ error: 'Check-in link not found' });
  }

  const caseRecord = queryOne(db, 'SELECT * FROM cases WHERE id = ?', [fu.case_id]);
  if (!caseRecord) {
    return res.status(404).json({ error: 'Case not found' });
  }

  // Score the follow-up response using Pattern Engine
  const { responseScore, responseRisk } = patternEngine.processCheckInResponse(
    {
      id: fu.id,
      caseId: fu.case_id,
      dayNumber: fu.day_number,
      question: fu.question,
      scheduledDate: fu.scheduled_date,
      status: 'completed',
      token
    },
    responseText,
    Number(safetyRating)
  );

  const completedAt = getSimulatedDate().toISOString();

  // Update this follow-up
  execute(db, `
    UPDATE follow_ups 
    SET status = 'completed', completed_date = ?, response = ?, response_score = ?, response_risk = ?, safety_rating = ?
    WHERE token = ?
  `, [completedAt, responseText, responseScore, responseRisk, Number(safetyRating), token]);

  // Append response to case transcript/messages
  const messages = JSON.parse(caseRecord.messages_json || '[]');
  messages.push({
    sender: 'citizen',
    text: `[Day ${fu.day_number} Check-in]: ${responseText} (Safety Rating: ${safetyRating}/5)`,
    timestamp: completedAt
  });

  // Re-run pattern engine across ALL check-ins for this case
  const allFollowUps = queryAll(db, 'SELECT * FROM follow_ups WHERE case_id = ? ORDER BY day_number ASC', [caseRecord.id]);
  const formattedFollowUps: FollowUpSchedule[] = allFollowUps.map(f => ({
    id: f.id,
    caseId: f.case_id,
    dayNumber: f.day_number,
    question: f.question,
    scheduledDate: f.scheduled_date,
    completedDate: f.completed_date,
    status: f.id === fu.id ? 'completed' : f.status,
    token: f.token,
    response: f.id === fu.id ? responseText : f.response,
    responseScore: f.id === fu.id ? responseScore : f.response_score,
    responseRisk: f.id === fu.id ? responseRisk : f.response_risk,
    safetyRating: f.id === fu.id ? Number(safetyRating) : f.safety_rating
  }));

  const patternAnalysis = patternEngine.detectPatterns(
    {
      ...caseRecord,
      sviScore: caseRecord.svi_score,
      riskLevel: caseRecord.risk_level,
      subScores: JSON.parse(caseRecord.sub_scores_json || '{}'),
      explanation: JSON.parse(caseRecord.explanation_json || '{}'),
      recommendedActions: JSON.parse(caseRecord.recommended_actions_json || '[]'),
      messages,
      patternFlags: [],
      isFlaggedForReview: false,
      repeatCaller: Boolean(caseRecord.repeat_caller),
      priorCaseCount: caseRecord.prior_case_count
    } as any,
    formattedFollowUps,
    getSimulatedDate()
  );

  const isFlagged = patternAnalysis.isFlagged || caseRecord.is_flagged_for_review === 1;

  execute(db, `
    UPDATE cases 
    SET messages_json = ?, pattern_flags_json = ?, is_flagged_for_review = ?, updated_at = ?
    WHERE id = ?
  `, [
    JSON.stringify(messages),
    JSON.stringify(patternAnalysis.flags),
    isFlagged ? 1 : 0,
    completedAt,
    caseRecord.id
  ]);

  await logAudit(
    'FOLLOW_UP_RESPONSE',
    `Day ${fu.day_number} check-in completed. Score: ${responseScore} (${responseRisk}). Flags: ${patternAnalysis.flags.length}`,
    { name: caseRecord.citizen_name, role: 'citizen' },
    caseRecord.id,
    req
  );

  broadcastRealtimeEvent('CHECKIN_COMPLETED', {
    caseId: caseRecord.id,
    dayNumber: fu.day_number,
    responseScore,
    flags: patternAnalysis.flags,
    isFlagged
  });

  res.json({
    success: true,
    message: 'Your response has been securely received by the 14566 helpline counsellors.',
    docketNumber: caseRecord.docket_number
  });
});

// 9. OUTBOX SIMULATOR (SMS / WhatsApp)
app.get('/api/outbox', async (_req: Request, res: Response) => {
  const db = await getDb();
  const messages = queryAll(db, 'SELECT * FROM outbox ORDER BY sent_at DESC LIMIT 50');
  res.json({ outbox: messages });
});

// 10. TIME TRAVEL & SCHEDULER SIMULATION
app.post('/api/admin/time-travel', authenticateToken, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  const { advanceDays = 0, reset = false } = req.body;

  if (reset) {
    timeOffsetDays = 0;
  } else {
    timeOffsetDays += Number(advanceDays);
  }

  const simulatedDate = getSimulatedDate();

  // Evaluate all overdue check-ins against new simulated date
  const pendingCheckins = queryAll(db, "SELECT * FROM follow_ups WHERE status = 'pending'");
  let markedOverdueCount = 0;

  for (const chk of pendingCheckins) {
    const sched = new Date(chk.scheduled_date);
    if (sched <= simulatedDate) {
      const diffHours = (simulatedDate.getTime() - sched.getTime()) / (1000 * 60 * 60);
      if (diffHours >= 24) {
        execute(db, "UPDATE follow_ups SET status = 'overdue' WHERE id = ?", [chk.id]);
        markedOverdueCount++;
      }
    }
  }

  // Re-run pattern detector across all cases
  const allCases = queryAll(db, 'SELECT * FROM cases');
  let newlyFlaggedCount = 0;

  for (const c of allCases) {
    const caseFollowUps = queryAll(db, 'SELECT * FROM follow_ups WHERE case_id = ? ORDER BY day_number ASC', [c.id]);
    const formatted: FollowUpSchedule[] = caseFollowUps.map(f => ({
      id: f.id,
      caseId: f.case_id,
      dayNumber: f.day_number,
      question: f.question,
      scheduledDate: f.scheduled_date,
      completedDate: f.completed_date,
      status: f.status,
      token: f.token,
      response: f.response,
      responseScore: f.response_score,
      responseRisk: f.response_risk,
      safetyRating: f.safety_rating
    }));

    const analysis = patternEngine.detectPatterns(
      {
        ...c,
        sviScore: c.svi_score,
        riskLevel: c.risk_level,
        subScores: JSON.parse(c.sub_scores_json || '{}'),
        explanation: JSON.parse(c.explanation_json || '{}'),
        recommendedActions: JSON.parse(c.recommended_actions_json || '[]'),
        messages: JSON.parse(c.messages_json || '[]'),
        patternFlags: [],
        isFlaggedForReview: false,
        repeatCaller: Boolean(c.repeat_caller),
        priorCaseCount: c.prior_case_count
      } as any,
      formatted,
      simulatedDate
    );

    if (analysis.isFlagged) {
      execute(db, `
        UPDATE cases 
        SET pattern_flags_json = ?, is_flagged_for_review = 1 
        WHERE id = ?
      `, [JSON.stringify(analysis.flags), c.id]);
      newlyFlaggedCount++;
    }
  }

  await logAudit(
    'TIME_TRAVEL_SIMULATION',
    `Simulated time advanced by ${advanceDays} days. Simulated Date: ${simulatedDate.toISOString()}. Overdue marked: ${markedOverdueCount}. Flagged: ${newlyFlaggedCount}`,
    req.user,
    undefined,
    req
  );

  broadcastRealtimeEvent('TIME_TRAVEL_TRIGGERED', {
    timeOffsetDays,
    simulatedDate: simulatedDate.toISOString(),
    markedOverdueCount,
    newlyFlaggedCount
  });

  res.json({
    success: true,
    timeOffsetDays,
    simulatedDate: simulatedDate.toISOString(),
    markedOverdueCount,
    newlyFlaggedCount
  });
});

// 11. ANALYTICS & KPIS (District & State Dashboards)
app.get('/api/analytics/kpis', authenticateToken, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  let districtFilter = '';
  const params: any[] = [];

  if (req.user?.role === 'district_admin' && req.user.district) {
    districtFilter = ' AND district = ?';
    params.push(req.user.district);
  }

  const totalCasesRow = queryOne(db, `SELECT COUNT(*) as cnt FROM cases WHERE 1=1 ${districtFilter}`, params);
  const criticalOpenRow = queryOne(db, `SELECT COUNT(*) as cnt FROM cases WHERE risk_level = 'Critical' AND status != 'Resolved' AND status != 'Closed' ${districtFilter}`, params);
  const avgSviRow = queryOne(db, `SELECT AVG(svi_score) as avg_svi FROM cases WHERE 1=1 ${districtFilter}`, params);
  
  // Follow-up completion rate
  let fuQuery = `SELECT 
    COUNT(*) as total_fu,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_fu
    FROM follow_ups fu
    JOIN cases c ON fu.case_id = c.id
    WHERE 1=1 ${districtFilter.replace(/district =/g, 'c.district =')}`;
  const fuRow = queryOne(db, fuQuery, params);

  const totalFU = fuRow?.total_fu || 1;
  const completedFU = fuRow?.completed_fu || 0;
  const fuCompletionRate = Math.round((completedFU / totalFU) * 100);

  // Average response time simulation (minutes)
  const avgResponseTimeMin = 14.5;

  res.json({
    totalCases: totalCasesRow?.cnt || 0,
    criticalOpen: criticalOpenRow?.cnt || 0,
    avgSvi: Math.round(avgSviRow?.avg_svi || 0),
    avgResponseTimeMin,
    fuCompletionRate
  });
});

app.get('/api/analytics/districts', authenticateToken, async (_req: AuthRequest, res: Response) => {
  const db = await getDb();
  const rows = queryAll(db, `
    SELECT 
      district,
      COUNT(*) as total,
      SUM(CASE WHEN risk_level = 'Critical' THEN 1 ELSE 0 END) as critical,
      SUM(CASE WHEN risk_level = 'High' THEN 1 ELSE 0 END) as high,
      SUM(CASE WHEN risk_level = 'Moderate' THEN 1 ELSE 0 END) as moderate,
      SUM(CASE WHEN risk_level = 'Low' THEN 1 ELSE 0 END) as low,
      AVG(svi_score) as avg_svi,
      SUM(CASE WHEN is_flagged_for_review = 1 THEN 1 ELSE 0 END) as flagged
    FROM cases
    GROUP BY district
    ORDER BY total DESC
  `);

  res.json({
    districts: rows.map(r => ({
      district: r.district,
      total: r.total,
      critical: r.critical,
      high: r.high,
      moderate: r.moderate,
      low: r.low,
      avgSvi: Math.round(r.avg_svi || 0),
      flagged: r.flagged
    }))
  });
});

app.get('/api/analytics/trends', authenticateToken, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  let districtFilter = '';
  const params: any[] = [];
  if (req.user?.role === 'district_admin' && req.user.district) {
    districtFilter = ' AND district = ?';
    params.push(req.user.district);
  }

  // Risk Distribution
  const riskRows = queryAll(db, `
    SELECT risk_level, COUNT(*) as count 
    FROM cases 
    WHERE 1=1 ${districtFilter} 
    GROUP BY risk_level
  `, params);

  // Top reasons for escalation / flags
  const flaggedCases = queryAll(db, `
    SELECT pattern_flags_json, explanation_json 
    FROM cases 
    WHERE is_flagged_for_review = 1 ${districtFilter}
  `, params);

  const reasonsCount: Record<string, number> = {
    'Self-Harm / Suicide Risk': 0,
    'Threat to Life / Severe Abuse': 0,
    'Silence / Seized Phone Pattern': 0,
    'SVI Escalation (+15 pts)': 0,
    'Support Deficit on Day 30': 0,
    'Weapon Mention': 0
  };

  for (const fc of flaggedCases) {
    const flags = JSON.parse(fc.pattern_flags_json || '[]');
    const expl = JSON.parse(fc.explanation_json || '{}');
    
    for (const f of flags) {
      if (f.code === 'RISING_SVI') reasonsCount['SVI Escalation (+15 pts)']++;
      if (f.code === 'CONSECUTIVE_SILENCE') reasonsCount['Silence / Seized Phone Pattern']++;
      if (f.code === 'SUPPORT_NOT_RECEIVED') reasonsCount['Support Deficit on Day 30']++;
      if (f.code === 'NEW_THREAT') reasonsCount['Threat to Life / Severe Abuse']++;
    }

    if (expl.safetyRuleApplied?.includes('Suicide')) {
      reasonsCount['Self-Harm / Suicide Risk']++;
    }
  }

  const escalationReasons = Object.entries(reasonsCount).map(([reason, count]) => ({
    reason,
    count: Math.max(1, count)
  })).sort((a, b) => b.count - a.count);

  res.json({
    riskDistribution: riskRows,
    escalationReasons
  });
});

// 12. AUDIT LOGS
app.get('/api/audit-logs', authenticateToken, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  const { action, userId, limit = 100 } = req.query;

  let sql = 'SELECT * FROM audit_logs WHERE 1=1';
  const params: any[] = [];

  if (action) {
    sql += ' AND action = ?';
    params.push(action);
  }
  if (userId) {
    sql += ' AND user_id = ?';
    params.push(userId);
  }

  sql += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(Number(limit));

  const logs = queryAll(db, sql, params);
  res.json({ logs });
});

// 13. SETTINGS & DPDP ACT 2023 COMPLIANCE
app.get('/api/settings', async (_req: Request, res: Response) => {
  const db = await getDb();
  const rows = queryAll(db, 'SELECT key, value FROM system_settings');
  const settingsMap: Record<string, any> = {};
  for (const r of rows) {
    try {
      settingsMap[r.key] = JSON.parse(r.value);
    } catch {
      settingsMap[r.key] = r.value;
    }
  }
  settingsMap['timeOffsetDays'] = timeOffsetDays;
  settingsMap['simulatedCurrentDate'] = getSimulatedDate().toISOString();
  res.json(settingsMap);
});

app.post('/api/settings', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'state_admin' && req.user?.role !== 'district_admin') {
    return res.status(403).json({ error: 'Administrative privileges required.' });
  }

  const db = await getDb();
  const { weights, thresholds, retention_days } = req.body;

  if (weights) {
    execute(db, "INSERT OR REPLACE INTO system_settings (key, value) VALUES ('weights', ?)", [JSON.stringify(weights)]);
  }
  if (thresholds) {
    execute(db, "INSERT OR REPLACE INTO system_settings (key, value) VALUES ('thresholds', ?)", [JSON.stringify(thresholds)]);
  }
  if (retention_days) {
    execute(db, "INSERT OR REPLACE INTO system_settings (key, value) VALUES ('retention_days', ?)", [JSON.stringify(retention_days)]);
  }

  await logAudit('SETTINGS_UPDATED', 'System scoring weights or thresholds updated', req.user, undefined, req);

  res.json({ success: true });
});

// DPDP Right to be Forgotten (Erase citizen data)
app.post('/api/dpdp/delete-data', authenticateToken, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  const { caseId, confirmationReason } = req.body;

  if (!caseId) {
    return res.status(400).json({ error: 'Case ID required for erasure request' });
  }

  // Anonymize & scrub PII under DPDP Act 2023
  execute(db, `
    UPDATE cases 
    SET citizen_name = 'REDACTED (DPDP Erased)',
        phone_encrypted = '',
        phone_masked = '+91 **********',
        transcript = '[REDACTED UNDER CITIZEN RIGHT TO ERASURE - DPDP ACT 2023]',
        messages_json = '[]',
        voice_features_json = null,
        raw_audio_stored = 0
    WHERE id = ?
  `, [caseId]);

  execute(db, 'DELETE FROM follow_ups WHERE case_id = ?', [caseId]);
  execute(db, 'DELETE FROM outbox WHERE case_id = ?', [caseId]);

  await logAudit(
    'DPDP_DATA_ERASURE',
    `Right to erasure executed for ${caseId}. Reason: ${confirmationReason || 'Citizen statutory request'}.`,
    req.user,
    caseId,
    req
  );

  broadcastRealtimeEvent('CASE_UPDATED', { caseId, deleted: true });

  res.json({ success: true, message: 'All citizen PII, transcripts, and voice feature vectors have been permanently scrubbed.' });
});

// CSV Export for State / District Administration
app.get('/api/export/csv', authenticateToken, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  const type = req.query.type || 'cases';

  if (type === 'cases') {
    const rows = queryAll(db, `
      SELECT id, docket_number, citizen_name, phone_masked, district, language, channel, 
             intent, svi_score, risk_level, confidence, status, is_flagged_for_review, created_at
      FROM cases 
      ORDER BY created_at DESC
    `);

    let csv = 'ID,Docket Number,Citizen Name,Phone,District,Language,Channel,Intent,SVI Score,Risk Level,Confidence,Status,Flagged,Created At\n';
    for (const r of rows) {
      csv += `"${r.id}","${r.docket_number}","${r.citizen_name}","${r.phone_masked}","${r.district}","${r.language}","${r.channel}","${r.intent}",${r.svi_score},"${r.risk_level}",${r.confidence},"${r.status}",${r.is_flagged_for_review},"${r.created_at}"\n`;
    }

    res.header('Content-Type', 'text/csv');
    res.attachment(`sahara_cases_report_${new Date().toISOString().slice(0, 10)}.csv`);
    return res.send(csv);
  } else {
    const logs = queryAll(db, 'SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 500');
    let csv = 'ID,Timestamp,User ID,User Name,Role,Action,Case ID,Details,IP\n';
    for (const l of logs) {
      csv += `"${l.id}","${l.timestamp}","${l.user_id}","${l.user_name}","${l.user_role}","${l.action}","${l.case_id || ''}","${(l.details || '').replace(/"/g, '""')}","${l.ip_address || ''}"\n`;
    }

    res.header('Content-Type', 'text/csv');
    res.attachment(`sahara_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    return res.send(csv);
  }
});

/* ==========================================================================
   SERVER INITIALIZATION & VITE MIDDLEWARE
   ========================================================================== */

async function startServer() {
  // 1. Initialize SQLite and seed data
  await seedDatabase();

  // 2. Setup periodic follow-up cron (runs every 10 minutes to check overdue)
  cron.schedule('*/10 * * * *', async () => {
    try {
      const db = await getDb();
      const now = getSimulatedDate();
      const pendings = queryAll(db, "SELECT * FROM follow_ups WHERE status = 'pending'");
      for (const p of pendings) {
        if (new Date(p.scheduled_date) < now) {
          execute(db, "UPDATE follow_ups SET status = 'overdue' WHERE id = ?", [p.id]);
        }
      }
    } catch (e) {
      console.error('Error in follow-up cron:', e);
    }
  });

  // 3. Mount Vite middleware for dev or serve dist in prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, '../dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`  Sahara AI Helpline (NHAA 14566) - SIH 2026`);
    console.log(`  Dev server running on http://0.0.0.0:${PORT}`);
    console.log(`  Demo Accounts:`);
    console.log(`  - Citizen:    citizen@demo.in / Demo@1234`);
    console.log(`  - Counsellor: counsellor@demo.in / Demo@1234`);
    console.log(`  - District:   district@demo.in / Demo@1234`);
    console.log(`  - State:      state@demo.in / Demo@1234`);
    console.log(`======================================================\n`);
  });
}

startServer().catch(err => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
