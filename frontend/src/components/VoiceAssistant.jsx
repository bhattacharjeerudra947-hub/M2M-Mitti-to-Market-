import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Mic, Volume2, VolumeX, Loader2, MessageCircle,
  Square, RotateCcw, AlertTriangle, Bot,
} from 'lucide-react';
import { useFarmerLanguage } from '../context/FarmerContext';
import { t_key, getLanguageByCode } from '../data/farmerTranslations';
import { generateResponse } from '../services/voiceService';

/* ───────── helpers ───────── */

function isSpeechSupported() {
  return typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
}

function isTTSSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

const LANG_BCP47 = {
  en:'en-IN', hi:'hi-IN', bn:'bn-IN', ta:'ta-IN', te:'te-IN', mr:'mr-IN',
  gu:'gu-IN', kn:'kn-IN', ml:'ml-IN', pa:'pa-IN', or:'or-IN', as:'as-IN',
  ks:'ks-IN', kok:'kok-IN', mai:'mai-IN', brx:'brx-IN', doi:'doi-IN',
  sd:'sd-IN', mni:'mni-IN', ne:'ne-IN', sa:'sa-IN', sat:'sat-IN', ur:'ur-IN',
};

/* ───────── component ───────── */

export default function VoiceAssistant() {
  const { language } = useFarmerLanguage();

  const [phase, setPhase] = useState('idle');
  const [response, setResponse] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [textMode, setTextMode] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [expanded, setExpanded] = useState(false);

  const recognitionRef = useRef(null);
  const synthRef = useRef(null);

  // Ref to always have access to the latest language value
  const langRef = useRef(language);
  langRef.current = language;

  /* Clean up on unmount */
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
      if (isTTSSupported()) window.speechSynthesis.cancel();
    };
  }, []);

  /* Stop TTS when language changes */
  useEffect(() => {
    if (isTTSSupported()) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [language]);

  /* ── Text-to-Speech (stable, no deps) ── */
  const speakText = useCallback((text) => {
    if (!isTTSSupported()) return;
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = LANG_BCP47[langRef.current] || 'en-IN';
    utter.rate = 0.9;
    utter.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const match = voices.find((v) => v.lang.startsWith(langRef.current)) ||
                  voices.find((v) => v.lang.startsWith('hi')) ||
                  voices[0];
    if (match) utter.voice = match;

    utter.onstart = () => setIsSpeaking(true);
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utter);
    synthRef.current = utter;
  }, []);

  const stopSpeaking = useCallback(() => {
    if (isTTSSupported()) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  /* ── Process query (stable — reads langRef) ── */
  const processQuery = useCallback(async (query) => {
    const lang = langRef.current;
    setPhase('processing');
    setExpanded(true);

    try {
      const result = await generateResponse(query, lang);
      const resp = result.text || t_key(lang, 'aiError');
      setResponse(resp);
      setChatHistory((prev) => [
        ...prev,
        { role: 'user', text: query },
        { role: 'assistant', text: resp },
      ]);
      setPhase('answered');
      setTimeout(() => speakText(resp), 300);
    } catch {
      setPhase('error');
      setErrorMessage(t_key(lang, 'aiError'));
    }
  }, [speakText]);

  /* ── Start listening (stable — reads langRef + processQueryRef) ── */
  const processQueryRef = useRef(processQuery);
  processQueryRef.current = processQuery;

  const startListening = useCallback(() => {
    const lang = langRef.current;

    if (!isSpeechSupported()) {
      setPhase('error');
      setErrorMessage(t_key(lang, 'recognitionError'));
      setTextMode(true);
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = LANG_BCP47[lang] || 'en-IN';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    setPhase('listening');
    setResponse('');
    setErrorMessage('');
    if (isTTSSupported()) window.speechSynthesis.cancel();
    setIsSpeaking(false);

    let finalTranscript = '';

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      // Use interim for display if no final yet
      if (!finalTranscript.trim() && interim) {
        setResponse(interim);
      }
    };

    recognition.onerror = (event) => {
      const l = langRef.current;
      if (event.error === 'no-speech') {
        setPhase('error');
        setErrorMessage(t_key(l, 'noSpeech'));
      } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setPhase('error');
        setErrorMessage(t_key(l, 'permissionDenied'));
      } else if (event.error === 'network') {
        setPhase('error');
        setErrorMessage(t_key(l, 'networkError'));
      } else if (event.error === 'aborted') {
        setPhase('idle');
      } else {
        setPhase('error');
        setErrorMessage(t_key(l, 'recognitionError'));
      }
    };

    recognition.onend = () => {
      if (finalTranscript.trim()) {
        processQueryRef.current(finalTranscript.trim());
      } else {
        setPhase('error');
        setErrorMessage(t_key(langRef.current, 'noSpeech'));
      }
    };

    try {
      recognition.start();
    } catch {
      setPhase('error');
      setErrorMessage(t_key(lang, 'recognitionError'));
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
  }, []);

  /* ── Text input fallback ── */
  const handleTextSubmit = (e) => {
    e.preventDefault();
    const q = textInput.trim();
    if (!q) return;
    setTextInput('');
    processQuery(q);
  };

  const toggleSpeak = useCallback(() => {
    if (isSpeaking) {
      stopSpeaking();
    } else if (response) {
      speakText(response);
    }
  }, [isSpeaking, response, speakText, stopSpeaking]);

  const reset = useCallback(() => {
    stopSpeaking();
    setPhase('idle');
    setResponse('');
    setErrorMessage('');
    setExpanded(false);
  }, [stopSpeaking]);

  /* ── UI ── */
  const lang = getLanguageByCode(language);

  return (
    <div className="w-full">
      <div className="bg-gradient-to-br from-primary-50 via-white to-mustard-50 rounded-2xl border border-primary-200 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary-700" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-navy-900">{t_key(language, 'voiceAssistant')}</h3>
            <p className="text-xs text-navy-500 mt-0.5 max-w-xs">{t_key(language, 'voiceAssistantDesc')}</p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 py-2">
          {phase === 'idle' && (
            <>
              <button
                onClick={() => { setExpanded(true); startListening(); }}
                className="group relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-xl shadow-primary-200 hover:shadow-2xl hover:shadow-primary-300 active:scale-95 transition-all duration-200 flex items-center justify-center"
                aria-label={t_key(language, 'speakToUs')}
              >
                <Mic className="w-10 h-10 sm:w-12 sm:h-12 group-hover:scale-110 transition-transform" />
                <span className="absolute inset-0 rounded-full bg-primary-400 opacity-0 group-hover:opacity-20 group-active:opacity-30 transition-opacity animate-pulse" />
              </button>
              <p className="text-sm font-semibold text-navy-700 text-center">
                {t_key(language, 'speakToUs')}
              </p>
            </>
          )}

          {phase === 'listening' && (
            <>
              <button
                onClick={stopListening}
                className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white shadow-xl shadow-red-200 active:scale-95 transition-all duration-200 flex items-center justify-center"
                aria-label={t_key(language, 'stopRecording')}
              >
                <Square className="w-8 h-8 sm:w-10 sm:h-10" />
                <span className="absolute inset-0 rounded-full border-4 border-red-400 animate-ping opacity-30" />
                <span className="absolute -inset-3 rounded-full border-2 border-red-300 animate-pulse opacity-20" />
              </button>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <p className="text-sm font-semibold text-red-600">{t_key(language, 'listening')}</p>
              </div>
              {response && (
                <p className="text-xs text-navy-500 italic max-w-xs text-center">{response}</p>
              )}
            </>
          )}

          {phase === 'processing' && (
            <>
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-mustard-400 to-mustard-500 text-white shadow-xl shadow-mustard-200 flex items-center justify-center">
                <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin" />
              </div>
              <p className="text-sm font-semibold text-mustard-700">{t_key(language, 'processing')}</p>
            </>
          )}

          {phase === 'answered' && (
            <>
              <button
                onClick={() => startListening()}
                className="group w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-xl shadow-primary-200 hover:shadow-2xl active:scale-95 transition-all duration-200 flex items-center justify-center"
                aria-label={t_key(language, 'askAnother')}
              >
                <Mic className="w-10 h-10 sm:w-12 sm:h-12 group-hover:scale-110 transition-transform" />
              </button>
              <p className="text-sm font-semibold text-primary-700">{t_key(language, 'askAnother')}</p>
            </>
          )}

          {phase === 'error' && (
            <>
              <button
                onClick={() => { setExpanded(true); startListening(); }}
                className="group w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-navy-600 to-navy-700 text-white shadow-xl shadow-navy-200 hover:shadow-2xl active:scale-95 transition-all duration-200 flex items-center justify-center"
                aria-label={t_key(language, 'speakToUs')}
              >
                <Mic className="w-10 h-10 sm:w-12 sm:h-12 group-hover:scale-110 transition-transform" />
              </button>
              <div className="flex items-start gap-2 max-w-xs text-center">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-sm text-navy-700">{errorMessage}</p>
              </div>
              <button
                onClick={() => { setPhase('idle'); setErrorMessage(''); setTextMode(true); }}
                className="text-xs text-navy-500 underline hover:text-navy-700"
              >
                {t_key(language, 'typeFallback')}
              </button>
            </>
          )}
        </div>

        {/* ─── Text input fallback ─── */}
        {textMode && (phase === 'idle' || phase === 'error' || phase === 'answered') && (
          <form onSubmit={handleTextSubmit} className="mt-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={t_key(language, 'typeFallback')}
                className="flex-1 px-4 py-3 rounded-xl border border-navy-200 bg-white text-sm text-navy-800 placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition"
              />
              <button
                type="submit"
                disabled={!textInput.trim()}
                className="px-5 py-3 bg-navy-900 text-white text-sm font-semibold rounded-xl hover:bg-navy-800 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
              >
                {t_key(language, 'sending').replace('...', '→')}
              </button>
            </div>
          </form>
        )}

        {!textMode && phase === 'idle' && (
          <button
            onClick={() => setTextMode(true)}
            className="mt-3 w-full text-center text-xs text-navy-400 hover:text-navy-600 transition"
          >
            {t_key(language, 'typeFallback')}
          </button>
        )}

        {/* ─── Conversation Cards ─── */}
        {expanded && chatHistory.length > 0 && (
          <div className="mt-5 space-y-4 border-t border-primary-100 pt-4">
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-primary-700" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-navy-900 text-white rounded-br-md'
                      : 'bg-white border border-navy-100 text-navy-800 rounded-bl-md shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            ))}

            {phase === 'answered' && response && (
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={toggleSpeak}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 text-xs font-semibold rounded-full border border-primary-200 hover:bg-primary-100 transition"
                >
                  {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  {isSpeaking ? t_key(language, 'stopSpeaking') : t_key(language, 'playResponse')}
                </button>
                <button
                  onClick={() => startListening()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-mustard-50 text-mustard-700 text-xs font-semibold rounded-full border border-mustard-200 hover:bg-mustard-100 transition"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {t_key(language, 'askAnother')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── Footer controls ─── */}
        {expanded && (
          <div className="mt-4 flex justify-between items-center border-t border-navy-50 pt-3">
            <button
              onClick={reset}
              className="flex items-center gap-1.5 text-xs text-navy-400 hover:text-navy-600 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t_key(language, 'clearChat')}
            </button>
            <span className="text-[10px] text-navy-300 font-medium">
              {lang.native} · {lang.name}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
