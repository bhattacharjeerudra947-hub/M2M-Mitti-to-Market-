import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Bot, Mic, Send, TrendingUp, TrendingDown, Minus, BarChart3,
  Volume2, VolumeX, Lightbulb,
} from 'lucide-react';
import {
  AreaChart, Area, ResponsiveContainer,
} from 'recharts';
import { useFarmerLanguage } from '../context/FarmerContext';
import { t_key } from '../data/farmerTranslations';
import { processTrendQuery, getCropTrends, getAIRecommendations, getAvailableCrops } from '../services/trendService';

const LANG_BCP47 = {
  en:'en-IN', hi:'hi-IN', bn:'bn-IN', ta:'ta-IN', te:'te-IN', mr:'mr-IN',
  gu:'gu-IN', kn:'kn-IN', ml:'ml-IN', pa:'pa-IN', or:'or-IN', as:'as-IN',
  ks:'ks-IN', kok:'kok-IN', mai:'mai-IN', brx:'brx-IN', doi:'doi-IN',
  sd:'sd-IN', mni:'mni-IN', ne:'ne-IN', sa:'sa-IN', sat:'sat-IN', ur:'ur-IN',
};

function isSpeechSupported() {
  return typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
}

function TrendIndicator({ direction, change }) {
  if (direction === 'increasing') return <TrendingUp className="w-4 h-4 text-emerald-500" />;
  if (direction === 'decreasing') return <TrendingDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-navy-400" />;
}

function MiniChart({ data, color = '#0f2a4a' }) {
  return (
    <ResponsiveContainer width="100%" height={60}>
      <AreaChart data={data.slice(-8)} margin={{ top: 2, right: 4, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id={`mini-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.2} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="price" stroke={color} fill={`url(#mini-${color.replace('#', '')})`} strokeWidth={1.5} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function ConfidenceBar({ value }) {
  return (
    <div className="flex items-center gap-2 mt-1">
      <span className="text-[10px] text-navy-400">{t_key('en', 'confidence') || 'Confidence'}</span>
      <div className="flex-1 h-1.5 bg-navy-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${value > 0.7 ? 'bg-emerald-500' : value > 0.5 ? 'bg-mustard-400' : 'bg-navy-300'}`}
          style={{ width: `${value * 100}%` }}
        />
      </div>
      <span className="text-[10px] text-navy-500 font-medium">{Math.round(value * 100)}%</span>
    </div>
  );
}

export default function TrendInsights() {
  const { language } = useFarmerLanguage();
  const [chatHistory, setChatHistory] = useState([]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [activeCrop, setActiveCrop] = useState(null);
  const [showRecommendations, setShowRecommendations] = useState(true);
  const recognitionRef = useRef(null);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  const trends = getCropTrends();
  const recommendations = getAIRecommendations();
  const crops = getAvailableCrops();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const speakText = useCallback((text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text.replace(/[🎤🤖📈📊🌾📍🔮💡]/g, ''));
    utter.lang = LANG_BCP47[language] || 'en-IN';
    utter.rate = 0.9;
    utter.onstart = () => setIsSpeaking(true);
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utter);
  }, [language]);

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const handleQuery = useCallback((query) => {
    if (!query.trim()) return;
    setChatHistory((prev) => [...prev, { role: 'user', text: query }]);
    setInput('');

    setTimeout(() => {
      const result = processTrendQuery(query, language);
      setChatHistory((prev) => [...prev, {
        role: 'assistant',
        text: result.text,
        trend: result.trend,
      }]);
      setExpanded(true);
      setTimeout(() => speakText(result.text), 400);
    }, 600 + Math.random() * 800);
  }, [language, speakText]);

  const startListening = useCallback(() => {
    if (!isSpeechSupported()) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = LANG_BCP47[language] || 'en-IN';
    recognition.interimResults = false;
    recognition.continuous = false;
    setIsListening(true);
    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setInput(text);
      setIsListening(false);
      handleQuery(text);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    try { recognition.start(); } catch { setIsListening(false); }
  }, [language, handleQuery]);

  const handleSubmit = (e) => {
    e.preventDefault();
    handleQuery(input);
  };

  return (
    <div className="bg-white rounded-2xl border border-navy-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-navy-900 to-navy-800 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-mustard-400/20 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-mustard-300" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-white">{t_key(language, 'marketInsights') || 'Market & Crop Insights'}</h3>
            <p className="text-xs text-navy-300">{t_key(language, 'insightsDesc') || 'AI-powered market trends, predictions & recommendations'}</p>
          </div>
          {isSpeaking && (
            <button onClick={stopSpeaking} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition">
              <VolumeX className="w-4 h-4 text-white" />
            </button>
          )}
        </div>

        {/* Crop chips */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none">
          {crops.map((crop) => (
            <button
              key={crop.id}
              onClick={() => {
                setActiveCrop(activeCrop === crop.id ? null : crop.id);
                if (activeCrop !== crop.id) handleQuery(`${crop.name} trend`);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                activeCrop === crop.id
                  ? 'bg-mustard-400 text-navy-900'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <span>{crop.emoji}</span>
              <span>{crop.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* AI Recommendations */}
      {showRecommendations && chatHistory.length === 0 && (
        <div className="p-4 border-b border-navy-50">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-mustard-500" />
            <h4 className="text-xs font-semibold text-navy-700 uppercase tracking-wide">
              {t_key(language, 'aiRecommendations') || 'AI Recommendations'}
            </h4>
          </div>
          <div className="space-y-2">
            {recommendations.map((rec) => (
              <button
                key={rec.id}
                onClick={() => handleQuery(`Should I sell ${rec.crop.name}?`)}
                className="w-full text-left p-3 bg-mustard-50/50 rounded-xl border border-mustard-100 hover:border-mustard-300 transition group"
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg">{rec.crop.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-navy-800 leading-relaxed">{rec.message}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        rec.urgency === 'high' ? 'bg-red-100 text-red-700' :
                        rec.urgency === 'medium' ? 'bg-mustard-100 text-mustard-700' :
                        'bg-navy-50 text-navy-600'
                      }`}>
                        {rec.urgency}
                      </span>
                      <ConfidenceBar value={rec.confidence} />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat history */}
      {chatHistory.length > 0 && (
        <div className="max-h-[400px] overflow-y-auto p-4 space-y-3">
          {chatHistory.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-navy-100 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-3.5 h-3.5 text-navy-600" />
                </div>
              )}
              <div className={`max-w-[85%] ${
                msg.role === 'user'
                  ? 'bg-navy-900 text-white rounded-2xl rounded-br-md px-4 py-2.5'
                  : 'bg-navy-50 text-navy-800 rounded-2xl rounded-bl-md px-4 py-3'
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                {msg.trend && (
                  <div className="mt-2 pt-2 border-t border-navy-100/50">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendIndicator direction={msg.trend.trend.direction} change={msg.trend.trend.change} />
                      <span className="text-xs font-semibold">₹{msg.trend.currentPrice}/{msg.trend.crop.unit}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        msg.trend.trend.change > 0 ? 'bg-emerald-100 text-emerald-700' :
                        msg.trend.trend.change < 0 ? 'bg-red-100 text-red-700' :
                        'bg-navy-100 text-navy-600'
                      }`}>
                        {msg.trend.trend.change > 0 ? '+' : ''}{msg.trend.trend.change}%
                      </span>
                    </div>
                    <MiniChart data={msg.trend.priceHistory} />
                    {msg.trend.predictions.map((p, j) => (
                      <div key={j} className="flex items-center justify-between text-[10px] text-navy-500 mt-1">
                        <span>{p.week}</span>
                        <span className="font-medium">₹{p.price}</span>
                        <ConfidenceBar value={p.confidence} />
                      </div>
                    ))}
                  </div>
                )}
                {msg.role === 'assistant' && (
                  <div className="flex gap-1.5 mt-2">
                    <button
                      onClick={() => speakText(msg.text)}
                      className="p-1 rounded hover:bg-navy-100 transition"
                    >
                      <Volume2 className="w-3 h-3 text-navy-400" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      )}

      {/* Input area */}
      <div className="p-3 border-t border-navy-100 bg-navy-50/30">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <button
            type="button"
            onClick={isListening ? () => recognitionRef.current?.stop() : startListening}
            className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition ${
              isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-navy-100 text-navy-600 hover:bg-navy-200'
            }`}
          >
            <Mic className="w-4 h-4" />
          </button>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t_key(language, 'askMarketQuestion') || 'Ask about market trends...'}
            className="flex-1 px-3 py-2.5 rounded-xl bg-white border border-navy-200 text-sm text-navy-800 placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="shrink-0 w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <p className="text-[10px] text-navy-400 text-center mt-2">
          {t_key(language, 'aiDisclaimer') || 'AI-based estimates — not guaranteed predictions. Always verify with local conditions.'}
        </p>
      </div>
    </div>
  );
}
