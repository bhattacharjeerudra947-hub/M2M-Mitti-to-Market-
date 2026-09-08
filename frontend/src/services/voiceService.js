const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

const SESSION_STORAGE_KEY = 'mitti2market_ai_session_id';

/*
 * ---------------------------------------------------------
 * Get or create conversation sessionsss
 * ---------------------------------------------------------
 */

function getSessionId() {
  let sessionId =
    sessionStorage.getItem(SESSION_STORAGE_KEY);

  if (!sessionId) {
    sessionId =
      crypto.randomUUID();

    sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      sessionId
    );
  }

  return sessionId;
}

/*
 * ---------------------------------------------------------
 * Generate AI response
 * ---------------------------------------------------------
 */

export async function generateResponse(
  query,
  langCode = 'en',
  location = null
) {
  try {
    const sessionId = getSessionId();

    const response = await fetch(
      `${API_BASE_URL}/ai/ask`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: query,
          language: langCode,
          sessionId: sessionId,

          // Farmer's current GPS location
          latitude: location?.latitude ?? null,
          longitude: location?.longitude ?? null,
        }),
      }
    );

    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (data.sessionId) {
      sessionStorage.setItem(
        SESSION_STORAGE_KEY,
        data.sessionId
      );
    }

    if (!response.ok) {
      return {
        text:
          data.answer ||
          data.message ||
          'Agriculture AI service is currently unavailable.',
        detectedLang: langCode,
      };
    }

    return {
      text:
        data.answer ||
        'Sorry, I could not generate an answer.',
      detectedLang: langCode,
    };

  } catch (error) {

    console.error(
      'Agriculture AI error:',
      error
    );

    return {
      text:
        'Sorry, the agriculture AI service is temporarily unavailable. Please try again.',
      detectedLang: langCode,
    };
  }
}

/*
 * ---------------------------------------------------------
 * Start a completely new AI conversation
 * ---------------------------------------------------------
 */

export async function clearConversation() {

  try {

    const sessionId =
      sessionStorage.getItem(
        SESSION_STORAGE_KEY
      );

    if (!sessionId) {
      return;
    }

    await fetch(
      `${API_BASE_URL}/ai/memory/${sessionId}`,
      {
        method: 'DELETE',
      }
    );

  } catch (error) {

    console.error(
      'Unable to clear AI conversation:',
      error
    );

  } finally {

    sessionStorage.removeItem(
      SESSION_STORAGE_KEY
    );
  }
}