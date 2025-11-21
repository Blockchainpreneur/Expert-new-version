export interface Track {
  id: number;
  chapterNumber: number;
  title: string;
  author: string;
  description: string; // Short description for the list
  fullText?: string; // "Meat" - Generated later
  imageUrl?: string; // "Meat" - Generated later
  audioBuffer?: AudioBuffer; // "Audio" - Generated last
  isDurationEstimated?: boolean;
}

export interface Playlist {
  topic: string;
  tracks: Track[];
}

export interface VoiceConfig {
  name: string;
  id: string;
}

export const AVAILABLE_VOICES: VoiceConfig[] = [
  { name: 'Puck', id: 'Puck' },
  { name: 'Kore', id: 'Kore' },
  { name: 'Fenrir', id: 'Fenrir' },
  { name: 'Charon', id: 'Charon' },
  { name: 'Zephyr', id: 'Zephyr' },
];

export enum PlayerState {
  IDLE = 'IDLE',
  LOADING_SKELETON = 'LOADING_SKELETON', // Generating playlist
  LOADING_TRACK = 'LOADING_TRACK', // Generating text/image/audio
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  ERROR = 'ERROR'
}