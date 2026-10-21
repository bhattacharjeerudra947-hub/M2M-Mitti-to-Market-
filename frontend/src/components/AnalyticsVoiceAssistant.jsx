import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic, MicOff, Volume2, VolumeX, Pause, Play, RotateCcw,
  Send, Sparkles, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Loader2
} from 'lucide-react';
import { apiPost } from '../api';
import { useAuth } from '../context/AuthContext';
import { useFarmerLanguage } from '../context/FarmerContext';
import { cleanTextForTTS } from '../utils/agriSpeechHelper';

const QUICK_QUESTIONS = {
  bn: [
    'আমার এই মাসে মোট কত লাভ হয়েছে?',
    'কোল্ড স্টোরেজে কত খরচ হয়েছে?',
    'কোন ফসল থেকে সবচেয়ে বেশি লাভ হয়েছে?',
    'আমার কত পণ্য এখনও বিক্রি হয়নি?',
    'গত মাসের তুলনায় এই মাসে লাভ কতটা পরিবর্তিত হয়েছে?',
  ],
  hi: [
    'इस महीने मेरा कुल मुनाफा कितना हुआ?',
    'कोल्ड स्टोरेज पर कितना खर्च हुआ?',
    'किस फसल से सबसे ज्यादा मुनाफा हुआ?',
    'मेरा कितना माल अभी तक नहीं बिका?',
    'पिछले महीने की तुलना में इस महीने का मुनाफा कितना बदला?',
  ],
  en: [
    'How much profit did I make this month?',
    'How much did I spend on cold storage?',
    'Which crop generated the highest profit?',
    'How much produce is still unsold?',
    'Compare this month with last month',
  ],
};

const BCP47_LANG = {
  bn: 'bn-IN',
  hi: 'hi-IN',
  en: 'en-IN',
};

function isSpeechSupported() {
  return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
}

function isTTSSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export default function AnalyticsVoiceAssistant({ onFocusMetric, userRole = 'FARMER' }) {
  const { user } = useAuth();
  const { language } = useFarmerLanguage();

  const activeLang = ['bn', 'hi', 'en'].includes(language) ? language : 'en';

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [assistantResponse, setAssistantResponse] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  const recognitionRef = useRef(null);
  const speechUtteranceRef = useRef(null);

  // Preload TTS voices for instant and natural voice selection
  useEffect(() => {
    if (!isTTSSupported()) return;
    const populateVoices = () => {
      try { window.speechSynthesis.getVoices(); } catch {}
    };
    populateVoices();
    window.speechSynthesis.onvoiceschanged = populateVoices;
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Stop speech when component unmounts
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

  // Text-to-Speech playback handler with natural phrasing and fluent tone
  const speakText = useCallback((text, langCode) => {
    if (!isTTSSupported() || !text) return;
    window.speechSynthesis.cancel();

    // Clean text and currency symbols into natural spoken language
    const speechReady = cleanTextForTTS(text, langCode || activeLang);

    const utterance = new SpeechSynthesisUtterance(speechReady);
    const targetLang = BCP47_LANG[langCode] || 'en-IN';
    utterance.lang = targetLang;
    utterance.rate = 0.98; // Natural, conversational pace
    utterance.pitch = 1.0; // Warm, natural pitch

    // Select the highest quality natural/neural voice available in browser
    const voices = window.speechSynthesis.getVoices();
    const langPrefix = (langCode || 'en').toLowerCase();
    const langBCP = targetLang.toLowerCase();

    const matchingVoices = voices.filter(v => {
      const vLang = (v.lang || '').toLowerCase().replace('_', '-');
      return vLang.startsWith(langPrefix) || vLang.startsWith(langBCP) || vLang.includes(langPrefix);
    });

    const naturalVoice = matchingVoices.find(v =>
      /natural|google|neural|online|premium|deepmind/i.test(v.name)
    ) || matchingVoices.find(v =>
      /female|priya|swara|neerja|kalpana|veena/i.test(v.name)
    ) || matchingVoices[0];

    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };
    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };
    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    speechUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [activeLang]);

  const handlePauseResumeTTS = () => {
    if (!isTTSSupported()) return;
    if (isPlaying && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    } else if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  };

  const handleStopTTS = () => {
    if (isTTSSupported()) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
    }
  };

  // Submit query to backend analytics voice engine
  const executeQuery = async (queryText) => {
    if (!queryText || !queryText.trim()) return;
    setIsProcessing(true);
    setErrorMsg('');
    handleStopTTS();

    try {
      const res = await apiPost('/api/analytics/voice-query', {
        query: queryText.trim(),
        language: activeLang,
        userId: user?.id || 1,
        role: userRole || 'FARMER',
      });

      setAssistantResponse(res);
      if (res?.spokenText) {
        speakText(res.spokenText, activeLang);
      }
      if (res?.metricKey && onFocusMetric) {
        onFocusMetric(res.metricKey, res.chartFocus);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Could not process analytics voice query. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Voice Recording / Speech-to-Text handler
  const startListening = () => {
    if (!isSpeechSupported()) {
      setErrorMsg('Speech recognition is not supported in this browser. Please type your query below.');
      return;
    }

    handleStopTTS();
    setErrorMsg('');
    setTranscript('');

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognizer = new SpeechRec();
    recognizer.lang = BCP47_LANG[activeLang] || 'en-IN';
    recognizer.interimResults = true;
    recognizer.continuous = false;

    recognizer.onstart = () => {
      setIsListening(true);
    };

    recognizer.onresult = (event) => {
      let current = '';
      for (let i = 0; i < event.results.length; i++) {
        current += event.results[i][0].transcript;
      }
      setTranscript(current);
    };

    recognizer.onerror = (event) => {
      setIsListening(false);
      if (event.error === 'not-allowed') {
        setErrorMsg('Microphone access denied. Please grant permission in your browser settings.');
      } else if (event.error !== 'no-speech') {
        setErrorMsg('Could not recognize voice. You can edit or type below.');
      }
    };

    recognizer.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognizer;
    recognizer.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
  };

  const chips = QUICK_QUESTIONS[activeLang] || QUICK_QUESTIONS.en;

  return (
    <div className="bg-gradient-to-r from-navy-900 via-navy-800 to-emerald-950 text-white rounded-3xl p-6 shadow-xl border border-navy-700/60 mb-8 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-inner">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span>M2M Multilingual Voice Assistant</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 font-medium">
                {activeLang === 'bn' ? 'বাংলা' : activeLang === 'hi' ? 'हिन्दी' : 'English'}
              </span>
            </h2>
            <p className="text-xs text-navy-200">
              Ask business & storage profitability questions naturally in your preferred language
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-navy-200 transition"
          title="Toggle panel"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-5 space-y-4">
          {/* Quick Query Suggestion Chips */}
          <div>
            <p className="text-[11px] font-semibold text-navy-300 uppercase tracking-wider mb-2">
              Suggested Questions
            </p>
            <div className="flex flex-wrap gap-2">
              {chips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setTranscript(chip);
                    executeQuery(chip);
                  }}
                  className="text-xs bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-1.5 rounded-xl transition text-left"
                >
                  💬 {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Voice Input & Transcript Area */}
          <div className="bg-navy-950/60 rounded-2xl p-4 border border-navy-700/80">
            <div className="flex items-center gap-3">
              <button
                onClick={isListening ? stopListening : startListening}
                className={`p-3.5 rounded-2xl font-semibold flex items-center gap-2 transition shadow-lg ${
                  isListening
                    ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
                title={isListening ? 'Stop listening' : 'Start voice recognition'}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                <span className="text-xs">{isListening ? 'Listening...' : 'Tap to Speak'}</span>
              </button>

              <div className="flex-1">
                <input
                  type="text"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder={
                    activeLang === 'bn'
                      ? 'প্রশ্ন বলুন বা লিখুন (যেমন: আমার এই মাসে মোট কত লাভ হয়েছে?)...'
                      : activeLang === 'hi'
                      ? 'बोलें या लिखें (जैसे: इस महीने मेरा कुल मुनाफा कितना हुआ?)...'
                      : 'Speak or type your question (e.g., How much profit did I make this month?)...'
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') executeQuery(transcript);
                  }}
                  className="w-full bg-transparent border-0 text-white placeholder-navy-400 text-sm focus:outline-none focus:ring-0 px-2"
                />
              </div>

              <button
                onClick={() => executeQuery(transcript)}
                disabled={isProcessing || !transcript.trim()}
                className="p-3 bg-white/15 hover:bg-white/25 disabled:opacity-40 rounded-xl text-white transition flex items-center justify-center"
                title="Send query"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error Message if any */}
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Assistant Spoken / Written Response Card */}
          {assistantResponse && (
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" /> Verified Business Insight
                </div>

                {/* Audio Controls: Play, Pause, Replay, Stop */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => speakText(assistantResponse.spokenText, activeLang)}
                    className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs flex items-center gap-1 transition"
                    title="Replay Voice"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Replay
                  </button>

                  {isPlaying && (
                    <button
                      onClick={handlePauseResumeTTS}
                      className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs flex items-center gap-1 transition"
                      title={isPaused ? 'Resume' : 'Pause'}
                    >
                      {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                    </button>
                  )}

                  {isPlaying && (
                    <button
                      onClick={handleStopTTS}
                      className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs flex items-center gap-1 transition"
                      title="Stop Speaking"
                    >
                      <VolumeX className="w-3.5 h-3.5" /> Stop
                    </button>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-100 font-medium leading-relaxed">
                {assistantResponse.textResponse}
              </p>

              {assistantResponse.metricKey && (
                <div className="text-[11px] text-emerald-300/80 flex items-center gap-1 pt-1 border-t border-emerald-500/20">
                  <span>📊 Linked Dashboard Focus:</span>
                  <span className="font-semibold">{assistantResponse.metricKey}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
