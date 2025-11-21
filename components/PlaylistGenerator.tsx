import React, { useState, useRef } from 'react';
import { Sparkles, PlayCircle, BookOpen, User, Play, Pause, Volume2 } from 'lucide-react';
import { Playlist, AVAILABLE_VOICES, VoiceConfig } from '../types';
import { generatePlaylist, generateTrackAudio } from '../services/geminiService';
import { base64ToArrayBuffer, decodePCM } from '../utils/audioUtils';

interface PlaylistGeneratorProps {
  onPlaylistGenerated: (playlist: Playlist, voice: VoiceConfig) => void;
}

const SUGGESTIONS = [
  { 
    category: "Business Growth", 
    topics: [
      "Scaling Friction: The 50-Person Breaking Point", 
      "The Unit Economics of Virality", 
      "Escaping the 'Founder Centric' Trap"
    ] 
  },
  { 
    category: "Psychology & Hypnosis", 
    topics: [
      "The Placebo Effect as a Performance Tool", 
      "Rewiring Subconscious Limiting Beliefs", 
      "Altered States: Flow vs. Self-Hypnosis"
    ] 
  },
  { 
    category: "Empathy & Leadership", 
    topics: [
      "The Psychology of Radical Delegation", 
      "Mirror Neurons in Team Conflict", 
      "Perception vs. Intention in Management"
    ] 
  },
  { 
    category: "Cognitive Science", 
    topics: [
      "The Neuroscience of Decision Fatigue", 
      "Dopamine Loops in Product Design", 
      "Neuroplasticity in Adult Learning"
    ] 
  },
  { 
    category: "Strategic Thinking", 
    topics: [
      "Game Theory in High-Stakes Negotiation", 
      "The Sunk Cost Fallacy in Innovation", 
      "Asymmetric Upside in Crisis Management"
    ] 
  },
  { 
    category: "Biohacking & Performance", 
    topics: [
      "Optimizing Circadian Rhythms for Focus", 
      "Nutritional Psychiatry: Food and Mood", 
      "Breathwork for Nervous System Regulation"
    ] 
  }
];

const PlaylistGenerator: React.FC<PlaylistGeneratorProps> = ({ onPlaylistGenerated }) => {
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<VoiceConfig>(AVAILABLE_VOICES[0]);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  
  // Refs for voice preview audio
  const previewCtxRef = useRef<AudioContext | null>(null);
  const previewSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const handleGenerate = async (e?: React.FormEvent, customTopic?: string) => {
    if (e) e.preventDefault();
    const topicToUse = customTopic || topic;
    if (!topicToUse.trim()) return;

    if (customTopic) setTopic(customTopic);

    setIsLoading(true);
    try {
      const tracks = await generatePlaylist(topicToUse);
      onPlaylistGenerated({ topic: topicToUse, tracks }, selectedVoice);
    } catch (error) {
      alert("Failed to generate playlist. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayPreview = async (e: React.MouseEvent, voice: VoiceConfig) => {
    e.stopPropagation();
    
    // Stop existing preview
    if (previewSourceRef.current) {
      previewSourceRef.current.stop();
      previewSourceRef.current = null;
    }
    if (previewingVoiceId === voice.id) {
      setPreviewingVoiceId(null);
      return;
    }

    setPreviewingVoiceId(voice.id);

    try {
      const text = `Hello, I'm ${voice.name}. Ready to learn something new?`;
      const base64Audio = await generateTrackAudio(text, voice.name);
      
      if (base64Audio) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = previewCtxRef.current || new AudioContextClass({ sampleRate: 24000 });
        previewCtxRef.current = ctx;

        if (ctx.state === 'suspended') await ctx.resume();

        const arrayBuffer = base64ToArrayBuffer(base64Audio);
        const audioBuffer = decodePCM(arrayBuffer, ctx);

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => setPreviewingVoiceId(null);
        source.start();
        previewSourceRef.current = source;
      }
    } catch (error) {
      console.error("Preview failed", error);
      setPreviewingVoiceId(null);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[80vh]">
      
      {/* Hero Section */}
      <div className="text-center mb-12 space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-sm font-medium animate-in fade-in slide-in-from-bottom-4">
          <Sparkles className="w-4 h-4" />
          <span>AI-Powered Learning</span>
        </div>
        <h1 className="text-6xl font-extrabold text-slate-900 tracking-tight mb-4">
          Expert<span className="text-blue-600">.app</span>
        </h1>
        <p className="text-slate-500 text-xl max-w-xl mx-auto leading-relaxed">
          Generate custom audiobooks on any topic instantly. <br/>
          Structured like a course, narrated like a pro.
        </p>
      </div>

      {/* Main Input Card */}
      <div className="w-full max-w-2xl bg-white rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-slate-100 p-2 overflow-hidden">
        <form onSubmit={(e) => handleGenerate(e)} className="flex flex-col gap-2">
          
          {/* Input Area */}
          <div className="relative group">
            <input
              id="topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What do you want to learn today?"
              className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border-0 rounded-full px-8 py-6 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg outline-none"
              autoComplete="off"
            />
            <div className="absolute right-3 top-3">
               <button
                type="submit"
                disabled={isLoading || !topic}
                className="bg-slate-900 text-white p-3 rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-slate-900 transition-all duration-300 shadow-lg"
              >
                {isLoading ? (
                   <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <PlayCircle className="w-6 h-6 fill-current" />
                )}
              </button>
            </div>
          </div>

          {/* Voice Selection Pills */}
          <div className="px-4 pb-4 pt-2">
            <div className="flex items-center justify-between mb-3 px-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Narrator</span>
              <span className="text-xs text-slate-400">Preview available</span>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {AVAILABLE_VOICES.map((voice) => {
                const isSelected = selectedVoice.id === voice.id;
                const isPreviewing = previewingVoiceId === voice.id;
                
                return (
                  <div
                    key={voice.id}
                    onClick={() => setSelectedVoice(voice)}
                    className={`
                      group relative flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer border transition-all duration-200
                      ${isSelected 
                        ? 'bg-slate-900 border-slate-900 text-white shadow-md' 
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}
                    `}
                  >
                    <span className="text-sm font-medium">{voice.name}</span>
                    
                    {/* Play Preview Button */}
                    <button
                      onClick={(e) => handlePlayPreview(e, voice)}
                      className={`
                        flex items-center justify-center w-6 h-6 rounded-full transition-colors
                        ${isSelected ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600'}
                      `}
                      title="Test Voice"
                    >
                       {isPreviewing ? (
                         <span className="flex gap-0.5 h-2 items-end">
                           <span className="w-0.5 bg-current h-full animate-[bounce_1s_infinite]"></span>
                           <span className="w-0.5 bg-current h-2/3 animate-[bounce_1s_infinite_0.2s]"></span>
                           <span className="w-0.5 bg-current h-1/2 animate-[bounce_1s_infinite_0.4s]"></span>
                         </span>
                       ) : (
                         <Play className="w-3 h-3 fill-current" />
                       )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

        </form>
      </div>

      {/* Quick Picks */}
      <div className="mt-12 w-full max-w-4xl">
        <p className="text-center text-slate-400 text-sm font-medium mb-6 uppercase tracking-wider">Curated Deep Dives</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {SUGGESTIONS.map((group) => (
             <div key={group.category} className="flex flex-col gap-3">
               <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider md:text-left ml-1 opacity-60">{group.category}</h3>
               {group.topics.map(t => (
                 <button 
                   key={t}
                   onClick={() => handleGenerate(undefined, t)}
                   disabled={isLoading}
                   className="text-left px-4 py-3 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 hover:text-blue-700 text-slate-600 text-sm transition-all duration-200 truncate"
                   title={t}
                 >
                   {t}
                 </button>
               ))}
             </div>
           ))}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-16 flex gap-8 text-slate-400">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          <span className="text-sm">Curated Chapters</span>
        </div>
        <div className="flex items-center gap-2">
          <User className="w-4 h-4" />
          <span className="text-sm">Gemini 2.5 Voice</span>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm">Real-time Gen</span>
        </div>
      </div>
    </div>
  );
};

export default PlaylistGenerator;