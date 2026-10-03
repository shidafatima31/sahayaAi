import { describe, it, expect } from 'vitest';
import { assessmentEngine } from '../services/assessmentEngine.ts';
import { patternEngine } from '../services/patternEngine.ts';
import { CaseRecord, FollowUpSchedule } from '../../src/types/index.ts';

describe('Sahara AI Assessment Engine', () => {
  it('correctly handles low-risk informational inquiry', () => {
    const result = assessmentEngine.assess({
      text: 'Hello, I want to inquire about government schemes and legal aid provisions under the DV Act.'
    });

    expect(result.riskLevel).toBe('Low');
    expect(result.sviScore).toBeLessThan(25);
    expect(result.isFlaggedForReview).toBe(false);
    expect(result.humanOnlyTriage).toBe(false);
  });

  it('detects high distress in abusive relationship with fear words and threats', () => {
    const result = assessmentEngine.assess({
      text: 'He is beating me violently every evening. I am terrified and scared for my life. He locked me in the room.'
    });

    expect(['High', 'Critical']).toContain(result.riskLevel);
    expect(result.sviScore).toBeGreaterThanOrEqual(50);
    expect(result.detectedRedFlags.length).toBeGreaterThan(0);
    expect(result.explanation.matchedKeywords.length).toBeGreaterThan(0);
  });

  it('handles multilingual Hindi and Kannada phrases', () => {
    const hindiResult = assessmentEngine.assess({
      text: 'Mujhe bahut darr lag raha hai, roz mara peeta hai aur gala daba diya.'
    });
    // 'gala daba diya' is an immediate threat to life (at least High or Critical)
    expect(['High', 'Critical']).toContain(hindiResult.riskLevel);

    const kannadaResult = assessmentEngine.assess({
      text: 'Nanna ganda tumba hodedaru, raktha barthide, saayabeku antha anustide.'
    });
    expect(kannadaResult.riskLevel).toBe('Critical'); // 'saayabeku' = suicide/self-harm
  });

  it('handles negation correctly (not scared / nahi dar rahi)', () => {
    const negative = assessmentEngine.assess({
      text: 'I am not scared of him anymore, I just want standard legal paperwork.'
    });

    const positive = assessmentEngine.assess({
      text: 'I am scared of him, he will hurt me.'
    });

    // The positive text should have significantly higher text emotion score than negated
    expect(positive.subScores.textEmotion).toBeGreaterThan(negative.subScores.textEmotion);
  });

  /* ---------------- HARD SAFETY RULES ---------------- */
  describe('Safety Rule Overrides (Non-negotiable)', () => {
    it('OVERRIDE 1: Any suicide/self-harm mention MUST trigger CRITICAL risk regardless of score', () => {
      // Even with calm text and minimal other words, self-harm rule must force Critical
      const result = assessmentEngine.assess({
        text: 'Everything is quiet today, but I feel I want to die and end it all.'
      });

      expect(result.riskLevel).toBe('Critical');
      expect(result.explanation.safetyRuleApplied).toBeDefined();
      expect(result.explanation.safetyRuleApplied).toContain('Suicide / Self-Harm indicator detected');
      expect(result.isFlaggedForReview).toBe(true);
    });

    it('OVERRIDE 2: Any immediate threat to life must be at least HIGH risk', () => {
      const result = assessmentEngine.assess({
        text: 'He said he will kill me if I talk to anyone.'
      });

      expect(['High', 'Critical']).toContain(result.riskLevel);
      expect(result.explanation.safetyRuleApplied).toBeDefined();
    });

    it('OVERRIDE 3: Low confidence input routes to human review with warning label', () => {
      // Very short, ambiguous text
      const result = assessmentEngine.assess({
        text: 'yes maybe'
      });

      expect(result.confidence).toBeLessThan(0.5);
      expect(result.isFlaggedForReview).toBe(true);
    });

    it('Citizen opt-out skips AI SVI and assigns Human-only triage', () => {
      const result = assessmentEngine.assess({
        text: 'I have an emergency',
        optedOutOfAI: true
      });

      expect(result.sviScore).toBe(0);
      expect(result.humanOnlyTriage).toBe(true);
      expect(result.isFlaggedForReview).toBe(true);
    });
  });
});

describe('Sahara AI Follow-up & Pattern Detection Engine', () => {
  const baseCase: CaseRecord = {
    id: 'case_test_1',
    docketNumber: 'NHAA-2026-9999',
    citizenName: 'Test Citizen',
    phoneEncrypted: '',
    phoneMasked: '+91 98*** **321',
    district: 'Bengaluru Urban',
    language: 'English',
    channel: 'chat',
    intent: 'Incident',
    consentGiven: true,
    optedOutOfAI: false,
    sviScore: 35,
    riskLevel: 'Moderate',
    confidence: 0.85,
    subScores: { voiceStress: 20, textEmotion: 40, redFlags: 10, context: 20 },
    explanation: { topFactors: [], matchedKeywords: [], audioCues: [], breakdownSummary: '' },
    recommendedActions: [],
    rawAudioStored: false,
    transcript: 'Initial incident',
    messages: [],
    status: 'Open',
    patternFlags: [],
    isFlaggedForReview: false,
    repeatCaller: false,
    priorCaseCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  it('RULE 1: Flags Rising SVI (+15 points or more between check-ins)', () => {
    const checkIns: FollowUpSchedule[] = [
      {
        id: 'fu_0',
        caseId: 'case_test_1',
        dayNumber: 0,
        question: 'How safe?',
        scheduledDate: new Date().toISOString(),
        status: 'completed',
        token: 'tok_0',
        response: 'Somewhat okay',
        responseScore: 35
      },
      {
        id: 'fu_1',
        caseId: 'case_test_1',
        dayNumber: 1,
        question: 'Changed?',
        scheduledDate: new Date().toISOString(),
        status: 'completed',
        token: 'tok_1',
        response: 'He attacked me with a stick',
        responseScore: 60 // +25 jump!
      }
    ];

    const result = patternEngine.detectPatterns(baseCase, checkIns);
    expect(result.isFlagged).toBe(true);
    expect(result.flags.some(f => f.code === 'RISING_SVI')).toBe(true);
  });

  it('RULE 2: Flags Silence when 2 consecutive check-ins are missed/overdue', () => {
    const pastDate1 = new Date();
    pastDate1.setDate(pastDate1.getDate() - 3);

    const pastDate2 = new Date();
    pastDate2.setDate(pastDate2.getDate() - 2);

    const checkIns: FollowUpSchedule[] = [
      {
        id: 'fu_0',
        caseId: 'case_test_1',
        dayNumber: 0,
        question: 'Safe?',
        scheduledDate: pastDate1.toISOString(),
        status: 'overdue',
        token: 'tok_0'
      },
      {
        id: 'fu_1',
        caseId: 'case_test_1',
        dayNumber: 1,
        question: 'Changed?',
        scheduledDate: pastDate2.toISOString(),
        status: 'overdue',
        token: 'tok_1'
      }
    ];

    const result = patternEngine.detectPatterns(baseCase, checkIns, new Date());
    expect(result.isFlagged).toBe(true);
    expect(result.flags.some(f => f.code === 'CONSECUTIVE_SILENCE')).toBe(true);
  });

  it('RULE 3: Flags Day 30 Support Deficit when promised support is not received', () => {
    const checkIns: FollowUpSchedule[] = [
      {
        id: 'fu_30',
        caseId: 'case_test_1',
        dayNumber: 30,
        question: 'Receiving support?',
        scheduledDate: new Date().toISOString(),
        status: 'completed',
        token: 'tok_30',
        response: 'Nobody came, no support received from police or counsellor.',
        responseScore: 70,
        safetyRating: 1
      }
    ];

    const result = patternEngine.detectPatterns(baseCase, checkIns);
    expect(result.isFlagged).toBe(true);
    expect(result.flags.some(f => f.code === 'SUPPORT_NOT_RECEIVED')).toBe(true);
  });
});
