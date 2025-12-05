/**
 * Gemini Service - Secure API Client
 *
 * This service calls our secure serverless function instead of
 * directly calling the Gemini API. The API key is stored securely
 * on the server side.
 */

// API endpoint - works for both local and production
const getApiEndpoint = (): string => {
  // In production (Vercel), use relative path
  // In development, use the same origin
  return '/api/gemini';
};

/**
 * Generate smart QR content using AI
 * @param userPrompt - The user's prompt describing what QR code they want
 * @returns The generated QR code content string
 */
export const generateSmartQRContent = async (userPrompt: string): Promise<string> => {
  // Input validation on client side (server also validates)
  if (!userPrompt || typeof userPrompt !== 'string') {
    throw new Error('Please enter a valid prompt');
  }

  const trimmedPrompt = userPrompt.trim();
  if (trimmedPrompt.length === 0) {
    throw new Error('Prompt cannot be empty');
  }

  if (trimmedPrompt.length > 1000) {
    throw new Error('Prompt is too long. Maximum 1000 characters allowed.');
  }

  try {
    const response = await fetch(getApiEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: trimmedPrompt }),
    });

    // Handle rate limiting
    if (response.status === 429) {
      const remaining = response.headers.get('X-RateLimit-Remaining');
      throw new Error(
        remaining === '0'
          ? 'Rate limit exceeded. Please wait a moment and try again.'
          : 'Service is busy. Please try again shortly.'
      );
    }

    // Handle other errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to generate content. Please try again.');
    }

    const data = await response.json();

    if (!data.success || !data.content) {
      throw new Error('Invalid response from server');
    }

    return data.content;
  } catch (error) {
    // Re-throw if it's already our custom error
    if (error instanceof Error) {
      // Network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error. Please check your connection and try again.');
      }
      throw error;
    }

    // Unknown error
    throw new Error('An unexpected error occurred. Please try again.');
  }
};

/**
 * Check if AI feature is available
 * In serverless setup, we assume it's available if the endpoint exists
 */
export const isAIAvailable = (): boolean => {
  return true; // Always true as server handles API key
};
