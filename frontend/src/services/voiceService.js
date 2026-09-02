/**
 * Voice Assistant Service
 *
 * This module handles:
 * 1. Generating AI responses to farmer queries
 * 2. Translating queries between languages (future)
 *
 * Current implementation: Local agricultural knowledge base.
 * Can be replaced with a real AI API by swapping generateResponse().
 */



/* ─────────────────────────────────────────────
   Agricultural Knowledge Base (multilingual)
   ───────────────────────────────────────────── */

const KNOWLEDGE_BASE = {
  en: {
    greetings: "Hello! I'm your Mitti2Market assistant. Ask me about farming, crop prices, orders, or the marketplace.",
    crops: {
      tomato: "For tomatoes: Use drip irrigation. Monitor for early blight and fruit borer. Spray neem oil for pests. Current market price: ₹25-30/kg. Best planting time: After monsoon or February.",
      onion: "For onions: Use well-drained soil. Protect from purple blotch. Keep soil moist during bulb formation. Market price: ₹22-26/kg. Store in cool, dry places.",
      potato: "For potatoes: Use certified seed potatoes. Monitor for late blight. Hill up plants regularly. Market price: ₹18-24/kg. Harvest when foliage yellows.",
      rice: "For rice: Maintain proper water levels. Use SRI method for better yields. Watch for blast disease. Market price: ₹28-35/kg. Transplant seedlings 20-25 days old.",
      wheat: "For wheat: Sow in November. Use zero tillage for conservation. Apply nitrogen in splits. Market price: ₹24-28/kg. Harvest when grain is hard.",
      mango: "For mango: Prune after harvest. Control powdery mildew with sulphur spray. Use fruit fly traps. Market price: ₹60-80/kg for Alphonso.",
      grapes: "For grapes: Use shade net in summer. Spray for berry moth. Maintain proper spacing. Market price: ₹50-70/kg. Harvest when berries are sweet.",
      chili: "For chilies: Transplant after monsoon. Watch for leaf curl virus. Use yellow sticky traps. Market price: ₹100-130/kg for Guntur variety.",
    },
    prices: "Current market prices are updated regularly on your dashboard. The AI Price Advisor provides recommendations based on demand, supply, and seasonal trends. Check the 'AI Price Advisor' section for detailed analysis.",
    orders: "To manage orders: Go to the Orders section in your dashboard. You can track order status, view delivery details, and contact buyers directly.",
    logistics: "For logistics: Use our AI-optimized routes to reduce transport costs. You can arrange pickup through the Logistics section.",
    general: "I can help with: Crop advice (say 'tomato advice' or 'rice tips'), Market prices (say 'price of onion'), Order management, Logistics and delivery tips. What would you like to know?",
  },
  hi: {
    greetings: "नमस्ते! मैं आपका Mitti2Market सहायक हूँ। खेती, फसल की कीमतों, ऑर्डर या बाज़ार के बारे में पूछें।",
    crops: {
      tomato: "टमाटर के लिए: ड्रिप सिंचाई का उपयोग करें। प्रारंभिक झुलसन और फल छेदक की निगरानी करें। कीटों के लिए नीम का तेल छिड़कें। बाज़ार मूल्य: ₹25-30/किलो। रोपण का सबसे अच्छा समय: मानसून के बाद या फरवरी।",
      onion: "प्याज के लिए: अच्छी जल निकासी वाली मिट्टी का उपयोग करें। बैंगनी धब्बे से बचाएं। प्याज के गठन के दौरान मिट्टी को नम रखें। बाज़ार मूल्य: ₹22-26/किलो।",
      potato: "आलू के लिए: प्रमाणित बीज आलू का उपयोग करें। देर से झुलसन की निगरानी करें। बाज़ार मूल्य: ₹18-24/किलो।",
      rice: "चावल के लिए: सही पानी का स्तर बनाए रखें। ब्लास्ट रोग की जांच करें। बाज़ार मूल्य: ₹28-35/किलो।",
      wheat: "गेहूं के लिए: नवंबर में बोएं। नाइट्रोजन को भागों में डालें। बाज़ार मूल्य: ₹24-28/किलो।",
      mango: "आम के लिए: फसल के बाद छंटाई करें। पाउडरी मिल्ड्यू को नियंत्रित करें। बाज़ार मूल्य: ₹60-80/किलो।",
      grapes: "अंगूर के लिए: गर्मियों में शेड नेट का उपयोग करें। बाज़ार मूल्य: ₹50-70/किलो।",
      chili: "मिर्च के लिए: मानसून के बाद रोपाई करें। लीफ कर्ल वायरस से सावधान रहें। बाज़ार मूल्य: ₹100-130/किलो।",
    },
    prices: "वर्तमान बाज़ार मूल्य आपके डैशबोर्ड पर नियमित रूप से अपडेट होते हैं। AI मूल्य सलाहकार मांग, आपूर्ति और मौसमी रुझानों के आधार पर सिफारिशें प्रदान करता है।",
    orders: "ऑर्डर प्रबंधित करने के लिए: अपने डैशबोर्ड में ऑर्डर सेक्शन में जाएं। आप ऑर्डर स्थिति ट्रैक कर सकते हैं और खरीदारों से सीधे संपर्क कर सकते हैं।",
    logistics: "लॉजिस्टिक्स के लिए: परिवहन लागत कम करने के लिए हमारे AI-अनुकूलित मार्गों का उपयोग करें।",
    general: "मैं मदद कर सकता हूँ: फसल सलाह, बाज़ार मूल्य, ऑर्डर प्रबंधन, लॉजिस्टिक्स। आप क्या जानना चाहेंगे?",
  },
  bn: {
    greetings: "নমস্কার! আমি আপনার Mitti2Market সহকারী। কৃষি, ফসলের মূল্য, অর্ডার বা বাজার সম্পর্কে জিজ্ঞাসা করুন।",
    crops: {
      tomato: "টমেটোর জন্য: ড্রিপ সেচ ব্যবহার করুন। আর্লি ব্লাইট এবং ফ্রুট বোরার পর্যবেক্ষণ করুন। বাজার মূল্য: ₹25-30/কেজি।",
      onion: "পেঁয়াজের জন্য: ভালো জল নিকাস মাটি ব্যবহার করুন। বাজার মূল্য: ₹22-26/কেজি।",
      rice: "ভাতের জন্য: সঠিক জলের পরিমাণ বজায় রাখুন। বাজার মূল্য: ₹28-35/কেজি।",
    },
    prices: "বর্তমান বাজার মূল্য আপনার ড্যাশবোর্ডে নিয়মিত আপডেট হয়। AI মূল্য পরামর্শদাতা চেক করুন।",
    orders: "অর্ডার পরিচালনা করতে: আপনার ড্যাশবোর্ডে অর্ডার সেকশনে যান।",
    logistics: "লজিস্টিক্সের জন্য: আমাদের AI-অপ্টিমাইজড রুট ব্যবহার করুন।",
    general: "আমি সাহায্য করতে পারি: ফসল পরামর্শ, বাজার মূল্য, অর্ডার পরিচালনা। আপনি কী জানতে চান?",
  },
  ta: {
    greetings: "வணக்கம்! நான் உங்கள் Mitti2Market உதவியாளர். விவசாயம், பயிர் விலைகள், ஆர்டர்கள் அல்லது சந்தை பற்றி கேளுங்கள்.",
    crops: {
      tomato: "தக்காளிக்கு: சொட்டு நீர்ப்பாசனம் பயன்படுத்துங்கள். சந்தை விலை: ₹25-30/கிலோ.",
      onion: "வெங்காயத்திற்கு: நல்ல வடிகால் மண் பயன்படுத்துங்கள். சந்தை விலை: ₹22-26/கிலோ.",
      rice: "அரிசிக்கு: சரியான நீர் மட்டம் பராமரியுங்கள். சந்தை விலை: ₹28-35/கிலோ.",
    },
    prices: "தற்போதைய சந்தை விலைகள் உங்கள் டாஷ்போர்டில் புதுப்பிக்கப்படுகின்றன.",
    orders: "ஆர்டர்களை நிர்வகிக்க: உங்கள் டாஷ்போர்டில் ஆர்டர் பிரிவுக்குச் செல்லுங்கள்.",
    logistics: "தளவாடங்களுக்கு: எங்கள் AI-ஆப்டிமைஸ்ட் வழிகளைப் பயன்படுத்துங்கள்.",
    general: "நான் உதவ முடியும்: பயிர் ஆலோசனை, சந்தை விலைகள், ஆர்டர் நிர்வாகம். நீங்கள் என்ன அறிய விரும்புகிறீர்கள்?",
  },
  te: {
    greetings: "నమస్కారం! నేను మీ Mitti2Market అసిస్టెంట్. వ్యవసాయం, పంట ధరలు, ఆర్డర్లు లేదా మార్కెట్ గురించి అడగండి.",
    crops: {
      tomato: "టమాటా కోసం: డ్రిప్ సాగునీటి వాడండి. మార్కెట్ ధర: ₹25-30/కిలో.",
      onion: "ఉల్లిపాయ కోసం: మంచి నీటి వసోల్ మట్టి వాడండి. మార్కెట్ ధర: ₹22-26/కిలో.",
      rice: "బియ్యం కోసం: సరైన నీటి స్థాయి కాపాడండి. మార్కెట్ ధర: ₹28-35/కిలో.",
    },
    prices: "ప్రస్తుత మార్కెట్ ధరలు మీ డాష్‌బోర్డ్‌లో నియమితంగా అప్‌డేట్ అవుతాయి.",
    orders: "ఆర్డర్లను నిర్వహించడానికి: మీ డాష్‌బోర్డ్‌లో ఆర్డర్ విభాగానికి వెళ్ళండి.",
    logistics: "లాజిస్టిక్స్ కోసం: మా AI-ఆప్టిమైజ్డ్ రూట్లను ఉపయోగించండి.",
    general: "నేను సహాయం చేయగలను: పంట సలహా, మార్కెట్ ధరలు, ఆర్డర్ నిర్వహణ. మీరు ఏమి తెలుసుకోవాలనుకుంటున్నారు?",
  },
  mr: {
    greetings: "नमस्कार! मी तुमचा Mitti2Market सहाय्यक आहे. शेती, पिकांच्या किंमती, ऑर्डर किंवा बाजाराबद्दल विचारा.",
    crops: {
      tomato: "टोमॅटोसाठी: ड्रिप सिंचन वापरा. बाजार किंमत: ₹25-30/किलो.",
      onion: "कांद्यासाठी: चांगल्या पाण्याच्या निचरा असलेली माती वापरा. बाजार किंमत: ₹22-26/किलो.",
      rice: "तांदूळासाठी: योग्य पाण्याची पातळी राखा. बाजार किंमत: ₹28-35/किलो.",
    },
    prices: "सध्याच्या बाजार किंमती तुमच्या डॅशबोर्डवर नियमित अद्यायावत होतात.",
    orders: "ऑर्डर व्यवस्थापित करण्यासाठी: तुमच्या डॅशबोर्डमधील ऑर्डर विभागात जा.",
    general: "मी मदत करू शकतो: पीक सल्ला, बाजार किंमती, ऑर्डर व्यवस्थापन. तुम्हाला काय जाणून घ्यायचे आहे?",
  },
  gu: {
    greetings: "નમસ્તે! હું તમારો Mitti2Market સહાયક છું. ખેતી, પાકના ભાવ, ઓર્ડર અથવા માર્કેટપ્લેસ વિશે પૂછો.",
    crops: {
      tomato: "ટમેટા માટે: ડ્રિપ સિંચન વપરાશો. બજાર ભાવ: ₹25-30/કિલો.",
      onion: "ડુંગળી માટે: સારી પાણીનિકાસ માટી વપરાશો. બજાર ભાવ: ₹22-26/કિલો.",
    },
    prices: "વર્તમાન બજાર ભાવ તમારા ડેશબોર્ડ પર નિયમિત રીતે અપડેટ થાય છે.",
    general: "હું મદદ કરી શકું: પાક સલાહ, બજાર ભાવ, ઓર્ડર વ્યવસ્થાપન.",
  },
  kn: {
    greetings: "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ Mitti2Market ಸಹಾಯಕ. ಕೃಷಿ, ಬೆಳೆ ಬೆಲೆಗಳು, ಆರ್ಡರ್‌ಗಳು ಅಥವಾ ಮಾರುಕಟ್ಟೆ ಬಗ್ಗೆ ಕೇಳಿ.",
    crops: {
      tomato: "ಟೊಮೇಟೊಗೆ: ಡ್ರಿಪ್ ನೀರಾವರಿ ಬಳಸಿ. ಮಾರುಕಟ್ಟೆ ಬೆಲೆ: ₹25-30/ಕೆಜಿ.",
      rice: "ಅಕ್ಕಿಗೆ: ಸರಿಯಾದ ನೀರಿನ ಮಟ್ಟ ಕಾಪಾಡಿ. ಮಾರುಕಟ್ಟೆ ಬೆಲೆ: ₹28-35/ಕೆಜಿ.",
    },
    prices: "ಪ್ರಸ್ತುತ ಮಾರುಕಟ್ಟೆ ಬೆಲೆಗಳು ನಿಮ್ಮ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ನಲ್ಲಿ ನಿಯಮಿತವಾಗಿ ನವೀಕರಿಸಲಾಗುತ್ತದೆ.",
    general: "ನಾನು ಸಹಾಯ ಮಾಡಬಲ್ಲೆ: ಬೆಳೆ ಸಲಹೆ, ಮಾರುಕಟ್ಟೆ ಬೆಲೆಗಳು, ಆರ್ಡರ್ ನಿರ್ವಹಣೆ.",
  },
  ml: {
    greetings: "നമസ്കാരം! ഞാൻ നിങ്ങളുടെ Mitti2Market സഹായകൻ. കൃഷി, വിള വിലകൾ, ഓർഡറുകൾ അല്ലെങ്കിൽ മാർക്കറ്റ് എന്നതിനെക്കുറിച്ച് ചോദിക്കൂ.",
    crops: {
      tomato: "തക്കാളിക്ക്: ഡ്രിപ്പ് ജലസേചനം ഉപയോഗിക്കൂ. മാർക്കറ്റ് വില: ₹25-30/കിലോ.",
      rice: "അരിക്ക്: ശരിയായ ജലനിരപ്പ് നിലനിർത്തൂ. മാർക്കറ്റ് വില: ₹28-35/കിലോ.",
    },
    prices: "നിലവിലെ മാർക്കറ്റ് വിലകൾ നിങ്ങളുടെ ഡാഷ്‌ബോർഡിൽ ക്രമമായി അപ്ഡേറ്റ് ചെയ്യുന്നു.",
    general: "ഞാൻ സഹായിക്കാൻ കഴിയും: വിള ഉപദേശം, മാർക്കറ്റ് വിലകൾ, ഓർഡർ മാനേജ്‌മെന്റ്.",
  },
  pa: {
    greetings: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਤੁਹਾਡਾ Mitti2Market ਸਹਾਇਕ ਹਾਂ। ਖੇਤੀ, ਫ਼ਸਲ ਦੀਆਂ ਕੀਮਤਾਂ, ਆਰਡਰ ਜਾਂ ਬਾਜ਼ਾਰ ਬਾਰੇ ਪੁੱਛੋ।",
    crops: {
      tomato: "ਟਮਾਟਰ ਲਈ: ਡ੍ਰਿਪ ਸਿੰਚਾਈ ਵਰਤੋ। ਬਾਜ਼ਾਰ ਕੀਮਤ: ₹25-30/ਕਿਲੋ।",
      rice: "ਚੌਲ ਲਈ: ਸਹੀ ਪਾਣੀ ਦਾ ਪੱਧਰ ਰੱਖੋ। ਬਾਜ਼ਾਰ ਕੀਮਤ: ₹28-35/ਕਿਲੋ।",
    },
    prices: "ਮੌਜੂਦਾ ਬਾਜ਼ਾਰ ਕੀਮਤਾਂ ਤੁਹਾਡੇ ਡੈਸ਼ਬੋਰਡ 'ਤੇ ਨਿਯਮਤ ਤੌਰ 'ਤੇ ਅੱਪਡੇਟ ਹੁੰਦੀਆਂ ਹਨ।",
    general: "ਮੈਂ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ: ਫ਼ਸਲ ਸਲਾਹ, ਬਾਜ਼ਾਰ ਕੀਮਤਾਂ, ਆਰਡਰ ਪ੍ਰਬੰਧਨ।",
  },
  or: {
    greetings: "ନମସ୍କାର! ମୁଁ ଆପଣଙ୍କ Mitti2Market ସହାୟକ। କୃଷି, ଫସଲ ମୂଲ୍ୟ, ଅର୍ଡର କିମ୍ବା ବଜାର ବିଷୟରେ ପଚାରନ୍ତୁ।",
    crops: {
      tomato: "ଟମାଟୋ ପାଇଁ: ଡ୍ରିପ୍ ସିଞ୍ଚନ ବ୍ୟବହାର କରନ୍ତୁ। ବଜାର ମୂଲ୍ୟ: ₹25-30/କିଲୋ।",
      rice: "ଚାଉଳ ପାଇଁ: ସଠିକ୍ ଜଳ ସ୍ତର ବଜାୟ ରଖନ୍ତୁ। ବଜାର ମୂଲ୍ୟ: ₹28-35/କିଲୋ।",
    },
    prices: "ବର୍ତ୍ତମାନ ବଜାର ମୂଲ୍ୟ ଆପଣଙ୍କ ଡ୍ୟାଶବୋର୍ଡରେ ନିୟମିତ ଅପଡେଟ୍ ହୁଏ।",
    general: "ମୁଁ ସାହାଯ୍ୟ କରିପାରିବି: ଫସଲ ପରାମର୍ଶ, ବଜାର ମୂଲ୍ୟ, ଅର୍ଡର ପରିଚାଳନା।",
  },
  ne: {
    greetings: "नमस्ते! म तपाईको Mitti2Market सहायक हुँ। कृषि, बालीको मूल्य, अर्डर वा बजारबारे सोध्नुहोस्।",
    crops: {
      tomato: "टमाटरको लागि: ड्रिप सिंचन प्रयोग गर्नुहोस्। बजार मूल्य: ₹25-30/किलो।",
      rice: "चामलको लागि: सहित पानीको तह कायम राख्नुहोस्। बजार मूल्य: ₹28-35/किलो।",
    },
    prices: "हालका बजार मूल्यहरू तपाईको ड्यासबोर्डमा नियमित रूपमा अपडेट हुन्छन्।",
    general: "म सहयोग गर्न सक्छु: बाली सल्लाह, बजार मूल्य, अर्डर व्यवस्थापन।",
  },
  sa: {
    greetings: "नमस्ते! अहं भवतः Mitti2Market सहायकः। कृषेः, फसल मूल्यानां, आदेशानां वा बजारस्य विषये पृच्छतु।",
    general: "अहं सहायतां कर्तुं शक्नोमि: फसल परामर्शः, बजार मूल्यानि, आदेश व्यवस्थापनम्।",
  },
  ur: {
    greetings: "نمسکار! میں آپ کا Mitti2Market معاون ہوں۔ کھیتی، فصل کی قیمتیں، آرڈر یا مارکیٹ کے بارے میں پوچھیں۔",
    crops: {
      tomato: "ٹماٹر کے لیے: ڈرپ آبپاشی استعمال کریں۔ مارکیٹ قیمت: ₹25-30/کلو۔",
      rice: "چاول کے لیے: مناسب پانی کی سطح برقرار رکھیں۔ مارکیٹ قیمت: ₹28-35/کلو۔",
    },
    prices: "موجودہ مارکیٹ قیمتیں آپ کے ڈیش بورڈ پر باقاعدگی سے اپ ڈیٹ ہوتی ہیں۔",
    general: "میں مدد کر سکتا ہوں: فصل مشورہ، مارکیٹ قیمتیں، آرڈر مینجمنٹ۔",
  },
};

/* Default responses for languages without full KB */
const DEFAULT_RESPONSES = {
  hi: { general: "मैं मदद कर सकता हूँ: फसल सलाह, बाज़ार मूल्य, ऑर्डर प्रबंधन। आप क्या जानना चाहेंगे?" },
  bn: { general: "আমি সাহায্য করতে পারি: ফসল পরামর্শ, বাজার মূল্য, অর্ডার পরিচালনা।" },
  ta: { general: "நான் உதவ முடியும்: பயிர் ஆலோசனை, சந்தை விலைகள், ஆர்டர் நிர்வாகம்." },
  te: { general: "నేను సహాయం చేయగలను: పంట సలహా, మార్కెట్ ధరలు, ఆర్డర్ నిర్వహణ." },
  mr: { general: "मी मदत करू शकतो: पीक सल्ला, बाजार किंमती, ऑर्डर व्यवस्थापन." },
  gu: { general: "હું મદદ કરી શકું: પાક સલાહ, બજાર ભાવ, ઓર્ડર વ્યવસ્થાપન." },
  kn: { general: "ನಾನು ಸಹಾಯ ಮಾಡಬಲ್ಲೆ: ಬೆಳೆ ಸಲಹೆ, ಮಾರುಕಟ್ಟೆ ಬೆಲೆಗಳು, ಆರ್ಡರ್ ನಿರ್ವಹಣೆ." },
  ml: { general: "ഞാൻ സഹായിക്കാൻ കഴിയും: വിള ഉപദേശം, മാർക്കറ്റ് വിലകൾ, ഓർഡർ മാനേജ്‌മെന്റ്." },
  pa: { general: "ਮੈਂ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ: ਫ਼ਸਲ ਸਲਾਹ, ਬਾਜ਼ਾਰ ਕੀਮਤਾਂ, ਆਰਡਰ ਪ੍ਰਬੰਧਨ।" },
  or: { general: "ମୁଁ ସାହାଯ୍ୟ କରିପାରିବି: ଫସଲ ପରାମର୍ଶ, ବଜାର ମୂଲ୍ୟ, ଅର୍ଡର ପରିଚାଳନା।" },
  as: { general: "মই সহায় কৰিব পাৰো: ফসল পৰামৰ্শ, বজাৰ মূল্য, অৰ্ডাৰ ব্যৱস্থাপনা।" },
  ne: { general: "म सहयोग गर्न सक्छु: बाली सल्लाह, बजार मूल्य, अर्डर व्यवस्थापन।" },
  kok: { general: "हां मदत करू शकतो: पीक सल्ला, बाजार किंमती, ऑर्डर व्यवस्थापन।" },
  mai: { general: "हम मदत करि सकैत अन: फसल सल्लाह, बजार मूल्य, ऑर्डर व्यवस्थापन।" },
  brx: { general: "असि मदद दान बरया गोनां: खेतसेरा सल्लाय, बाजार मूल्य, ऑर्डर हाबथाय।" },
  ks: { general: "میہک ہیکھ مدد کریتھ: کھیتی مشورہ، مارکیٹ قیمت، آرڈر مینجمنٹ۔" },
  sd: { general: 'أسان مدد ڪري سگھيون: کشاورزي مشورو، مارڪيٽ قيمت، آرڊر مينجمنٽ۔' },
  mni: { general: "অমি মদত তারিবা য়াই: লৈসিং সল্লায়, মার্কেত দাম, অর্ডাৰ হাবথায়।" },
  sat: { general: "ᱟᱨᱚ ᱰᱚᱨᱚᱢᱚᱱ ᱠᱚᱱ: ᱡᱚᱢᱚ ᱥᱚᱦᱟᱨ, ᱦᱚᱨᱚ, ᱳᱨᱰᱟᱨ ᱦᱚᱨᱚᱨᱚ ᱦᱚᱨᱚᱢᱚᱜ।" },
};

/* ──────────────────────────────
   Intent Detection
   ────────────────────────────── */

const INTENT_PATTERNS = {
  cropAdvice: [
    /crop|farmer|plant|grow|seed|irrig|harvest|pest|disease|fertil|spray|weath|rain|soil|field|कृषि|खेती|फसल|बाली|पौध|रोप|कीट|रोग|बीज|खाद|पानी|मिट्टी|किसान|फসল|পাক|প্রত্যাগমন|கட்டுப்பாடு|వ్యవసాయం|शेती|खेती|ખેતી|ಕೃಷಿ|വിള|ਖੇਤੀ|କୃଷି|শেতছি|कृषि|کھیتی|کشاورزي|লৈসিং|ᱡᱚᱢᱚ/i,
  ],
  tomato: [/tomato|टमाटर|টমাটো|தக்காளி|టమాటా|टोमॅटो|ટમેટા|ಟೊಮೇಟೊ|തക്കਾളി|ਟਮਾਟਰ|ଟମାଟୋ|টমাটো|ٹماٹر/i],
  onion: [/onion|pyaz|प्याज|পেঁয়াজ|வெங்காயம்|ఉల్లి|कांद्या|ડુંગળી|ಈರುಳ್ಳி|സവാള|ਪਿਆਜ|ପିଆଜ|ڈوگر/i],
  potato: [/potato|आलू|আলু|உருளைక்கிழங்கு|బంగాళాదుంప|भटाटे|બટાટા|ಆಲೂಗಡ್ಡೆ|ഉരുളക്കിഴങ്ങ്|ਆਲੂ|ଆଳୁ/i],
  rice: [/rice|chawal|tandul|चावल|ভাত|அரிசி|బియ్యం|तांदूळ|ચોખા|ಅಕ್ಕಿ|ചാവല|ਚੌਲ|ଚାଉଳ|चामल|چاول/i],
  wheat: [/wheat|gehu|गेहूं|ग्वाम|আটা|கோதுமை|గోధుమ|गहू|ઘઉં|ಗೋಧಿ|ഗോതമ്പ്|ਕਣਕ|ଗହମ/i],
  mango: [/mango|आम|आम्ब|आंबा|আম|மாம்பழம்|ఆమ|आम्बा|આમ|ಮಾಂಗೋ|മാങ്ങ|ਅੰਬ/i],
  grapes: [/grape|अंगूर|আঙুর|திராட்சை|ద్రాక్ష|द्राक्ष|આંબા|ದ್ರಾಕ್ಷി|ਮੁੱਨੀ|ଅଙ୍ଗୂର/i],
  chili: [/chili|chilli|mirch|मिर्च|লঙ্কা|மிளகாய்|మిర్చి|मिर्ची|મરચુ|ಮೆಣಸು|മുളക്|ਮਿਰਚ|ଲଙ୍କା/i],
  prices: [/price|rate|cost|value|market|money|भाव|दाम|मूल्य|কিমত|मूल्य|விலை|धర|భావ|किंमत|ભાવ|ಬೆಲೆ|വില|ਕੀਮਤ|ମୂଲ୍ୟ|قیمت/i],
  orders: [/order|buy|sell|purchase|sale|ऑर्डर|अर्डर|অর্ডার|ஆர்டர்|ఆర్డర్|ऑर्डर|ਆਰਡਰ/i],
  logistics: [/logistics|delivery|transport|ship|track|লজিস্টিক্স|डिलीवरी|டெலிவரி|డెలివరీ/i],
};

function detectIntent(query) {
  const q = query.toLowerCase();
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const p of patterns) {
      if (p.test(q)) return intent;
    }
  }
  return 'general';
}

function getResponseForIntent(lang, intent, kb) {
  if (kb.crops && kb.crops[intent]) return kb.crops[intent];
  if (kb[intent]) return kb[intent];
  return kb.general || KNOWLEDGE_BASE.en.general;
}

/* ──────────────────────────────
   Public API
   ────────────────────────────── */

/**
 * Generate a response for the given query in the given language.
 * @param {string} query - The farmer's question
 * @param {string} langCode - Internal language code (e.g. 'hi', 'ta')
 * @returns {Promise<{text: string, detectedLang: string}>}
 */
export async function generateResponse(query, langCode = 'en') {
  // Simulate network latency for realism
  await new Promise((r) => setTimeout(r, 800 + Math.random() * 1200));

  const intent = detectIntent(query);
  const kb = KNOWLEDGE_BASE[langCode] || KNOWLEDGE_BASE.en;
  const defaultResp = DEFAULT_RESPONSES[langCode];

  const text = getResponseForIntent(langCode, intent, kb) ||
               (defaultResp && defaultResp.general) ||
               KNOWLEDGE_BASE.en.general;

  return { text, detectedLang: langCode };
}

/**
 * Get a greeting in the given language.
 */
export function getGreeting(langCode = 'en') {
  const kb = KNOWLEDGE_BASE[langCode] || KNOWLEDGE_BASE.en;
  return kb.greetings || KNOWLEDGE_BASE.en.greetings;
}
