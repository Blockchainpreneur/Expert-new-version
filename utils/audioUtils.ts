/**
 * Converts a base64 string to an ArrayBuffer.
 */
export const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

/**
 * Decodes Raw PCM (Int16) from Gemini into an AudioBuffer (Float32).
 * Gemini usually returns 24kHz mono audio.
 */
export const decodePCM = (
  arrayBuffer: ArrayBuffer,
  audioContext: AudioContext,
  sampleRate: number = 24000
): AudioBuffer => {
  const pcm16 = new Int16Array(arrayBuffer);
  const float32 = new Float32Array(pcm16.length);

  // Convert Int16 to Float32 (-1.0 to 1.0)
  for (let i = 0; i < pcm16.length; i++) {
    float32[i] = pcm16[i] / 32768.0;
  }

  const audioBuffer = audioContext.createBuffer(1, float32.length, sampleRate);
  audioBuffer.getChannelData(0).set(float32);
  
  return audioBuffer;
};

/**
 * Helper to resume AudioContext if it's suspended (browser policy).
 */
export const ensureAudioContextReady = async (ctx: AudioContext) => {
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
};