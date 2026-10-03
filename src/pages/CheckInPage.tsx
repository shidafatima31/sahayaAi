import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Heart, 
  ShieldCheck, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  PhoneCall, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api.ts';
import { QuickExit } from '../components/QuickExit.tsx';

export const CheckInPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkInData, setCheckInData] = useState<any>(null);
  const [responseText, setResponseText] = useState('');
  const [safetyRating, setSafetyRating] = useState<number>(3);
  const [completed, setCompleted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    loadCheckIn();
  }, [token]);

  const loadCheckIn = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await api.getCheckInByToken(token!);
      setCheckInData(data);
      if (data.checkIn.status === 'completed') {
        setCompleted(true);
        setResponseText(data.checkIn.response || '');
        if (data.checkIn.safetyRating) setSafetyRating(data.checkIn.safetyRating);
      }
    } catch (err: any) {
      console.error('Failed to load check-in:', err);
      setErrorMessage('This check-in link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    try {
      await api.submitCheckInResponse(token, responseText, safetyRating);
      setCompleted(true);
    } catch (err: any) {
      console.error('Checkin submit error:', err);
      alert('Could not submit response: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex items-center gap-2 text-sm text-teal-800">
          <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <span>Opening secure check-in portal...</span>
        </div>
      </div>
    );
  }

  if (errorMessage || !checkInData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-6 rounded-2xl border border-red-200 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h3 className="text-lg font-bold text-slate-900">Check-in Unavailable</h3>
          <p className="text-xs text-slate-600">{errorMessage}</p>
          <div className="p-3 bg-teal-50 rounded-xl text-xs text-teal-900 font-medium">
            For immediate support, please call toll-free helpline <strong>14566</strong> or <strong>112</strong>.
          </div>
          <Link to="/" className="inline-block text-xs font-semibold text-teal-700 hover:underline">
            Return to Sahara AI Home
          </Link>
        </div>
      </div>
    );
  }

  const { checkIn, caseInfo } = checkInData;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 flex flex-col justify-between">
      
      {/* Top Header */}
      <div className="max-w-2xl mx-auto w-full flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center">
            <Heart className="w-4 h-4 fill-current" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">Sahara AI | NHAA 14566</div>
            <div className="text-[10px] text-slate-500">Confidential Longitudinal Check-in</div>
          </div>
        </div>

        <QuickExit />
      </div>

      {/* Main Card */}
      <div className="max-w-2xl mx-auto w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        
        {/* Case Reference Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4 text-xs">
          <div>
            <span className="text-slate-400 font-bold uppercase text-[10px]">Docket ID</span>
            <div className="font-mono font-bold text-slate-900">{caseInfo?.docketNumber}</div>
          </div>
          <div className="text-right">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Interval</span>
            <div className="font-semibold text-teal-700">Day {checkIn.dayNumber} Safety Evaluation</div>
          </div>
        </div>

        {!completed ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-2">
              <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 text-[11px] font-bold border border-teal-200">
                Scheduled Follow-up
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
                "{checkIn.question}"
              </h2>
              <p className="text-xs text-slate-500">
                Your response is directly routed to certified counsellors. Please answer honestly; your privacy is fully protected.
              </p>
            </div>

            {/* Safety Rating 1 to 5 */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                How safe do you feel right now? (1 = Highly Endangered, 5 = Completely Safe)
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setSafetyRating(val)}
                    className={`py-3 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                      safetyRating === val 
                        ? 'border-teal-600 bg-teal-600 text-white shadow-sm' 
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 px-1">
                <span>1 - In Immediate Danger</span>
                <span>3 - Moderately Safe</span>
                <span>5 - Fully Secure</span>
              </div>
            </div>

            {/* Detailed text */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Please describe your current situation or urgent needs
              </label>
              <textarea
                rows={4}
                required
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Share any new developments, threats, or if you still need medical/legal/police support..."
                className="w-full p-4 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 outline-none placeholder:text-slate-400"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !responseText.trim()}
              className="w-full py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting Secure Check-in...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Follow-up Response</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* Confirmation Screen */
          <div className="text-center space-y-4 py-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-700 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Thank you. Your response has been received.</h3>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
              Our 14566 helpline team has logged your safety update. If our system detects any heightened distress pattern, a counsellor will proactively contact you.
            </p>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-1">
              <div className="text-slate-400 font-bold uppercase text-[10px]">Your Submitted Status:</div>
              <div className="font-semibold text-slate-800">Safety Score: {safetyRating}/5</div>
              <p className="text-slate-600 italic">"{responseText}"</p>
            </div>

            <div className="pt-2">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:underline"
              >
                <span>Return to Sahara AI Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

      </div>

      {/* Emergency Footer */}
      <div className="max-w-2xl mx-auto w-full text-center mt-6 text-xs text-slate-500">
        In case of immediate physical emergency, dial <strong>112</strong> or <strong>14566</strong> right away.
      </div>

    </div>
  );
};
