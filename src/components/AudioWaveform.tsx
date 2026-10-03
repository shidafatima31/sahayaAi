import React, { useEffect, useRef } from 'react';

interface AudioWaveformProps {
  analyser: AnalyserNode | null;
  isRecording: boolean;
  className?: string;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({ 
  analyser, 
  isRecording,
  className = '' 
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!isRecording || !analyser) {
      // Draw idle flat line
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      return;
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#14b8a6'; // teal-500
      ctx.beginPath();

      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      // Draw faint glow
      ctx.strokeStyle = 'rgba(45, 212, 191, 0.4)';
      ctx.lineWidth = 6;
      ctx.stroke();
    };

    draw();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [analyser, isRecording]);

  return (
    <div className={`relative overflow-hidden rounded-xl border border-slate-700 bg-slate-900 ${className}`}>
      <canvas 
        ref={canvasRef} 
        width={400} 
        height={100} 
        className="w-full h-24 block"
      />
      {isRecording && (
        <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-950/80 border border-red-500/50 text-red-400 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span>Live Acoustic Feed</span>
        </div>
      )}
    </div>
  );
};
