import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';

// We initialize the client only when needed to handle potential missing keys gracefully in UI
const getAiClient = () => {
  if (!apiKey) {
    console.warn("API Key is missing for Gemini Service");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateSmartQRContent = async (userPrompt: string): Promise<string> => {
  const ai = getAiClient();
  if (!ai) {
    throw new Error("Gemini API Key is not configured.");
  }

  const systemInstruction = `
    You are an expert helper for a QR Code Generator app. 
    Your goal is to translate user intent into the correct raw string format for QR codes.
    
    Rules:
    1. If the user asks for WiFi, return strict format: WIFI:S:MySSID;T:WPA;P:MyPass;;
    2. If the user asks for a Contact/VCard, return strict VCard 3.0 format.
    3. If the user asks for a URL, return the clean URL.
    4. If the user asks for an Email/SMS, return 'mailto:...' or 'smsto:...'.
    5. If the user wants a summary or creative text, provide just the text.
    6. Return ONLY the raw string for the QR code. No markdown, no explanations.
    
    Examples:
    Input: "Wifi for HomeNetwork password secure123"
    Output: WIFI:T:WPA;S:HomeNetwork;P:secure123;;
    
    Input: "Email to john@example.com subject Hello body How are you"
    Output: mailto:john@example.com?subject=Hello&body=How%20are%20you
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.1, // Low temperature for deterministic formatting
      }
    });

    const text = response.text;
    return text ? text.trim() : '';
  } catch (error) {
    console.error("Gemini generation error:", error);
    throw new Error("Failed to generate smart content. Please try again.");
  }
};