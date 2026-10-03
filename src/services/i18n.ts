export type SupportedLanguage = 'English' | 'Hindi' | 'Kannada' | 'Marathi' | 'Tamil' | 'Telugu' | 'Bengali';

export interface Translations {
  appName: string;
  tagline: string;
  corePrinciple: string;
  emergencyHelpline: string;
  quickExit: string;
  quickExitTooltip: string;
  consentTitle: string;
  consentExplanation: string;
  consentCheckbox: string;
  optOutOption: string;
  startIntakeBtn: string;
  selectLanguage: string;
  intentTitle: string;
  intentPlaceholder: string;
  intentAnalyzeBtn: string;
  detectedIntent: string;
  proceedToDetails: string;
  channelChat: string;
  channelVoice: string;
  channelIvrs: string;
  chatPlaceholder: string;
  sendBtn: string;
  recordingVoice: string;
  recordBtn: string;
  stopRecordBtn: string;
  ivrsPrompt: string;
  submitCaseBtn: string;
  confirmationTitle: string;
  confirmationMsg: string;
  caseIdLabel: string;
  nextCheckInLabel: string;
  emergencyNumbersTitle: string;
  takeDay0CheckinNow: string;
}

export const TRANSLATIONS: Record<string, Translations> = {
  English: {
    appName: 'Sahara AI',
    tagline: 'NHAA 14566 Distress Helpline & Follow-up Triage',
    corePrinciple: 'AI prioritizes. Humans decide.',
    emergencyHelpline: 'Emergency Helpline: 14566 | 112',
    quickExit: 'Quick Safety Exit',
    quickExitTooltip: 'Immediately closes this page and opens a safe neutral website',
    consentTitle: 'Informed Consent & Privacy Notice (DPDP Act 2023)',
    consentExplanation: 'Sahara AI assists 14566 counsellors by analyzing emotional stress markers (vocal acoustics and text sentiment). Under the Digital Personal Data Protection Act 2023, your raw audio is discarded immediately after acoustic feature extraction unless you explicitly consent. You may opt out of AI scoring at any time with zero loss of human service.',
    consentCheckbox: 'I understand and give consent for distress feature analysis to triage my case for human counsellors.',
    optOutOption: 'Continue without AI analysis (Human-only triage)',
    startIntakeBtn: 'Proceed to Confidential Help',
    selectLanguage: 'Choose Preferred Language',
    intentTitle: 'How can we help you today?',
    intentPlaceholder: 'Briefly type what is happening (e.g., "I need urgent police help", "My husband is threatening me", or "I need information on shelter homes")...',
    intentAnalyzeBtn: 'Check Priority',
    detectedIntent: 'Detected Inquiry Category',
    proceedToDetails: 'Continue with Help Channels',
    channelChat: 'Empathetic Chatbot',
    channelVoice: 'Voice Note (Acoustic Analysis)',
    channelIvrs: '14566 IVRS Phone Simulation',
    chatPlaceholder: 'Type your message safely here...',
    sendBtn: 'Send Message',
    recordingVoice: 'Recording audio... Speak naturally. Voice features will be calculated on your device.',
    recordBtn: 'Record Voice Note',
    stopRecordBtn: 'Stop Recording & Process',
    ivrsPrompt: 'Simulating 14566 Helpline Dial-in...',
    submitCaseBtn: 'Submit Secure Helpline Request',
    confirmationTitle: 'Help is on the way. You are not alone.',
    confirmationMsg: 'Your case has been securely logged with the 14566 helpline. A trained counsellor is reviewing your file with priority.',
    caseIdLabel: 'Your Confidential Docket ID',
    nextCheckInLabel: 'Scheduled Safety Follow-up',
    emergencyNumbersTitle: 'Immediate 24/7 Helpline Numbers',
    takeDay0CheckinNow: 'Answer Initial Day 0 Safety Check-in Now'
  },
  Hindi: {
    appName: 'सहारा AI (Sahara AI)',
    tagline: 'NHAA 14566 संकट हेल्पलाइन एवं अनुवर्ती सहायता',
    corePrinciple: 'AI प्राथमिकता तय करता है। निर्णय इंसान लेते हैं।',
    emergencyHelpline: 'आपातकालीन हेल्पलाइन: 14566 | 112',
    quickExit: 'त्वरित सुरक्षा निकास (Quick Exit)',
    quickExitTooltip: 'तुरंत इस पेज को बंद करके सुरक्षित वेबसाइट खोलें',
    consentTitle: 'सूचित सहमति एवं गोपनीयता सूचना (DPDP अधिनियम 2023)',
    consentExplanation: 'सहारा AI आपकी आवाज़ की ध्वनि और पाठ से तनाव का विश्लेषण करके 14566 परामर्शदाताओं की सहायता करता है। डिजिटल डेटा संरक्षण अधिनियम 2023 के तहत आपकी आवाज़ की रिकॉर्डिंग को तुरंत नष्ट कर दिया जाता है। आप चाहें तो AI विश्लेषण के बिना भी पूरी मानवीय सहायता प्राप्त कर सकते हैं।',
    consentCheckbox: 'मैं परामर्शदाताओं की सहायता हेतु तनाव संकेतकों के विश्लेषण की सहमति देता/देती हूँ।',
    optOutOption: 'AI विश्लेषण के बिना आगे बढ़ें (केवल मानवीय परामर्श)',
    startIntakeBtn: 'गोपनीय सहायता प्राप्त करें',
    selectLanguage: 'भाषा चुनें',
    intentTitle: 'आज हम आपकी क्या मदद कर सकते हैं?',
    intentPlaceholder: 'संक्षेप में लिखें कि क्या समस्या है (उदा. "मुझे पुलिस सुरक्षा चाहिए", "पति मारपीट कर रहे हैं", आदि)...',
    intentAnalyzeBtn: 'प्राथमिकता जांचें',
    detectedIntent: 'पहचानी गई श्रेणी',
    proceedToDetails: 'सहायता माध्यम चुनें',
    channelChat: 'सुरक्षित चैटबॉट',
    channelVoice: 'आवाज़ संदेश (ध्वनि विश्लेषण)',
    channelIvrs: '14566 IVRS फ़ोन सिम्युलेटर',
    chatPlaceholder: 'यहाँ सुरक्षित रूप से अपना संदेश लिखें...',
    sendBtn: 'संदेश भेजें',
    recordingVoice: 'रिकॉर्डिंग जारी है... सामान्य रूप से बोलें। डेटा आपके डिवाइस पर सुरक्षित रहेगा।',
    recordBtn: 'आवाज़ रिकॉर्ड करें',
    stopRecordBtn: 'रिकॉर्डिंग समाप्त करें',
    ivrsPrompt: '14566 हेल्पलाइन कॉल सिम्युलेशन...',
    submitCaseBtn: 'सुरक्षित हेल्पलाइन अनुरोध दर्ज करें',
    confirmationTitle: 'सहायता आपके पास पहुँच रही है। आप अकेले नहीं हैं।',
    confirmationMsg: 'आपका मामला 14566 हेल्पलाइन में सुरक्षित रूप से दर्ज कर लिया गया है। हमारे परामर्शदाता प्राथमिकता के साथ समीक्षा कर रहे हैं।',
    caseIdLabel: 'आपकी गोपनीय केस संख्या',
    nextCheckInLabel: 'निर्धारित सुरक्षा फॉलो-अप',
    emergencyNumbersTitle: '24/7 आपातकालीन नंबर',
    takeDay0CheckinNow: 'अभी डे 0 सुरक्षा चेक-इन का उत्तर दें'
  },
  Kannada: {
    appName: 'ಸಹಾರಾ AI (Sahara AI)',
    tagline: 'NHAA 14566 ಸಹಾಯವಾಣಿ ಮತ್ತು ಮುಂದಿನ ನಿಗಾ ವ್ಯವಸ್ಥೆ',
    corePrinciple: 'AI ಆದ್ಯತೆ ನೀಡುತ್ತದೆ. ಮಾನವರು ನಿರ್ಧರಿಸುತ್ತಾರೆ.',
    emergencyHelpline: 'ತುರ್ತು ಸಹಾಯವಾಣಿ: 14566 | 112',
    quickExit: 'ತ್ವರಿತ ಸುರಕ್ಷತಾ ನಿರ್ಗಮನ (Quick Exit)',
    quickExitTooltip: 'ತಕ್ಷಣವೇ ಈ ಪುಟವನ್ನು ಮುಚ್ಚಿ ಸುರಕ್ಷಿತ ಪುಟಕ್ಕೆ ತೆರಳಿ',
    consentTitle: 'ತಿಳುವಳಿಕೆಯುಳ್ಳ ಸಮ್ಮತಿ ಮತ್ತು ಗೌಪ್ಯತೆ (DPDP ಕಾಯ್ದೆ 2023)',
    consentExplanation: 'ಸಹಾರಾ AI ಧ್ವನಿ ಮತ್ತು ಪಠ್ಯದ ಮೂಲಕ ಒತ್ತಡದ ಮಟ್ಟವನ್ನು ಅಂದಾಜಿಸಿ 14566 ಆಪ್ತಸಮಾಲೋಚಕರಿಗೆ ನೆರವಾಗುತ್ತದೆ. DPDP ಕಾಯ್ದೆಯನ್ವಯ ನಿಮ್ಮ ಮೂಲ ಆಡಿಯೋವನ್ನು ವಿಶ್ಲೇಷಣೆಯ ನಂತರ ತಕ್ಷಣ ಅಳಿಸಲಾಗುತ್ತದೆ. ನೀವು ಬಯಸಿದರೆ AI ಇಲ್ಲದೆಯೇ ಕೇವಲ ಮಾನವ ನೆರವನ್ನು ಪಡೆಯಬಹುದು.',
    consentCheckbox: 'ಸಮಾಲೋಚಕರ ನೆರವಿಗಾಗಿ ಒತ್ತಡದ ಲಕ್ಷಣಗಳನ್ನು ವಿಶ್ಲೇಷಿಸಲು ನಾನು ಸಮ್ಮತಿಸುತ್ತೇನೆ.',
    optOutOption: 'AI ವಿಶ್ಲೇಷಣೆ ಇಲ್ಲದೆ ಮುಂದುವರಿಯಿರಿ (ಕೇವಲ ಮಾನವ ನೆರವು)',
    startIntakeBtn: 'ಗೌಪ್ಯ ಸಹಾಯಕ್ಕೆ ಮುಂದುವರಿಯಿರಿ',
    selectLanguage: 'ಭಾಷೆಯನ್ನು ಆರಿಸಿ',
    intentTitle: 'ನಾವು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?',
    intentPlaceholder: 'ನಿಮ್ಮ ಸಮಸ್ಯೆಯನ್ನು ಸಂಕ್ಷಿಪ್ತವಾಗಿ ಬರೆಯಿರಿ (ಉದಾ: "ಪೊಲೀಸ್ ರಕ್ಷಣೆ ಬೇಕು", "ನನ್ನ ಗಂಡ ಹೊಡೆಯುತ್ತಿದ್ದಾರೆ")...',
    intentAnalyzeBtn: 'ಆದ್ಯತೆ ಪರಿಶೀಲಿಸಿ',
    detectedIntent: 'ಗುರುತಿಸಲಾದ ವಿಭಾಗ',
    proceedToDetails: 'ಸಹಾಯದ ಮಾರ್ಗವನ್ನು ಆರಿಸಿ',
    channelChat: 'ಚಾಟ್‌ಬಾಟ್ ಸಮಾಲೋಚನೆ',
    channelVoice: 'ಧ್ವನಿ ಸಂದೇಶ (ಧ್ವನಿ ವಿಶ್ಲೇಷಣೆ)',
    channelIvrs: '14566 IVRS ಕರೆ ಸಿಮ್ಯುಲೇಶನ್',
    chatPlaceholder: 'ಇಲ್ಲಿ ಸುರಕ್ಷಿತವಾಗಿ ಸಂದೇಶ ಟೈಪ್ ಮಾಡಿ...',
    sendBtn: 'ಸಂದೇಶ ಕಳುಹಿಸಿ',
    recordingVoice: 'ಧ್ವನಿ ಮುದ್ರಣವಾಗುತ್ತಿದೆ... ಧ್ವನಿ ವೈಶಿಷ್ಟ್ಯಗಳನ್ನು ನಿಮ್ಮ ಸಾಧನದಲ್ಲೇ ಲೆಕ್ಕಹಾಕಲಾಗುತ್ತದೆ.',
    recordBtn: 'ಧ್ವನಿ ರೆಕಾರ್ಡ್ ಮಾಡಿ',
    stopRecordBtn: 'ರೆಕಾರ್ಡಿಂಗ್ ನಿಲ್ಲಿಸಿ',
    ivrsPrompt: '14566 ಸಹಾಯವಾಣಿ ಸಿಮ್ಯುಲೇಶನ್...',
    submitCaseBtn: 'ಸಹಾಯವಾಣಿ ವಿನಂತಿಯನ್ನು ಸಲ್ಲಿಸಿ',
    confirmationTitle: 'ಸಹಾಯ ತಲುಪುತ್ತಿದೆ. ನೀವು ಒಂಟಿಯಲ್ಲ.',
    confirmationMsg: 'ನಿಮ್ಮ ದೂರನ್ನು 14566 ಸಹಾಯವಾಣಿಯಲ್ಲಿ ದಾಖಲಿಸಲಾಗಿದೆ. ನಮ್ಮ ತರಬೇತಿ ಪಡೆದ ಆಪ್ತಸಮಾಲೋಚಕರು ಪರಿಶೀಲಿಸುತ್ತಿದ್ದಾರೆ.',
    caseIdLabel: 'ನಿಮ್ಮ ಗೌಪ್ಯ ಡಾಕೆಟ್ ಸಂಖ್ಯೆ',
    nextCheckInLabel: 'ಮುಂದಿನ ಸುರಕ್ಷತಾ ತಪಾಸಣೆ',
    emergencyNumbersTitle: '24/7 ತುರ್ತು ಸಹಾಯವಾಣಿ ಸಂಖ್ಯೆಗಳು',
    takeDay0CheckinNow: 'ಈಗಲೇ ದಿನ 0 ಸುರಕ್ಷತಾ ತಪಾಸಣೆಗೆ ಉತ್ತರಿಸಿ'
  }
};

export function getTranslation(lang: string = 'English'): Translations {
  if (TRANSLATIONS[lang]) return TRANSLATIONS[lang];
  return TRANSLATIONS['English'];
}
