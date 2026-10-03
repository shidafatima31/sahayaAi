import { VoiceFeatures } from '../types/index.ts';

/**
 * Client-side Real-time Web Audio API & Acoustic Feature Extractor
 * Extracts physiological distress markers without sending raw audio to server:
 * - Autocorrelation Pitch (F0)
 * - Pitch Variance
 * - Pause Ratio and Hesitation Length
 * - Speech Cadence / Syllable Rate Proxy
 * - Vocal Tremor (4-12 Hz amplitude/pitch modulation)
 * - RMS Energy
 */
export async function extractAcousticFeatures(audioBlob: Blob): Promise<VoiceFeatures> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);
  const durationSec = audioBuffer.duration;

  if (durationSec < 0.5) {
    return {
      avgPitchHz: 0,
      pitchVariance: 0,
      pauseRatio: 0,
      pauseDurationSec: 0,
      speechRateProxy: 0,
      rmsAmplitude: 0,
      tremorModulationHz: 0,
      audioDurationSec: durationSec
    };
  }

  // 1. Frame-by-frame analysis
  const frameSize = Math.floor(sampleRate * 0.04); // 40ms frame
  const hopSize = Math.floor(sampleRate * 0.02);   // 20ms hop
  const numFrames = Math.floor((channelData.length - frameSize) / hopSize);

  const pitches: number[] = [];
  const energies: number[] = [];
  let silentFrames = 0;

  // Energy threshold for silence/pause
  let totalEnergy = 0;
  for (let i = 0; i < channelData.length; i++) {
    totalEnergy += channelData[i] * channelData[i];
  }
  const meanRms = Math.sqrt(totalEnergy / channelData.length);
  const silenceThreshold = Math.max(0.005, meanRms * 0.2);

  for (let f = 0; f < numFrames; f++) {
    const start = f * hopSize;
    let frameRms = 0;

    for (let i = 0; i < frameSize; i++) {
      const sample = channelData[start + i];
      frameRms += sample * sample;
    }
    frameRms = Math.sqrt(frameRms / frameSize);
    energies.push(frameRms);

    if (frameRms < silenceThreshold) {
      silentFrames++;
      continue;
    }

    // Autocorrelation for fundamental frequency (pitch)
    const pitch = autocorrelationPitch(channelData, start, frameSize, sampleRate);
    if (pitch >= 75 && pitch <= 500) {
      pitches.push(pitch);
    }
  }

  // 2. Average pitch & pitch variance
  let avgPitchHz = 0;
  let pitchVariance = 0;
  if (pitches.length > 0) {
    avgPitchHz = pitches.reduce((a, b) => a + b, 0) / pitches.length;
    const sumSqDiff = pitches.reduce((sum, p) => sum + Math.pow(p - avgPitchHz, 2), 0);
    pitchVariance = sumSqDiff / pitches.length;
  }

  // 3. Pause metrics
  const pauseRatio = numFrames > 0 ? silentFrames / numFrames : 0;
  const pauseDurationSec = pauseRatio * durationSec;

  // 4. Speech rate proxy: detect energy peak transients (syllable envelopes)
  let energyPeaks = 0;
  for (let i = 1; i < energies.length - 1; i++) {
    if (energies[i] > energies[i - 1] && energies[i] > energies[i + 1] && energies[i] > silenceThreshold * 1.5) {
      energyPeaks++;
    }
  }
  const speechRateProxy = durationSec > 0 ? parseFloat((energyPeaks / durationSec).toFixed(2)) : 0;

  // 5. Vocal Tremor (4-12 Hz modulation in energy envelope)
  // Compute modulation frequency across the smoothed energy profile
  const tremorModulationHz = detectTremorFrequency(energies, 1 / 0.02); // 50 Hz frame rate

  return {
    avgPitchHz: Math.round(avgPitchHz),
    pitchVariance: Math.round(pitchVariance),
    pauseRatio: parseFloat(pauseRatio.toFixed(3)),
    pauseDurationSec: parseFloat(pauseDurationSec.toFixed(2)),
    speechRateProxy,
    rmsAmplitude: parseFloat(meanRms.toFixed(3)),
    tremorModulationHz: parseFloat(tremorModulationHz.toFixed(1)),
    audioDurationSec: parseFloat(durationSec.toFixed(1))
  };
}

/**
 * Autocorrelation algorithm for pitch detection
 */
function autocorrelationPitch(
  buffer: Float32Array, 
  offset: number, 
  length: number, 
  sampleRate: number
): number {
  const minPeriod = Math.floor(sampleRate / 500); // ~500 Hz max
  const maxPeriod = Math.floor(sampleRate / 75);  // ~75 Hz min

  let bestPeriod = 0;
  let maxCorr = -1;

  for (let period = minPeriod; period <= maxPeriod; period++) {
    let corr = 0;
    for (let i = 0; i < length - period; i++) {
      corr += buffer[offset + i] * buffer[offset + i + period];
    }
    if (corr > maxCorr) {
      maxCorr = corr;
      bestPeriod = period;
    }
  }

  return bestPeriod > 0 ? sampleRate / bestPeriod : 0;
}

/**
 * Tremor frequency detector (detects 4-12 Hz modulation in speech power envelope)
 */
function detectTremorFrequency(energies: number[], sampleRateHz: number): number {
  if (energies.length < 50) return 0;

  // Autocorrelation over energy curve to detect modulation period
  const minLag = Math.floor(sampleRateHz / 12); // 12 Hz
  const maxLag = Math.floor(sampleRateHz / 4);  // 4 Hz

  let bestLag = 0;
  let maxCorr = -1;

  for (let lag = minLag; lag <= maxLag && lag < energies.length / 2; lag++) {
    let corr = 0;
    for (let i = 0; i < energies.length - lag; i++) {
      corr += energies[i] * energies[i + lag];
    }
    if (corr > maxCorr) {
      maxCorr = corr;
      bestLag = lag;
    }
  }

  if (bestLag > 0) {
    const freq = sampleRateHz / bestLag;
    if (freq >= 4 && freq <= 12) {
      return freq;
    }
  }

  return 0;
}
