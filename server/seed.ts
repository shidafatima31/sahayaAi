import bcrypt from 'bcryptjs';
import { getDb, execute, queryOne, saveDb } from './db.ts';
import { encryptField, maskPhoneNumber } from './services/encryption.ts';
import { assessmentEngine } from './services/assessmentEngine.ts';
import { patternEngine } from './services/patternEngine.ts';
import { CaseRecord, RiskLevel, FollowUpSchedule, ChannelType, IntentType } from '../src/types/index.ts';

const DISTRICTS = [
  'Bengaluru Urban',
  'Mysuru',
  'Belagavi',
  'Dakshina Kannada',
  'Kalaburagi',
  'Hubballi-Dharwad'
];

const LANGUAGES = ['English', 'Hindi', 'Kannada'];

interface SeedTemplate {
  name: string;
  phone: string;
  district: string;
  language: string;
  channel: ChannelType;
  intent: IntentType;
  transcript: string;
  status: 'Open' | 'In Progress' | 'Escalated' | 'Resolved';
  voiceFeatures?: {
    avgPitchHz: number;
    pitchVariance: number;
    pauseRatio: number;
    pauseDurationSec: number;
    speechRateProxy: number;
    rmsAmplitude: number;
    tremorModulationHz: number;
    audioDurationSec: number;
  };
  patternScenario?: 'worsening' | 'silence' | 'support_deficit' | 'new_threat';
  daysAgo: number;
  repeatCaller?: boolean;
  priorCaseCount?: number;
}

const SEED_TEMPLATES: SeedTemplate[] = [
  // 1. Critical Self-Harm Scenario (Demo Scenario 3)
  {
    name: 'Ananya Sharma',
    phone: '9845012345',
    district: 'Bengaluru Urban',
    language: 'Hindi',
    channel: 'voice',
    intent: 'Distress',
    transcript: 'Mujhe samajh nahi aa raha main kya karu... he beats me everyday, locked me in the room without food. Mujhe lagta hai mujhe mar jana chahti hu, I cannot live anymore. Please help me...',
    status: 'Open',
    daysAgo: 0,
    repeatCaller: true,
    priorCaseCount: 2,
    voiceFeatures: {
      avgPitchHz: 285,
      pitchVariance: 3200,
      pauseRatio: 0.48,
      pauseDurationSec: 4.2,
      speechRateProxy: 1.4,
      rmsAmplitude: 0.18,
      tremorModulationHz: 7.8,
      audioDurationSec: 18.5
    }
  },
  // 2. Worsening Case over 30 Days (Demo Scenario 4)
  {
    name: 'Lakshmi Gowda',
    phone: '9448123456',
    district: 'Mysuru',
    language: 'Kannada',
    channel: 'chat',
    intent: 'Incident',
    transcript: 'Nanna ganda tumba kopa madthare, money kottilla, verbally abuse madthare. I want some counselling advice.',
    status: 'Escalated',
    daysAgo: 32,
    repeatCaller: false,
    priorCaseCount: 0,
    patternScenario: 'worsening'
  },
  // 3. Moderate Distress (Demo Scenario 2)
  {
    name: 'Priyanka Patel',
    phone: '9980234567',
    district: 'Bengaluru Urban',
    language: 'English',
    channel: 'chat',
    intent: 'Incident',
    transcript: 'My in-laws are restricting my movements and constantly taunting me for dowry. I am extremely anxious and scared about what might happen next. Need legal advice on my rights.',
    status: 'In Progress',
    daysAgo: 2,
    repeatCaller: false,
    priorCaseCount: 0
  },
  // 4. Low-Risk Inquiry (Demo Scenario 1)
  {
    name: 'Sunita Reddy',
    phone: '9741345678',
    district: 'Bengaluru Urban',
    language: 'English',
    channel: 'chat',
    intent: 'Inquiry',
    transcript: 'Hello, I want information regarding government protection orders and free legal aid provisions under the DV Act for a friend in distress.',
    status: 'Resolved',
    daysAgo: 5,
    repeatCaller: false,
    priorCaseCount: 0
  },
  // 5. Silence / Phone Seizure Pattern Case
  {
    name: 'Deepa Hegde',
    phone: '9632456789',
    district: 'Dakshina Kannada',
    language: 'Kannada',
    channel: 'voice',
    intent: 'Distress',
    transcript: 'Avaru mobile kithukondiddare, locked me inside. Heluvudakke yaaru illa.',
    status: 'Escalated',
    daysAgo: 10,
    repeatCaller: true,
    priorCaseCount: 1,
    patternScenario: 'silence',
    voiceFeatures: {
      avgPitchHz: 260,
      pitchVariance: 2400,
      pauseRatio: 0.42,
      pauseDurationSec: 3.5,
      speechRateProxy: 2.1,
      rmsAmplitude: 0.15,
      tremorModulationHz: 6.2,
      audioDurationSec: 14.0
    }
  },
  // 6. Support Deficit Case (Day 30 promise broken)
  {
    name: 'Kavitha Patil',
    phone: '9148567890',
    district: 'Belagavi',
    language: 'Marathi',
    channel: 'ivrs',
    intent: 'Incident',
    transcript: 'Severe physical aggression from spouse, police was supposed to visit and counselling promised.',
    status: 'Escalated',
    daysAgo: 31,
    repeatCaller: false,
    priorCaseCount: 0,
    patternScenario: 'support_deficit'
  },
  // 7. Critical Threat with Weapon
  {
    name: 'Rukmini Kulkarni',
    phone: '9844678901',
    district: 'Hubballi-Dharwad',
    language: 'Kannada',
    channel: 'voice',
    intent: 'Distress',
    transcript: 'He brought a knife today and threatened he will kill me if I step outside the house. Raktha barthide, he hit my shoulder with iron rod. Send police fast!',
    status: 'Open',
    daysAgo: 0,
    repeatCaller: true,
    priorCaseCount: 3,
    voiceFeatures: {
      avgPitchHz: 310,
      pitchVariance: 4100,
      pauseRatio: 0.35,
      pauseDurationSec: 2.1,
      speechRateProxy: 6.2,
      rmsAmplitude: 0.32,
      tremorModulationHz: 9.4,
      audioDurationSec: 12.8
    }
  },
  // 8. Hindi Distress - Confinement
  {
    name: 'Meena Devi',
    phone: '9480789012',
    district: 'Kalaburagi',
    language: 'Hindi',
    channel: 'ivrs',
    intent: 'Distress',
    transcript: 'Mujhe kamre me band kar diya hai, phone cheen liya tha abhi chupke se call kar rahi hu. Bachao mujhe!',
    status: 'Open',
    daysAgo: 1,
    repeatCaller: false,
    priorCaseCount: 0
  },
  // 9. Kannada Moderate Domestic Neglect
  {
    name: 'Shwetha Bhat',
    phone: '9900890123',
    district: 'Dakshina Kannada',
    language: 'Kannada',
    channel: 'chat',
    intent: 'Incident',
    transcript: 'Mane olage tension ide. Oota kodadilla, mental pressure hakthare. Counsellor jothe mathadbeku.',
    status: 'In Progress',
    daysAgo: 3,
    repeatCaller: false,
    priorCaseCount: 0
  },
  // 10. English Inquiry on Women's Helpline
  {
    name: 'Aarti Menon',
    phone: '9739901234',
    district: 'Bengaluru Urban',
    language: 'English',
    channel: 'chat',
    intent: 'Inquiry',
    transcript: 'Can someone tell me the procedure for registering a complaint at the local women police station without escalating immediately to FIR?',
    status: 'Resolved',
    daysAgo: 7,
    repeatCaller: false,
    priorCaseCount: 0
  }
];

// Generate additional 35 diverse realistic cases to reach 45+ cases across all 6 districts
function generateAdditionalTemplates(): SeedTemplate[] {
  const extra: SeedTemplate[] = [];
  const firstNames = ['Fatima', 'Sneha', 'Geetha', 'Archana', 'Nandini', 'Pooja', 'Shilpa', 'Bharathi', 'Shabana', 'Manjula', 'Divya', 'Saraswathi', 'Radha', 'Kiran', 'Vidya', 'Roopa', 'Amina', 'Suma', 'Sudha', 'Pallavi', 'Tanuja', 'Hema', 'Asha', 'Vandana', 'Pushpa', 'Girija', 'Chaitra', 'Kusuma', 'Sujatha', 'Renuka', 'Usha', 'Gowri', 'Rehana', 'Mamata', 'Varsha'];
  const lastNames = ['Rao', 'Bhat', 'Shetty', 'Kumar', 'Naik', 'Deshmukh', 'Khan', 'Jadhav', 'Biradar', 'Hosamani', 'Patil', 'Swamy', 'Joshi', 'Hebbar', 'Gowda'];

  const sampleTranscripts = [
    { text: 'Facing severe physical harassment by my husband and his brother. Bruises on my hand. Need police intervention.', intent: 'Distress' as const, riskHint: 'High' },
    { text: 'Frequent shouting and financial control. They take my salary and do not give money for basic expenses.', intent: 'Incident' as const, riskHint: 'Moderate' },
    { text: 'I want to inquire about shelter homes in Mysuru district for emergency stay.', intent: 'Inquiry' as const, riskHint: 'Low' },
    { text: 'Bahut gussa karte hain, gaaliyaan dete hain roz. Chinta aur darr lag raha hai.', intent: 'Incident' as const, riskHint: 'Moderate' },
    { text: 'Gala daba diya kal raat. He said he will burn me alive. Police ko bhejo turant!', intent: 'Distress' as const, riskHint: 'Critical' },
    { text: 'Nanna ganda daily kudi madtane hodedaru. Police station ge complaint kodbeku.', intent: 'Incident' as const, riskHint: 'High' },
    { text: 'What is the compensation scheme for victims under Karnataka state victim welfare fund?', intent: 'Inquiry' as const, riskHint: 'Low' },
    { text: 'Locked me inside the store room without water since morning. Won\'t let me leave.', intent: 'Distress' as const, riskHint: 'High' },
    { text: 'Roz roz ke jhagde se thak chuki hu. Darr lagta hai kahi mujhe kuch kar na de.', intent: 'Incident' as const, riskHint: 'Moderate' },
    { text: 'Aatmahatye madabeku antha anustide. Yaaru nanna mata kelalla. Help me.', intent: 'Distress' as const, riskHint: 'Critical' }
  ];

  for (let i = 0; i < 35; i++) {
    const fName = firstNames[i % firstNames.length];
    const lName = lastNames[i % lastNames.length];
    const district = DISTRICTS[i % DISTRICTS.length];
    const lang = LANGUAGES[i % LANGUAGES.length];
    const channel: ChannelType = (['chat', 'voice', 'ivrs', 'direct'] as ChannelType[])[i % 4];
    const tItem = sampleTranscripts[i % sampleTranscripts.length];
    const daysAgo = (i * 2) % 28;

    const hasVoice = channel === 'voice' || channel === 'ivrs';
    const isHighOrCritical = tItem.riskHint === 'High' || tItem.riskHint === 'Critical';

    extra.push({
      name: `${fName} ${lName}`,
      phone: `9${Math.floor(100000000 + Math.random() * 899999999)}`,
      district,
      language: lang,
      channel,
      intent: tItem.intent,
      transcript: tItem.text,
      status: i % 5 === 0 ? 'Resolved' : i % 3 === 0 ? 'In Progress' : 'Open',
      daysAgo,
      repeatCaller: i % 4 === 0,
      priorCaseCount: i % 4 === 0 ? Math.floor(Math.random() * 3) + 1 : 0,
      voiceFeatures: hasVoice ? {
        avgPitchHz: isHighOrCritical ? 270 : 210,
        pitchVariance: isHighOrCritical ? 2800 : 750,
        pauseRatio: isHighOrCritical ? 0.42 : 0.18,
        pauseDurationSec: isHighOrCritical ? 3.4 : 1.1,
        speechRateProxy: isHighOrCritical ? 5.8 : 3.4,
        rmsAmplitude: 0.22,
        tremorModulationHz: isHighOrCritical ? 7.2 : 0,
        audioDurationSec: 15.0
      } : undefined
    });
  }

  return extra;
}

export async function seedDatabase(): Promise<void> {
  const db = await getDb();

  // Check if users already seeded
  const userCheck = queryOne(db, 'SELECT COUNT(*) as cnt FROM users');
  if (userCheck && userCheck.cnt > 0) {
    console.log('Database already seeded. Skipping initial seeding.');
    return;
  }

  console.log('Seeding Sahara AI database with demo accounts and 45+ cases...');

  const passwordHash = await bcrypt.hash('Demo@1234', 10);
  const now = new Date().toISOString();

  // 1. Seed Demo Accounts
  const users = [
    { id: 'usr_citizen', email: 'citizen@demo.in', name: 'Citizen Caller (Demo)', role: 'citizen', district: 'Bengaluru Urban' },
    { id: 'usr_counsellor', email: 'counsellor@demo.in', name: 'Dr. Radhika Sen (Senior Counsellor)', role: 'counsellor', district: 'Bengaluru Urban' },
    { id: 'usr_district', email: 'district@demo.in', name: 'R. K. Verma (District Magistrate / Officer)', role: 'district_admin', district: 'Bengaluru Urban' },
    { id: 'usr_state', email: 'state@demo.in', name: 'Dr. Anita Deshmukh (State Directorate NHAA)', role: 'state_admin', district: 'Karnataka State' }
  ];

  for (const u of users) {
    execute(db, `
      INSERT INTO users (id, email, password_hash, name, role, district, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [u.id, u.email, passwordHash, u.name, u.role, u.district, now]);
  }

  // 2. Combine templates
  const allTemplates = [...SEED_TEMPLATES, ...generateAdditionalTemplates()];

  let caseCounter = 1001;

  for (const t of allTemplates) {
    const caseId = `case_${caseCounter}`;
    const docketNum = `NHAA-2026-${caseCounter}`;
    caseCounter++;

    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - t.daysAgo);
    const createdAt = baseDate.toISOString();

    // Run assessment engine
    const assessment = assessmentEngine.assess({
      text: t.transcript,
      voiceFeatures: t.voiceFeatures,
      context: {
        repeatCaller: t.repeatCaller,
        priorCaseCount: t.priorCaseCount,
        priorSviScores: t.repeatCaller ? [55, 68] : []
      }
    });

    // Schedule check-ins (Day 0, Day 1, Day 7, Day 30)
    const schedules = patternEngine.generateSchedules(caseId, baseDate);

    // Apply specific pattern scenarios if requested
    if (t.patternScenario === 'worsening') {
      // Day 0: moderate
      schedules[0].status = 'completed';
      schedules[0].completedDate = new Date(baseDate.getTime() + 10 * 60000).toISOString();
      schedules[0].response = 'Situation is somewhat tense, hoping counselling helps.';
      schedules[0].responseScore = 42;
      schedules[0].responseRisk = 'Moderate';
      schedules[0].safetyRating = 3;

      // Day 1: higher
      const day1Date = new Date(baseDate);
      day1Date.setDate(day1Date.getDate() + 1);
      schedules[1].status = 'completed';
      schedules[1].completedDate = day1Date.toISOString();
      schedules[1].response = 'Situation worsened. He came drunk and threatened me with violence.';
      schedules[1].responseScore = 65;
      schedules[1].responseRisk = 'High';
      schedules[1].safetyRating = 2;

      // Day 7: jump +20
      const day7Date = new Date(baseDate);
      day7Date.setDate(day7Date.getDate() + 7);
      schedules[2].status = 'completed';
      schedules[2].completedDate = day7Date.toISOString();
      schedules[2].response = 'Extremely dangerous now. He hit me with a stick, broke my arm. Said he will kill me.';
      schedules[2].responseScore = 88;
      schedules[2].responseRisk = 'Critical';
      schedules[2].safetyRating = 1;

      // Day 30: pending
      schedules[3].status = 'pending';
    } else if (t.patternScenario === 'silence') {
      // Day 0: completed
      schedules[0].status = 'completed';
      schedules[0].completedDate = new Date(baseDate.getTime() + 10 * 60000).toISOString();
      schedules[0].response = 'Scared in the room.';
      schedules[0].responseScore = 60;
      schedules[0].safetyRating = 2;

      // Day 1 & Day 7: missed/overdue
      schedules[1].status = 'overdue';
      schedules[2].status = 'overdue';
      schedules[3].status = 'pending';
    } else if (t.patternScenario === 'support_deficit') {
      // Day 0, 1, 7, 30 all completed
      schedules[0].status = 'completed';
      schedules[0].response = 'Reported severe issue';
      schedules[0].responseScore = 70;

      schedules[1].status = 'completed';
      schedules[1].response = 'Waiting for police team';
      schedules[1].responseScore = 68;

      schedules[2].status = 'completed';
      schedules[2].response = 'Still nobody came';
      schedules[2].responseScore = 72;

      schedules[3].status = 'completed';
      schedules[3].response = 'Nobody contacted me, no support received from legal or police. I am completely abandoned.';
      schedules[3].responseScore = 85;
      schedules[3].safetyRating = 1;
    } else if (t.daysAgo >= 8) {
      // Normal older case: Day 0 and Day 1 completed
      schedules[0].status = 'completed';
      schedules[0].completedDate = new Date(baseDate.getTime() + 10 * 60000).toISOString();
      schedules[0].response = 'Thank you for following up. Feeling slightly safer today.';
      schedules[0].responseScore = Math.max(15, assessment.sviScore - 15);
      schedules[0].safetyRating = 4;

      schedules[1].status = 'completed';
      schedules[1].completedDate = new Date(baseDate.getTime() + 86400000).toISOString();
      schedules[1].response = 'Talked to counsellor. Situation stable.';
      schedules[1].responseScore = Math.max(10, assessment.sviScore - 20);
      schedules[1].safetyRating = 4;
    }

    // Run pattern engine on these check-ins
    const mockCaseRecord: CaseRecord = {
      id: caseId,
      docketNumber: docketNum,
      citizenName: t.name,
      phoneEncrypted: encryptField(t.phone),
      phoneMasked: maskPhoneNumber(t.phone),
      district: t.district,
      language: t.language,
      channel: t.channel,
      intent: t.intent,
      consentGiven: true,
      optedOutOfAI: false,
      sviScore: assessment.sviScore,
      riskLevel: assessment.riskLevel,
      confidence: assessment.confidence,
      subScores: assessment.subScores,
      explanation: assessment.explanation,
      recommendedActions: assessment.recommendedActions,
      voiceFeatures: t.voiceFeatures,
      rawAudioStored: false,
      transcript: t.transcript,
      messages: [
        { sender: 'citizen', text: t.transcript, timestamp: createdAt },
        { sender: 'bot', text: 'Thank you for reaching out to 14566. Your safety is our highest priority. Our human counsellor team has been notified.', timestamp: createdAt }
      ],
      status: t.status,
      patternFlags: [],
      isFlaggedForReview: assessment.isFlaggedForReview,
      repeatCaller: !!t.repeatCaller,
      priorCaseCount: t.priorCaseCount || 0,
      createdAt,
      updatedAt: now
    };

    const patternResults = patternEngine.detectPatterns(mockCaseRecord, schedules, new Date());
    const finalPatternFlags = patternResults.flags;
    const isFlagged = assessment.isFlaggedForReview || patternResults.isFlagged;

    // Insert Case
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
      docketNum,
      t.name,
      mockCaseRecord.phoneEncrypted,
      mockCaseRecord.phoneMasked,
      t.district,
      t.language,
      t.channel,
      t.intent,
      1,
      0,
      assessment.sviScore,
      assessment.riskLevel,
      assessment.confidence,
      JSON.stringify(assessment.subScores),
      JSON.stringify(assessment.explanation),
      JSON.stringify(assessment.recommendedActions),
      t.voiceFeatures ? JSON.stringify(t.voiceFeatures) : null,
      0,
      t.transcript,
      JSON.stringify(mockCaseRecord.messages),
      t.status,
      null,
      JSON.stringify(finalPatternFlags),
      isFlagged ? 1 : 0,
      t.repeatCaller ? 1 : 0,
      t.priorCaseCount || 0,
      createdAt,
      now
    ]);

    // Insert Follow Ups
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
        s.completedDate || null,
        s.status,
        s.token,
        s.response || null,
        s.responseScore || null,
        s.responseRisk || null,
        s.safetyRating || null
      ]);

      // Add to outbox simulator
      execute(db, `
        INSERT INTO outbox (
          id, case_id, recipient_phone, channel, body, link, sent_at, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        `msg_${s.id}`,
        caseId,
        mockCaseRecord.phoneMasked,
        'SMS',
        `NHAA 14566 Check-in (Day ${s.dayNumber}): ${s.question} Click to respond safely:`,
        `/checkin/${s.token}`,
        s.scheduledDate,
        s.status === 'completed' ? 'delivered' : 'pending'
      ]);
    }

    // Add Audit Log
    execute(db, `
      INSERT INTO audit_logs (
        id, timestamp, user_id, user_name, user_role, action, case_id, details
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      `log_${caseId}`,
      createdAt,
      'SYSTEM_AI',
      'Sahara AI Triage Module',
      'citizen',
      'INTAKE_ASSESSMENT',
      caseId,
      `Case initiated via ${t.channel}. SVI assessed at ${assessment.sviScore} (${assessment.riskLevel}). Confidence: ${(assessment.confidence * 100).toFixed(0)}%.`
    ]);
  }

  // System settings default
  execute(db, `
    INSERT OR REPLACE INTO system_settings (key, value) VALUES
    ('weights', '{"voice":0.25,"text":0.30,"redFlags":0.30,"context":0.15}'),
    ('thresholds', '{"moderate":25,"high":50,"critical":75}'),
    ('retention_days', '90'),
    ('time_offset_days', '0')
  `);

  saveDb();
  console.log('Seeding completed successfully!');
}
