/**
 * AI Market & Agriculture Trend Prediction Service
 *
 * Modular architecture:
 * 1. Data collection layer (mock / future API)
 * 2. Trend analysis engine
 * 3. Prediction model (mock / future ML model)
 * 4. AI explanation generator
 *
 * To integrate a real API: replace the functions in the
 * "Public API" section at the bottom of this file.
 */

/* ─────────────────────────────────────────────
   1. DATA COLLECTION LAYER (Mock/Demo)
   Replace with real mandi prices, weather,
   supply-chain data APIs when available.
   ───────────────────────────────────────────── */

const MOCK_CROPS = [
  { id: 'tomato', name: 'Tomato', emoji: '🍅', unit: 'kg', basePrice: 28 },
  { id: 'onion', name: 'Onion', emoji: '🧅', unit: 'kg', basePrice: 24 },
  { id: 'potato', name: 'Potato', emoji: '🥔', unit: 'kg', basePrice: 22 },
  { id: 'rice', name: 'Rice', emoji: '🌾', unit: 'kg', basePrice: 32 },
  { id: 'wheat', name: 'Wheat', emoji: '🌿', unit: 'kg', basePrice: 26 },
  { id: 'chili', name: 'Chili', emoji: '🌶️', unit: 'kg', basePrice: 115 },
  { id: 'mango', name: 'Mango', emoji: '🥭', unit: 'kg', basePrice: 75 },
  { id: 'grapes', name: 'Grapes', emoji: '🍇', unit: 'kg', basePrice: 60 },
];

const MOCK_MARKETS = [
  { id: 'nashik', name: 'Nashik Mandi', lat: 19.9975, lng: 73.7898, distance: 12 },
  { id: 'pune', name: 'Pune APMC', lat: 18.5204, lng: 73.8567, distance: 68 },
  { id: 'mumbai', name: 'Mumbai Wholesale', lat: 19.076, lng: 72.8777, distance: 165 },
  { id: 'indore', name: 'Indore Mandi', lat: 22.7196, lng: 75.8577, distance: 420 },
  { id: 'aurangabad', name: 'Aurangabad Mandi', lat: 19.8762, lng: 75.3433, distance: 85 },
  { id: 'nagpur', name: 'Nagpur Market', lat: 21.1458, lng: 79.0882, distance: 310 },
];

const SEASONS = {
  kharif: { name: 'Kharif', months: 'Jun-Oct', crops: ['rice', 'chili'] },
  rabi: { name: 'Rabi', months: 'Nov-Mar', crops: ['wheat', 'onion'] },
  zaid: { name: 'Zaid', months: 'Mar-Jun', crops: ['mango', 'grapes'] },
  perennial: { name: 'Perennial', months: 'Year-round', crops: ['tomato', 'potato'] },
};

/** Generate realistic historical price data for a crop */
function generatePriceHistory(basePrice, weeks = 16) {
  const data = [];
  let price = basePrice;
  for (let i = 0; i < weeks; i++) {
    const noise = (Math.random() - 0.5) * basePrice * 0.12;
    const seasonal = Math.sin((i / weeks) * Math.PI * 2) * basePrice * 0.08;
    price = Math.max(basePrice * 0.6, Math.min(basePrice * 1.5, basePrice + noise + seasonal));
    data.push({
      week: `W${i + 1}`,
      price: Math.round(price),
    });
  }
  return data;
}

/** Generate predicted future prices */
function generatePredictions(basePrice, history) {
  const lastPrice = history[history.length - 1]?.price || basePrice;
  const avgChange = history.length > 1
    ? (history[history.length - 1].price - history[0].price) / history.length
    : 0;

  return [
    { week: 'W+1', price: Math.round(lastPrice + avgChange * 0.8 + (Math.random() - 0.5) * 2), confidence: 0.85 },
    { week: 'W+2', price: Math.round(lastPrice + avgChange * 1.5 + (Math.random() - 0.5) * 3), confidence: 0.72 },
    { week: 'W+3', price: Math.round(lastPrice + avgChange * 2.2 + (Math.random() - 0.5) * 4), confidence: 0.60 },
    { week: 'W+4', price: Math.round(lastPrice + avgChange * 3.0 + (Math.random() - 0.5) * 5), confidence: 0.48 },
  ];
}

/** Calculate demand indicators */
function calculateDemand(cropId) {
  const demands = {
    tomato: { level: 'high', change: 8.2, season: 'peak' },
    onion: { level: 'medium', change: -2.1, season: 'moderate' },
    potato: { level: 'medium', change: 3.5, season: 'steady' },
    rice: { level: 'high', change: 5.8, season: 'peak' },
    wheat: { level: 'low', change: -4.2, season: 'off-season' },
    chili: { level: 'high', change: 12.1, season: 'peak' },
    mango: { level: 'medium', change: 1.3, season: 'moderate' },
    grapes: { level: 'medium', change: 0.8, season: 'steady' },
  };
  return demands[cropId] || { level: 'medium', change: 0, season: 'steady' };
}

/** Get trend direction from price history */
function getTrend(priceHistory) {
  if (priceHistory.length < 4) return { direction: 'stable', strength: 'weak', change: 0 };
  const recent = priceHistory.slice(-4);
  const earlier = priceHistory.slice(-8, -4);
  const recentAvg = recent.reduce((s, p) => s + p.price, 0) / recent.length;
  const earlierAvg = earlier.length ? earlier.reduce((s, p) => s + p.price, 0) / earlier.length : recentAvg;
  const change = ((recentAvg - earlierAvg) / earlierAvg) * 100;
  const direction = change > 2 ? 'increasing' : change < -2 ? 'decreasing' : 'stable';
  const strength = Math.abs(change) > 8 ? 'strong' : Math.abs(change) > 3 ? 'moderate' : 'weak';
  return { direction, strength, change: Math.round(change * 10) / 10 };
}

/* ─────────────────────────────────────────────
   2. TREND ANALYSIS ENGINE
   ───────────────────────────────────────────── */

function analyzeCropTrend(crop) {
  const history = generatePriceHistory(crop.basePrice);
  const predictions = generatePredictions(crop.basePrice, history);
  const trend = getTrend(history);
  const demand = calculateDemand(crop.id);

  const currentPrice = history[history.length - 1].price;
  const priceChange = currentPrice - history[history.length - 5]?.price || currentPrice;
  const priceChangePercent = history[history.length - 5]
    ? ((priceChange / history[history.length - 5].price) * 100).toFixed(1)
    : 0;

  return {
    crop,
    currentPrice,
    priceHistory: history,
    predictions,
    trend,
    demand,
    priceChange: Number(priceChangePercent),
    bestMarket: MOCK_MARKETS[Math.floor(Math.random() * MOCK_MARKETS.length)],
  };
}

/* ─────────────────────────────────────────────
   3. AI EXPLANATION GENERATOR
   ───────────────────────────────────────────── */

const EXPLANATIONS = {
  en: {
    increasing: "Demand is rising due to seasonal factors and reduced supply from competing regions. This is a favorable time to consider selling.",
    decreasing: "Prices are softening due to increased arrivals in mandis and reduced export demand. Consider holding stock if storage is available.",
    stable: "Prices are holding steady with balanced supply and demand. No urgent action needed — monitor for changes.",
    highDemand: "This crop is seeing strong demand from retail and processing sectors. Prices are likely to remain firm.",
    lowDemand: "Demand has slowed for this crop. Consider diversifying or finding alternative markets.",
    bestMarket: "Based on current mandi data, this market offers the best combination of price and accessibility for your produce.",
    sellNow: "Current market conditions favor selling. Prices are at a relative high and demand is strong.",
    waitSell: "Prices may improve in the coming weeks. If you have storage, consider waiting for a better window.",
    seasonTip: "Understanding seasonal patterns helps plan your sowing and harvesting for maximum returns.",
    general: "This analysis is based on current market data, historical patterns, and AI trend modeling. Always consider local conditions.",
  },
  hi: {
    increasing: "मांग मौसमी कारकों और प्रतिस्पर्धी क्षेत्रों से कम आपूर्ति के कारण बढ़ रही है। बेचने का अनुकूल समय है।",
    decreasing: "मंडियों में बढ़ती आवक और कम निर्यात मांग के कारण कीमतें कम हो रही हैं। भंडारण हो तो रोकें।",
    stable: "कीमतें स्थिर हैं, आपूर्ति और मांग संतुलित है। कोई जल्दी कार्रवाई की जरूरत नहीं।",
    highDemand: "इस फसल की खुदरा और प्रसंस्करण क्षेत्रों से मजबूत मांग है। कीमतें बनी रहेंगी।",
    lowDemand: "इस फसल की मांग धीमी पड़ गई है। विविधीकरण या वैकल्पिक बाज़ार देखें।",
    bestMarket: "वर्तमान मंडी डेटा के अनुसार, यह बाज़ार आपकी उपज के लिए सबसे अच्छा है।",
    sellNow: "वर्तमान बाज़ार स्थिति बेचने के अनुकूल है। कीमतें अपेक्षाकृत ऊँची हैं।",
    waitSell: "आने वाले हफ्तों में कीमतें बढ़ सकती हैं। भंडारण हो तो इंतज़ार करें।",
    seasonTip: "मौसमी पैटर्न समझने से बुवाई और कटाई की योजना बनाने में मदद मिलती है।",
    general: "यह विश्लेषण वर्तमान बाज़ार डेटा, ऐतिहासिक पैटर्न और AI ट्रेंड मॉडलिंग पर आधारित है। स्थानीय स्थितियों पर विचार करें।",
  },
  bn: {
    increasing: "মৌসুমি কারণ এবং প্রতিযোগী অঞ্চল থেকে কম সরবরাহের কারণে চাহিদা বাড়ছে। বিক্রয়ের অনুকূল সময়।",
    decreasing: "মন্ডিতে বাড়তি আগমন এবং কম রপ্তানি চাহিদার কারণে মূল্য কমছে। স্টক রাখতে পারেন।",
    stable: "মূল্য স্থির আছে, সরবরাহ ও চাহিদা ভারসাম্যপূর্ণ।",
    general: "এই বিশ্লেষণ বর্তমান বাজার ডেটা, ঐতিহাসিক প্যাটার্ন এবং AI ট্রেন্ড মডেলিং-এর উপর ভিত্তি করে।",
  },
  ta: {
    increasing: "பருவகால காரணிகள் மற்றும் போட்டி பகுதிகளிலிருந்து குறைந்த விநியோகம் காரணமாக தேவை அதிகரிக்கிறது.",
    decreasing: "மண்டிகளில் அதிக வருகை காரணமாக விலைகள் குறைகின்றன. சேமிப்பு இருந்தால் காத்திருங்கள்.",
    stable: "விலைகள் நிலையாக உள்ளன, விநியோகம் மற்றும் தேவி சமநிலையில் உள்ளன.",
    general: "இந்த பகுப்பாய்வு தற்போதைய சந்தை தரவு, வரலாற்று முறைகள் மற்றும் AI போக்கு மாதிரியின் அடிப்படையில் அமைந்துள்ளது.",
  },
};

export function generateExplanation(cropId, trend, demand, lang = 'en') {
  const e = EXPLANATIONS[lang] || EXPLANATIONS.en;
  const parts = [];

  if (trend.direction === 'increasing') parts.push(e.increasing);
  else if (trend.direction === 'decreasing') parts.push(e.decreasing);
  else parts.push(e.stable);

  if (demand.level === 'high') parts.push(e.highDemand);
  else if (demand.level === 'low') parts.push(e.lowDemand);

  parts.push(e.general);
  return parts.join(' ');
}

/* ─────────────────────────────────────────────
   4. MARKET COMPARISON
   ───────────────────────────────────────────── */

function compareMarkets(cropId) {
  const crop = MOCK_CROPS.find((c) => c.id === cropId);
  if (!crop) return [];

  return MOCK_MARKETS.map((market) => ({
    ...market,
    currentPrice: Math.round(crop.basePrice + (Math.random() - 0.3) * crop.basePrice * 0.3),
    supply: Math.round(Math.random() * 5000 + 500),
    demand: Math.round(Math.random() * 4000 + 800),
    rating: (4 + Math.random()).toFixed(1),
  })).sort((a, b) => b.currentPrice - a.currentPrice);
}

/* ─────────────────────────────────────────────
   PUBLIC API
   ───────────────────────────────────────────── */

/** Get all crop trends */
export function getCropTrends() {
  return MOCK_CROPS.map(analyzeCropTrend);
}

/** Get trend for a specific crop */
export function getCropTrend(cropId) {
  const crop = MOCK_CROPS.find((c) => c.id === cropId);
  return crop ? analyzeCropTrend(crop) : null;
}

/** Get price history for a crop (chart data) */
export function getPriceHistory(cropId) {
  const crop = MOCK_CROPS.find((c) => c.id === cropId);
  if (!crop) return [];
  const history = generatePriceHistory(crop.basePrice);
  const predictions = generatePredictions(crop.basePrice, history);
  return [
    ...history.map((h) => ({ ...h, type: 'actual' })),
    ...predictions.map((p) => ({ ...p, type: 'predicted' })),
  ];
}

/** Get demand indicators for all crops */
export function getDemandIndicators() {
  return MOCK_CROPS.map((crop) => ({
    ...crop,
    demand: calculateDemand(crop.id),
  }));
}

/** Get regional market trends */
export function getRegionalTrends() {
  return MOCK_MARKETS.map((market) => ({
    ...market,
    topCrops: MOCK_CROPS.slice(0, 3).map((crop) => ({
      ...crop,
      price: Math.round(crop.basePrice + (Math.random() - 0.3) * crop.basePrice * 0.2),
    })),
    activeBuyers: Math.floor(Math.random() * 20 + 5),
    volume: Math.floor(Math.random() * 10000 + 2000),
  }));
}

/** Get AI recommendations */
export function getAIRecommendations() {
  return [
    {
      id: 1,
      type: 'sell',
      crop: MOCK_CROPS[0],
      message: 'Consider selling your tomatoes now — prices are trending upward and demand is high.',
      confidence: 0.82,
      urgency: 'high',
    },
    {
      id: 2,
      type: 'hold',
      crop: MOCK_CROPS[4],
      message: 'Wheat prices are likely to recover in 2-3 weeks. Hold stock if you have storage.',
      confidence: 0.68,
      urgency: 'medium',
    },
    {
      id: 3,
      type: 'plant',
      crop: MOCK_CROPS[2],
      message: 'Potato planting season is approaching. Early planting can yield premium prices.',
      confidence: 0.75,
      urgency: 'low',
    },
    {
      id: 4,
      type: 'market',
      crop: MOCK_CROPS[3],
      message: 'Nashik Mandi currently offers 8% higher rice prices compared to your usual market.',
      confidence: 0.90,
      urgency: 'medium',
    },
  ];
}

/** Get market comparison for a crop */
export function getMarketComparison(cropId) {
  return compareMarkets(cropId);
}

/** Get available crops */
export function getAvailableCrops() {
  return MOCK_CROPS;
}

/** Get available markets */
export function getAvailableMarkets() {
  return MOCK_MARKETS;
}

/** AI chat: process a trend-related query */
export function processTrendQuery(query, lang = 'en') {
  const q = query.toLowerCase();
  const explanations = EXPLANATIONS[lang] || EXPLANATIONS.en;

  // Detect crop
  const cropMatch = MOCK_CROPS.find((c) =>
    q.includes(c.id) || q.includes(c.name.toLowerCase())
  );

  // Detect intent
  if (/trend|price|increase|decrease|up|down|ढल|चढ़|बढ़|বৃদ্ধি|குறை|పెరుగు|वाढ|ਵਾਧਾ|प्रवृत्ति|রুझান/i.test(q)) {
    if (cropMatch) {
      const trend = analyzeCropTrend(cropMatch);
      return {
        text: `${cropMatch.emoji} ${cropMatch.name}: ${explanations[trend.trend.direction]}\n\nCurrent: ₹${trend.currentPrice}/${cropMatch.unit} (${trend.trend.change > 0 ? '+' : ''}${trend.trend.change}%)\nPredicted: ₹${trend.predictions[0].price}/${cropMatch.unit} next week (confidence: ${Math.round(trend.predictions[0].confidence * 100)}%)`,
        trend,
      };
    }
    return { text: `${explanations.general}\n\nAsk about specific crops: tomato, onion, rice, wheat, chili, potato, mango, grapes.`, trend: null };
  }

  if (/sell|hold|wait|बेच|रोक|पकड़|বিক্রয়|விற்க|अम्म|అమ్మ|विक्री|ਵੇਚ|बिक्री/i.test(q)) {
    if (cropMatch) {
      const trend = analyzeCropTrend(cropMatch);
      const advice = trend.trend.direction === 'increasing' ? explanations.sellNow : explanations.waitSell;
      return { text: `${cropMatch.emoji} ${cropMatch.name}: ${advice}\n\nConfidence: ${Math.round((0.5 + Math.random() * 0.4) * 100)}%`, trend };
    }
    return { text: explanations.general, trend: null };
  }

  if (/demand|मांग|चाहिदা|தேவை|డిమాండ్|माग|ਮੰਗ|Чाहिदा/i.test(q)) {
    const demands = getDemandIndicators();
    const highDemand = demands.filter((d) => d.demand.level === 'high');
    const list = highDemand.map((d) => `${d.emoji} ${d.name} (${d.demand.change > 0 ? '+' : ''}${d.demand.change}%)`).join('\n');
    return { text: `${lang === 'hi' ? 'उच्च मांग वाली फसलें:' : 'High demand crops:'}\n${list}\n\n${explanations.highDemand}`, trend: null };
  }

  if (/market|mandi|बाज़ार|मंडी|বাজার|சந்தை|మార్కెట్|बाजार|ਮੰਡੀ|बजार/i.test(q)) {
    const markets = getRegionalTrends();
    const list = markets.slice(0, 4).map((m) => `${m.name}: ${m.topCrops.map((c) => `${c.emoji} ₹${c.price}`).join(', ')}`).join('\n');
    return { text: `${lang === 'hi' ? 'नज़दीकी बाज़ार:' : 'Nearby markets:'}\n${list}`, trend: null };
  }

  if (/season|मौसम|मौसमी|মৌসুম|பருவம்|సీజన్|हवामान|ਸੀਜ਼ਨ| موسم/i.test(q)) {
    return {
      text: `${lang === 'hi' ? 'मौसमी रुझान:' : 'Seasonal trends:'}\n\n🟢 Kharif (Jun-Oct): Rice, Chili — Peak season\n🟡 Rabi (Nov-Mar): Wheat, Onion — Moderate demand\n🔵 Zaid (Mar-Jun): Mango, Grapes — Coming season\n⚪ Perennial: Tomato, Potato — Year-round\n\n${explanations.seasonTip}`,
      trend: null,
    };
  }

  // Default response
  return {
    text: `${explanations.general}\n\n${lang === 'hi' ? 'आप पूछ सकते हैं:' : 'You can ask about:'}\n• ${lang === 'hi' ? 'टमाटर का रुझान' : 'Tomato trends'}\n• ${lang === 'hi' ? 'क्या मुझे गेहूं अभी बेचना चाहिए?' : 'Should I sell wheat now?'}\n• ${lang === 'hi' ? 'कौन सी फसल की ज़्यादा मांग है?' : 'Which crops are in high demand?'}\n• ${lang === 'hi' ? 'नज़दीकी मंडी की कीमतें' : 'Nearby market prices'}`,
    trend: null,
  };
}

export { MOCK_CROPS, MOCK_MARKETS, SEASONS };
