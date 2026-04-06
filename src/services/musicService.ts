import { GoogleGenAI } from "@google/genai";

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export async function generateSynthwaveTrack(onProgress: (msg: string) => void): Promise<string> {
  if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await window.aistudio.openSelectKey();
      // Assume success after triggering
    }
  }

  // @ts-ignore
  const apiKey = typeof process !== 'undefined' && process.env ? (process.env.API_KEY || process.env.GEMINI_API_KEY) : '';
  
  const ai = new GoogleGenAI({ apiKey });

  onProgress("Composing 80s synthwave track...");

  const response = await ai.models.generateContentStream({
    model: "lyria-3-clip-preview",
    contents: "A fast-paced 80s synthwave track with heavy bass, retro neon vibes, driving arpeggios, and a strong 130 BPM beat. Perfect for an arcade space shooter.",
  });

  let audioBase64 = "";
  let mimeType = "audio/wav";

  for await (const chunk of response) {
    const parts = chunk.candidates?.[0]?.content?.parts;
    if (!parts) continue;
    for (const part of parts) {
      if (part.inlineData?.data) {
        if (!audioBase64 && part.inlineData.mimeType) {
          mimeType = part.inlineData.mimeType;
        }
        audioBase64 += part.inlineData.data;
        onProgress("Receiving audio data...");
      }
    }
  }

  if (!audioBase64) {
    throw new Error("Failed to generate audio.");
  }

  onProgress("Decoding audio...");
  const binary = atob(audioBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType });
  return URL.createObjectURL(blob);
}
