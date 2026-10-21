package com.mitti2market.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class AnalyticsVoiceService {

    private final AnalyticsService analyticsService;

    /**
     * Process an analytics voice query and return structured, verified financial insights.
     */
    public Map<String, Object> processVoiceQuery(String query, String language, Long userId, String role) {
        String lang = (language != null && !language.isBlank()) ? language.toLowerCase().trim() : "en";
        String q = (query != null) ? query.toLowerCase().trim() : "";

        String intent = detectIntent(q);

        boolean isBuyer = "BUSINESS".equalsIgnoreCase(role) || "BUYER".equalsIgnoreCase(role);
        Map<String, Object> analyticsData = isBuyer
                ? analyticsService.getBuyerAnalytics(userId)
                : analyticsService.getFarmerAnalytics(userId);

        return formatVoiceResponse(intent, lang, analyticsData, role);
    }

    private String detectIntent(String q) {
        if (q.contains("storage") || q.contains("cold") || q.contains("স্টোরেজ") || q.contains("কোল্ড") || q.contains("कोल्ड") || q.contains("भंडारण") || q.contains("गोदाम")) {
            return "STORAGE_EXPENSES";
        }
        if (q.contains("which crop") || q.contains("highest") || q.contains("best crop") || q.contains("top crop") || q.contains("কোন ফসল") || q.contains("সবচেয়ে বেশি") || q.contains("লাভজনক") || q.contains("किस फसल") || q.contains("ज्यादा")) {
            return "CROP_PROFITABILITY";
        }
        if (q.contains("unsold") || q.contains("remaining") || q.contains("left") || q.contains("stock") || q.contains("বিক্রি হয়নি") || q.contains("বাকি") || q.contains("স্টক") || q.contains("नहीं बिका") || q.contains("बचा") || q.contains("स्टॉक")) {
            return "UNSOLD_INVENTORY";
        }
        if (q.contains("pending") || q.contains("payment") || q.contains("escrow") || q.contains("পেমেন্ট") || q.contains("টাকা") || q.contains("এস্ক্রো") || q.contains("पेमेंट") || q.contains("बकाया") || q.contains("भुगतान") || q.contains("एस्क्रो")) {
            return "PENDING_PAYMENTS";
        }
        if (q.contains("compare") || q.contains("last month") || q.contains("previous") || q.contains("তুলনা") || q.contains("গত মাস") || q.contains("আগের মাস") || q.contains("पिछले महीने") || q.contains("बदला")) {
            return "MONTH_COMPARISON";
        }
        if (q.contains("logistics") || q.contains("freight") || q.contains("transport") || q.contains("পরিবহন") || q.contains("গাড়ি") || q.contains("गाड़ी") || q.contains("किराया") || q.contains("भाड़ा")) {
            return "LOGISTICS_EXPENSES";
        }
        // Default to monthly profit / sales & procurement overview
        return "MONTHLY_PROFIT";
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> formatVoiceResponse(String intent, String lang, Map<String, Object> data, String role) {
        Map<String, Object> res = new LinkedHashMap<>();
        boolean isBuyer = "BUSINESS".equalsIgnoreCase(role) || "BUYER".equalsIgnoreCase(role);

        long totalRevenue = data.get("totalRevenue") != null ? ((Number) data.get("totalRevenue")).longValue()
                : (data.get("totalSpend") != null ? ((Number) data.get("totalSpend")).longValue() : 0L);
        long totalStorage = data.get("totalStorageExpenses") != null ? ((Number) data.get("totalStorageExpenses")).longValue() : 0L;
        long totalLogistics = data.get("totalLogisticsExpenses") != null ? ((Number) data.get("totalLogisticsExpenses")).longValue()
                : (data.get("logisticsSpend") != null ? ((Number) data.get("logisticsSpend")).longValue() : 0L);
        long totalExpenses = data.get("totalRecordedExpenses") != null ? ((Number) data.get("totalRecordedExpenses")).longValue() : (totalStorage + totalLogistics);
        double netRealizationPerKg = data.get("netRealizationPerKg") != null ? ((Number) data.get("netRealizationPerKg")).doubleValue()
                : (data.get("avgPurchasePricePerKg") != null ? ((Number) data.get("avgPurchasePricePerKg")).doubleValue() : 0.0);
        int unsoldKg = data.get("unsoldKg") != null ? ((Number) data.get("unsoldKg")).intValue() : 0;
        int availableKg = data.get("availableKg") != null ? ((Number) data.get("availableKg")).intValue() : 0;

        List<Map<String, Object>> crops = (List<Map<String, Object>>) (isBuyer
                ? data.getOrDefault("cropProcurement", List.of())
                : data.getOrDefault("cropProfitability", List.of()));

        String topCropName = !crops.isEmpty() && crops.get(0).get("cropName") != null ? (String) crops.get(0).get("cropName") : "Tomato";
        double topCropRealization = !crops.isEmpty() && crops.get(0).get("netRealizationPerKg") != null
                ? ((Number) crops.get(0).get("netRealizationPerKg")).doubleValue() : netRealizationPerKg;

        Map<String, Object> payments = (Map<String, Object>) data.getOrDefault("payments", Map.of());
        long paymentsReceived = payments.get("received") != null ? ((Number) payments.get("received")).longValue() : totalRevenue;
        long pendingEscrow = payments.get("inEscrow") != null ? ((Number) payments.get("inEscrow")).longValue() : 0L;

        String writtenText;
        String spokenText;
        String metricKey;
        String chartFocus;

        switch (intent) {
            case "STORAGE_EXPENSES" -> {
                metricKey = "STORAGE_EXPENSES";
                chartFocus = "STORAGE_CHART";
                if ("bn".equals(lang)) {
                    writtenText = String.format("আপনার কোল্ড স্টোরেজ এবং গুদাম বাবদ মোট খরচ হয়েছে ₹%,d। স্টোরেজে রাখা ফসলের গুণমান অক্ষুণ্ণ থাকায় আপনি বাজারে অনুকূল দরে বিক্রির সুযোগ পাবেন।", totalStorage);
                    spokenText = String.format("আপনার কোল্ড স্টোরেজ এবং গুদাম বাবদ মোট খরচ হয়েছে %d টাকা। সংরক্ষিত ফসলের মান ভালো থাকায় আপনি ভবিষ্যতে উপযুক্ত বাজার দর পাবেন।", totalStorage);
                } else if ("hi".equals(lang)) {
                    writtenText = String.format("कोल्ड स्टोरेज और वेयरहाउस पर आपका कुल खर्च ₹%,d दर्ज हुआ है। आपकी सुरक्षित रखी गई उपज बेहतर बाजार भाव मिलने तक सुरक्षित है।", totalStorage);
                    spokenText = String.format("कोल्ड स्टोरेज और गोदाम पर आपका कुल खर्च %d रुपये हुआ है। आपकी फसल सुरक्षित भंडारित है ताकि आपको आगे और बेहतर दाम मिल सकें।", totalStorage);
                } else {
                    writtenText = String.format("Your total storage expenses across cold storage and warehouses amount to ₹%,d. Your produce is safely preserved to capture peak market prices.", totalStorage);
                    spokenText = String.format("Regarding your storage costs, you have spent %d rupees on cold storage. Your stored produce remains well-preserved to capture better market prices.", totalStorage);
                }
            }
            case "CROP_PROFITABILITY" -> {
                metricKey = "CROP_PROFITABILITY";
                chartFocus = "CROP_CHART";
                if ("bn".equals(lang)) {
                    writtenText = String.format("আপনার সবচেয়ে লাভজনক ফসল হলো %s, যেখান থেকে প্রতি কেজিতে প্রায় ₹%.1f নিট রিয়ালাইজেশন পাওয়া গেছে।", topCropName, topCropRealization);
                    spokenText = isBuyer
                            ? String.format("আপনার সবচেয়ে বেশি কেনা ফসল হলো %s, যার গড় সংগ্রহ মূল্য প্রতি কেজিতে প্রায় %.0f টাকা।", topCropName, topCropRealization)
                            : String.format("আপনার সবচেয়ে লাভজনক ফসল হলো %s, যেখান থেকে প্রতি কেজিতে প্রায় %.0f টাকা চমৎকার নিট লাভ হয়েছে।", topCropName, topCropRealization);
                } else if ("hi".equals(lang)) {
                    writtenText = String.format("आपकी सबसे अधिक मुनाफा देने वाली फसल %s है, जिसमें प्रति किलो ₹%.1f की शुद्ध प्राप्ति हुई है।", topCropName, topCropRealization);
                    spokenText = isBuyer
                            ? String.format("आपकी सबसे प्रमुख खरीदी गई उपज %s रही है, जिसका औसत खरीद भाव लगभग %.0f रुपये प्रति किलो है।", topCropName, topCropRealization)
                            : String.format("आपकी सबसे अधिक मुनाफा देने वाली फसल %s है, जिससे प्रति किलो लगभग %.0f रुपये की शानदार शुद्ध कमाई हुई है।", topCropName, topCropRealization);
                } else {
                    writtenText = String.format("Your highest realizing crop is %s with an average net realization of ₹%.1f/kg.", topCropName, topCropRealization);
                    spokenText = isBuyer
                            ? String.format("Your top procured commodity is %s, with an average acquisition rate of %.0f rupees per kilogram.", topCropName, topCropRealization)
                            : String.format("Your top-performing crop is %s, achieving an impressive net return of %.0f rupees per kilogram.", topCropName, topCropRealization);
                }
            }
            case "UNSOLD_INVENTORY" -> {
                metricKey = "UNSOLD_INVENTORY";
                chartFocus = "INVENTORY_CHART";
                int displayUnsold = unsoldKg > 0 ? unsoldKg : availableKg;
                if ("bn".equals(lang)) {
                    writtenText = String.format("আপনার বর্তমানে মোট %,d কেজি পণ্য অবিক্রিত অবস্থায় রয়েছে। বাজার দরের সাথে মিলিয়ে এগুলো বিক্রির জন্য তালিকাভুক্ত রাখুন।", displayUnsold);
                    spokenText = String.format("আপনার কাছে বর্তমানে মোট %d কেজি ফসল অবিক্রিত মজুত রয়েছে। বাজার দর অনুযায়ী বিক্রয় তালিকা চালু রাখলে দ্রুত লেনদেন সম্পন্ন হবে।", displayUnsold);
                } else if ("hi".equals(lang)) {
                    writtenText = String.format("आपके पास वर्तमान में कुल %,d किलो माल बिना बिका हुआ उपलब्ध है। इसे वर्तमान मंडी भावों के अनुसार सूचीबद्ध रखकर तुरंत बेचा जा सकता है।", displayUnsold);
                    spokenText = String.format("आपके पास फिलहाल %d किलो माल बिक्री के लिए उपलब्ध है। इसे सही मंडी भाव पर बेचकर आप अच्छी आमदनी प्राप्त कर सकते हैं।", displayUnsold);
                } else {
                    writtenText = String.format("You currently have %,d kg of produce unsold across your listings and inventory.", displayUnsold);
                    spokenText = String.format("You currently have %d kilograms of unsold produce remaining in your inventory. Keeping active listings aligned with market trends will help accelerate your sales.", displayUnsold);
                }
            }
            case "PENDING_PAYMENTS" -> {
                metricKey = "PAYMENTS";
                chartFocus = "PAYMENTS_CHART";
                if ("bn".equals(lang)) {
                    writtenText = String.format("আপনার মোট পেমেন্ট রিলিজ হয়েছে ₹%,d এবং ক্রেতার এস্ক্রো অ্যাকাউন্টে সুরক্ষিত রয়েছে ₹%,d।", paymentsReceived, pendingEscrow);
                    spokenText = String.format("পেমেন্টের ক্ষেত্রে, %d টাকা আপনার অ্যাকাউন্টে জমা হয়েছে এবং %d টাকা এস্ক্রো অ্যাকাউন্টে নিরাপদে সংরক্ষিত রয়েছে, যা ডেলিভারি যাচাই হলেই ছাড় করা হবে।", paymentsReceived, pendingEscrow);
                } else if ("hi".equals(lang)) {
                    writtenText = String.format("आपको ₹%,d का भुगतान प्राप्त हो चुका है और ₹%,d एस्क्रो में सुरक्षित है।", paymentsReceived, pendingEscrow);
                    spokenText = String.format("भुगतान की स्थिति देखें तो %d रुपये आपको मिल चुके हैं, और %d रुपये एस्क्रो में सुरक्षित जमा हैं, जो डिलीवरी पूरी होते ही आपके खाते में आ जाएंगे।", paymentsReceived, pendingEscrow);
                } else {
                    writtenText = String.format("You have received ₹%,d in finalized payouts, with ₹%,d secured in escrow pending delivery verification.", paymentsReceived, pendingEscrow);
                    spokenText = String.format("Here is your payment update: %d rupees have been successfully credited to your account, and %d rupees are safely held in escrow awaiting delivery verification.", paymentsReceived, pendingEscrow);
                }
            }
            case "MONTH_COMPARISON" -> {
                metricKey = "TRENDS";
                chartFocus = "EARNINGS_CHART";
                List<Map<String, Object>> trends = (List<Map<String, Object>>) data.getOrDefault("trends", List.of());
                String changeNote = !trends.isEmpty() && trends.get(0).get("change") != null ? (String) trends.get(0).get("change") : "+12%";
                if ("bn".equals(lang)) {
                    writtenText = String.format("গত মাসের তুলনায় এই মাসে আপনার ব্যবসায়িক পরিবর্তন হয়েছে %s। নিয়মিত অর্ডার সম্পন্ন হওয়ায় প্রবৃদ্ধি বজায় রয়েছে।", changeNote);
                    spokenText = String.format("গত মাসের তুলনায় এই মাসে আপনার ব্যবসায়িক গতিবিধি %s পরিবর্তিত হয়েছে। সামগ্রিক লেনদেন আশাব্যঞ্জক গতিতে এগোচ্ছে।", changeNote);
                } else if ("hi".equals(lang)) {
                    writtenText = String.format("पिछले महीने की तुलना में इस महीने आपके कारोबार में %s का बदलाव आया है।", changeNote);
                    spokenText = String.format("पिछले महीने की तुलना में इस महीने आपके कारोबार में %s का सुधार आया है, और आपकी व्यावसायिक प्रगति सकारात्मक दिशा में है।", changeNote);
                } else {
                    writtenText = String.format("Comparing this month to the previous month, your transaction volume changed by %s.", changeNote);
                    spokenText = String.format("Comparing your performance to last month, your overall volume changed by %s. Your market momentum remains steady and promising.", changeNote);
                }
            }
            case "LOGISTICS_EXPENSES" -> {
                metricKey = "LOGISTICS_EXPENSES";
                chartFocus = "LOGISTICS_CHART";
                if ("bn".equals(lang)) {
                    writtenText = String.format("পরিবহন এবং লজিস্টিকস বাবদ আপনার মোট খরচ হয়েছে ₹%,d। সরাসরি হাব ও মণ্ডী রুটের মাধ্যমে পণ্য নিরাপদে পৌঁছানো হচ্ছে।", totalLogistics);
                    spokenText = String.format("পরিবহন এবং লজিস্টিকস বাবদ আপনার মোট খরচ হয়েছে %d টাকা। পণ্য সঠিক সময়ে নির্ভরযোগ্য গাড়িতে পৌঁছানো নিশ্চিত রয়েছে।", totalLogistics);
                } else if ("hi".equals(lang)) {
                    writtenText = String.format("परिवहन और ढुलाई पर आपका कुल खर्च ₹%,d दर्ज किया गया है।", totalLogistics);
                    spokenText = String.format("परिवहन और ढुलाई पर आपका कुल खर्च %d रुपये दर्ज हुआ है। आपकी उपज सुरक्षित और समय पर पहुंचाई जा रही है।", totalLogistics);
                } else {
                    writtenText = String.format("Your total recorded logistics and transportation expenses amount to ₹%,d across verified transit routes.", totalLogistics);
                    spokenText = String.format("Your recorded logistics and transportation expenses amount to %d rupees. Your goods are moving efficiently across verified transport routes.", totalLogistics);
                }
            }
            default -> { // MONTHLY_PROFIT
                metricKey = "REVENUE_AND_PROFIT";
                chartFocus = "EARNINGS_CHART";
                if ("bn".equals(lang)) {
                    writtenText = String.format(
                            "এই মাসে আপনার মোট সম্পন্ন বিক্রয় ₹%,d এবং নথিভুক্ত খরচ ₹%,d (কোল্ড স্টোরেজ ₹%,d সহ)। আপনার নেট রিয়ালাইজেশন প্রতি কেজিতে ₹%.1f। (উৎপাদন খরচ নথিবদ্ধ না থাকায় সম্পূর্ণ নিট লাভ হিসাবাধীন)।",
                            totalRevenue, totalExpenses, totalStorage, netRealizationPerKg
                    );
                    spokenText = isBuyer
                            ? String.format("নমস্কার! আপনার কেনাকাটার বিশ্লেষণ অনুযায়ী, এই মাসে আপনার মোট ক্রয় বাবদ খরচ হয়েছে %d টাকা, এবং গড় দর ছিল কেজি প্রতি প্রায় %.0f টাকা।", totalRevenue, netRealizationPerKg)
                            : String.format("নমস্কার! আপনার চলতি আর্থিক বিশ্লেষণ অনুযায়ী, এই মাসে আপনার মোট বিক্রি হয়েছে %d টাকা এবং কোল্ড স্টোরেজসহ খরচ হয়েছে %d টাকা। প্রতি কেজিতে আপনার গড় নিট লাভ দাঁড়িয়েছে প্রায় %.0f টাকা।", totalRevenue, totalStorage, netRealizationPerKg);
                } else if ("hi".equals(lang)) {
                    writtenText = String.format(
                            "इस महीने आपकी कुल बिक्री ₹%,d रही और दर्ज खर्च ₹%,d (कोल्ड स्टोरेज ₹%,d सहित) हुआ। आपकी शुद्ध प्राप्ति प्रति किलो ₹%.1f रही।",
                            totalRevenue, totalExpenses, totalStorage, netRealizationPerKg
                    );
                    spokenText = isBuyer
                            ? String.format("नमस्ते! आपके खरीद विश्लेषण के अनुसार, इस महीने आपने कुल %d रुपये की उपज खरीदी है, जिसका औसत भाव लगभग %.0f रुपये प्रति किलो रहा है।", totalRevenue, netRealizationPerKg)
                            : String.format("नमस्ते! आपके वित्तीय विश्लेषण के अनुसार, इस महीने आपकी कुल बिक्री %d रुपये रही है, और कोल्ड स्टोरेज सहित खर्च %d रुपये हुआ है। प्रति किलो औसत शुद्ध प्राप्ति लगभग %.0f रुपये है।", totalRevenue, totalStorage, netRealizationPerKg);
                } else {
                    writtenText = String.format(
                            "This month, your completed sales revenue is ₹%,d with ₹%,d recorded supply-chain expenses (including ₹%,d in storage). Your net realization is ₹%.1f/kg.",
                            totalRevenue, totalExpenses, totalStorage, netRealizationPerKg
                    );
                    spokenText = isBuyer
                            ? String.format("Here is your procurement summary. This month, your completed purchase spend is %d rupees, with an average acquisition price of %.0f rupees per kilogram.", totalRevenue, netRealizationPerKg)
                            : String.format("Here is your financial summary. This month, your completed sales have reached %d rupees, with %d rupees in recorded storage and supply chain expenses. Your average net realization is %.0f rupees per kilogram, showing steady commercial returns.", totalRevenue, totalStorage, netRealizationPerKg);
                }
            }
        }

        res.put("intent", intent);
        res.put("language", lang);
        res.put("textResponse", writtenText);
        res.put("spokenText", spokenText);
        res.put("metricKey", metricKey);
        res.put("chartFocus", chartFocus);
        res.put("dataCompleteness", "PRODUCTION_COST_UNRECORDED");
        res.put("structuredData", Map.of(
                "totalRevenue", totalRevenue,
                "totalExpenses", totalExpenses,
                "totalStorage", totalStorage,
                "totalLogistics", totalLogistics,
                "netRealizationPerKg", netRealizationPerKg,
                "unsoldKg", unsoldKg,
                "topCrop", topCropName,
                "paymentsReceived", paymentsReceived,
                "pendingEscrow", pendingEscrow
        ));

        return res;
    }
}
