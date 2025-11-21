import React, { useState } from 'react';
import { Playlist, VoiceConfig } from './types';
import PlaylistGenerator from './components/PlaylistGenerator';
import AudioPlayer from './components/AudioPlayer';
import { Play, ListMusic, ArrowLeft } from 'lucide-react';

const App: React.FC = () => {
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<VoiceConfig | null>(null);
  const [activeTrackIndex, setActiveTrackIndex] = useState<number | null>(null);
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);

  const handlePlaylistGenerated = (generatedPlaylist: Playlist, voice: VoiceConfig) => {
    setPlaylist(generatedPlaylist);
    setSelectedVoice(voice);
  };

  const startPlaying = (index: number) => {
    setActiveTrackIndex(index);
    setIsPlayerExpanded(true);
  };

  const closePlayer = () => {
    setActiveTrackIndex(null);
    setIsPlayerExpanded(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden selection:bg-blue-100 selection:text-blue-900">
      
      {/* Subtle Background Gradients (Light Mode) */}
      <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-blue-100/50 rounded-full blur-[120px] pointer-events-none mix-blend-multiply"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-100/50 rounded-full blur-[100px] pointer-events-none mix-blend-multiply"></div>

      {/* Main Content */}
      <div className="relative z-10 pb-24"> {/* Add padding bottom for mini player */}
        {!playlist ? (
          <PlaylistGenerator onPlaylistGenerated={handlePlaylistGenerated} />
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-8 md:py-16 animate-in slide-in-from-bottom-8 duration-700">
            
            {/* Navigation Bar */}
            <div className="flex items-center justify-between mb-8">
              <button 
                onClick={() => setPlaylist(null)}
                className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm font-medium">Home</span>
              </button>
              
              <div className="hidden md:flex items-center gap-2 text-sm text-slate-400">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Narrated by {selectedVoice?.name}
              </div>
            </div>

            {/* Header */}
            <div className="flex flex-col items-center text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-widest mb-4 shadow-sm">
                <ListMusic className="w-3 h-3" />
                <span>Generated Syllabus</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-2 tracking-tight leading-tight">{playlist.topic}</h2>
            </div>

            {/* Track List - Pills Style */}
            <div className="space-y-3">
               {playlist.tracks.map((track, index) => (
                 <div 
                   key={track.id}
                   className={`group relative bg-white border rounded-2xl p-2 pr-6 transition-all duration-300 cursor-pointer flex items-center gap-4
                     ${activeTrackIndex === index 
                       ? 'border-blue-500 shadow-md ring-1 ring-blue-100' 
                       : 'border-slate-200 hover:border-blue-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]'
                     }
                   `}
                   onClick={() => startPlaying(index)}
                 >
                   {/* Number / Play Icon Box */}
                   <div className={`w-16 h-16 flex-shrink-0 rounded-xl flex items-center justify-center font-mono text-lg transition-colors duration-300
                     ${activeTrackIndex === index
                       ? 'bg-blue-600 text-white'
                       : 'bg-slate-50 text-slate-400 group-hover:bg-blue-600 group-hover:text-white'
                     }
                   `}>
                     {activeTrackIndex === index ? (
                        <div className="flex gap-1 h-4 items-end">
                          <div className="w-1 bg-white animate-[bounce_1s_infinite] h-2"></div>
                          <div className="w-1 bg-white animate-[bounce_1s_infinite_0.2s] h-4"></div>
                          <div className="w-1 bg-white animate-[bounce_1s_infinite_0.4s] h-3"></div>
                        </div>
                     ) : (
                       <>
                         <span className="group-hover:hidden">{index + 1}</span>
                         <Play className="hidden group-hover:block w-6 h-6 fill-current" />
                       </>
                     )}
                   </div>

                   {/* Text Content */}
                   <div className="flex-grow py-2 min-w-0">
                     <h3 className={`text-lg font-semibold transition-colors truncate ${activeTrackIndex === index ? 'text-blue-700' : 'text-slate-900 group-hover:text-blue-600'}`}>
                       {track.title}
                     </h3>
                     <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
                        <span className="font-medium whitespace-nowrap">{track.author}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300 flex-shrink-0"></span>
                        <span className="truncate opacity-80">{track.description}</span>
                     </div>
                   </div>

                   {/* Hover Arrow */}
                   {activeTrackIndex !== index && (
                     <div className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300 hidden sm:block">
                       <Play className="w-5 h-5 text-slate-300" />
                     </div>
                   )}
                 </div>
               ))}
            </div>
          </div>
        )}
      </div>

      {/* Audio Player Overlay */}
      {playlist && activeTrackIndex !== null && selectedVoice && (
        <AudioPlayer 
          playlist={playlist.tracks}
          initialTrackIndex={activeTrackIndex}
          topic={playlist.topic}
          voice={selectedVoice}
          onClose={closePlayer}
          isExpanded={isPlayerExpanded}
          onToggleExpand={() => setIsPlayerExpanded(!isPlayerExpanded)}
        />
      )}
    </div>
  );
};

export default App;