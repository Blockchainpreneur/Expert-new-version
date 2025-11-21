import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  audioContext: AudioContext | null;
  sourceNode: AudioBufferSourceNode | null;
  isPlaying: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ audioContext, sourceNode, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const requestRef = useRef<number>(0);

  useEffect(() => {
    if (!audioContext || !sourceNode || !isPlaying) return;

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    sourceNode.connect(analyser);
    analyserRef.current = analyser;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      requestRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Wider bars for cleaner look
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2; // Scale

        // Gradient suited for light mode (Blue to Violet)
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#2563eb'); // Blue 600
        gradient.addColorStop(1, '#9333ea'); // Purple 600

        ctx.fillStyle = gradient;
        
        // Rounded tops for bars
        ctx.beginPath();
        ctx.roundRect(x, canvas.height - barHeight, barWidth - 1, barHeight, [2, 2, 0, 0]);
        ctx.fill();

        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [audioContext, sourceNode, isPlaying]);

  return (
    <canvas 
      ref={canvasRef} 
      width={300} 
      height={60} 
      className="w-full h-full"
    />
  );
};

export default Visualizer;