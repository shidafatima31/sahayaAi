import { 
  RiskLevel, 
  SubScores, 
  ScoreExplanation, 
  RecommendedAction, 
  VoiceFeatures, 
  SystemSettings 
} from '../../src/types/index.ts';

// Multilingual lexicon dictionaries with weights
const EMOTION_LEXICON = {
  // Fear & terror
  fear: [
    'scared', 'afraid', 'terrified', 'fear', 'frightened', 'horror', 'panic',
    'darr', 'dar', 'khauf', 'bhayanak', 'darna', 'dari hui', 'dar lag raha',
    'bhaya', 'hedarike', 'anjike', 'hegediro'
  ],
  // Anxiety & agitation
  anxiety: [
    'anxious', 'nervous', 'shaking', 'worried', 'stress', 'restless', 'nightmare',
    'chinta', 'ghabrahat', 'tension', 'pareshan', 'bechain', 'ghabrayi',
    'aatanuka', 'chintha', 'byakula', 'tumba tension'
  ],
  // Hopelessness & depression
  hopelessness: [
    'hopeless', 'helpless', 'alone', 'no way out', 'give up', 'nobody cares', 'useless', 'crying',
    'koi nahi hai', 'bebas', 'lachaar', 'kuch nahi ho sakta', 'ro rahi hu', 'har gayi',
    'enu agalla', 'yaaru illa', 'asahayaka', 'kanneeru', 'nambike illa'
  ],
  // Anger & aggression experienced
  anger: [
    'angry', 'furious', 'screaming', 'shouted', 'abusive', 'insulted',
    'gussa', 'chillaya', 'gaali', 'gaaliyaan', 'apman',
    'kopa', 'bairu', 'keelagi nodu'
  ]
};

// Negation triggers across English, Hindi, and Kannada
const NEGATION_WORDS = [
  'not', 'no', 'never', 'don\'t', 'dont', 'without', 'hardly',
  'nahi', 'mat', 'nhi', 'bina',
  'illa', 'bedi', 'alla', 'enu illa'
];

// Red Flag categories
export const RED_FLAG_PATTERNS = {
  SUICIDE_SELF_HARM: {
    category: 'Self-Harm / Suicide Risk',
    severity: 'critical' as const,
    phrases: [
      'want to die', 'end it all', 'kill myself', 'suicide', 'commit suicide', 
      'better off dead', 'don\'t want to live', 'cannot live anymore',
      'mar jana chahti hu', 'mar jana chahta hu', 'jeena nahi chahti', 'khudkushi', 
      'jaan de dungi', 'aatmhatya', 'khatam karna chahti',
      'saayabeku', 'jeevana beda', 'aatmahatye', 'saayoke hogtini'
    ]
  },
  IMMEDIATE_THREAT: {
    category: 'Immediate Threat to Life',
    severity: 'critical' as const,
    phrases: [
      'will kill me', 'going to kill me', 'threatened to kill', 'strangled', 'choking me',
      'slit my throat', 'burn me alive', 'throw acid',
      'jaan se maar dega', 'jaan se maar dunga', 'gala daba diya', 'acid fekne ki dhamki', 
      'zinda jala dega', 'maar dalega',
      'kolyu madtini', 'jeeva tegithini', 'uri hakthare', 'kolyuthane'
    ]
  },
  PHYSICAL_VIOLENCE: {
    category: 'Severe Physical Abuse',
    severity: 'high' as const,
    phrases: [
      'beating', 'hit me', 'bleeding', 'fractured', 'broken bone', 'punched', 'kicked', 
      'bruises', 'severe pain', 'hospital', 'injured',
      'mara peeta', 'khoon nikal raha', 'haddi toot gayi', 'chot lagi hai', 'hospital me hu',
      'hodedaru', 'raktha barthide', 'maranantika', 'gayagondiddeve'
    ]
  },
  WEAPON_MENTION: {
    category: 'Weapons Involved',
    severity: 'critical' as const,
    phrases: [
      'knife', 'gun', 'blade', 'weapon', 'rod', 'iron rod', 'pistol',
      'chaaku', 'chaku', 'bandook', 'danda', 'talwar', 'lohe ki rod',
      'churi', 'katti', 'bandooku', 'maranantika aayudha'
    ]
  },
  CONFINEMENT: {
    category: 'Illegal Confinement / Hostage',
    severity: 'high' as const,
    phrases: [
      'locked me in', 'locked inside', 'won\'t let me leave', 'snatched phone', 
      'trapped in room', 'captive', 'not allowed outside',
      'kamre me band kar diya', 'bahar nahi jane dete', 'phone cheen liya', 'kaid kar rakha hai',
      'mane olage bhandisiddare', 'horage hogalu bidalla', 'mobile kithukondaru'
    ]
  },
  FINANCIAL_NEGLECT: {
    category: 'Financial Deprivation / Starvation',
    severity: 'moderate' as const,
    phrases: [
      'no food', 'starving', 'no money for medicine', 'took all savings', 'kicked out of house',
      'khana nahi diya', 'bhukha rakha', 'dawa ke paise nahi', 'ghar se nikal diya',
      'oota kottilla', 'hana kottilla', 'maneyinda horagakidare'
    ]
  }
};

export interface AssessmentContext {
  priorSviScores?: number[];
  priorCaseCount?: number;
  repeatCaller?: boolean;
  daysSinceLastContact?: number;
  unresolvedPriorCases?: boolean;
}

export interface AssessmentInput {
  text: string;
  voiceFeatures?: VoiceFeatures;
  context?: AssessmentContext;
  optedOutOfAI?: boolean;
  customSettings?: SystemSettings;
}

export interface AssessmentResult {
  sviScore: number;
  riskLevel: RiskLevel;
  confidence: number;
  subScores: SubScores;
  explanation: ScoreExplanation;
  recommendedActions: RecommendedAction[];
  detectedRedFlags: Array<{ category: string; matched: string; severity: string }>;
  isFlaggedForReview: boolean;
  humanOnlyTriage: boolean;
}

export class AssessmentEngine {
  private defaultSettings: SystemSettings = {
    weights: {
      voice: 0.25,
      text: 0.30,
      redFlags: 0.30,
      context: 0.15
    },
    thresholds: {
      moderate: 25,
      high: 50,
      critical: 75
    },
    retentionDays: 90
  };

  /**
   * Main assessment entry point
   */
  public assess(input: AssessmentInput): AssessmentResult {
    // If citizen explicitly opted out of AI analysis
    if (input.optedOutOfAI) {
      return {
        sviScore: 0,
        riskLevel: 'Moderate', // Default safe human queue
        confidence: 1.0,
        subScores: { voiceStress: 0, textEmotion: 0, redFlags: 0, context: 0 },
        explanation: {
          topFactors: ['Citizen opted out of AI processing'],
          matchedKeywords: [],
          audioCues: [],
          breakdownSummary: 'Direct human-only triage assigned upon citizen request under DPDP Act 2023.'
        },
        recommendedActions: [
          {
            action: 'counselling',
            label: 'Comprehensive Human Intake',
            priority: 'Within 24h',
            reason: 'Citizen opted for human-only triage without algorithmic scoring.'
          }
        ],
        detectedRedFlags: [],
        isFlaggedForReview: true,
        humanOnlyTriage: true
      };
    }

    const settings = input.customSettings || this.defaultSettings;

    // 1. Text Emotion Score
    const { textScore, matchedEmotions, negatedPhrases } = this.calculateTextEmotion(input.text);

    // 2. Red Flags Detection
    const { redFlagsScore, detectedFlags, hasSelfHarm, hasImmediateThreat } = this.detectRedFlags(input.text);

    // 3. Voice Stress Score
    const { voiceScore, audioCues } = this.calculateVoiceStress(input.voiceFeatures);

    // 4. Context Score
    const { contextScore, contextFactors } = this.calculateContextScore(input.context);

    // 5. Confidence Calculation
    const confidence = this.calculateConfidence(input.text, input.voiceFeatures);

    // 6. Base Formula weighted computation
    const hasVoice = Boolean(input.voiceFeatures && input.voiceFeatures.audioDurationSec >= 1);
    let computedSvi: number;

    if (!hasVoice) {
      // Re-normalize weights across text, redFlags, and context so text-only inputs aren't artificially deflated
      const sumOtherWeights = settings.weights.text + settings.weights.redFlags + settings.weights.context;
      const normText = settings.weights.text / sumOtherWeights;
      const normRed = settings.weights.redFlags / sumOtherWeights;
      const normCtx = settings.weights.context / sumOtherWeights;

      computedSvi = Math.round(
        textScore * normText +
        redFlagsScore * normRed +
        contextScore * normCtx
      );
    } else {
      const weights = settings.weights;
      computedSvi = Math.round(
        voiceScore * weights.voice +
        textScore * weights.text +
        redFlagsScore * weights.redFlags +
        contextScore * weights.context
      );
    }
    computedSvi = Math.min(100, Math.max(0, computedSvi));

    // 7. Apply Hard-Coded Safety Rules (Overrides)
    let finalRisk: RiskLevel = this.mapScoreToRisk(computedSvi, settings.thresholds);
    let safetyRuleApplied: string | undefined = undefined;

    // Safety Rule 1: Any self-harm/suicide mention -> CRITICAL immediately
    if (hasSelfHarm) {
      finalRisk = 'Critical';
      computedSvi = Math.max(computedSvi, 85);
      safetyRuleApplied = 'HARD SAFETY OVERRIDE: Suicide / Self-Harm indicator detected. Automatically classified as CRITICAL.';
    } 
    // Safety Rule 2: Any immediate threat to life -> At least HIGH
    else if (hasImmediateThreat) {
      if (finalRisk === 'Low' || finalRisk === 'Moderate') {
        finalRisk = 'High';
        computedSvi = Math.max(computedSvi, 65);
        safetyRuleApplied = 'HARD SAFETY OVERRIDE: Immediate life-threatening peril reported. Minimum risk set to HIGH.';
      }
    }

    // Safety Rule 3: Low confidence -> flag for human review
    const isLowConfidence = confidence < 0.5;

    // 8. Generate "Why this score" Explanation
    const topFactors: string[] = [];
    if (detectedFlags.length > 0) {
      topFactors.push(`Critical red flags detected: ${detectedFlags.map(f => f.category).join(', ')}`);
    }
    if (textScore > 40) {
      topFactors.push(`High linguistic markers of emotional distress (${textScore}/100)`);
    }
    if (voiceScore > 40) {
      topFactors.push(`Vocal acoustic tremor, high pitch variance or long hesitations (${voiceScore}/100)`);
    }
    if (contextScore > 30) {
      topFactors.push(`Elevated historical risk context (${contextFactors.join(', ')})`);
    }
    if (topFactors.length === 0) {
      topFactors.push('Standard low-distress inquiry pattern with calm vocal and linguistic metrics');
    }

    const matchedKeywords = [
      ...detectedFlags.map(f => `"${f.matched}" (${f.category})`),
      ...matchedEmotions.slice(0, 6)
    ];

    const explanation: ScoreExplanation = {
      topFactors,
      matchedKeywords,
      audioCues,
      safetyRuleApplied,
      breakdownSummary: `SVI ${computedSvi}/100 calculated from Text (${Math.round(textScore)}), Voice (${Math.round(voiceScore)}), Red Flags (${Math.round(redFlagsScore)}), and Context (${Math.round(contextScore)}). Confidence: ${(confidence * 100).toFixed(0)}%.`
    };

    // 9. Generate AI Recommendations based on risk, flags, context
    const recommendedActions = this.generateRecommendations(finalRisk, detectedFlags, input.context);

    return {
      sviScore: computedSvi,
      riskLevel: finalRisk,
      confidence,
      subScores: {
        voiceStress: Math.round(voiceScore),
        textEmotion: Math.round(textScore),
        redFlags: Math.round(redFlagsScore),
        context: Math.round(contextScore)
      },
      explanation,
      recommendedActions,
      detectedRedFlags: detectedFlags,
      isFlaggedForReview: isLowConfidence || hasSelfHarm || hasImmediateThreat || finalRisk === 'Critical',
      humanOnlyTriage: false
    };
  }

  /**
   * Text Emotion Scoring with Negation Handling
   */
  public calculateTextEmotion(text: string): { textScore: number; matchedEmotions: string[]; negatedPhrases: string[] } {
    if (!text || text.trim().length === 0) {
      return { textScore: 0, matchedEmotions: [], negatedPhrases: [] };
    }

    const lower = text.toLowerCase();
    const words = lower.split(/[\s,.;:!?()"-]+/);
    const matchedEmotions: string[] = [];
    const negatedPhrases: string[] = [];

    let rawScore = 0;

    // Check each emotion category
    for (const [emotionKey, list] of Object.entries(EMOTION_LEXICON)) {
      for (const phrase of list) {
        const regex = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        let match;
        while ((match = regex.exec(lower)) !== null) {
          const matchIdx = match.index;
          // Lookback 40 characters for negation words
          const precedingSub = lower.substring(Math.max(0, matchIdx - 40), matchIdx);
          const hasNegation = NEGATION_WORDS.some(neg => {
            const negRegex = new RegExp(`\\b${neg}\\b`, 'i');
            return negRegex.test(precedingSub);
          });

          if (hasNegation) {
            negatedPhrases.push(`not ${phrase}`);
            // Small offset rather than adding fear
          } else {
            matchedEmotions.push(phrase);
            if (emotionKey === 'fear') rawScore += 22;
            else if (emotionKey === 'anxiety') rawScore += 16;
            else if (emotionKey === 'hopelessness') rawScore += 20;
            else if (emotionKey === 'anger') rawScore += 12;
          }
        }
      }
    }

    // Normalized to 0-100
    const textScore = Math.min(100, Math.round(rawScore));
    return { textScore, matchedEmotions: Array.from(new Set(matchedEmotions)), negatedPhrases };
  }

  /**
   * Red Flags Detection
   */
  public detectRedFlags(text: string): {
    redFlagsScore: number;
    detectedFlags: Array<{ category: string; matched: string; severity: string }>;
    hasSelfHarm: boolean;
    hasImmediateThreat: boolean;
  } {
    if (!text) {
      return { redFlagsScore: 0, detectedFlags: [], hasSelfHarm: false, hasImmediateThreat: false };
    }

    const lower = text.toLowerCase();
    const detectedFlags: Array<{ category: string; matched: string; severity: string }> = [];
    let hasSelfHarm = false;
    let hasImmediateThreat = false;
    let totalScore = 0;

    for (const [key, rule] of Object.entries(RED_FLAG_PATTERNS)) {
      for (const phrase of rule.phrases) {
        if (lower.includes(phrase.toLowerCase())) {
          detectedFlags.push({
            category: rule.category,
            matched: phrase,
            severity: rule.severity
          });

          if (key === 'SUICIDE_SELF_HARM') {
            hasSelfHarm = true;
            totalScore += 55;
          } else if (key === 'IMMEDIATE_THREAT') {
            hasImmediateThreat = true;
            totalScore += 45;
          } else if (key === 'WEAPON_MENTION') {
            totalScore += 40;
          } else if (key === 'PHYSICAL_VIOLENCE') {
            totalScore += 35;
          } else if (key === 'CONFINEMENT') {
            totalScore += 30;
          } else {
            totalScore += 18;
          }
        }
      }
    }

    // Danger assessment co-occurrence: multiple distinct red flag categories (e.g. violence + confinement)
    const uniqueCategories = new Set(detectedFlags.map(f => f.category));
    if (uniqueCategories.size >= 2) {
      totalScore += 20;
    }

    const redFlagsScore = Math.min(100, totalScore);
    return { redFlagsScore, detectedFlags, hasSelfHarm, hasImmediateThreat };
  }

  /**
   * Voice Stress Scoring based on extracted acoustic features
   */
  public calculateVoiceStress(voice?: VoiceFeatures): { voiceScore: number; audioCues: string[] } {
    if (!voice || voice.audioDurationSec < 1) {
      // No voice provided or negligible length: neutral baseline
      return { voiceScore: 0, audioCues: ['No audio or insufficient length provided'] };
    }

    let score = 0;
    const audioCues: string[] = [];

    // 1. Tremor (4-12 Hz modulation in pitch/energy) - classic physiological panic/tremble
    if (voice.tremorModulationHz >= 4.5 && voice.tremorModulationHz <= 11.5) {
      score += 35;
      audioCues.push(`Significant vocal tremor detected (${voice.tremorModulationHz.toFixed(1)} Hz)`);
    } else if (voice.tremorModulationHz > 0) {
      score += 10;
    }

    // 2. Pitch Variance - high pitch variability indicates distress/screaming/sobbing
    if (voice.pitchVariance > 2500) {
      score += 30;
      audioCues.push('High pitch instability / distress frequency fluctuations');
    } else if (voice.pitchVariance > 1200) {
      score += 18;
      audioCues.push('Elevated pitch variation');
    }

    // 3. Pause Ratio & Duration - frequent long hesitations / gasping
    if (voice.pauseRatio > 0.45) {
      score += 20;
      audioCues.push(`Prolonged pauses/choking silence (${(voice.pauseRatio * 100).toFixed(0)}% speech pause ratio)`);
    } else if (voice.pauseRatio > 0.3) {
      score += 10;
    }

    // 4. Speech Rate - very rapid (panic) or abnormally slow (shock/depression)
    if (voice.speechRateProxy > 5.5) {
      score += 15;
      audioCues.push('Rapid speech cadence (hyperventilation/panic indicator)');
    } else if (voice.speechRateProxy < 1.8 && voice.speechRateProxy > 0.2) {
      score += 15;
      audioCues.push('Labored, slow speech (trauma/shock pattern)');
    }

    const voiceScore = Math.min(100, Math.max(0, score));
    return { voiceScore, audioCues: audioCues.length > 0 ? audioCues : ['Vocal acoustics within calm baseline limits'] };
  }

  /**
   * Context Scoring: prior complaints, repeat caller, days elapsed
   */
  public calculateContextScore(context?: AssessmentContext): { contextScore: number; contextFactors: string[] } {
    if (!context) {
      return { contextScore: 10, contextFactors: ['First-time interaction'] };
    }

    let score = 0;
    const contextFactors: string[] = [];

    if (context.repeatCaller) {
      score += 25;
      contextFactors.push('Repeat caller history on 14566 docket');
    }

    if (context.priorCaseCount && context.priorCaseCount > 1) {
      const extra = Math.min(30, context.priorCaseCount * 12);
      score += extra;
      contextFactors.push(`${context.priorCaseCount} previous logged incident records`);
    }

    if (context.unresolvedPriorCases) {
      score += 25;
      contextFactors.push('Unresolved prior cases on record');
    }

    if (context.priorSviScores && context.priorSviScores.length > 0) {
      const avgPrior = context.priorSviScores.reduce((a, b) => a + b, 0) / context.priorSviScores.length;
      if (avgPrior >= 60) {
        score += 20;
        contextFactors.push(`High historical SVI baseline (avg ${Math.round(avgPrior)})`);
      }
    }

    return { contextScore: Math.min(100, score), contextFactors };
  }

  /**
   * Confidence Estimation (0.0 to 1.0)
   */
  public calculateConfidence(text: string, voice?: VoiceFeatures): number {
    let conf = 0.4; // Base confidence
    const wordCount = text ? text.trim().split(/\s+/).length : 0;

    if (wordCount >= 25) conf += 0.35;
    else if (wordCount >= 10) conf += 0.25;
    else if (wordCount >= 4) conf += 0.15;

    if (voice && voice.audioDurationSec >= 3) {
      conf += 0.25;
    } else if (voice && voice.audioDurationSec >= 1) {
      conf += 0.15;
    }

    return Math.min(0.98, Math.max(0.35, parseFloat(conf.toFixed(2))));
  }

  /**
   * Map SVI numeric score to categorical Risk Level
   */
  public mapScoreToRisk(score: number, thresholds: SystemSettings['thresholds']): RiskLevel {
    if (score >= thresholds.critical) return 'Critical';
    if (score >= thresholds.high) return 'High';
    if (score >= thresholds.moderate) return 'Moderate';
    return 'Low';
  }

  /**
   * Generate Human Action Recommendations
   */
  public generateRecommendations(
    risk: RiskLevel, 
    flags: Array<{ category: string; matched: string; severity: string }>,
    context?: AssessmentContext
  ): RecommendedAction[] {
    const recs: RecommendedAction[] = [];

    // Critical or High Risk
    if (risk === 'Critical') {
      recs.push({
        action: 'police_intervention',
        label: 'Emergency Police Dispatch / Protection',
        priority: 'Immediate',
        reason: 'Critical SVI score with acute danger to life or physical safety identified.'
      });
      recs.push({
        action: 'medical_assistance',
        label: 'Urgent Medical & EMT Support',
        priority: 'Immediate',
        reason: 'Severe violence, injury risks, or self-harm vulnerabilities flagged.'
      });
      recs.push({
        action: 'witness_protection',
        label: 'Safehouse & Shelter Admission',
        priority: 'Immediate',
        reason: 'Immediate physical extraction required to secure victim away from perpetrator.'
      });
    } else if (risk === 'High') {
      recs.push({
        action: 'police_intervention',
        label: 'PCR Patrol Alert & Local Station Notification',
        priority: 'Within 24h',
        reason: 'Severe abuse indicators or explicit physical intimidation recorded.'
      });
      recs.push({
        action: 'counselling',
        label: 'Crisis Trauma Counselling (Senior Counsellor)',
        priority: 'Immediate',
        reason: 'High psychological distress and acute trauma indicators require immediate human care.'
      });
      recs.push({
        action: 'legal_aid',
        label: 'Protection Order / Legal Aid Cell',
        priority: 'Within 24h',
        reason: 'Immediate legal injunction needed under Protection of Women from Domestic Violence Act.'
      });
    } else if (risk === 'Moderate') {
      recs.push({
        action: 'counselling',
        label: 'Scheduled Tele-Counselling Session',
        priority: 'Within 24h',
        reason: 'Moderate stress vulnerability index; needs empathetic human guidance and safety planning.'
      });
      recs.push({
        action: 'legal_aid',
        label: 'Legal Rights & Mediation Consultation',
        priority: 'Within 48h',
        reason: 'Assessment reveals potential financial control or unaddressed civil rights issues.'
      });
    } else {
      // Low risk
      recs.push({
        action: 'counselling',
        label: 'Informational Support & Follow-up',
        priority: 'Routine',
        reason: 'Low distress score; standard verification and reassurance protocol.'
      });
    }

    return recs;
  }
}

export const assessmentEngine = new AssessmentEngine();
