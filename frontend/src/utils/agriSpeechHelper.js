/**
 * Agricultural Speech Helper
 * 
 * Provides:
 * 1. Speech-to-text normalizer for Indian agricultural vocabulary (crops, fertilizers, diseases, mandis)
 * 2. Location intent detection for "near me" mandi queries
 * 3. Text cleaner for TTS (strips markdown, emojis, converts currency to natural spoken words)
 */

// Common phonetic / speech recognition errors mapped to standard agricultural terms
const AGRI_PHONETIC_CORRECTIONS = [
  // Crops & Produce
  { pattern: /\b(tometo|tomoto|tomata|tamater|tamator)\b/gi, replacement: 'tomato' },
  { pattern: /\b(alu|aaloo|aalu|batata)\b/gi, replacement: 'potato' },
  { pattern: /\b(pyaj|pyaaz|pyaz|piyaj|kanda)\b/gi, replacement: 'onion' },
  { pattern: /\b(gehu|gehun|gehoo|kanak)\b/gi, replacement: 'wheat' },
  { pattern: /\b(chawal|dhan|chaanwal)\b/gi, replacement: 'rice' },
  { pattern: /\b(mirch|mirchi|hari mirch|marach)\b/gi, replacement: 'chilli' },
  { pattern: /\b(adrak|adrakh|aada)\b/gi, replacement: 'ginger' },
  { pattern: /\b(lahsun|lasun|lehasun|roshun)\b/gi, replacement: 'garlic' },
  { pattern: /\b(phool gobhi|phool gobi|fulkopi|gobhi|gobi)\b/gi, replacement: 'cauliflower' },
  { pattern: /\b(patta gobhi|patta gobi|bandhakopi)\b/gi, replacement: 'cabbage' },
  { pattern: /\b(baingan|baigan|begun|vangi)\b/gi, replacement: 'brinjal' },
  { pattern: /\b(bhindi|bhendi|dhendos)\b/gi, replacement: 'okra' },
  { pattern: /\b(kheera|khira|kakdi|shosha)\b/gi, replacement: 'cucumber' },
  { pattern: /\b(gajar|gajor)\b/gi, replacement: 'carrot' },
  { pattern: /\b(sarson|sarso|sorshe)\b/gi, replacement: 'mustard' },
  { pattern: /\b(makka|makkai|bhutta)\b/gi, replacement: 'maize' },
  { pattern: /\b(kapas|rui|tula)\b/gi, replacement: 'cotton' },
  { pattern: /\b(ganna|aakh)\b/gi, replacement: 'sugarcane' },
  { pattern: /\b(haldi|holud)\b/gi, replacement: 'turmeric' },
  { pattern: /\b(kela|kola)\b/gi, replacement: 'banana' },
  { pattern: /\b(seb|saeb|apel)\b/gi, replacement: 'apple' },
  { pattern: /\b(aam)\b/gi, replacement: 'mango' },

  // Fertilizers & Chemicals
  { pattern: /\b(uria|yuriya|yuria)\b/gi, replacement: 'urea' },
  { pattern: /\b(d a p|die ammonium)\b/gi, replacement: 'DAP' },
  { pattern: /\b(n p k)\b/gi, replacement: 'NPK' },
  { pattern: /\b(potash|potaash)\b/gi, replacement: 'potash' },
  { pattern: /\b(khad|saar|gobarkhad)\b/gi, replacement: 'fertilizer' },
  { pattern: /\b(kitnashak|keetnashak|kitnashok)\b/gi, replacement: 'pesticide' },
  { pattern: /\b(fungiside|fafundinashak)\b/gi, replacement: 'fungicide' },

  // Mandi & Price Terms
  { pattern: /\b(mondi|mandi rate|mandi price)\b/gi, replacement: 'mandi' },
  { pattern: /\b(bhaav|bhav|daam|daam kitna|bhav kya)\b/gi, replacement: 'price' },
  { pattern: /\b(apmc rate|bazaar bhav)\b/gi, replacement: 'mandi price' }
];

/**
 * Corrects common speech-to-text recognition slips for agricultural terminology
 */
export function normalizeAgriSpeech(transcript) {
  if (!transcript || typeof transcript !== 'string') return '';

  let normalized = transcript.trim();
  for (const item of AGRI_PHONETIC_CORRECTIONS) {
    normalized = normalized.replace(item.pattern, item.replacement);
  }
  return normalized;
}

/**
 * Detects if the user's question has a location / "near me" intent
 */
export function hasLocationIntent(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  const locationTerms = [
    'near me', 'nearby', 'nearest', 'near', 'around me', 'closest',
    'paas', 'pass', 'najdeek', 'ke paas', 'aas paas', 'bagal me',
    'amar kache', 'kache', 'nikatbartee', 'kacher',
    'पास', 'नजदीक', 'आसपास', 'काछे', 'কাছে', 'নিকটবর্তী'
  ];
  return locationTerms.some(term => lower.includes(term));
}

/**
 * Cleans text for natural Text-To-Speech playback
 * - Strips emojis
 * - Removes markdown asterisks, hashes, bullets
 * - Converts currency symbols to localized spoken words
 * - Strips URLs
 */
export function cleanTextForTTS(text, langCode = 'en') {
  if (!text) return '';

  let cleaned = text
    // Remove emojis
    .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
    // Remove markdown bold / italic
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/_{1,2}(.*?)_{1,2}/g, '$1')
    // Remove markdown headers
    .replace(/^#+\s+/gm, '')
    // Remove bullet points
    .replace(/^\s*[-•*]\s+/gm, '')
    // Remove markdown links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove raw URLs
    .replace(/https?:\/\/\S+/gi, '');

  // Currency replacement based on language
  const code = (langCode || 'en').toLowerCase();
  if (code === 'hi') {
    cleaned = cleaned
      .replace(/₹\s*([0-9,]+)/g, '$1 रुपये')
      .replace(/([0-9,]+)\s*\/quintal/gi, '$1 रुपये प्रति क्विंटल')
      .replace(/([0-9,]+)\s*\/kg/gi, '$1 रुपये प्रति किलो');
  } else if (code === 'bn') {
    cleaned = cleaned
      .replace(/₹\s*([0-9,]+)/g, '$1 টাকা')
      .replace(/([0-9,]+)\s*\/quintal/gi, '$1 টাকা প্রতি কুইন্টাল')
      .replace(/([0-9,]+)\s*\/kg/gi, '$1 টাকা প্রতি কেজি');
  } else {
    cleaned = cleaned
      .replace(/₹\s*([0-9,]+)/g, '$1 rupees')
      .replace(/([0-9,]+)\s*\/quintal/gi, '$1 rupees per quintal')
      .replace(/([0-9,]+)\s*\/kg/gi, '$1 rupees per kg');
  }

  // Normalize excessive spaces and linebreaks into natural pauses
  cleaned = cleaned
    .replace(/\n+/g, '. ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned;
}

/**
 * Splits streaming text into completed sentences ready for immediate TTS playback
 */
export function extractCompletedSentences(buffer) {
  // Delimiters for English, Hindi (purna viram ।), Bengali, etc.
  const sentenceRegex = /([^.!?।\n]+[.!?।\n]+)/g;
  const matches = [];
  let match;
  let lastIndex = 0;

  while ((match = sentenceRegex.exec(buffer)) !== null) {
    matches.push(match[0].trim());
    lastIndex = sentenceRegex.lastIndex;
  }

  const remaining = buffer.substring(lastIndex);
  return { completed: matches, remaining };
}

/**
 * High-reliability client-side agronomy fallback for immediate responses
 * in case of network drops, server restart, or external API timeouts.
 */
export function getEmergencyAgriResponse(rawQuery, langCode = 'en') {
  const q = (rawQuery || '').toLowerCase();
  const lang = (langCode || 'en').toLowerCase();

  // 1. Off-topic detection (cars, bikes, gadgets, cinema, sports, politics)
  const isOffTopic = (
    (q.includes('car') || q.includes('buy a car') || q.includes('bike') || q.includes('truck') || q.includes('iphone') ||
     q.includes('phone') || q.includes('movie') || q.includes('song') || q.includes('cricket') || q.includes('ipl') ||
     q.includes('crypto') || q.includes('stock market') || q.includes('politics') || q.includes('election')) &&
    !q.includes('tractor') && !q.includes('farmer') && !q.includes('kisan') && !q.includes('kheti') && !q.includes('fasal')
  );

  if (isOffTopic) {
    if (lang === 'hi') {
      const text = 'मैं आपका कृषि मित्र हूँ। मैं केवल खेती-बाड़ी, फसल, मंडी भाव, खाद, कीट नियंत्रण और मौसम से जुड़े सवालों में आपकी मदद कर सकता हूँ। कृपया कृषि से संबंधित प्रश्न पूछें।';
      return { text, spokenText: text, intent: 'OFF_TOPIC' };
    }
    if (lang === 'bn') {
      const text = 'আমি আপনার কৃষি মিত্র। আমি শুধুমাত্র কৃষি, ফসল, মান্ডির দর, সার, কীট দমন এবং চাষবাস সম্পর্কিত বিষয়ে সহায়তা করতে পারি। দয়া করে কৃষিসংক্রান্ত প্রশ্ন জিজ্ঞাসা করুন।';
      return { text, spokenText: text, intent: 'OFF_TOPIC' };
    }
    const text = 'I am Krishi Mitra, your farming assistant. I specialize only in agriculture, crops, mandi prices, fertilizers, pests, and farming guidance. Please ask a farming-related question.';
    return { text, spokenText: text, intent: 'OFF_TOPIC' };
  }

  // 2. Potato fertilizer & rapid growth
  if (q.includes('potato') || q.includes('aalu') || q.includes('aloo') || q.includes('आलू') || q.includes('আলু')) {
    if (lang === 'hi') {
      const text = 'आलू की तेज बढ़वार और पैदावार के लिए बुवाई के समय प्रति एकड़ 100 किग्रा डीएपी, 80 किग्रा एमओपी और 50 किग्रा यूरिया की बेसल खुराक डालें। बुवाई के 30-35 दिन बाद मिट्टी चढ़ाते समय 50 किग्रा यूरिया की टॉप ड्रेसिंग करें। कंदों के तेजी से विकास के लिए 45 और 60 दिन पर 13-0-45 (पोटेशियम नाइट्रेट) का छिड़काव करें।';
      return { text, spokenText: text, crop: 'Potato', intent: 'AGRICULTURE_QA' };
    }
    if (lang === 'bn') {
      const text = 'আলুর দ্রুত বৃদ্ধি ও ফলনের জন্য রোপণের সময় প্রতি একরে ১০০ কেজি ডিএপি, ৮০ কেজি এমওপি এবং ৫০ কেজি ইউরিয়া প্রয়োগ করুন। রোপণের ৩০-৩৫ দিন পর মাটি তোলার সময় ৫০ কেজি ইউরিয়া দিন। আলুর দ্রুত আকার বৃদ্ধির জন্য ৪৫ এবং ৬০ দিনের মাথায় ১৩-০-৪৫ (পটাশিয়াম নাইট্রেট) স্প্রে করুন।';
      return { text, spokenText: text, crop: 'Potato', intent: 'AGRICULTURE_QA' };
    }
    const text = 'For faster potato growth and high yield, apply a basal dose of 100 kg DAP, 80 kg MOP, and 50 kg Urea per acre before planting. Top-dress with 50 kg Urea at 30–35 days during earthing-up. For rapid tuber bulking, spray Potassium Nitrate (13-0-45) @ 5g/L at 45 and 60 days.';
    return { text, spokenText: text, crop: 'Potato', intent: 'AGRICULTURE_QA' };
  }

  // 3. Wheat
  if (q.includes('wheat') || q.includes('gehun') || q.includes('gehu') || q.includes('गेहूं') || q.includes('গম')) {
    if (lang === 'hi') {
      const text = 'गेहूं के लिए बुवाई पर प्रति एकड़ 55 किग्रा डीएपी, 20 किग्रा एमओपी और 40 किग्रा यूरिया डालें। बुवाई के 20-25 दिन बाद पहली सिंचाई (सीआरआई अवस्था) पर 40 किग्रा यूरिया दें। कल्ले निकलने के बाद दूसरा यूरिया डालें।';
      return { text, spokenText: text, crop: 'Wheat', intent: 'AGRICULTURE_QA' };
    }
    if (lang === 'bn') {
      const text = 'গমের জন্য একর প্রতি ৫৫ কেজি ডিএপি, ২০ কেজি এমওপি এবং ৪০ কেজি ইউরিয়া রোপণের সময় দিন। রোপণের ২০-২৫ দিনের মাথায় প্রথম সেচ ও ৪০ কেজি ইউরিয়া দেওয়া অত্যন্ত জরুরি।';
      return { text, spokenText: text, crop: 'Wheat', intent: 'AGRICULTURE_QA' };
    }
    const text = 'For wheat, apply 55 kg DAP, 20 kg MOP, and 40 kg Urea per acre at sowing. Provide the critical first irrigation at 21 days (Crown Root Initiation stage) along with 40 kg Urea top-dressing.';
    return { text, spokenText: text, crop: 'Wheat', intent: 'AGRICULTURE_QA' };
  }

  // 4. General Pest & Disease
  if (q.includes('pest') || q.includes('insect') || q.includes('disease') || q.includes('keeda') || q.includes('कीट') || q.includes('रोग') || q.includes('পোকা')) {
    if (lang === 'hi') {
      const text = 'रस चूसक कीटों (माहू, थ्रिप्स) के लिए नीम तेल 10,000 ppm (3 मिली/लीटर) या एसिटामिप्रिड (0.5 ग्राम/लीटर) का छिड़काव करें। फफूंद जनित रोगों के लिए मैंकोजेब (2.5 ग्राम/लीटर) का प्रयोग करें।';
      return { text, spokenText: text, intent: 'AGRICULTURE_QA' };
    }
    if (lang === 'bn') {
      const text = 'চোষক পোকা দমনে নিম তেল (৩ মিলি/লিটার) বা অ্যাসিটামিপ্রিড স্প্রে করুন। ছত্রাকজনিত রোগের জন্য ম্যানকোজেব (২.৫ গ্রাম/লিটার) ব্যবহার করুন।';
      return { text, spokenText: text, intent: 'AGRICULTURE_QA' };
    }
    const text = 'For sucking pests (aphids, thrips), spray Neem oil (3 ml/L) or Acetamiprid (0.5 g/L). For fungal diseases, spray Mancozeb 75 WP (2.5 g/L).';
    return { text, spokenText: text, intent: 'AGRICULTURE_QA' };
  }

  // 5. General Agricultural advice
  if (lang === 'hi') {
    const text = 'फसल की अच्छी पैदावार के लिए संतुलित एनपीके खाद का प्रयोग करें, खेत में जल निकासी का उचित प्रबंध रखें और जैविक सुधार के लिए ट्राइकोडर्मा तथा सड़ी गोबर की खाद का उपयोग करें।';
    return { text, spokenText: text, intent: 'AGRICULTURE_QA' };
  }
  if (lang === 'bn') {
    const text = 'ফসলের সর্বোচ্চ ফলনের জন্য সুষম এনপিকে সার ব্যবহার করুন, সঠিক সেচ ও নিকাশি ব্যবস্থা রাখুন এবং ট্রাইকোডার্মা ও পচা গোবর সারের মতো জৈব উপাদান প্রয়োগ করুন।';
    return { text, spokenText: text, intent: 'AGRICULTURE_QA' };
  }
  const text = 'For healthy crops, ensure balanced NPK fertilization based on soil testing, maintain adequate drainage, and incorporate organic compost with bio-fertilizers like Trichoderma.';
  return { text, spokenText: text, intent: 'AGRICULTURE_QA' };
}
