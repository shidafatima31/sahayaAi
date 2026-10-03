import { 
  CaseRecord, 
  FollowUpSchedule, 
  PatternFlag, 
  RiskLevel 
} from '../../src/types/index.ts';
import { assessmentEngine } from './assessmentEngine.ts';

export const CHECKIN_QUESTIONS: Record<number, string> = {
  0: 'How safe do you feel right now? Please share any urgent concerns.',
  1: 'Has your situation changed since our team reached out yesterday?',
  7: 'Do you still need counselling, legal aid, or safety assistance?',
  30: 'Are you receiving the promised support from our legal, medical, or counselling team?'
};

export class PatternEngine {
  /**
   * Generates initial Day 0, Day 1, Day 7, and Day 30 schedule for a case
   */
  public generateSchedules(caseId: string, baseDate: Date = new Date()): FollowUpSchedule[] {
    const intervals = [0, 1, 7, 30];
    return intervals.map(day => {
      const scheduled = new Date(baseDate);
      scheduled.setDate(scheduled.getDate() + day);
      // Give Day 0 immediate schedule
      if (day === 0) {
        scheduled.setMinutes(scheduled.getMinutes() + 5);
      }

      const token = `chk_${caseId.replace(/[^a-zA-Z0-9]/g, '')}_d${day}_${Math.random().toString(36).substring(2, 8)}`;

      return {
        id: `fu_${caseId}_d${day}`,
        caseId,
        dayNumber: day,
        question: CHECKIN_QUESTIONS[day] || 'How is your safety status today?',
        scheduledDate: scheduled.toISOString(),
        status: day === 0 ? 'pending' : 'pending',
        token
      };
    });
  }

  /**
   * Analyze all check-ins for a case and detect escalation patterns
   */
  public detectPatterns(
    caseRecord: CaseRecord,
    checkIns: FollowUpSchedule[],
    simulatedNow: Date = new Date()
  ): { flags: PatternFlag[]; isFlagged: boolean } {
    const flags: PatternFlag[] = [];
    const nowIso = simulatedNow.toISOString();

    // 1. Check for Overdue and Consecutive Silence
    // Sort checkins by dayNumber
    const sorted = [...checkIns].sort((a, b) => a.dayNumber - b.dayNumber);
    let consecutiveMissed = 0;

    for (const chk of sorted) {
      const sched = new Date(chk.scheduledDate);
      // If scheduled in the past relative to simulatedNow
      if (sched <= simulatedNow && chk.status !== 'completed') {
        // More than 24 hours overdue
        const diffHours = (simulatedNow.getTime() - sched.getTime()) / (1000 * 60 * 60);
        if (diffHours >= 24) {
          consecutiveMissed++;
        }
      } else if (chk.status === 'completed') {
        consecutiveMissed = 0; // reset
      }
    }

    if (consecutiveMissed >= 2) {
      flags.push({
        code: 'CONSECUTIVE_SILENCE',
        label: 'Silence Pattern Detected',
        severity: 'critical',
        reason: `Caller failed to respond to ${consecutiveMissed} consecutive scheduled check-ins. High danger of isolation, phone seizure, or victim incapacity.`,
        detectedAt: nowIso
      });
    }

    // 2. Check for Rising SVI (+15 points or more between check-ins or from initial intake)
    const completedWithScores = sorted.filter(c => c.status === 'completed' && c.responseScore !== undefined);
    
    // Check initial intake vs first completed
    if (completedWithScores.length > 0) {
      const firstScore = completedWithScores[0].responseScore!;
      if (firstScore - caseRecord.sviScore >= 15) {
        flags.push({
          code: 'RISING_SVI',
          label: 'Worsening Distress Trajectory',
          severity: 'warning',
          reason: `Stress Vulnerability Index jumped from ${caseRecord.sviScore} to ${firstScore} (+${firstScore - caseRecord.sviScore} pts) in follow-up check-in.`,
          detectedAt: nowIso
        });
      }

      // Check between consecutive check-ins
      for (let i = 1; i < completedWithScores.length; i++) {
        const prev = completedWithScores[i - 1].responseScore!;
        const curr = completedWithScores[i].responseScore!;
        if (curr - prev >= 15) {
          flags.push({
            code: 'RISING_SVI',
            label: 'Rapid SVI Escalation',
            severity: 'critical',
            reason: `Distress index escalated by +${curr - prev} points between Day ${completedWithScores[i - 1].dayNumber} and Day ${completedWithScores[i].dayNumber}.`,
            detectedAt: nowIso
          });
        }
      }
    }

    // 3. Check for New Threats in follow-up texts
    for (const chk of completedWithScores) {
      if (chk.response) {
        const redFlags = assessmentEngine.detectRedFlags(chk.response);
        if (redFlags.detectedFlags.length > 0) {
          const names = redFlags.detectedFlags.map(f => f.category).join(', ');
          flags.push({
            code: 'NEW_THREAT',
            label: 'New Threat Logged in Follow-Up',
            severity: 'critical',
            reason: `Critical indicators (${names}) mentioned during Day ${chk.dayNumber} check-in: "${chk.response.substring(0, 80)}..."`,
            detectedAt: nowIso
          });
        }
      }
    }

    // 4. Day 30: Support Promised But Not Received
    const day30 = sorted.find(c => c.dayNumber === 30 && c.status === 'completed');
    if (day30 && day30.response) {
      const resp = day30.response.toLowerCase();
      const negativeSigns = [
        'no', 'nahi', 'kuch nahi', 'nobody contacted', 'nobody came', 'no help',
        'havent got', 'haven\'t received', 'not received', 'abandoned', 'still waiting',
        'yaaru barlilla', 'sahaya sigalilla', 'enu agilla'
      ];
      const saidNegative = negativeSigns.some(s => resp.includes(s));
      if (saidNegative || (day30.safetyRating && day30.safetyRating <= 2)) {
        flags.push({
          code: 'SUPPORT_NOT_RECEIVED',
          label: 'Institutional Support Deficit',
          severity: 'critical',
          reason: 'Citizen reports Day 30 post-intake that promised legal/counselling/police support was not provided or situation remains unsafe.',
          detectedAt: nowIso
        });
      }
    }

    return {
      flags,
      isFlagged: flags.length > 0
    };
  }

  /**
   * Process a citizen's check-in response
   */
  public processCheckInResponse(
    checkIn: FollowUpSchedule,
    responseText: string,
    safetyRating: number = 3
  ): { responseScore: number; responseRisk: RiskLevel } {
    // Score the follow-up text using the assessment engine
    const result = assessmentEngine.assess({
      text: responseText,
      context: {
        priorSviScores: [50]
      }
    });

    // Modulate score with safety rating: 1 (unsafe) adds 30 pts, 5 (safe) subtracts 20 pts
    let score = result.sviScore;
    if (safetyRating <= 1) score = Math.max(score, 80);
    else if (safetyRating === 2) score = Math.max(score, 60);
    else if (safetyRating >= 4 && score < 50) score = Math.max(10, score - 15);

    const risk = assessmentEngine.mapScoreToRisk(score, {
      moderate: 25,
      high: 50,
      critical: 75
    });

    return {
      responseScore: score,
      responseRisk: risk
    };
  }
}

export const patternEngine = new PatternEngine();
