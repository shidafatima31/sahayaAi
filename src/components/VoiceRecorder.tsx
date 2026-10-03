import React, { useState, useRef } from 'react';
import { Mic, Square, CheckCircle2, RotateCcw, AlertCircle, Shield } from 'lucide-react';
import { extractAcousticFeatures } from '../services/audioFeatureExtractor.ts';
import { VoiceFeatures } from '../types/index.ts';
import { AudioWaveform } from './AudioWaveform.tsx';

interface VoiceRecorderProps {
  onFeaturesExtracted: (features: VoiceFeatures, rawStored: boolean, duration: number) => void;
  lang?: string;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ 
  onFeaturesExtracted, 
  lang = 'English' 
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [extractedFeatures, setExtractedFeatures] = useState<VoiceFeatures | null>(null);
  const [allowRawAudioStorage, setAllowRawAudioStorage] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const startRecording = async () => {
    setErrorMessage(null);
    setExtractedFeatures(null);
    setAudioUrl(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup Web Audio API Analyser for live waveform
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        try {
          // Extract REAL client-side acoustic features
          const features = await extractAcousticFeatures(audioBlob);
          setExtractedFeatures(features);
          onFeaturesExtracted(features, allowRawAudioStorage, features.audioDurationSec);
        } catch (err: any) {
          console.error('Feature extraction failed:', err);
          setErrorMessage('Could not process audio features. Please try again.');
        } finally {
          setIsProcessing(false);
        }

        // Stop all media tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error('Mic access error:', err);
      setErrorMessage('Microphone access was denied or is unavailable. Please grant microphone permission in your browser.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resetRecording = () => {
    setExtractedFeatures(null);
    setAudioUrl(null);
    setRecordingDuration(0);
    setErrorMessage(null);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-slate-900 flex items-center gap-2">
            <Mic className="w-4 h-4 text-teal-600" />
            <span>Voice Distress Analysis Channel</span>
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Real acoustic frequency extraction running locally on your device (autocorrelation, pitch variance, tremor).
          </p>
        </div>

        {isRecording && (
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Real-time Waveform Canvas */}
      <AudioWaveform 
        analyser={analyserRef.current} 
        isRecording={isRecording} 
      />

      {/* Control Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        {!isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm shadow transition-all active:scale-95 cursor-pointer"
          >
            <Mic className="w-4 h-4" />
            <span>{extractedFeatures ? 'Re-record Voice Note' : 'Start Voice Recording'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium text-sm shadow transition-all active:scale-95 cursor-pointer animate-pulse"
          >
            <Square className="w-4 h-4 fill-current" />
            <span>Stop & Analyze Features</span>
          </button>
        )}

        {extractedFeatures && (
          <button
            type="button"
            onClick={resetRecording}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Processing State */}
      {isProcessing && (
        <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-800 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <span>Computing acoustic pitch autocorrelation and physiological tremor...</span>
        </div>
      )}

      {/* Extracted Features Badge Grid */}
      {extractedFeatures && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Acoustic Features Extracted (Sent to Counsellor):
            </span>
            <span className="text-slate-500 font-mono">{extractedFeatures.audioDurationSec}s audio</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <div className="text-slate-400 text-[10px] uppercase font-bold">Avg Pitch (F0)</div>
              <div className="font-mono font-semibold text-slate-800">{extractedFeatures.avgPitchHz} Hz</div>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <div className="text-slate-400 text-[10px] uppercase font-bold">Pitch Variance</div>
              <div className="font-mono font-semibold text-slate-800">{extractedFeatures.pitchVariance}</div>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <div className="text-slate-400 text-[10px] uppercase font-bold">Hesitation / Pauses</div>
              <div className="font-mono font-semibold text-slate-800">{(extractedFeatures.pauseRatio * 100).toFixed(0)}%</div>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <div className="text-slate-400 text-[10px] uppercase font-bold">Vocal Tremor</div>
              <div className="font-mono font-semibold text-slate-800">{extractedFeatures.tremorModulationHz > 0 ? `${extractedFeatures.tremorModulationHz} Hz` : 'Normal'}</div>
            </div>
          </div>
        </div>
      )}

      {/* DPDP Act 2023 Data Minimisation Notice */}
      <div className="pt-2 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-500">
        <Shield className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p>
            <strong>DPDP Act 2023 Data Minimisation:</strong> Raw voice audio is strictly NOT stored on servers by default. Only numeric acoustic metrics (pitch, tremor, pauses) are transmitted to the triage engine.
          </p>
          <label className="flex items-center gap-2 cursor-pointer text-slate-600">
            <input
              type="checkbox"
              checked={allowRawAudioStorage}
              onChange={(e) => {
                setAllowRawAudioStorage(e.target.checked);
                if (extractedFeatures) {
                  onFeaturesExtracted(extractedFeatures, e.target.checked, extractedFeatures.audioDurationSec);
                }
              }}
              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span>Optional: Allow encrypted audio recording storage for legal prosecution / police evidence</span>
          </label>
        </div>
      </div>
    </div>
  );
};
