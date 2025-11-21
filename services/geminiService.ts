import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Track } from "../types";

// Initialize GenAI Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Phase A: Generate the Playlist Skeleton
 */
export const generatePlaylist = async (topic: string): Promise<Track[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Create a curated list of 5 distinct audio chapters to teach someone about: "${topic}".
      Each chapter should have a catchy title, an author name (can be a historical figure or expert related to the topic), and a 1-sentence description.
      Return strictly JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              chapterNumber: { type: Type.INTEGER },
              title: { type: Type.STRING },
              author: { type: Type.STRING },
              description: { type: Type.STRING },
            },
            required: ["chapterNumber", "title", "author", "description"],
          },
        },
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return data.map((item: any, index: number) => ({
        id: index,
        ...item,
      }));
    }
    throw new Error("No data returned from Gemini");
  } catch (error) {
    console.error("Error generating playlist:", error);
    throw error;
  }
};

/**
 * Phase B (Step 2): Generate the "Meat" (Text Content)
 */
export const generateTrackText = async (track: Track, topic: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Flash is fast enough for text generation
      contents: `Write a compelling, educational script (approx 200-300 words) for an audio chapter.
      Topic: ${topic}
      Chapter: ${track.title} by ${track.author}
      Context: ${track.description}
      
      Style: Engaging, clear, like a high-quality podcast or audiobook. Do not include "Scene" or sound effect instructions. Just the spoken text.`,
    });

    return response.text || "Content generation failed.";
  } catch (error) {
    console.error("Error generating text:", error);
    return "Sorry, I couldn't generate the text for this chapter.";
  }
};

/**
 * Phase B (Step 2): Generate Cover Art
 */
export const generateTrackImage = async (track: Track): Promise<string | undefined> => {
  try {
    // Using Flash Image for speed and efficiency
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [{
          text: `A minimalist, abstract, high-design album cover for a podcast chapter titled "${track.title}". 
          Theme: Knowledge, Modern, Digital Art. 
          Colors: Dark slate, electric blue, gold. 
          No text on image.`
        }]
      },
    });

    // Iterate to find image part
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return undefined;
  } catch (error) {
    console.error("Error generating image:", error);
    return undefined;
  }
};

/**
 * Phase B (Step 3): Generate Audio (TTS)
 */
export const generateTrackAudio = async (text: string, voiceName: string): Promise<string | undefined> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio;
  } catch (error) {
    console.error("Error generating audio:", error);
    return undefined;
  }
};