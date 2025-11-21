import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Loader2, X, ChevronDown, ChevronUp, Maximize2 } from 'lucide-react';
import { Track, PlayerState, VoiceConfig } from '../types';
import { generateTrackText, generateTrackImage, generateTrackAudio } from '../services/geminiService';
import { base64ToArrayBuffer, decodePCM, ensureAudioContextReady } from '../utils/audioUtils';
import Visualizer from './Visualizer';

interface AudioPlayerProps {
  playlist: Track[];
  initialTrackIndex: number;
  topic: string;
  voice: VoiceConfig;
  onClose: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ 
  playlist, 
  initialTrackIndex, 
  topic, 
  voice, 
  onClose,
  isExpanded,
  onToggleExpand
}) => {
  // --- State ---
  const [currentIndex, setCurrentIndex] = useState(initialTrackIndex);
  const [playerState, setPlayerState] = useState<PlayerState>(PlayerState.LOADING_TRACK);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  
  // --- Refs (The Engine) ---
  const currentJobIdRef = useRef<number>(0); 
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const cacheRef = useRef<Map<number, Track>>(new Map());

  // --- Initialization ---
  useEffect(() => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass({ sampleRate: 24000 }); 
    audioContextRef.current = ctx;
    
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    gainNodeRef.current = gainNode;

    return () => {
      ctx.close();
    };
  }, []);

  // Update current index if initial changes (mostly for keeping sync, though managed internally usually)
  useEffect(() => {
    if (initialTrackIndex !== currentIndex && initialTrackIndex !== -1) {
       loadAndPlayTrack(initialTrackIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTrackIndex]);

  // --- The Core "Job Controller" Logic ---
  const loadAndPlayTrack = useCallback(async (index: number) => {
    if (index < 0 || index >= playlist.length) return;

    const jobId = currentJobIdRef.current + 1;
    currentJobIdRef.current = jobId;

    setCurrentIndex(index);
    setPlayerState(PlayerState.LOADING_TRACK);
    
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch (e) {}
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    let trackData = cacheRef.current.get(index);
    if (!trackData) trackData = { ...playlist[index] };
    setCurrentTrack(trackData);

    // Phase B Step 2: Content Generation
    if (!trackData.fullText) {
      if (currentJobIdRef.current !== jobId) return;
      try {
        const [text, imageUrl] = await Promise.all([
          generateTrackText(trackData, topic),
          generateTrackImage(trackData)
        ]);
        if (currentJobIdRef.current !== jobId) return;
        trackData.fullText = text;
        trackData.imageUrl = imageUrl;
        cacheRef.current.set(index, trackData);
        setCurrentTrack({ ...trackData }); 
      } catch (e) {
        console.error("Error generating content", e);
        setPlayerState(PlayerState.ERROR);
        return;
      }
    }

    // Phase B Step 3: Audio Generation
    if (!trackData.audioBuffer) {
       if (currentJobIdRef.current !== jobId) return;
       try {
         const base64Audio = await generateTrackAudio(trackData.fullText!, voice.name);
         if (currentJobIdRef.current !== jobId) return;
         if (base64Audio && audioContextRef.current) {
           const arrayBuffer = base64ToArrayBuffer(base64Audio);
           const audioBuffer = decodePCM(arrayBuffer, audioContextRef.current);
           trackData.audioBuffer = audioBuffer;
           cacheRef.current.set(index, trackData);
         } else {
           throw new Error("Failed to generate audio");
         }
       } catch (e) {
         setPlayerState(PlayerState.ERROR);
         return;
       }
    }

    // Phase B Step 4: Playback
    if (currentJobIdRef.current !== jobId) return;
    if (trackData.audioBuffer && audioContextRef.current) {
      await ensureAudioContextReady(audioContextRef.current);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = trackData.audioBuffer;
      if (gainNodeRef.current) source.connect(gainNodeRef.current);
      
      source.onended = () => {
        if (currentJobIdRef.current === jobId) handleNext(); 
      };

      source.start();
      sourceNodeRef.current = source;
      setPlayerState(PlayerState.PLAYING);
      prefetchNextTrack(index + 1);
    }

  }, [playlist, topic, voice]);

  const prefetchNextTrack = async (nextIndex: number) => {
    if (nextIndex >= playlist.length) return;
    if (cacheRef.current.has(nextIndex)) return;
    try {
      let nextTrack = { ...playlist[nextIndex] };
      const [text, imageUrl] = await Promise.all([
        generateTrackText(nextTrack, topic),
        generateTrackImage(nextTrack)
      ]);
      nextTrack.fullText = text;
      nextTrack.imageUrl = imageUrl;
      if (text) {
        const base64Audio = await generateTrackAudio(text, voice.name);
        if (base64Audio && audioContextRef.current) {
           const arrayBuffer = base64ToArrayBuffer(base64Audio);
           const audioBuffer = decodePCM(arrayBuffer, audioContextRef.current);
           nextTrack.audioBuffer = audioBuffer;
        }
      }
      cacheRef.current.set(nextIndex, nextTrack);
    } catch (e) {}
  };

  const togglePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playerState === PlayerState.PLAYING) {
      audioContextRef.current?.suspend();
      setPlayerState(PlayerState.PAUSED);
    } else if (playerState === PlayerState.PAUSED) {
      audioContextRef.current?.resume();
      setPlayerState(PlayerState.PLAYING);
    }
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex < playlist.length - 1) {
      loadAndPlayTrack(currentIndex + 1);
    } else {
        setPlayerState(PlayerState.IDLE);
    }
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex > 0) {
      loadAndPlayTrack(currentIndex - 1);
    }
  };

  // Initial load
  useEffect(() => {
    if (currentIndex === initialTrackIndex && playerState === PlayerState.LOADING_TRACK && !currentTrack) {
        loadAndPlayTrack(initialTrackIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!currentTrack) return null;

  // --- RENDER: MINI PLAYER ---
  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-10 duration-300">
        <div 
          onClick={onToggleExpand}
          className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/50 p-3 flex items-center gap-4 cursor-pointer hover:bg-white transition-colors"
        >
          {/* Thumbnail */}
          <div className="w-12 h-12 rounded-lg bg-slate-200 overflow-hidden flex-shrink-0 relative">
             {currentTrack.imageUrl ? (
               <img src={currentTrack.imageUrl} className="w-full h-full object-cover" alt="Cover" />
             ) : (
               <div className="w-full h-full flex items-center justify-center">
                 <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
               </div>
             )}
          </div>

          {/* Info */}
          <div className="flex-grow min-w-0">
            <h3 className="text-sm font-bold text-slate-900 truncate">{currentTrack.title}</h3>
            <p className="text-xs text-slate-500 truncate">Chapter {currentTrack.chapterNumber} • {topic}</p>
          </div>

          {/* Mini Controls */}
          <div className="flex items-center gap-3">
            <button 
              onClick={togglePlayPause}
              className="p-2 rounded-full bg-slate-900 text-white hover:bg-slate-800 transition-colors"
            >
               {playerState === PlayerState.LOADING_TRACK ? (
                 <Loader2 className="w-4 h-4 animate-spin" />
               ) : playerState === PlayerState.PLAYING ? (
                 <Pause className="w-4 h-4 fill-current" />
               ) : (
                 <Play className="w-4 h-4 fill-current" />
               )}
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
              className="p-2 text-slate-400 hover:text-slate-600"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER: FULL PLAYER ---
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
      
      {/* Backdrop with Blur */}
      <div className="absolute inset-0 bg-white/90 backdrop-blur-xl transition-all" onClick={onToggleExpand}></div>

      {/* Main Player Card */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full h-full sm:h-[90vh] sm:max-w-5xl bg-white sm:rounded-[2.5rem] shadow-2xl border border-white/50 flex flex-col md:flex-row overflow-hidden"
      >
        
        {/* Top Bar Controls (Mobile/Desktop) */}
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-20 pointer-events-none">
          <button 
            onClick={onToggleExpand}
            className="pointer-events-auto p-2 bg-white/50 backdrop-blur-sm rounded-full hover:bg-white text-slate-600 transition-all"
          >
            <ChevronDown className="w-6 h-6" />
          </button>
          <button 
            onClick={onClose}
            className="pointer-events-auto p-2 bg-white/50 backdrop-blur-sm rounded-full hover:bg-red-50 hover:text-red-500 text-slate-400 transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Left Side: Visuals */}
        <div className="w-full md:w-1/2 h-1/3 md:h-full relative bg-slate-50 flex-shrink-0">
           {currentTrack.imageUrl ? (
             <>
                <img 
                  src={currentTrack.imageUrl} 
                  alt="Cover" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent md:from-transparent md:via-transparent pointer-events-none"></div>
             </>
           ) : (
             <div className="w-full h-full flex items-center justify-center bg-slate-50">
               <Loader2 className="w-12 h-12 text-slate-300 animate-spin" />
             </div>
           )}
           
           {/* Status Pill */}
           <div className="absolute top-6 left-1/2 -translate-x-1/2 md:left-6 md:translate-x-0 px-4 py-2 bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-white/20 flex items-center gap-2 z-10">
              {playerState === PlayerState.LOADING_TRACK ? (
                 <>
                  <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                  <span className="text-xs font-bold text-slate-800 tracking-wide">GENERATING</span>
                 </>
              ) : (
                 <>
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                  <span className="text-xs font-bold text-slate-800 tracking-wide">LIVE</span>
                 </>
              )}
           </div>
        </div>

        {/* Right Side: Controls & Text */}
        <div className="w-full md:w-1/2 h-2/3 md:h-full flex flex-col bg-white relative">
           
           {/* Content Wrapper */}
           <div className="flex flex-col h-full p-6 md:p-12">
              
              {/* Header Text */}
              <div className="space-y-3 mb-6 flex-shrink-0 mt-8 md:mt-4 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 text-blue-600 font-medium text-sm">
                   <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100">Chapter {currentTrack.chapterNumber}</span>
                   <span className="text-slate-300">•</span>
                   <span className="text-slate-500 truncate max-w-[150px]">{topic}</span>
                </div>
                <h2 className="text-2xl md:text-4xl font-bold text-slate-900 leading-tight tracking-tight line-clamp-2">{currentTrack.title}</h2>
                <p className="text-base md:text-lg text-slate-500">{currentTrack.author}</p>
              </div>

              {/* Scrollable Text Area */}
              <div className="flex-grow overflow-y-auto pr-2 mb-6 scrollbar-hide mask-image-gradient">
                {currentTrack.fullText ? (
                  <p className="text-slate-600 leading-relaxed text-lg whitespace-pre-wrap font-serif opacity-0 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-forwards">
                    {currentTrack.fullText}
                  </p>
                ) : (
                  <div className="space-y-3 animate-pulse opacity-50">
                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-200 rounded w-full"></div>
                    <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                    <div className="h-4 bg-slate-200 rounded w-4/5"></div>
                    <div className="h-4 bg-slate-200 rounded w-full"></div>
                  </div>
                )}
              </div>

              {/* Bottom Controls Container */}
              <div className="bg-slate-50 rounded-3xl p-6 shadow-inner border border-slate-100 mt-auto flex-shrink-0">
                 {/* Visualizer */}
                 <div className="mb-6 h-12 w-full opacity-50 flex items-end justify-center">
                    <Visualizer 
                      audioContext={audioContextRef.current} 
                      sourceNode={sourceNodeRef.current}
                      isPlaying={playerState === PlayerState.PLAYING}
                    />
                 </div>

                 {/* Buttons */}
                 <div className="flex items-center justify-center gap-6 md:gap-10">
                    <button 
                      onClick={handlePrev}
                      disabled={currentIndex === 0}
                      className="p-2 text-slate-400 hover:text-slate-900 transition-colors disabled:opacity-20"
                    >
                      <SkipBack className="w-8 h-8" />
                    </button>

                    <button 
                      onClick={togglePlayPause}
                      disabled={playerState === PlayerState.LOADING_TRACK}
                      className="p-6 bg-slate-900 text-white rounded-full shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-80 disabled:scale-100"
                    >
                      {playerState === PlayerState.LOADING_TRACK ? (
                        <Loader2 className="w-8 h-8 animate-spin" />
                      ) : playerState === PlayerState.PLAYING ? (
                        <Pause className="w-8 h-8 fill-current" />
                      ) : (
                        <Play className="w-8 h-8 fill-current ml-1" />
                      )}
                    </button>

                    <button 
                      onClick={handleNext}
                      disabled={currentIndex === playlist.length - 1}
                      className="p-2 text-slate-400 hover:text-slate-900 transition-colors disabled:opacity-20"
                    >
                      <SkipForward className="w-8 h-8" />
                    </button>
                 </div>
              </div>

           </div>
        </div>

      </div>
    </div>
  );
};

export default AudioPlayer;