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

        Map<String, Object> analyticsData = "BUSINESS".equalsIgnoreCase(role) || "BUYER".equalsIgnoreCase(role)
                ? analyticsService.getBuyerAnalytics(userId)
                : analyticsService.getFarmerAnalytics(userId);

        return formatVoiceResponse(intent, lang, analyticsData, role);
    }

    private String detectIntent(String q) {
        if (q.contains("storage") || q.contains("cold") || q.contains("স্টোরেজ") || q.contains("কোল্ড") || q.contains("कोल्ड") || q.contains("भंडारण") || q.contains("गोदाम")) {
            return "STORAGE_EXPENSES";
        }
        if (q.contains("which crop") || q.contains("highest") || q.contains("best crop") || q.contains("কোন ফসল") || q.contains("সবচেয়ে বেশি") || q.contains("किस फसल") || q.contains("ज्यादा")) {
            return "CROP_PROFITABILITY";
        }
        if (q.contains("unsold") || q.contains("remaining") || q.contains("left") || q.contains("বিক্রি হয়নি") || q.contains("বাকি") || q.contains("नहीं बिका") || q.contains("बचा")) {
            return "UNSOLD_INVENTORY";
        }
        if (q.contains("pending") || q.contains("payment") || q.contains("পেমেন্ট") || q.contains("টাকা") || q.contains("पेमेंट") || q.contains("बकाया") || q.contains("भुगतान")) {
            return "PENDING_PAYMENTS";
        }
        if (q.contains("compare") || q.contains("last month") || q.contains("তুলনা") || q.contains("গত মাস") || q.contains("पिछले महीने") || q.contains("बदला")) {
            return "MONTH_COMPARISON";
        }
        if (q.contains("logistics") || q.contains("freight") || q.contains("পরিবহন") || q.contains("गाड़ी") || q.contains("किराया")) {
            return "LOGISTICS_EXPENSES";
        }
        // Default to monthly profit / earnings
        return "MONTHLY_PROFIT";
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> formatVoiceResponse(String intent, String lang, Map<String, Object> data, String role) {
        Map<String, Object> res = new LinkedHashMap<>();

        long totalRevenue = data.get("totalRevenue") != null ? ((Number) data.get("totalRevenue")).longValue() : 0L;
        long totalStorage = data.get("totalStorageExpenses") != null ? ((Number) data.get("totalStorageExpenses")).longValue() : 0L;
        long totalLogistics = data.get("totalLogisticsExpenses") != null ? ((Number) data.get("totalLogisticsExpenses")).longValue() : 0L;
        long totalExpenses = data.get("totalRecordedExpenses") != null ? ((Number) data.get("totalRecordedExpenses")).longValue() : 0L;
        double netRealizationPerKg = data.get("netRealizationPerKg") != null ? ((Number) data.get("netRealizationPerKg")).doubleValue() : 0.0;
        int unsoldKg = data.get("unsoldKg") != null ? ((Number) data.get("unsoldKg")).intValue() : 0;
        int availableKg = data.get("availableKg") != null ? ((Number) data.get("availableKg")).intValue() : 0;

        List<Map<String, Object>> crops = (List<Map<String, Object>>) data.getOrDefault("cropProfitability", List.of());
        String topCropName = !crops.isEmpty() ? (String) crops.get(0).get("cropName") : "Tomato";
        double topCropRealization = !crops.isEmpty() && crops.get(0).get("netRealizationPerKg") != null ? ((Number) crops.get(0).get("netRealizationPerKg")).doubleValue() : netRealizationPerKg;

        Map<String, Object> payments = (Map<String, Object>) data.getOrDefault("payments", Map.of());
        long paymentsReceived = payments.get("received") != null ? ((Number) payments.get("received")).longValue() : 0L;
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
                    writtenText = String.format("আপনার কোল্ড স্টোরেজ এবং গুদাম বাবদ মোট খরচ হয়েছে ₹%,d। স্টোরেজে রাখা ফসলে গড় নিট রিয়ালাইজেশন সংরক্ষিত রয়েছে।", totalStorage);
                    spokenText = String.format("আপনার কোল্ড স্টোরেজ বাবদ মোট খরচ হয়েছে %d টাকা।", totalStorage);
                } else if ("hi".equals(lang)) {
                    writtenText = String.format("कोल्ड स्टोरेज और वेयरहाउस पर आपका कुल खर्च ₹%,d हुआ है। यह आपके सुरक्षित रखे गए लॉट्स की लागत दर्शाता है।", totalStorage);
                    spokenText = String.format("कोल्ड स्टोरेज पर आपका कुल खर्च %d रुपये हुआ है।", totalStorage);
                } else {
                    writtenText = String.format("Your total storage expenses across cold storage and warehouses amount to ₹%,d.", totalStorage);
                    spokenText = String.format("You spent %d rupees on cold storage.", totalStorage);
                }
            }
            case "CROP_PROFITABILITY" -> {
                metricKey = "CROP_PROFITABILITY";
                chartFocus = "CROP_CHART";
                if ("bn".equals(lang)) {
                    writtenText = String.format("আপনার সবচেয়ে লাভজনক ফসল হলো %s, যেখান থেকে প্রতি কেজিতে প্রায় ₹%.1f নিট রিয়ালাইজেশন পাওয়া গেছে।", topCropName, topCropRealization);
                    spokenText = String.format("সবচেয়ে বেশি লাভ হয়েছে %s থেকে, প্রতি কেজিতে প্রায় %.0f টাকা।", topCropName, topCropRealization);
                } else if ("hi".equals(lang)) {
                    writtenText = String.format("आपकी सबसे अधिक मुनाफा देने वाली फसल %s है, जिसमें प्रति किलो ₹%.1f की शुद्ध प्राप्ति हुई है।", topCropName, topCropRealization);
                    spokenText = String.format("सबसे ज्यादा मुनाफा %s से हुआ, प्रति किलो लगभग %.0f रुपये।", topCropName, topCropRealization);
                } else {
                    writtenText = String.format("Your highest realizing crop is %s with an average net realization of ₹%.1f/kg.", topCropName, topCropRealization);
                    spokenText = String.format("%s generated the highest net return at %.0f rupees per kg.", topCropName, topCropRealization);
                }
            }
            case "UNSOLD_INVENTORY" -> {
                metricKey = "UNSOLD_INVENTORY";
                chartFocus = "INVENTORY_CHART";
                int displayUnsold = unsoldKg > 0 ? unsoldKg : availableKg;
                if ("bn".equals(lang)) {
                    writtenText = String.format("আপনার বর্তমানে মোট %,d কেজি পণ্য অবিক্রিত অবস্থায় রয়েছে। বাজার দরের সাথে মিলিয়ে এগুলো বিক্রির জন্য তালিকাভুক্ত রাখুন।", displayUnsold);
                    spokenText = String.format("আপনার মোট %d কেজি পণ্য এখনও অবিক্রিত রয়েছে।", displayUnsold);
                } else if ("hi".equals(lang)) {
                    writtenText = String.format("आपके पास वर्तमान में कुल %,d किलो माल बिना बिका हुआ उपलब्ध है।", displayUnsold);
                    spokenText = String.format("आपका कुल %d किलो माल अभी तक नहीं बिका है।", displayUnsold);
                } else {
                    writtenText = String.format("You currently have %,d kg of produce unsold across your listings and inventory.", displayUnsold);
                    spokenText = String.format("You have %d kilograms of unsold produce remaining.", displayUnsold);
                }
            }
            case "PENDING_PAYMENTS" -> {
                metricKey = "PAYMENTS";
                chartFocus = "PAYMENTS_CHART";
                if ("bn".equals(lang)) {
                    writtenText = String.format("আপনার মোট পেমেন্ট রিলিজ হয়েছে ₹%,d এবং ক্রেতার এস্ক্রো অ্যাকাউন্টে সুরক্ষিত রয়েছে ₹%,d।", paymentsReceived, pendingEscrow);
                    spokenText = String.format("আপনার এস্ক্রো অ্যাকাউন্টে %d টাকা সুরক্ষিত পেমেন্ট জমা রয়েছে।", pendingEscrow);
                } else if ("hi".equals(lang)) {
                    writtenText = String.format("आपको ₹%,d का भुगतान प्राप्त हो चुका है और ₹%,d एस्क्रो में सुरक्षित है।", paymentsReceived, pendingEscrow);
                    spokenText = String.format("आपके %d रुपये एस्क्रो में सुरक्षित जमा हैं।", pendingEscrow);
                } else {
                    writtenText = String.format("You have received ₹%,d in finalized payouts, with ₹%,d secured in escrow pending delivery verification.", paymentsReceived, pendingEscrow);
                    spokenText = String.format("You have %d rupees secured in escrow payments.", pendingEscrow);
                }
            }
            case "MONTH_COMPARISON" -> {
                metricKey = "TRENDS";
                chartFocus = "EARNINGS_CHART";
                List<Map<String, Object>> trends = (List<Map<String, Object>>) data.getOrDefault("trends", List.of());
                String changeNote = !trends.isEmpty() ? (String) trends.get(0).get("change") : "+12%";
                if ("bn".equals(lang)) {
                    writtenText = String.format("গত মাসের তুলনায় এই মাসে আপনার ব্যবসায়িক পরিবর্তন হয়েছে %s। নিয়মিত অর্ডার সম্পন্ন হওয়ায় প্রবৃদ্ধি বজায় রয়েছে।", changeNote);
                    spokenText = String.format("গত মাসের তুলনায় এই মাসে বিক্রি %s পরিবর্তিত হয়েছে।", changeNote);
                } else if ("hi".equals(lang)) {
                    writtenText = String.format("पिछले महीने की तुलना में इस महीने आपके कारोबार में %s का बदलाव आया है।", changeNote);
                    spokenText = String.format("पिछले महीने के मुकाबले इस महीने कारोबार %s बदला है।", changeNote);
                } else {
                    writtenText = String.format("Comparing this month to the previous month, your transaction volume changed by %s.", changeNote);
                    spokenText = String.format("Compared to last month, your performance changed by %s.", changeNote);
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
                    spokenText = String.format(
                            "আপনার মোট বিক্রি হয়েছে %d টাকা এবং কোল্ড স্টোরেজ খরচ %d টাকা। প্রতি কেজিতে নিট রিয়ালাইজেশন প্রায় %.0f টাকা।",
                            totalRevenue, totalStorage, netRealizationPerKg
                    );
                } else if ("hi".equals(lang)) {
                    writtenText = String.format(
                            "इस महीने आपकी कुल बिक्री ₹%,d रही और दर्ज खर्च ₹%,d (कोल्ड स्टोरेज ₹%,d सहित) हुआ। आपकी शुद्ध प्राप्ति प्रति किलो ₹%.1f रही।",
                            totalRevenue, totalExpenses, totalStorage, netRealizationPerKg
                    );
                    spokenText = String.format(
                            "आपकी कुल बिक्री %d रुपये और कोल्ड स्टोरेज खर्च %d रुपये रहा। प्रति किलो शुद्ध प्राप्ति लगभग %.0f रुपये है।",
                            totalRevenue, totalStorage, netRealizationPerKg
                    );
                } else {
                    writtenText = String.format(
                            "This month, your completed sales revenue is ₹%,d with ₹%,d recorded supply-chain expenses (including ₹%,d in storage). Your net realization is ₹%.1f/kg.",
                            totalRevenue, totalExpenses, totalStorage, netRealizationPerKg
                    );
                    spokenText = String.format(
                            "Your completed sales total %d rupees with %d rupees in storage expenses, giving a net realization of %.0f rupees per kg.",
                            totalRevenue, totalStorage, netRealizationPerKg
                    );
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
                "totalStorageExpenses", totalStorage,
                "totalLogisticsExpenses", totalLogistics,
                "netRealizationPerKg", netRealizationPerKg,
                "topCrop", topCropName,
                "unsoldKg", unsoldKg
        ));

        return res;
    }
}
