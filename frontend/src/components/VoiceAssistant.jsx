import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Mic, Volume2, VolumeX, Loader2, MessageCircle,
  Square, RotateCcw, AlertTriangle, Bot, Send, Sparkles,
  MapPin, CheckCircle2, ChevronRight, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFarmerLanguage } from '../context/FarmerContext';
import { t_key, getLanguageByCode } from '../data/farmerTranslations';
import { generateResponse, clearConversation } from '../services/voiceService';
import {
  normalizeAgriSpeech,
  hasLocationIntent,
  cleanTextForTTS
} from '../utils/agriSpeechHelper';

/* ───────── constants & voice mapping ───────── */

const LANG_BCP47 = {
  en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN', ta: 'ta-IN', te: 'te-IN', mr: 'mr-IN',
  gu: 'gu-IN', kn: 'kn-IN', ml: 'ml-IN', pa: 'pa-IN', or: 'or-IN', as: 'as-IN',
  ks: 'ks-IN', kok: 'kok-IN', mai: 'mai-IN', brx: 'brx-IN', doi: 'doi-IN',
  sd: 'sd-IN', mni: 'mni-IN', ne: 'ne-IN', sa: 'sa-IN', sat: 'sat-IN', ur: 'ur-IN',
};

// Suggestion chips by language
const SUGGESTIONS = {
  hi: [
    '🍅 टमाटर का आज का भाव?',
    '🥔 आलू की मंडी दर क्या है?',
    '🌾 गेहूं में कौन सी खाद डालें?',
    '🐛 कीटों से फसल कैसे बचाएं?',
  ],
  bn: [
    '🍅 টমেটোর আজকের দাম কত?',
    '🥔 আলুর মান্ডি দর কত?',
    '🌾 ধানে কোন সার দেব?',
    '🐛 পোকা মাকড় থেকে ফসল রক্ষা কীভাবে?',
  ],
  en: [
    '🍅 What is today\'s tomato price?',
    '🥔 Latest potato mandi rate?',
    '🌾 Which fertilizer should I use for wheat?',
    '🐛 How to protect crops from pests?',
  ],
};

function isSpeechSupported() {
  return typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
}

function isTTSSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export default function VoiceAssistant() {
  const { language } = useFarmerLanguage();
  const { user } = useAuth();

  // State
  const [phase, setPhase] = useState('idle'); // 'idle' | 'listening' | 'thinking' | 'speaking' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentlySpeakingIndex, setCurrentlySpeakingIndex] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [farmerLocation, setFarmerLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('idle'); // 'idle' | 'requesting' | 'granted' | 'denied'
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [processingTopic, setProcessingTopic] = useState('');

  // Refs
  const recognitionRef = useRef(null);
  const synthUtterRef = useRef(null);
  const chatBottomRef = useRef(null);
  const langRef = useRef(language);
  langRef.current = language;

  const farmerLocationRef = useRef(farmerLocation);
  farmerLocationRef.current = farmerLocation;

  /* ── 1. Voice Synthesis Initialization & Voice Loading ── */
  useEffect(() => {
    if (!isTTSSupported()) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        setVoicesLoaded(true);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  /* ── 2. Cleanup on Unmount ── */
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
      if (isTTSSupported()) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  /* ── 3. Stop TTS when language changes ── */
  useEffect(() => {
    if (isTTSSupported()) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setCurrentlySpeakingIndex(null);
  }, [language]);

  /* ── 4. Auto scroll to latest chat bubble ── */
  useEffect(() => {
    if (chatHistory.length > 0) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, phase]);

  /* ── 5. Location Helper (Only called when user requests "near me") ── */
  const requestLocation = useCallback(() => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setLocationStatus('denied');
        resolve(null);
        return;
      }

      setLocationStatus('requesting');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          setFarmerLocation(coords);
          setLocationStatus('granted');
          resolve(coords);
        },
        (err) => {
          console.warn('Geolocation denied or failed:', err.message);
          setLocationStatus('denied');
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 600000 }
      );
    });
  }, []);

  /* ── 6. Multilingual Text-to-Speech Engine ── */
  const speakText = useCallback((text, messageIndex = null) => {
    if (!isTTSSupported() || !text) return;

    window.speechSynthesis.cancel();

    const currentLang = langRef.current || 'en';
    const targetBcp47 = LANG_BCP47[currentLang] || 'en-IN';
    const cleanSpoken = cleanTextForTTS(text, currentLang);

    if (!cleanSpoken.trim()) return;

    const utter = new SpeechSynthesisUtterance(cleanSpoken);
    utter.lang = targetBcp47;
    utter.rate = 0.95; // Natural, clear pace for farmers
    utter.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();

    // Multilingual Voice Priority Matching:
    // 1. Exact match with neural/natural preference (e.g. Google हिन्दी, Microsoft Swara Online)
    // 2. Exact BCP-47 match (e.g. hi-IN, bn-IN, bn-BD)
    // 3. Prefix match (e.g. hi, bn)
    // STRICT RULE: If selected language is Hindi or Bengali, NEVER use an English voice!
    let matchedVoice = null;
    const isIndic = currentLang !== 'en';

    if (voices && voices.length > 0) {
      // 1. Natural / Neural voice in target language
      matchedVoice = voices.find(
        (v) => (v.lang === targetBcp47 || v.lang.startsWith(currentLang)) &&
               (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Online'))
      );

      // 2. Exact BCP-47 match
      if (!matchedVoice) {
        matchedVoice = voices.find((v) => v.lang === targetBcp47);
      }

      // 3. Language prefix match
      if (!matchedVoice) {
        matchedVoice = voices.find((v) => v.lang.toLowerCase().startsWith(currentLang.toLowerCase()));
      }

      // 4. Secondary dialect match (e.g. bn-BD for bn)
      if (!matchedVoice && currentLang === 'bn') {
        matchedVoice = voices.find((v) => v.lang.toLowerCase().includes('bn') || v.lang.toLowerCase().includes('bengali'));
      }

      // If target is English, fall back to any English voice
      if (!matchedVoice && !isIndic) {
        matchedVoice = voices.find((v) => v.lang.startsWith('en')) || voices[0];
      }
    }

    if (matchedVoice) {
      utter.voice = matchedVoice;
    }

    utter.onstart = () => {
      setIsSpeaking(true);
      setCurrentlySpeakingIndex(messageIndex);
      setPhase('speaking');
    };

    utter.onend = () => {
      setIsSpeaking(false);
      setCurrentlySpeakingIndex(null);
      setPhase('idle');
    };

    utter.onerror = (e) => {
      console.warn('TTS Error:', e);
      setIsSpeaking(false);
      setCurrentlySpeakingIndex(null);
      setPhase('idle');
    };

    synthUtterRef.current = utter;
    window.speechSynthesis.speak(utter);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (isTTSSupported()) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setCurrentlySpeakingIndex(null);
    setPhase('idle');
  }, []);

  /* ── 7. Process Question (Core Pipeline) ── */
  const processQuery = useCallback(async (rawQuery) => {
    if (!rawQuery || !rawQuery.trim()) return;

    const currentLang = langRef.current || 'en';
    const normalizedQuery = normalizeAgriSpeech(rawQuery.trim());

    // Distinguish mandi search vs general agriculture processing
    const lowerQ = normalizedQuery.toLowerCase();
    const isMandi = hasLocationIntent(lowerQ) ||
      lowerQ.includes('mandi') || lowerQ.includes('price') || lowerQ.includes('rate') ||
      lowerQ.includes('bhav') || lowerQ.includes('daam') || lowerQ.includes('dam') ||
      lowerQ.includes('भाव') || lowerQ.includes('दाम') || lowerQ.includes('দর');

    setProcessingTopic(isMandi ? 'mandi' : 'agri');
    setPhase('thinking');
    setErrorMessage('');
    setLiveTranscript('');

    // Stop previous audio
    if (isTTSSupported()) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);

    // Optimistically add user message to conversation history
    const userMsg = { role: 'user', text: normalizedQuery, time: new Date() };
    setChatHistory((prev) => [...prev, userMsg]);

    try {
      // Check if location coordinates are needed
      let locationToPass = farmerLocationRef.current;
      if (hasLocationIntent(normalizedQuery) && !locationToPass) {
        locationToPass = await requestLocation();
      }

      // Call AI Backend with farmer's registered signup district & state
      const result = await generateResponse(
        normalizedQuery,
        currentLang,
        locationToPass,
        user?.district || null,
        user?.state || null
      );

      const displayText = result.text || t_key(currentLang, 'aiError');
      const spokenText = result.spokenText || displayText;

      const assistantMsg = {
        role: 'assistant',
        text: displayText,
        spokenText: spokenText,
        crop: result.crop,
        intent: result.intent,
        mandiData: result.mandiData,
        district: result.district || user?.district || null,
        time: new Date(),
      };

      setChatHistory((prev) => [...prev, assistantMsg]);
      setPhase('idle');

      // Immediate voice playback with concise, natural spoken text
      const newMsgIndex = chatHistory.length + 1;
      setTimeout(() => {
        speakText(spokenText, newMsgIndex);
      }, 150);

    } catch (err) {
      console.error('Failed to process voice query:', err);
      setPhase('error');
      setErrorMessage(t_key(currentLang, 'aiError'));
    }
  }, [requestLocation, speakText, chatHistory.length, user?.district, user?.state]);

  const processQueryRef = useRef(processQuery);
  processQueryRef.current = processQuery;

  /* ── 8. Speech Recognition (STT) ── */
  const startListening = useCallback(() => {
    const currentLang = langRef.current || 'en';

    if (!isSpeechSupported()) {
      setPhase('error');
      setErrorMessage(t_key(currentLang, 'recognitionError'));
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    // Strict language binding to user's selected language
    recognition.lang = LANG_BCP47[currentLang] || 'en-IN';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    setPhase('listening');
    setLiveTranscript('');
    setErrorMessage('');
    stopSpeaking();

    let finalTranscript = '';

    recognition.onstart = () => {
      setPhase('listening');
      setLiveTranscript('');
      setErrorMessage('');
    };

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          finalTranscript += res[0].transcript;
        } else {
          interim += res[0].transcript;
        }
      }
      setLiveTranscript(interim || finalTranscript);
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      const l = langRef.current;
      setLiveTranscript('');
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
      setLiveTranscript('');
      if (finalTranscript && finalTranscript.trim()) {
        processQueryRef.current(finalTranscript.trim());
      } else {
        // If no speech was detected
        setPhase((currentPhase) => (currentPhase === 'listening' ? 'idle' : currentPhase));
      }
    };

    try {
      recognition.start();
    } catch (err) {
      console.warn('Recognition start failed:', err);
      setPhase('error');
      setErrorMessage(t_key(currentLang, 'recognitionError'));
    }
  }, [stopSpeaking]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
  }, []);

  /* ── 9. Text Input Submit Handler ── */
  const handleTextSubmit = (e) => {
    e.preventDefault();
    const q = textInput.trim();
    if (!q) return;
    setTextInput('');
    processQuery(q);
  };

  /* ── 10. Clear Chat & Reset Session Memory ── */
  const handleClearChat = async () => {
    stopSpeaking();
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }
    await clearConversation();
    setChatHistory([]);
    setPhase('idle');
    setErrorMessage('');
    setShowClearConfirm(false);
  };

  const activeLangObj = getLanguageByCode(language);
  const suggestionList = SUGGESTIONS[language] || SUGGESTIONS.en;

  return (
    <div className="w-full">
      <div className="bg-gradient-to-br from-emerald-50/50 via-white to-amber-50/40 rounded-3xl border border-primary-200/80 shadow-md overflow-hidden transition-all duration-300">
        
        {/* ─── Top Header Bar ─── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-primary-100/80 bg-white/70 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center shadow-md shadow-primary-200">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-navy-900 leading-tight">
                  {t_key(language, 'voiceAssistant')}
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {activeLangObj.native || activeLangObj.name}
                </span>

                {/* Farmer Registered District Badge */}
                {user?.district && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary-50 text-primary-800 border border-primary-200/80 shadow-2xs">
                    <MapPin className="w-3 h-3 text-primary-600 shrink-0" />
                    <span>{user.district}{user.state ? `, ${user.state}` : ''}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-navy-500 line-clamp-1 mt-0.5">
                {t_key(language, 'voiceAssistantDesc')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {chatHistory.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-navy-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition border border-transparent hover:border-red-200"
                title={t_key(language, 'clearChat')}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t_key(language, 'clearChat')}</span>
              </button>
            )}
          </div>
        </div>

        {/* ─── Clear Chat Confirmation Modal ─── */}
        {showClearConfirm && (
          <div className="p-4 bg-red-50/90 border-b border-red-200 flex items-center justify-between gap-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-xs font-semibold text-red-900">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>
                {language === 'hi'
                  ? 'क्या आप पूरी बातचीत साफ़ करना चाहते हैं?'
                  : language === 'bn'
                  ? 'আপনি কি সমস্ত বার্তা মুছে ফেলতে চান?'
                  : 'Clear entire conversation history?'}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleClearChat}
                className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition shadow-sm"
              >
                {t_key(language, 'clearChat')}
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1 bg-white border border-red-200 text-navy-700 text-xs font-semibold rounded-lg hover:bg-red-100 transition"
              >
                {t_key(language, 'close')}
              </button>
            </div>
          </div>
        )}

        {/* ─── View A: Initial Simple Hero View (When no messages yet) ─── */}
        {chatHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center">
            
            {/* Hero Interactive Mic Button */}
            <div className="relative mb-6 flex items-center justify-center">
              {phase === 'listening' ? (
                <div className="relative flex items-center justify-center">
                  {/* Glowing Concentric Pulse Rings */}
                  <span className="absolute -inset-4 rounded-full border-2 border-red-400 animate-pulse-ring-1 opacity-75 pointer-events-none" />
                  <span className="absolute -inset-8 rounded-full border-2 border-red-300 animate-pulse-ring-2 opacity-50 pointer-events-none" />
                  <span className="absolute -inset-12 rounded-full border border-red-200 animate-pulse opacity-30 pointer-events-none" />

                  <button
                    onClick={stopListening}
                    className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr from-red-600 via-rose-500 to-red-500 text-white shadow-2xl shadow-red-300/80 flex flex-col items-center justify-center active:scale-95 transition-all duration-300 cursor-pointer animate-mic-wobble"
                    aria-label={t_key(language, 'stopRecording')}
                    title="Listening... Click to finish speaking"
                  >
                    <Mic className="w-14 h-14 drop-shadow-md" />
                    {/* Live 5-bar sound equalizer */}
                    <div className="flex items-center gap-1 mt-1.5 h-4">
                      <span className="w-1 bg-white rounded-full animate-sound-bar-1" />
                      <span className="w-1 bg-white rounded-full animate-sound-bar-2" />
                      <span className="w-1 bg-white rounded-full animate-sound-bar-3" />
                      <span className="w-1 bg-white rounded-full animate-sound-bar-2" />
                      <span className="w-1 bg-white rounded-full animate-sound-bar-1" />
                    </div>
                  </button>
                </div>
              ) : phase === 'thinking' ? (
                <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 text-white shadow-2xl shadow-amber-200 flex flex-col items-center justify-center">
                  <Loader2 className="w-12 h-12 animate-spin" />
                  <span className="text-[11px] font-bold mt-2 uppercase tracking-wider">Mitti AI</span>
                </div>
              ) : (
                <button
                  onClick={startListening}
                  className="group relative w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr from-primary-600 via-primary-500 to-emerald-500 text-white shadow-2xl shadow-primary-200/80 hover:shadow-primary-300 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center cursor-pointer"
                  aria-label={t_key(language, 'speakToUs')}
                >
                  <Mic className="w-14 h-14 group-hover:scale-110 transition-transform duration-200" />
                  <span className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="absolute -inset-2 rounded-full border border-primary-300/40 animate-pulse" />
                </button>
              )}
            </div>

            {/* Status Label & Live Feedback */}
            <div className="mb-6 w-full max-w-sm">
              {phase === 'listening' && (
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 border border-red-200 shadow-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                    <p className="text-sm font-bold text-red-700">
                      {language === 'hi'
                        ? '🎙️ आपकी बात सुन रहे हैं... बोलिए'
                        : language === 'bn'
                        ? '🎙️ আপনার কথা শুনছি... বলুন'
                        : '🎙️ Listening to you... Speak now'}
                    </p>
                  </div>

                  {liveTranscript ? (
                    <div className="mt-2.5 px-4 py-2 bg-white border border-red-200 shadow-sm rounded-2xl text-xs font-semibold text-navy-900 animate-in fade-in">
                      "{liveTranscript}"
                    </div>
                  ) : (
                    <p className="text-[11px] text-navy-400 mt-1">
                      {language === 'hi'
                        ? 'अपनी भाषा में फसल या भाव पूछें'
                        : language === 'bn'
                        ? 'আপনার ভাষায় ফসল বা দাম জিজ্ঞাসা করুন'
                        : 'Ask crop or mandi questions clearly'}
                    </p>
                  )}

                  <button
                    onClick={stopListening}
                    className="mt-1 text-[11px] font-semibold text-red-600 hover:text-red-700 underline cursor-pointer"
                  >
                    {language === 'hi' ? 'रोकने के लिए क्लिक करें' : language === 'bn' ? 'থামাতে ক্লিক করুন' : 'Click to finish speaking'}
                  </button>
                </div>
              )}

              {phase === 'thinking' && (
                <div className="flex flex-col items-center justify-center gap-1">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800 shadow-xs animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    <span>
                      {processingTopic === 'mandi'
                        ? (language === 'hi'
                            ? `⏳ आपके जिले ${user?.district ? '(' + user.district + ')' : ''} से मंडी भाव खोज रहे हैं...`
                            : language === 'bn'
                            ? `⏳ আপনার জেলা ${user?.district ? '(' + user.district + ')' : ''} থেকে মান্ডি দর সংগ্রহ করা হচ্ছে...`
                            : `⏳ Fetching mandi prices in your district ${user?.district ? '(' + user.district + ')' : ''}...`)
                        : (language === 'hi'
                            ? '🧠 कृषि मित्र सलाह तैयार कर रहा है...'
                            : language === 'bn'
                            ? '🧠 কৃষি মিত্র পরামর্শ তৈরি করছে...'
                            : '🧠 Krishi Mitra is formulating advice...')}
                    </span>
                  </div>
                </div>
              )}

              {phase === 'idle' && (
                <div>
                  <h4 className="text-lg font-extrabold text-navy-900">
                    {t_key(language, 'speakToUs')}
                  </h4>
                  <p className="text-xs text-navy-500 mt-1 max-w-xs mx-auto">
                    {language === 'hi'
                      ? 'माइक दबाकर अपनी भाषा में फसल, भाव या खेती के बारे में पूछें'
                      : language === 'bn'
                      ? 'মাইক চেপে আপনার নিজের ভাষায় ফসল, মান্ডি দর বা চাষ নিয়ে জিজ্ঞাসা করুন'
                      : 'Tap mic and ask anything about crops, mandi prices, or farming in your language'}
                  </p>
                </div>
              )}

              {phase === 'error' && (
                <div className="flex flex-col items-center gap-2 text-center max-w-xs mx-auto">
                  <div className="flex items-center gap-1.5 text-amber-600 text-sm font-semibold">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage || t_key(language, 'aiError')}</span>
                  </div>
                  <button
                    onClick={startListening}
                    className="mt-1 px-4 py-1.5 bg-primary-600 text-white text-xs font-semibold rounded-xl hover:bg-primary-700 transition"
                  >
                    {language === 'hi' ? 'पुनः प्रयास करें' : language === 'bn' ? 'আবার চেষ্টা করুন' : 'Try Again'}
                  </button>
                </div>
              )}
            </div>

            {/* Quick Suggestion Chips */}
            <div className="w-full max-w-md mb-6">
              <div className="flex items-center justify-center gap-1.5 mb-2.5 text-[11px] font-semibold text-navy-400 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  {language === 'hi' ? 'सुझाए गए सवाल' : language === 'bn' ? 'প্রস্তাবিত প্রশ্ন' : 'Suggested Questions'}
                </span>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestionList.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => processQuery(chip.replace(/^[^\s]+\s+/, ''))}
                    className="px-3 py-1.5 bg-white border border-primary-200/80 rounded-xl text-xs font-medium text-navy-800 hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700 shadow-sm transition active:scale-95 text-left"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Inline Type Option */}
            <form onSubmit={handleTextSubmit} className="w-full max-w-md">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={t_key(language, 'typeFallback')}
                  className="w-full pl-4 pr-12 py-3 bg-white border border-navy-200 rounded-2xl text-sm text-navy-900 placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent shadow-sm"
                />
                <button
                  type="submit"
                  disabled={!textInput.trim()}
                  className="absolute right-2 w-8 h-8 rounded-xl bg-navy-900 text-white flex items-center justify-center hover:bg-navy-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  aria-label="Send"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* ─── View B: Continuous Conversation Layout (WhatsApp / ChatGPT Style) ─── */
          <div className="flex flex-col h-[520px]">
            
            {/* Scrollable Message Thread */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {chatHistory.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 shadow-sm text-sm leading-relaxed transition-all ${
                      msg.role === 'user'
                        ? 'bg-navy-900 text-white rounded-br-none'
                        : 'bg-white border border-navy-100 text-navy-900 rounded-bl-none'
                    }`}
                  >
                    {/* Message Body */}
                    <div className="whitespace-pre-wrap font-sans text-[13.5px] leading-relaxed">
                      {msg.text}
                    </div>

                    {/* Assistant Audio Action Bar */}
                    {msg.role === 'assistant' && (
                      <div className="mt-3 pt-2.5 border-t border-navy-50 flex items-center justify-between gap-3 text-xs flex-wrap">
                        <button
                          onClick={() => {
                            if (isSpeaking && currentlySpeakingIndex === i) {
                              stopSpeaking();
                            } else {
                              speakText(msg.spokenText || msg.text, i);
                            }
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition ${
                            isSpeaking && currentlySpeakingIndex === i
                              ? 'bg-red-50 text-red-600 border border-red-200'
                              : 'bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200/80'
                          }`}
                        >
                          {isSpeaking && currentlySpeakingIndex === i ? (
                            <>
                              <VolumeX className="w-3.5 h-3.5" />
                              <span>{t_key(language, 'stopSpeaking')}</span>
                              <span className="flex items-center gap-0.5 ml-1">
                                <span className="w-1 h-3 bg-red-500 animate-pulse rounded-full" />
                                <span className="w-1 h-4 bg-red-500 animate-pulse delay-75 rounded-full" />
                                <span className="w-1 h-2 bg-red-500 animate-pulse delay-150 rounded-full" />
                              </span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>{t_key(language, 'playResponse')}</span>
                            </>
                          )}
                        </button>

                        <div className="flex items-center gap-2 text-[11px] text-navy-400">
                          {msg.district && (
                            <span className="flex items-center gap-0.5 text-primary-700 font-medium">
                              <MapPin className="w-3 h-3" /> {msg.district}
                            </span>
                          )}
                          {msg.crop && (
                            <span>🌾 {msg.crop}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Dynamic Status Indicator inside thread */}
              {phase === 'thinking' && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="bg-white border border-amber-200 rounded-2xl px-4 py-2.5 text-xs font-semibold text-amber-800 shadow-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    <span>
                      {processingTopic === 'mandi'
                        ? (language === 'hi' ? 'मंडियों से भाव प्राप्त कर रहे हैं...' : language === 'bn' ? 'মান্ডির দর খোঁজা হচ্ছে...' : 'Fetching mandi prices...')
                        : (language === 'hi' ? 'कृषि मित्र सलाह तैयार कर रहा है...' : language === 'bn' ? 'কৃষি মিত্র পরামর্শ তৈরি করছে...' : 'Formulating agricultural guidance...')}
                    </span>
                  </div>
                </div>
              )}

              {phase === 'listening' && (
                <div className="flex items-center gap-3 justify-end">
                  <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-2.5 text-xs font-bold text-red-700 shadow-sm flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                    <span>{language === 'hi' ? 'सुन रहे हैं... बोलिए' : language === 'bn' ? 'শুনছি... বলুন' : 'Listening... Speak now'}</span>
                    <div className="flex items-center gap-0.5 h-3 ml-1">
                      <span className="w-0.5 bg-red-500 rounded-full animate-sound-bar-1" />
                      <span className="w-0.5 bg-red-500 rounded-full animate-sound-bar-2" />
                      <span className="w-0.5 bg-red-500 rounded-full animate-sound-bar-3" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Sticky Bottom Continuous Input Bar */}
            <div className="p-3 sm:p-4 bg-white/90 backdrop-blur-md border-t border-primary-100/80">
              
              {/* Active Listening Floating Banner */}
              {phase === 'listening' && (
                <div className="mb-2 px-3 py-2 bg-red-50/95 border border-red-200 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in duration-200 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
                    <span className="text-xs font-bold text-red-700">
                      {language === 'hi' ? 'सुन रहे हैं... बोलिए' : language === 'bn' ? 'শুনছি... বলুন' : 'Listening... Speak now'}
                    </span>
                    <div className="flex items-center gap-1 h-3.5">
                      <span className="w-0.5 bg-red-500 rounded-full animate-sound-bar-1" />
                      <span className="w-0.5 bg-red-500 rounded-full animate-sound-bar-2" />
                      <span className="w-0.5 bg-red-500 rounded-full animate-sound-bar-3" />
                      <span className="w-0.5 bg-red-500 rounded-full animate-sound-bar-2" />
                    </div>
                  </div>

                  {liveTranscript && (
                    <span className="text-xs text-navy-800 font-medium truncate max-w-[200px] bg-white px-2 py-0.5 rounded-md border border-red-100">
                      "{liveTranscript}"
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={stopListening}
                    className="px-2.5 py-1 bg-red-600 text-white rounded-lg text-[11px] font-bold hover:bg-red-700 transition shrink-0"
                  >
                    {t_key(language, 'stopRecording')}
                  </button>
                </div>
              )}

              <form onSubmit={handleTextSubmit} className="flex items-center gap-2">
                
                {/* Voice Mic Button (Direct tap to continue conversation) */}
                {phase === 'listening' ? (
                  <button
                    type="button"
                    onClick={stopListening}
                    className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-red-200 active:scale-95 transition animate-mic-wobble cursor-pointer"
                    title="Listening... Click to finish"
                  >
                    <Mic className="w-5 h-5" />
                    <span className="absolute -inset-1 rounded-2xl border-2 border-red-400 animate-pulse-ring-1 opacity-70 pointer-events-none" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startListening}
                    className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-primary-200 hover:shadow-primary-300 hover:scale-105 active:scale-95 transition cursor-pointer"
                    title={t_key(language, 'speakToUs')}
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                )}

                {/* Text input for follow-ups */}
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={
                    language === 'hi'
                      ? 'या यहाँ सवाल टाइप करें (जैसे: आलू में कौन सी खाद डालें)...'
                      : language === 'bn'
                      ? 'অথবা এখানে প্রশ্ন লিখুন (যেমন: আলুতে কোন সার দেব)...'
                      : 'Or type your question (e.g., potato fertilizer dosage)...'
                  }
                  className="flex-1 px-4 py-2.5 bg-navy-50/60 border border-navy-200 rounded-2xl text-xs sm:text-sm text-navy-900 placeholder:text-navy-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white shadow-2xs"
                />

                <button
                  type="submit"
                  disabled={!textInput.trim()}
                  className="w-11 h-11 rounded-2xl bg-navy-900 text-white flex items-center justify-center shrink-0 hover:bg-navy-800 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-sm"
                  aria-label="Send"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
