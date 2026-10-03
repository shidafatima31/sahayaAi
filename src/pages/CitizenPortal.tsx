import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  MessageSquare, 
  Mic, 
  PhoneCall, 
  AlertCircle, 
  ArrowRight, 
  CheckCircle2, 
  Send, 
  Heart, 
  Phone, 
  RotateCcw,
  Sparkles,
  Volume2,
  Lock,
  ChevronRight
} from 'lucide-react';
import { getTranslation } from '../services/i18n.ts';
import { api } from '../services/api.ts';
import { VoiceRecorder } from '../components/VoiceRecorder.tsx';
import { VoiceFeatures, IntentType, ChannelType } from '../types/index.ts';

export const CitizenPortal: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // State Step: 1 = Consent/Lang, 2 = Intent, 3 = Channel (Chat/Voice/IVRS), 4 = Confirmation
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [language, setLanguage] = useState<string>('English');
  const [consentGiven, setConsentGiven] = useState<boolean>(true);
  const [optedOutOfAI, setOptedOutOfAI] = useState<boolean>(false);
  const [citizenName, setCitizenName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [district, setDistrict] = useState<string>('Bengaluru Urban');

  // Intent State
  const [initialInput, setInitialInput] = useState<string>('');
  const [detectedIntent, setDetectedIntent] = useState<IntentType>('Incident');
  const [intentConfidence, setIntentConfidence] = useState<number>(0.85);

  // Channel Selection
  const initialChannel = (searchParams.get('channel') as ChannelType) || 'chat';
  const [selectedChannel, setSelectedChannel] = useState<ChannelType>(initialChannel);

  // Chatbot State
  const [messages, setMessages] = useState<Array<{ sender: 'bot' | 'citizen'; text: string; time: string }>>([]);
  const [chatInput, setChatInput] = useState<string>('');

  // Voice State
  const [voiceFeatures, setVoiceFeatures] = useState<VoiceFeatures | undefined>(undefined);
  const [rawAudioStored, setRawAudioStored] = useState<boolean>(false);

  // IVRS Simulation State
  const [ivrsStep, setIvrsStep] = useState<number>(1);
  const [ivrsDigits, setIvrsDigits] = useState<string>('');
  const [ivrsSpeaking, setIvrsSpeaking] = useState<boolean>(false);

  // Submission / Confirmation State
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [caseConfirmation, setCaseConfirmation] = useState<any>(null);

  const t = getTranslation(language);

  // Check initial query channel
  useEffect(() => {
    const ch = searchParams.get('channel');
    if (ch === 'ivrs' || ch === 'voice' || ch === 'chat') {
      setSelectedChannel(ch as ChannelType);
    }
  }, [searchParams]);

  // Guided Chat Questions with AI-Assisted Quick Selection Suggestions
  const GUIDED_STEPS = [
    {
      question: {
        English: 'Are you in an immediately safe place right now?',
        Hindi: 'क्या आप अभी किसी सुरक्षित स्थान पर हैं?',
        Kannada: 'ನೀವು ಈಗ ತಕ್ಷಣದ ಸುರಕ್ಷಿತ ಸ್ಥಳದಲ್ಲಿದ್ದೀರಾ?'
      },
      suggestions: {
        English: [
          'Yes, locked safely inside a room',
          'No, the abuser is in the house right now',
          'Outside at neighbor\'s house / public place',
          'In immediate danger, need police now'
        ],
        Hindi: [
          'हाँ, कमरे में सुरक्षित बंद हूँ',
          'नहीं, आरोपी अभी घर के अंदर है',
          'घर से बाहर पड़ोसी या सुरक्षित स्थान पर हूँ',
          'गंभीर खतरे में हूँ, तुरंत पुलिस चाहिए'
        ],
        Kannada: [
          'ಹೌದು, ಕೋಣೆಯಲ್ಲಿ ಸುರಕ್ಷಿತವಾಗಿದ್ದೇನೆ',
          'ಇಲ್ಲ, ಆಕ್ರಮಣಕಾರಿ ವ್ಯಕ್ತಿ ಮನೆಯಲ್ಲೇ ಇದ್ದಾನೆ',
          'ಮನೆಯಿಂದ ಹೊರಗೆ ನೆರೆಹೊರೆಯವರ ಬಳಿ ಇದ್ದೇನೆ',
          'ತೀವ್ರ ಅಪಾಯದಲ್ಲಿದ್ದೇನೆ, ತುರ್ತು ರಕ್ಷಣೆ ಬೇಕು'
        ]
      }
    },
    {
      question: {
        English: 'Who is causing you distress or threatening you (spouse, in-law, employer, stranger)?',
        Hindi: 'आपको कौन परेशान या प्रताड़ित कर रहा है (पति, ससुराल वाले, रिश्तेदार, अन्य)?',
        Kannada: 'ನಿಮಗೆ ಯಾರು ತೊಂದರೆ ಅಥವಾ ಹಿಂಸೆ ನೀಡುತ್ತಿದ್ದಾರೆ (ಪತಿ, ಅತ್ತೆ-ಮಾವ, ಇತರರು)?'
      },
      suggestions: {
        English: [
          'Husband / Partner',
          'In-laws / Family members',
          'Ex-partner / Stalker',
          'Landlord or Employer'
        ],
        Hindi: [
          'पति / वैवाहिक साथी',
          'ससुराल वाले / सास-ससुर',
          'पूर्व साथी / पीछा करने वाला',
          'मकान मालिक या कार्यस्थल पर'
        ],
        Kannada: [
          'ಪತಿ / ಸಂಗಾತಿ',
          'ಅತ್ತೆ-ಮಾವ / ಕುಟುಂಬದವರು',
          'ಮಾಜಿ ಸಂಗಾತಿ / ಹಿಂಬಾಲಕ',
          'ಮನೆ ಮಾಲೀಕರು ಅಥವಾ ಕೆಲಸದ ಸ್ಥಳದಲ್ಲಿ'
        ]
      }
    },
    {
      question: {
        English: 'Are there any physical injuries or immediate medical needs?',
        Hindi: 'क्या आपको कोई शारीरिक चोट लगी है या तत्काल डॉक्टर की जरूरत है?',
        Kannada: 'ಯಾವುದಾದರೂ ದೈಹಿಕ ಗಾಯ ಅಥವಾ ತುರ್ತು ವೈದ್ಯಕೀಯ ನೆರವಿನ ಅಗತ್ಯವಿದೆಯೇ?'
      },
      suggestions: {
        English: [
          'Yes, bleeding / severe wounds, need ambulance',
          'Bruises & physical trauma all over body',
          'No physical injuries, but extreme panic & fear',
          'Need confidential medical examination'
        ],
        Hindi: [
          'हाँ, खून बह रहा है, तुरंत एम्बुलेंस चाहिए',
          'चोट के गहरे निशान और बहुत दर्द है',
          'शारीरिक चोट नहीं, पर बहुत घबराहट और सदमा है',
          'गोपनीय चिकित्सकीय जांच की जरूरत है'
        ],
        Kannada: [
          'ಹೌದು, ರಕ್ತಸ್ರಾವ / ತೀವ್ರ ಗಾಯ, ಆಂಬ್ಯುಲೆನ್ಸ್ ಬೇಕು',
          'ದೇಹದ ಮೇಲೆ ಗಾಯದ ಗುರುತುಗಳು ಮತ್ತು ನೋವು',
          'ದೈಹಿಕ ಗಾಯವಿಲ್ಲ, ಆದರೆ ತೀವ್ರ ಭಯ ಮತ್ತು ಆತಂಕ',
          'ಗೌಪ್ಯ ವೈದ್ಯಕೀಯ ತಪಾಸಣೆ ಬೇಕು'
        ]
      }
    },
    {
      question: {
        English: 'Do you require emergency police assistance, safe shelter, or legal protection?',
        Hindi: 'क्या आपको पुलिस सहायता, सुरक्षित आश्रय गृह या मुफ्त कानूनी मदद चाहिए?',
        Kannada: 'ನಿಮಗೆ ತುರ್ತು ಪೊಲೀಸ್ ನೆರವು, ಸುರಕ್ಷಿತ ಆಶ್ರಯ ಅಥವಾ ಉಚಿತ ಕಾನೂನು ನೆರವು ಬೇಕೇ?'
      },
      suggestions: {
        English: [
          'Immediate Emergency Police (PCR) dispatch',
          'Urgent Safe Shelter / Women\'s Home admission',
          'Free Legal Aid & Protection Injunction (DV Act)',
          'Confidential tele-counselling session first'
        ],
        Hindi: [
          'तुरंत आपातकालीन पुलिस (PCR) वैन भेजें',
          'सुरक्षित महिला आश्रय गृह (Shelter Home) में जगह',
          'मुफ्त कानूनी सहायता और घरेलू हिंसा संरक्षण आदेश',
          'पहले किसी प्रशिक्षित काउंसलर से बात करनी है'
        ],
        Kannada: [
          'ತಕ್ಷಣವೇ ತುರ್ತು ಪೊಲೀಸ್ (PCR) ರಕ್ಷಣೆ ಕಳುಹಿಸಿ',
          'ಮಹಿಳಾ ಸಾಂತ್ವನ ಕೇಂದ್ರ / ಸುರಕ್ಷಿತ ಆಶ್ರಯ',
          'ಉಚಿತ ಕಾನೂನು ನೆರವು ಮತ್ತು ರಕ್ಷಣಾ ಆದೇಶ (DV Act)',
          'ಮೊದಲು ಆಪ್ತಸಮಾಲೋಚಕರೊಂದಿಗೆ ಗೌಪ್ಯವಾಗಿ ಮಾತನಾಡಬೇಕು'
        ]
      }
    }
  ];

  const getStepQuestion = (idx: number, lang: string): string => {
    const step = GUIDED_STEPS[idx];
    if (!step) return '';
    if (lang === 'Hindi') return step.question.Hindi;
    if (lang === 'Kannada') return step.question.Kannada;
    return step.question.English;
  };

  const getStepSuggestions = (idx: number, lang: string): string[] => {
    const step = GUIDED_STEPS[idx];
    if (!step) return [];
    if (lang === 'Hindi') return step.suggestions.Hindi;
    if (lang === 'Kannada') return step.suggestions.Kannada;
    return step.suggestions.English;
  };

  const [questionIdx, setQuestionIdx] = useState<number>(0);

  // Speak text using Web SpeechSynthesis API for IVRS
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.onstart = () => setIvrsSpeaking(true);
      utterance.onend = () => setIvrsSpeaking(false);
      utterance.onerror = () => setIvrsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Rule-based Intent Classifier
  const analyzeIntent = (text: string): { intent: IntentType; confidence: number } => {
    const lower = text.toLowerCase();
    const distressWords = ['kill', 'suicide', 'die', 'murder', 'blood', 'knife', 'emergency', 'help me', 'danger', 'strangled', 'hodedaru', 'saayabeku', 'bachao', 'mar dalega'];
    const inquiryWords = ['procedure', 'information', 'how to', 'scheme', 'rules', 'contact', 'law', 'dv act', 'address', 'rights'];

    const hasDistress = distressWords.some(w => lower.includes(w));
    if (hasDistress) {
      return { intent: 'Distress', confidence: 0.95 };
    }

    const hasInquiry = inquiryWords.some(w => lower.includes(w));
    if (hasInquiry) {
      return { intent: 'Inquiry', confidence: 0.90 };
    }

    return { intent: 'Incident', confidence: 0.85 };
  };

  const handleIntentCheck = () => {
    if (!initialInput.trim()) return;
    const res = analyzeIntent(initialInput);
    setDetectedIntent(res.intent);
    setIntentConfidence(res.confidence);
    setQuestionIdx(0);

    // Initialize chatbot with initial statement and first localized question
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const firstQ = getStepQuestion(0, language);
    setMessages([
      { sender: 'citizen', text: initialInput, time: now },
      { sender: 'bot', text: `Hello. Namaste. I hear you and you are safe here. ${firstQ}`, time: now }
    ]);

    setCurrentStep(3);
  };

  // Quick-selection of AI-assisted answer
  const handleSelectSuggestion = (suggestionText: string) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { sender: 'citizen' as const, text: suggestionText, time: now };
    
    let botReply = 'Thank you for providing these vital details. Our counsellors have logged your context. Please click "Submit Secure Helpline Request" below when ready.';
    if (questionIdx < GUIDED_STEPS.length - 1) {
      const nextIdx = questionIdx + 1;
      setQuestionIdx(nextIdx);
      const nextQ = getStepQuestion(nextIdx, language);
      botReply = `Understood. ${nextQ}`;
    } else {
      setQuestionIdx(GUIDED_STEPS.length);
    }

    const botMsg = { sender: 'bot' as const, text: botReply, time: now };
    setMessages(prev => [...prev, userMsg, botMsg]);
  };

  // Chat message send handler
  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { sender: 'citizen' as const, text: chatInput, time: now };
    
    let botReply = 'Thank you for providing these vital details. Our counsellors have logged your context. Please click "Submit Secure Helpline Request" below when ready.';
    if (questionIdx < GUIDED_STEPS.length - 1) {
      const nextIdx = questionIdx + 1;
      setQuestionIdx(nextIdx);
      const nextQ = getStepQuestion(nextIdx, language);
      botReply = `Understood. ${nextQ}`;
    } else {
      setQuestionIdx(GUIDED_STEPS.length);
    }

    const botMsg = { sender: 'bot' as const, text: botReply, time: now };
    setMessages(prev => [...prev, userMsg, botMsg]);
    setChatInput('');
  };

  // Final Intake Submission
  const handleSubmitIntake = async () => {
    setSubmitting(true);
    try {
      // Gather transcript
      let fullTranscript = initialInput;
      if (messages.length > 0) {
        fullTranscript = messages.map(m => `${m.sender.toUpperCase()}: ${m.text}`).join('\n');
      }

      const payload = {
        name: citizenName || 'Anonymous Citizen',
        phone: phone || '9845000000',
        district,
        language,
        channel: selectedChannel,
        intent: detectedIntent,
        consentGiven,
        optedOutOfAI,
        transcript: fullTranscript,
        messages,
        voiceFeatures,
        rawAudioStored
      };

      const res = await api.submitIntake(payload);
      setCaseConfirmation(res);
      setCurrentStep(4);
    } catch (err: any) {
      console.error('Submission failed:', err);
      alert('Intake submission error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Stepper Header */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${currentStep >= 1 ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500'}`}>1</span>
            <span className="font-semibold text-slate-800">Consent & Privacy</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300" />
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${currentStep >= 2 ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500'}`}>2</span>
            <span className="font-semibold text-slate-800">Intent Check</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300" />
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${currentStep >= 3 ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500'}`}>3</span>
            <span className="font-semibold text-slate-800">Help Channel</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300" />
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${currentStep >= 4 ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500'}`}>4</span>
            <span className="font-semibold text-slate-800">Confirmation</span>
          </div>
        </div>

        {/* =========================================================================
            STEP 1: CONSENT & LANGUAGE SELECTION (MANDATORY DPDP STEP)
           ========================================================================= */}
        {currentStep === 1 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
            
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                <span>Statutory DPDP Act 2023 Compliance</span>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900">{t.consentTitle}</h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {t.consentExplanation}
              </p>
            </div>

            {/* Language Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                {t.selectLanguage}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['English', 'Hindi', 'Kannada', 'Marathi', 'Tamil', 'Telugu', 'Bengali'].map(lang => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLanguage(lang)}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      language === lang 
                        ? 'border-teal-600 bg-teal-50 text-teal-900 shadow-xs' 
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* District Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                District / Jurisdiction (Karnataka)
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-sm bg-white text-slate-800 focus:ring-2 focus:ring-teal-500"
              >
                <option value="Bengaluru Urban">Bengaluru Urban</option>
                <option value="Mysuru">Mysuru</option>
                <option value="Belagavi">Belagavi</option>
                <option value="Dakshina Kannada">Dakshina Kannada</option>
                <option value="Kalaburagi">Kalaburagi</option>
                <option value="Hubballi-Dharwad">Hubballi-Dharwad</option>
              </select>
            </div>

            {/* Consent Options */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentGiven && !optedOutOfAI}
                  onChange={(e) => {
                    setConsentGiven(e.target.checked);
                    if (e.target.checked) setOptedOutOfAI(false);
                  }}
                  className="mt-1 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                />
                <span className="text-xs text-slate-700 leading-snug">
                  <strong>{t.consentCheckbox}</strong>
                  <span className="block text-slate-500 text-[11px] mt-0.5">
                    Extracts numeric acoustic metrics (pitch, tremor) and semantic distress cues. No raw audio is kept.
                  </span>
                </span>
              </label>

              {/* Explicit Opt-Out of AI option */}
              <div className="pt-2 border-t border-slate-200">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={optedOutOfAI}
                    onChange={(e) => {
                      setOptedOutOfAI(e.target.checked);
                      if (e.target.checked) setConsentGiven(false);
                    }}
                    className="mt-1 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                  />
                  <span className="text-xs text-amber-900 leading-snug">
                    <strong>{t.optOutOption}</strong>
                    <span className="block text-slate-500 text-[11px] mt-0.5">
                      SVI calculation is completely bypassed. Your case will be routed to a counsellor directly under "Human-only triage" with zero delay.
                    </span>
                  </span>
                </label>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="w-full py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <span>{t.startIntakeBtn}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* =========================================================================
            STEP 2: INTENT CHECK & FIRST STATEMENT
           ========================================================================= */}
        {currentStep === 2 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
            
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">Step 2: Rapid Triage Check</span>
              <h2 className="text-2xl font-extrabold text-slate-900">{t.intentTitle}</h2>
              <p className="text-xs text-slate-500">
                Our initial intent classifier checks whether your request is an informational inquiry, an active incident, or an urgent distress emergency.
              </p>
            </div>

            <div className="space-y-2">
              <textarea
                rows={4}
                value={initialInput}
                onChange={(e) => setInitialInput(e.target.value)}
                placeholder={t.intentPlaceholder}
                className="w-full p-4 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none placeholder:text-slate-400"
              />
            </div>

            {/* Live Intent Classification Preview */}
            {initialInput.trim().length > 3 && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">{t.detectedIntent}:</span>
                  <span className="font-mono text-slate-400">Confidence: {(intentConfidence * 100).toFixed(0)}%</span>
                </div>

                <div className="flex items-center gap-2">
                  {detectedIntent === 'Distress' && (
                    <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 border border-red-200 font-bold text-xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                      Urgent Distress Emergency (Direct Priority Queue)
                    </span>
                  )}
                  {detectedIntent === 'Incident' && (
                    <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs">
                      Active Domestic Incident (Comprehensive Assessment)
                    </span>
                  )}
                  {detectedIntent === 'Inquiry' && (
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs">
                      Informational Inquiry / Legal Rights Advice
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
              >
                Back
              </button>

              <button
                type="button"
                disabled={!initialInput.trim()}
                onClick={handleIntentCheck}
                className="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold text-sm shadow transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>{t.proceedToDetails}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        )}

        {/* =========================================================================
            STEP 3: MULTIMODAL CHANNELS (CHATBOT / VOICE NOTE / IVRS SIMULATION)
           ========================================================================= */}
        {currentStep === 3 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
            
            {/* Channel Tabs */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">Step 3: Detail Input</span>
                <h3 className="text-lg font-bold text-slate-900">Choose Intake Channel</h3>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSelectedChannel('chat')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    selectedChannel === 'chat' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chatbot</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedChannel('voice')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    selectedChannel === 'voice' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Voice Note</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedChannel('ivrs')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    selectedChannel === 'ivrs' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>14566 IVRS</span>
                </button>
              </div>
            </div>

            {/* CHANNEL A: EMPATHETIC CHATBOT */}
            {selectedChannel === 'chat' && (
              <div className="space-y-4">
                <div className="h-64 overflow-y-auto p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                  {messages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${m.sender === 'citizen' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[80%] p-3.5 rounded-2xl transition-all ${
                          m.sender === 'citizen'
                            ? 'bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-br-xs shadow-xs'
                            : 'bg-white border border-teal-100/90 text-slate-800 rounded-bl-xs shadow-2xs ring-1 ring-slate-900/5'
                        }`}
                      >
                        {m.sender === 'bot' && (
                          <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-bold text-teal-700 tracking-wide uppercase">
                            <ShieldCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            <span>Sahaya Helpline Assistant</span>
                          </div>
                        )}
                        <p className="leading-relaxed text-xs sm:text-[13px] font-normal">{m.text}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 px-1 font-mono">{m.time}</span>
                    </div>
                  ))}
                </div>

                {/* AI-Assisted Quick Selection Answers */}
                {questionIdx < GUIDED_STEPS.length ? (
                  <div className="p-3 bg-teal-50/70 rounded-xl border border-teal-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-teal-900 uppercase tracking-wide">
                        <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                        <span>AI-Assisted Quick Answers (Tap to select instantly):</span>
                      </div>
                      <span className="text-[10px] text-teal-700 font-mono font-semibold">
                        Step {questionIdx + 1} of {GUIDED_STEPS.length}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {getStepSuggestions(questionIdx, language).map((sugg, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSelectSuggestion(sugg)}
                          className="px-3 py-2 rounded-lg border border-teal-200 bg-white hover:bg-teal-50 text-teal-950 text-xs font-medium text-left transition-all active:scale-98 shadow-2xs hover:shadow-xs cursor-pointer flex items-center justify-between group"
                        >
                          <span className="leading-snug">{sugg}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-teal-400 group-hover:text-teal-700 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>All triage assessment questions answered. You may type additional context or submit your request below.</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={t.chatPlaceholder}
                    className="flex-1 p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    className="p-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white cursor-pointer transition-all active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* CHANNEL B: VOICE NOTE WITH REAL AUDIO FEATURES */}
            {selectedChannel === 'voice' && (
              <VoiceRecorder
                lang={language}
                onFeaturesExtracted={(features, rawStored) => {
                  setVoiceFeatures(features);
                  setRawAudioStored(rawStored);
                }}
              />
            )}

            {/* CHANNEL C: SIMULATED 14566 IVRS PHONE CALL */}
            {selectedChannel === 'ivrs' && (
              <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-5 border border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-xs">
                      14566
                    </div>
                    <div>
                      <div className="text-xs font-bold">NHAA 14566 National IVRS Gateway</div>
                      <div className="text-[10px] text-slate-400">SpeechSynthesis prompt audio playback</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => speakText("Welcome to National Helpline 14566. Press 1 for English. Press 2 for Hindi. Press 3 for Kannada. Please state your emergency clearly.")}
                    className="px-2.5 py-1 rounded-md bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Play Audio Prompt</span>
                  </button>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center font-mono text-xs text-teal-400">
                  {ivrsSpeaking ? 'Speaking: "Welcome to 14566. Press 1 for English..."' : 'IVRS Connected. Enter digits or record message:'}
                  <div className="text-lg font-bold text-white mt-1">
                    {ivrsDigits || 'Dialing...'}
                  </div>
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(digit => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => setIvrsDigits(prev => prev + digit)}
                      className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-all active:scale-95 cursor-pointer shadow-sm"
                    >
                      {digit}
                    </button>
                  ))}
                </div>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setIvrsDigits('')}
                    className="text-[11px] text-slate-400 hover:text-white"
                  >
                    Clear Keypad
                  </button>
                </div>
              </div>
            )}

            {/* Optional Citizen Phone / Name for follow-up */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-xs font-semibold text-slate-700 block">
                Contact details for 30-day safety follow-up (Encrypted under AES-256-GCM):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={citizenName}
                  onChange={(e) => setCitizenName(e.target.value)}
                  placeholder="Your Name (or Leave blank for Anonymous)"
                  className="p-2.5 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-teal-500"
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Mobile Number (e.g. 9845012345)"
                  className="p-2.5 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Submit Request Button */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
              >
                Back
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitIntake}
                className="px-6 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-98"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Transmitting to 14566 Triage...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>{t.submitCaseBtn}</span>
                  </>
                )}
              </button>
            </div>

          </div>
        )}

        {/* =========================================================================
            STEP 4: SUBMISSION CONFIRMATION
           ========================================================================= */}
        {currentStep === 4 && caseConfirmation && (
          <div className="bg-white rounded-2xl border border-teal-200 shadow-md p-6 sm:p-8 space-y-6">
            
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-700 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900">{t.confirmationTitle}</h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                {t.confirmationMsg}
              </p>
            </div>

            {/* Docket Box */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-center">
              <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">{t.caseIdLabel}</div>
              <div className="text-2xl font-mono font-black text-slate-900">{caseConfirmation.docketNumber}</div>
              <p className="text-[11px] text-slate-500">
                Keep this confidential docket number for status inquiries with police and helpline officers.
              </p>
            </div>

            {/* Day 0 Check-in Action */}
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                  {t.nextCheckInLabel}: Day 0 (Immediate)
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-800">Pending</span>
              </div>
              <p className="text-xs text-amber-800">
                "{caseConfirmation.nextCheckIn?.question}"
              </p>
              <button
                type="button"
                onClick={() => navigate(`/checkin/${caseConfirmation.nextCheckIn.token}`)}
                className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-all shadow-xs cursor-pointer"
              >
                {t.takeDay0CheckinNow}
              </button>
            </div>

            {/* 24/7 Helpline Numbers */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                {t.emergencyNumbersTitle}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {caseConfirmation.emergencyNumbers?.map((em: any, i: number) => (
                  <div key={i} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
                    <div className="text-[10px] text-slate-400 font-bold uppercase truncate">{em.label}</div>
                    <div className="text-base font-black text-slate-900 mt-0.5">{em.number}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/queue')}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-teal-300 font-semibold text-xs hover:bg-slate-800 cursor-pointer"
              >
                View in Counsellor Queue (Demo)
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentStep(1);
                  setCaseConfirmation(null);
                  setInitialInput('');
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                File Another Case
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
