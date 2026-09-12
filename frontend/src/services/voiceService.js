import { getEmergencyAgriResponse } from '../utils/agriSpeechHelper';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

const SESSION_STORAGE_KEY = 'mitti2market_ai_session_id';

/*
 * ---------------------------------------------------------
 * Get or create conversation session
 * ---------------------------------------------------------
 */
export function getSessionId() {
  let sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  return sessionId;
}

/*
 * ---------------------------------------------------------
 * Generate AI response (standard request with dual text & voice output)
 * ---------------------------------------------------------
 */
export async function generateResponse(
  query,
  langCode = 'en',
  location = null,
  district = null,
  state = null
) {
  try {
    const sessionId = getSessionId();

    const response = await fetch(`${API_BASE_URL}/ai/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: query,
        language: langCode,
        sessionId: sessionId,
        district: district || null,
        state: state || null,
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
      }),
    });

    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (data.sessionId) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, data.sessionId);
    }

    if (!response.ok) {
      // Use smart emergency agronomy fallback if server returns non-OK
      const emergency = getEmergencyAgriResponse(query, langCode);
      return {
        text: data.answer || emergency.text,
        spokenText: data.spokenText || emergency.spokenText || data.answer,
        crop: data.crop || emergency.crop || null,
        intent: data.intent || emergency.intent || 'GENERAL',
        mandiData: data.mandiData || [],
        detectedLang: langCode,
      };
    }

    return {
      text: data.answer || 'Sorry, I could not generate an answer.',
      spokenText: data.spokenText || data.answer || '',
      crop: data.crop || null,
      intent: data.intent || 'GENERAL',
      mandiData: data.mandiData || [],
      district: data.district || district,
      matchedDistrict: data.matchedDistrict ?? false,
      detectedLang: langCode,
    };
  } catch (error) {
    console.warn('Backend unavailable, using expert Krishi knowledge base:', error);
    const emergency = getEmergencyAgriResponse(query, langCode);
    return {
      text: emergency.text,
      spokenText: emergency.spokenText,
      crop: emergency.crop || null,
      intent: emergency.intent || 'GENERAL',
      mandiData: [],
      detectedLang: langCode,
    };
  }
}

/*
 * ---------------------------------------------------------
 * Streaming response for real-time speech and UI update
 * ---------------------------------------------------------
 */
export async function generateResponseStream(
  query,
  langCode = 'en',
  location = null,
  district = null,
  state = null,
  { onChunk, onComplete, onError }
) {
  try {
    const sessionId = getSessionId();
    const params = new URLSearchParams({
      question: query,
      language: langCode,
      sessionId: sessionId,
    });
    if (district) params.append('district', district);
    if (state) params.append('state', state);
    if (location?.latitude) params.append('latitude', location.latitude);
    if (location?.longitude) params.append('longitude', location.longitude);

    const response = await fetch(`${API_BASE_URL}/ai/stream?${params.toString()}`, {
      headers: {
        'Accept': 'text/event-stream',
      },
    });

    if (!response.ok) {
      // Fall back to standard generateResponse if stream endpoint fails
      const fallback = await generateResponse(query, langCode, location, district, state);
      if (onChunk) onChunk(fallback.text);
      if (onComplete) onComplete(fallback);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const block of lines) {
        const dataMatch = block.match(/data:(.*)/);
        const eventMatch = block.match(/event:(.*)/);
        const eventType = eventMatch ? eventMatch[1].trim() : 'chunk';

        if (eventType === 'chunk' && dataMatch) {
          const chunkText = dataMatch[1].trim();
          fullText += chunkText + ' ';
          if (onChunk) onChunk(chunkText);
        } else if (eventType === 'complete') {
          if (onComplete) {
            onComplete({
              text: fullText.trim(),
              spokenText: fullText.trim(),
              detectedLang: langCode,
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('Stream failed, falling back to standard request:', err);
    if (onError) onError(err);
  }
}

/*
 * ---------------------------------------------------------
 * Start a completely new AI conversation / Reset memory
 * ---------------------------------------------------------
 */
export async function clearConversation() {
  try {
    const sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (sessionId) {
      await fetch(`${API_BASE_URL}/ai/memory/${sessionId}`, {
        method: 'DELETE',
      });
    }
  } catch (error) {
    console.error('Unable to clear AI conversation:', error);
  } finally {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }
}