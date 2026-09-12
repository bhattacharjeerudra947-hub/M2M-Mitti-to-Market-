package com.mitti2market.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;

import java.time.Duration;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class AiService {

    private final WebClient webClient;
    private final ObjectMapper objectMapper;
    private final MandiPriceService mandiPriceService;
    private final CommodityResolverService commodityResolverService;

    // Session ID -> Conversation History
    private final Map<String, List<ConversationMessage>> conversationMemory = new ConcurrentHashMap<>();

    // Session ID -> Last actively discussed crop/commodity (for contextual follow-ups)
    private final Map<String, String> sessionLastCrop = new ConcurrentHashMap<>();

    private static final int MAX_HISTORY_MESSAGES = 10;

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    @Value("${gemini.model:gemini-2.0-flash}")
    private String geminiModel;

    public AiService(
            WebClient.Builder webClientBuilder,
            ObjectMapper objectMapper,
            MandiPriceService mandiPriceService,
            CommodityResolverService commodityResolverService) {

        this.webClient = webClientBuilder.build();
        this.objectMapper = objectMapper;
        this.mandiPriceService = mandiPriceService;
        this.commodityResolverService = commodityResolverService;
    }

    /**
     * Main AI method returning complete answer string.
     */
    public String askAgricultureAI(
            String question,
            String language,
            String sessionId,
            Double latitude,
            Double longitude) {

        Map<String, Object> details = askAgricultureAIWithDetails(
                question, language, sessionId, latitude, longitude
        );
        return String.valueOf(details.getOrDefault("answer", ""));
    }

    /**
     * Enriched AI method returning both visual text, concise spoken text for TTS,
     * detected intent, crop, and structured mandi data.
     */
    public Map<String, Object> askAgricultureAIWithDetails(
            String question,
            String language,
            String sessionId,
            Double latitude,
            Double longitude) {
        return askAgricultureAIWithDetails(question, language, sessionId, null, null, latitude, longitude);
    }

    public Map<String, Object> askAgricultureAIWithDetails(
            String question,
            String language,
            String sessionId,
            String district,
            String state,
            Double latitude,
            Double longitude) {

        Map<String, Object> result = new HashMap<>();

        if (question == null || question.trim().isEmpty()) {
            String emptyMsg = getEmptyQuestionMessage(language);
            result.put("answer", emptyMsg);
            result.put("spokenText", emptyMsg);
            result.put("intent", "EMPTY");
            result.put("sessionId", sessionId);
            return result;
        }

        String q = question.trim();
        String sid = (sessionId == null || sessionId.trim().isEmpty())
                ? UUID.randomUUID().toString()
                : sessionId.trim();

        String lang = (language == null || language.isBlank()) ? "en" : language.trim().toLowerCase();

        try {
            // 1. Off-Topic Gate Check (Agriculture Only Assistant)
            if (isStrictlyOffTopic(q)) {
                String offTopicMsg = getOffTopicMessage(lang);
                result.put("answer", offTopicMsg);
                result.put("spokenText", offTopicMsg);
                result.put("intent", "OFF_TOPIC");
                result.put("sessionId", sid);
                return result;
            }

            // 2. Mandi Price Intent Detection
            if (looksLikeMandiPriceQuestion(q)) {
                Map<String, Object> priceResult = handleMandiPrice(q, lang, sid, district, state, latitude, longitude);
                addConversation(sid, "user", q);
                addConversation(sid, "model", String.valueOf(priceResult.get("answer")));

                priceResult.put("sessionId", sid);
                return priceResult;
            }

            // 3. Agriculture Q&A via Gemini with Instant Built-in Krishi Knowledge Base Fallback
            String contextualQuestion = enrichWithContextualCrop(q, sid);

            String answer = null;
            try {
                answer = callGemini(contextualQuestion, lang, sid);
            } catch (Exception geminiEx) {
                System.err.println("Gemini unavailable (" + geminiEx.getMessage() + "), using Krishi Knowledge Base fallback.");
                answer = getExpertAgriculturalAdvice(contextualQuestion, lang);
            }

            if (answer == null || answer.isBlank()) {
                answer = getExpertAgriculturalAdvice(contextualQuestion, lang);
            }

            // Extract mentioned crop to remember for follow-ups
            String extractedCrop = extractCommodity(q);
            if (extractedCrop != null && !extractedCrop.isBlank()) {
                sessionLastCrop.put(sid, extractedCrop);
            }

            addConversation(sid, "user", q);
            addConversation(sid, "model", answer);

            result.put("answer", answer);
            result.put("spokenText", cleanForSpeech(answer, lang));
            result.put("intent", "AGRICULTURE_QA");
            result.put("crop", sessionLastCrop.get(sid));
            result.put("sessionId", sid);
            return result;

        } catch (Exception e) {
            System.err.println("AI Service Error: " + e.getMessage());
            e.printStackTrace();

            String expertFallback = getExpertAgriculturalAdvice(q, lang);
            result.put("answer", expertFallback);
            result.put("spokenText", cleanForSpeech(expertFallback, lang));
            result.put("intent", "AGRICULTURE_QA");
            result.put("sessionId", sid);
            return result;
        }
    }

    /**
     * Server-Sent Events (SSE) streaming method for real-time response generation.
     */
    public Flux<String> streamAgricultureAI(
            String question,
            String language,
            String sessionId,
            Double latitude,
            Double longitude) {
        return streamAgricultureAI(question, language, sessionId, null, null, latitude, longitude);
    }

    public Flux<String> streamAgricultureAI(
            String question,
            String language,
            String sessionId,
            String district,
            String state,
            Double latitude,
            Double longitude) {

        String q = (question != null) ? question.trim() : "";
        String lang = (language == null || language.isBlank()) ? "en" : language.trim().toLowerCase();
        String sid = (sessionId == null || sessionId.trim().isEmpty()) ? UUID.randomUUID().toString() : sessionId;

        if (q.isEmpty()) {
            return Flux.just(getEmptyQuestionMessage(lang));
        }

        if (isStrictlyOffTopic(q)) {
            return Flux.just(getOffTopicMessage(lang));
        }

        // If it's a mandi price question, evaluate and emit tokens
        if (looksLikeMandiPriceQuestion(q)) {
            Map<String, Object> details = handleMandiPrice(q, lang, sid, district, state, latitude, longitude);
            String answer = String.valueOf(details.get("answer"));
            addConversation(sid, "user", q);
            addConversation(sid, "model", answer);
            return Flux.just(answer);
        }

        // Otherwise stream Gemini responses with expert fallback
        String contextualQuestion = enrichWithContextualCrop(q, sid);
        return streamGeminiWithFallback(contextualQuestion, lang, sid);
    }

    // =========================================================
    // MANDI PRICE RESOLUTION & MULTILINGUAL FORMATTING
    // =========================================================

    private Map<String, Object> handleMandiPrice(
            String question,
            String language,
            String sessionId,
            String district,
            String state,
            Double latitude,
            Double longitude) {

        Map<String, Object> out = new HashMap<>();

        // Extract commodity or fallback to session context
        String userCommodity = extractCommodity(question);
        if (userCommodity == null || userCommodity.isBlank()) {
            userCommodity = sessionLastCrop.get(sessionId);
        }

        if (userCommodity == null || userCommodity.isBlank()) {
            String clarify = getClarifyCropMessage(language);
            out.put("answer", clarify);
            out.put("spokenText", clarify);
            out.put("intent", "CLARIFICATION");
            return out;
        }

        String commodity = commodityResolverService.resolveCommodity(userCommodity);
        if (commodity == null || commodity.isBlank()) {
            commodity = userCommodity;
        }

        // Save last mentioned crop in session context
        sessionLastCrop.put(sessionId, commodity);

        boolean isNearMe = isNearMeQuestion(question);

        // Fetch prices (Priority 1: Farmer registered district if provided)
        Map<String, Object> data = null;
        boolean matchedExactDistrict = false;

        if (district != null && !district.isBlank()) {
            data = mandiPriceService.searchPrices(
                    commodity, state, district, null, latitude, longitude
            );
            Object obj = (data != null) ? data.get("prices") : null;
            if (obj instanceof List<?> l && !l.isEmpty()) {
                matchedExactDistrict = true;
            }
        }

        // Priority 2: Fallback to broader state or nearby coordinates
        if (data == null || !matchedExactDistrict) {
            data = mandiPriceService.searchPrices(
                    commodity, state, null, null, latitude, longitude
            );
        }

        Object pricesObject = (data != null) ? data.get("prices") : null;
        List<Map<String, Object>> prices = (pricesObject instanceof List<?>)
                ? (List<Map<String, Object>>) pricesObject
                : Collections.emptyList();

        if (prices.isEmpty()) {
            String notFound = getMandiNotFoundMessage(commodity, language);
            out.put("answer", notFound);
            out.put("spokenText", notFound);
            out.put("intent", "MANDI_PRICE_NOT_FOUND");
            return out;
        }

        // Top market details for spoken response
        Map<String, Object> topPrice = prices.get(0);
        String topMarket = value(topPrice, "market");
        String topMin = value(topPrice, "minPrice");
        String topMax = value(topPrice, "maxPrice");
        String topModal = value(topPrice, "modalPrice");
        String topDate = value(topPrice, "arrivalDate");
        Double dist = topPrice.containsKey("distanceKm") ? ((Number) topPrice.get("distanceKm")).doubleValue() : null;

        // Visual formatted text
        String displayText = formatMandiVisual(commodity, prices, language, isNearMe, district, matchedExactDistrict);

        // Concise spoken response
        String spokenText = formatMandiSpoken(commodity, topMarket, topMin, topMax, topModal, topDate, dist, language, isNearMe, district, matchedExactDistrict);

        out.put("answer", displayText);
        out.put("spokenText", spokenText);
        out.put("crop", commodity);
        out.put("intent", isNearMe ? "MANDI_PRICE_NEAR_ME" : "MANDI_PRICE");
        out.put("mandiData", prices);
        out.put("district", district);
        out.put("matchedDistrict", matchedExactDistrict);
        return out;
    }

    private String formatMandiVisual(
            String commodity,
            List<Map<String, Object>> prices,
            String language,
            boolean isNearMe,
            String userDistrict,
            boolean matchedExactDistrict) {

        StringBuilder sb = new StringBuilder();

        if (userDistrict != null && !userDistrict.isBlank()) {
            if (matchedExactDistrict) {
                if ("hi".equalsIgnoreCase(language)) {
                    sb.append("📍 **आपके पंजीकृत जिले (").append(userDistrict).append(") के मंडी भाव:**\n\n");
                } else if ("bn".equalsIgnoreCase(language)) {
                    sb.append("📍 **আপনার নিবন্ধিত জেলা (").append(userDistrict).append(")-র মান্ডি দর:**\n\n");
                } else {
                    sb.append("📍 **Mandi prices in your district (").append(userDistrict).append("):**\n\n");
                }
            } else {
                if ("hi".equalsIgnoreCase(language)) {
                    sb.append("📍 **जिला: ").append(userDistrict).append("** _(आज इस जिले में सीधी आवक नहीं है, निकटतम सक्रिय मंडियों के भाव नीचे दिए गए हैं)_\n\n");
                } else if ("bn".equalsIgnoreCase(language)) {
                    sb.append("📍 **জেলা: ").append(userDistrict).append("** _(আজ সরাসরি আমদানি নেই, নিকটতম সক্রিয় মান্ডির দর নিচে প্রদত্ত)_\n\n");
                } else {
                    sb.append("📍 **District: ").append(userDistrict).append("** _(No direct arrivals today; showing nearest active regional markets)_\n\n");
                }
            }
        } else {
            if ("hi".equalsIgnoreCase(language)) {
                sb.append(isNearMe ? "📍 **आपके पास " : "🌾 **")
                  .append(commodity)
                  .append(" के नवीनतम सत्यापित मंडी भाव:**\n\n");
            } else if ("bn".equalsIgnoreCase(language)) {
                sb.append(isNearMe ? "📍 **আপনার কাছাকাছি " : "🌾 **")
                  .append(commodity)
                  .append("-এর সর্বশেষ যাচাইকৃত মান্ডি দর:**\n\n");
            } else {
                sb.append(isNearMe ? "📍 **Latest " : "🌾 **Latest verified mandi prices for ")
                  .append(commodity)
                  .append(isNearMe ? " prices near you:**\n\n" : ":**\n\n");
            }
        }

        int count = 0;
        for (Map<String, Object> p : prices) {
            String market = value(p, "market");
            String district = value(p, "district");
            String state = value(p, "state");
            String min = value(p, "minPrice");
            String max = value(p, "maxPrice");
            String modal = value(p, "modalPrice");
            String date = value(p, "arrivalDate");
            Double dist = p.containsKey("distanceKm") ? ((Number) p.get("distanceKm")).doubleValue() : null;

            sb.append("📍 **").append(market).append("**");
            if (dist != null && dist > 0) {
                sb.append(" (").append(dist).append(" km)");
            }
            sb.append("\n");

            if (!district.isBlank() || !state.isBlank()) {
                sb.append("   ").append(district).append(district.isBlank() || state.isBlank() ? "" : ", ").append(state).append("\n");
            }

            if ("hi".equalsIgnoreCase(language)) {
                sb.append("   • मोडल भाव: **₹").append(modal).append("/क्विंटल** (दायरा: ₹").append(min).append(" – ₹").append(max).append(")\n");
                sb.append("   • रिपोर्ट तिथि: ").append(date).append("\n\n");
            } else if ("bn".equalsIgnoreCase(language)) {
                sb.append("   • মোডাল দর: **₹").append(modal).append("/কুইন্টাল** (পরিসর: ₹").append(min).append(" – ₹").append(max).append(")\n");
                sb.append("   • তারিখ: ").append(date).append("\n\n");
            } else {
                sb.append("   • Modal Price: **₹").append(modal).append("/quintal** (Range: ₹").append(min).append(" – ₹").append(max).append(")\n");
                sb.append("   • Date: ").append(date).append("\n\n");
            }

            count++;
            if (count >= 5) break; // Show top 5 markets cleanly
        }

        if ("hi".equalsIgnoreCase(language)) {
            sb.append("ℹ️ _भाव सरकारी कृषि मंडी डेटा पर आधारित हैं। गुणवत्ता और किस्म के अनुसार भाव भिन्न हो सकते हैं।_");
        } else if ("bn".equalsIgnoreCase(language)) {
            sb.append("ℹ️ _দর সরকারি কৃষি মান্ডি রেকর্ডের উপর ভিত্তি করে প্রদত্ত।_");
        } else {
            sb.append("ℹ️ _Prices are from verified agricultural mandi records and vary by variety and quality._");
        }

        return sb.toString();
    }

    private String formatMandiSpoken(
            String commodity,
            String market,
            String min,
            String max,
            String modal,
            String date,
            Double dist,
            String language,
            boolean isNearMe,
            String userDistrict,
            boolean matchedExactDistrict) {

        if ("hi".equalsIgnoreCase(language)) {
            StringBuilder sb = new StringBuilder();
            if (userDistrict != null && matchedExactDistrict) {
                sb.append("आपके जिले ").append(userDistrict).append(" की ").append(market).append(" मंडी में ");
            } else if (dist != null && dist > 0) {
                sb.append("आपके पास ").append(market).append(" मंडी लगभग ").append(Math.round(dist)).append(" किलोमीटर दूर है। ");
            } else if (userDistrict != null) {
                sb.append("आज आपके जिले ").append(userDistrict).append(" में सीधी आवक दर्ज नहीं है। आपके पास ").append(market).append(" मंडी में ");
            } else {
                sb.append(market).append(" मंडी में ");
            }
            sb.append(commodity).append(" का मोडल भाव ₹").append(modal).append(" प्रति क्विंटल है, ");
            sb.append("और भाव ₹").append(min).append(" से ₹").append(max).append(" के बीच है।");
            return sb.toString();
        }

        if ("bn".equalsIgnoreCase(language)) {
            StringBuilder sb = new StringBuilder();
            if (userDistrict != null && matchedExactDistrict) {
                sb.append("আপনার জেলা ").append(userDistrict).append("-র ").append(market).append(" মান্ডিতে ");
            } else if (dist != null && dist > 0) {
                sb.append("আপনার নিকটবর্তী ").append(market).append(" মান্ডি প্রায় ").append(Math.round(dist)).append(" কিলোমিটার দূরে। ");
            } else if (userDistrict != null) {
                sb.append("আজ আপনার জেলা ").append(userDistrict).append("-তে সরাসরি দর নেই। নিকটবর্তী ").append(market).append(" মান্ডিতে ");
            } else {
                sb.append(market).append(" মান্ডিতে ");
            }
            sb.append(commodity).append("-র মোডাল দাম ₹").append(modal).append(" টাকা প্রতি কুইন্টাল, ");
            sb.append("এবং দাম ₹").append(min).append(" থেকে ₹").append(max).append(" টাকার মধ্যে।");
            return sb.toString();
        }

        // English
        StringBuilder sb = new StringBuilder();
        if (userDistrict != null && matchedExactDistrict) {
            sb.append("In your district ").append(userDistrict).append(", at ").append(market).append(" Mandi, ");
        } else if (dist != null && dist > 0) {
            sb.append("The closest market, ").append(market).append(", is around ").append(Math.round(dist)).append(" km away. ");
        } else if (userDistrict != null) {
            sb.append("No direct arrivals in your district ").append(userDistrict).append(" today. At the nearest active market, ").append(market).append(" Mandi, ");
        } else {
            sb.append("At ").append(market).append(" Mandi, ");
        }
        sb.append(commodity).append(" modal price is ₹").append(modal).append(" per quintal, ranging from ₹")
          .append(min).append(" to ₹").append(max).append(".");
        return sb.toString();
    }

    // =========================================================
    // GEMINI PROMPT & GENERATION
    // =========================================================

    private String buildAgricultureSystemPrompt(String language) {
        String langName = getLanguageName(language);

        return """
                You are Mitti2Market Agriculture AI (कृषि मित्र), an intelligent, practical farming advisor for Indian farmers.

                CORE RULES:
                1. RESPOND ONLY IN %s. Use clear, natural, native phrasing suitable for farmers.
                2. KEEP RESPONSES SHORT & DIRECT: 2 to 4 sentences maximum. Farmers listen to audio playback, so avoid long essays, introductions, or repetitive summaries.
                3. PRACTICAL & ACTIONABLE: Give immediate, realistic solutions (e.g. specific fertilizer dosage, organic remedy, irrigation frequency).
                4. STRICTLY AGRICULTURE: Help only with crops, vegetables, fruits, soil, fertilizers, pests, plant diseases, irrigation, weather guidance, and farming practices.
                5. VOICE-FRIENDLY: Avoid markdown headers, avoid long bulleted lists, and avoid robotic phrases like "As an AI".
                6. CONVERSATION CONTEXT: If the farmer asks a follow-up ("Which fertilizer should I use?", "How often?"), maintain the context of the previously discussed crop.
                7. NEVER INVENT CURRENT MANDI PRICES: Live mandi prices are handled separately by the platform's verified mandi API.
                """.formatted(langName);
    }

    private String callGemini(String question, String language, String sessionId) {
        List<ConversationMessage> history = getConversation(sessionId);

        List<Map<String, Object>> contents = new ArrayList<>();

        // Add history
        for (ConversationMessage msg : history) {
            contents.add(Map.of(
                    "role", msg.role(),
                    "parts", List.of(Map.of("text", msg.text()))
            ));
        }

        // Current question
        contents.add(Map.of(
                "role", "user",
                "parts", List.of(Map.of("text", question))
        ));

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("contents", contents);
        requestBody.put("systemInstruction", Map.of(
                "parts", List.of(Map.of("text", buildAgricultureSystemPrompt(language)))
        ));
        requestBody.put("generationConfig", Map.of(
                "temperature", 0.4,
                "maxOutputTokens", 800
        ));

        // Try primary model, fallback to gemini-2.0-flash / gemini-1.5-flash if needed
        List<String> modelsToTry = List.of(geminiModel, "gemini-2.0-flash", "gemini-1.5-flash");

        for (String model : modelsToTry) {
            try {
                String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                        + model + ":generateContent?key=" + geminiApiKey;

                String response = webClient
                        .post()
                        .uri(url)
                        .header("Content-Type", "application/json")
                        .bodyValue(requestBody)
                        .retrieve()
                        .bodyToMono(String.class)
                        .timeout(Duration.ofMillis(8000))
                        .block();

                if (response != null && !response.isBlank()) {
                    JsonNode root = objectMapper.readTree(response);
                    JsonNode textNode = root.path("candidates").path(0).path("content").path("parts").path(0).path("text");
                    if (!textNode.isMissingNode() && !textNode.asText().isBlank()) {
                        return textNode.asText().trim();
                    }
                }
            } catch (Exception e) {
                System.err.println("Gemini model " + model + " failed: " + e.getMessage());
            }
        }

        throw new RuntimeException("All Gemini models failed or timed out.");
    }

    private Flux<String> streamGeminiWithFallback(String question, String language, String sessionId) {
        return Flux.create(sink -> {
            String answer = null;
            try {
                answer = callGemini(question, language, sessionId);
            } catch (Exception geminiEx) {
                System.err.println("Streaming Gemini failed (" + geminiEx.getMessage() + "), using Krishi Knowledge Base fallback.");
                answer = getExpertAgriculturalAdvice(question, language);
            }

            if (answer == null || answer.isBlank()) {
                answer = getExpertAgriculturalAdvice(question, language);
            }

            addConversation(sessionId, "user", question);
            addConversation(sessionId, "model", answer);

            String[] chunks = answer.split("(?<=[.!?।\\n])\\s+");
            for (String chunk : chunks) {
                sink.next(chunk + " ");
            }
            sink.complete();
        });
    }

    private Flux<String> streamGemini(String question, String language, String sessionId) {
        return streamGeminiWithFallback(question, language, sessionId);
    }

    // =========================================================
    // INTENT & EXTRACTION HELPERS
    // =========================================================

    private boolean looksLikeMandiPriceQuestion(String question) {
        String q = question.toLowerCase();
        String[] terms = {
                "price", "prices", "rate", "rates", "bhav", "bhaav", "daam", "dam",
                "mandi", "market rate", "apmc", "modal price", "wholesale",
                "भाव", "दाम", "दर", "মন্ডি", "দাম", "দর", "বাজার দর"
        };
        for (String t : terms) {
            if (q.contains(t)) return true;
        }
        return false;
    }

    private boolean isNearMeQuestion(String question) {
        String q = question.toLowerCase();
        return q.contains("near me") || q.contains("nearby") || q.contains("near") ||
                q.contains("paas") || q.contains("pass") || q.contains("najdeek") ||
                q.contains("amar kache") || q.contains("kache") ||
                q.contains("पास") || q.contains("नजदीक") || q.contains("কাছে");
    }

    private boolean isStrictlyOffTopic(String question) {
        String q = question.toLowerCase();

        // Whitelist common greetings & agriculture terms
        if (q.matches(".*(hello|hi|hey|namaste|nomoshkar|salaam).*")) {
            return false;
        }

        // Do not flag if query explicitly contains farm machinery or agriculture context
        if (q.contains("tractor") || q.contains("tiller") || q.contains("harvester") ||
            q.contains("kisan") || q.contains("farmer") || q.contains("kheti") ||
            q.contains("fasal") || q.contains("crop") || q.contains("mandi") ||
            q.contains("price") || q.contains("bhav") || q.contains("fertilizer") ||
            q.contains("khad") || q.contains("keet")) {
            return false;
        }

        // Strictly off-topic keywords (vehicles, gadgets, cinema, sports, politics, crypto, etc.)
        String[] offTopics = {
                "car", "buy a car", "buy car", "automobile", "bike", "motorcycle", "scooter", "truck", "suv", "maruti", "hyundai", "dealership", "test drive",
                "cricket", "ipl", "match score", "bollywood", "hollywood", "actor", "actress",
                "movie", "cinema", "song", "president", "prime minister", "election", "politician", "bjp", "congress", "aap", "vote",
                "python", "javascript", "react", "programming", "coding", "software", "crypto", "bitcoin", "stock market", "share market", "forex", "mutual fund",
                "iphone", "playstation", "football", "messi", "ronaldo", "smartphone", "laptop", "computer", "gaming", "flight ticket", "hotel booking", "dating"
        };

        for (String off : offTopics) {
            if (q.contains(off)) return true;
        }

        return false;
    }

    public String getExpertAgriculturalAdvice(String question, String language) {
        String q = (question != null) ? question.toLowerCase() : "";
        String lang = (language == null) ? "en" : language.trim().toLowerCase();

        // 1. Potato (Fertilizer, rapid tuber growth, late blight)
        if (q.contains("potato") || q.contains("aalu") || q.contains("aloo") || q.contains("आलू") || q.contains("আলু")) {
            if (q.contains("blight") || q.contains("disease") || q.contains("bimari") || q.contains("rog") || q.contains("रोग") || q.contains("झुलसा") || q.contains("ধসা")) {
                if ("hi".equals(lang)) {
                    return "आलू में झुलसा रोग (लेट ब्लाइट) के नियंत्रण के लिए मैंकोजेब 75 WP (2.5 ग्राम प्रति लीटर) का निवारक छिड़काव करें। यदि लक्षण दिखाई दे रहे हों, तो साइमोक्सानिल + मैंकोजेब (2.5 ग्राम/लीटर) या रिडोमिल गोल्ड (2 ग्राम/लीटर) का तुरंत छिड़काव करें।";
                } else if ("bn".equals(lang)) {
                    return "আলুর নাবি ধসা (লেট ব্লাইট) রোগ নিয়ন্ত্রণে প্রতি লিটার জলে ২.৫ গ্রাম ম্যানকোজেব ৭৫ ডব্লিউপি মিশিয়ে স্প্রে করুন। রোগ দেখা দিলে দ্রুত সাইমোক্সানিল + ম্যানকোজেব বা রিডোমিল গোল্ড (২ গ্রাম/লিটার) স্প্রে করুন।";
                } else {
                    return "To control potato late blight, spray Mancozeb 75 WP (2.5 g/L) preventively. If disease spots have already appeared, immediately spray Cymoxanil + Mancozeb (2.5 g/L) or Metalaxyl + Mancozeb (Ridomil Gold @ 2 g/L).";
                }
            }
            // Fertilizer / rapid growth
            if ("hi".equals(lang)) {
                return "आलू की तेज बढ़वार और कंदों के अच्छे आकार के लिए बुवाई से पहले प्रति एकड़ 100 किग्रा डीएपी, 80 किग्रा एमओपी और 50 किग्रा यूरिया बेसल खुराक के रूप में डालें। बुवाई के 30-35 दिन बाद मिट्टी चढ़ाते समय 50 किग्रा यूरिया की टॉप ड्रेसिंग करें। कंदों के तेजी से विकास के लिए 45 और 60 दिन पर 13-0-45 (पोटेशियम नाइट्रेट) 5 ग्राम प्रति लीटर का छिड़काव करें।";
            } else if ("bn".equals(lang)) {
                return "আলুর দ্রুত বৃদ্ধি এবং ফলনের জন্য রোপণের সময় প্রতি একরে ১০০ কেজি ডিএপি, ৮০ কেজি এমওপি এবং ৫০ কেজি ইউরিয়া প্রয়োগ করুন। রোপণের ৩০-৩৫ দিন পর মাটি তোলার সময় ৫০ কেজি ইউরিয়া দিন। আলুর দ্রুত আকার বৃদ্ধির জন্য ৪৫ এবং ৬০ দিনের মাথায় ১৩-০-৪৫ (পটাশিয়াম নাইট্রেট) স্প্রে করুন।";
            } else {
                return "For faster potato growth and high yield, apply a balanced basal dose of 100 kg DAP, 80 kg MOP, and 50 kg Urea per acre before planting. Top-dress with 50 kg Urea at 30–35 days during earthing-up. For rapid tuber bulking and sizing, spray Potassium Nitrate (13-0-45) @ 5g/L at 45 and 60 days.";
            }
        }

        // 2. Wheat (Fertilizer, CRI irrigation)
        if (q.contains("wheat") || q.contains("gehun") || q.contains("gehu") || q.contains("गेहूं") || q.contains("গম")) {
            if ("hi".equals(lang)) {
                return "गेहूं के लिए बुवाई पर प्रति एकड़ 55 किग्रा डीएपी, 20 किग्रा एमओपी और 40 किग्रा यूरिया डालें। बुवाई के 20-25 दिन बाद (सीआरआई अवस्था) पहली सिंचाई अत्यंत आवश्यक है, इसके साथ 40 किग्रा यूरिया दें। कल्ले निकलने के बाद बालियां आने से पहले यूरिया की दूसरी खुराक डालें।";
            } else if ("bn".equals(lang)) {
                return "গমের জন্য একর প্রতি ৫৫ কেজি ডিএপি, ২০ কেজি এমওপি এবং ৪০ কেজি ইউরিয়া রোপণের সময় প্রয়োগ করুন। রোপণের ২০-২৫ দিনের মাথায় (শীর্ষ শিকড় গঠন পর্যায়) প্রথম সেচ ও ৪০ কেজি ইউরিয়া দেওয়া অত্যন্ত জরুরি।";
            } else {
                return "For wheat, apply 55 kg DAP, 20 kg MOP, and 40 kg Urea per acre at sowing. The first irrigation at 20-25 days (Crown Root Initiation stage) is vital; apply 40 kg Urea with it. Apply a second top-dressing of Urea before flowering.";
            }
        }

        // 3. Tomato
        if (q.contains("tomato") || q.contains("tamatar") || q.contains("टमाटर") || q.contains("টমেটো")) {
            if ("hi".equals(lang)) {
                return "टमाटर में अच्छी बढ़वार के लिए हर 15 दिन में एनपीके 19-19-19 (5 ग्राम/लीटर) और फूल आने पर 0-52-34 का छिड़काव करें। मरोड़िया रोग (लीफ कर्ल) से बचाव के लिए सफेद मक्खी पर इमिडाक्लोप्रिड (0.5 मिली/लीटर) और फल छेदक के लिए कोराजन (0.4 मिली/लीटर) का छिड़काव करें।";
            } else if ("bn".equals(lang)) {
                return "টমেটোর ভালো বৃদ্ধির জন্য প্রতি ১৫ দিন অন্তর ১৯-১৯-১৯ এবং ফুল আসার সময় ০-৫২-৩৪ স্প্রে করুন। পাতা কোঁকড়ানো রোগ দমনে সাদা মাছি নিয়ন্ত্রণে ইমিডাক্লোপ্রিড দিন এবং ফল ছিদ্রকারী পোকার জন্য কোরাজেন স্প্রে করুন।";
            } else {
                return "For tomatoes, spray water-soluble NPK 19-19-19 (5g/L) during vegetative growth, and 0-52-34 during flowering. For leaf curl prevention, control whiteflies with Imidacloprid (0.5 ml/L). For fruit borer, spray Chlorantraniliprole (Coragen 0.4 ml/L).";
            }
        }

        // 4. Onion
        if (q.contains("onion") || q.contains("pyaj") || q.contains("pyaaz") || q.contains("प्याज") || q.contains("পেঁয়াজ")) {
            if ("hi".equals(lang)) {
                return "प्याज के कंद बड़े करने के लिए बुवाई के 60 दिन बाद यूरिया का प्रयोग बंद कर दें। 70 और 85 दिनों पर 0-0-50 (पोटेशियम सल्फेट) 5 ग्राम/लीटर का छिड़काव करें और सल्फर 90% (3 किग्रा/एकड़) का उपयोग करें।";
            } else if ("bn".equals(lang)) {
                return "পেঁয়াজের আকার বৃদ্ধির জন্য ৬০ দিন পর ইউরিয়া বন্ধ করুন। ৭০ ও ৮৫ দিনের মাথায় ০-০-৫০ (পটাশিয়াম সালফেট) ৫ গ্রাম/লিটার স্প্রে করুন এবং পর্যাপ্ত নিকাশি নিশ্চিত করুন।";
            } else {
                return "For onion bulb enlargement, avoid excess nitrogen after 60 days to prevent splitting. Spray 0-0-50 (Sulphate of Potash) @ 5g/L at 70 and 85 days, and ensure proper soil drainage.";
            }
        }

        // 5. Rice / Paddy
        if (q.contains("rice") || q.contains("paddy") || q.contains("dhan") || q.contains("धान") || q.contains("ধান")) {
            if ("hi".equals(lang)) {
                return "धान में कल्ले फूटते समय खेत में 2-3 सेमी पानी रखें। रोपाई के 20-25 दिन बाद 40 किग्रा यूरिया और 10 किग्रा जिंक सल्फेट (21%) डालें। बालियां निकलने से पहले यूरिया की दूसरी खुराक दें।";
            } else if ("bn".equals(lang)) {
                return "ধানে কুশি আসার সময় জমিতে ২-৩ সেমি জল ধরে রাখুন। রোপণের ২০-২৫ দিন পর ৪০ কেজি ইউরিয়া ও ১০ কেজি জিঙ্ক সালফেট প্রয়োগ করুন।";
            } else {
                return "For paddy/rice, maintain 2-3 cm shallow standing water during tillering. Apply 40 kg Urea and 10 kg Zinc Sulphate (21%) at 20-25 days after transplanting, and top-dress with Urea again at panicle initiation.";
            }
        }

        // 6. Pest & Disease General
        if (q.contains("pest") || q.contains("insect") || q.contains("keeda") || q.contains("disease") || q.contains("fungus") || q.contains("कीट") || q.contains("रोग") || q.contains("पोका")) {
            if ("hi".equals(lang)) {
                return "रस चूसक कीटों (माहू, थ्रिप्स) के लिए नीम तेल 10,000 ppm (3 मिली/लीटर) या एसिटामिप्रिड (0.5 ग्राम/लीटर) का छिड़काव करें। फफूंद जनित रोगों और धब्बों के लिए मैंकोजेब 75 WP (2.5 ग्राम/लीटर) या कॉपर ऑक्सीक्लोराइड का उपयोग करें।";
            } else if ("bn".equals(lang)) {
                return "চোষক পোকার দমনে নিম তেল (৩ মিলি/লিটার) বা অ্যাসিটামিপ্রিড স্প্রে করুন। ছত্রাকজনিত দাগ ও পচন রোগের জন্য ম্যানকোজেব (২.৫ গ্রাম/লিটার) বা কপার অক্সিক্লোরাইড ব্যবহার করুন।";
            } else {
                return "For sucking pests (aphids, thrips, whiteflies), spray Neem oil (3 ml/L) or Acetamiprid 20 SP (0.5 g/L). For fungal diseases and leaf spot, spray Mancozeb 75 WP (2.5 g/L) or Copper Oxychloride (3 g/L).";
            }
        }

        // 7. General Agricultural Fallback
        if ("hi".equals(lang)) {
            return "फसल की अच्छी पैदावार के लिए संतुलित एनपीके खाद का प्रयोग करें, खेत में जल निकासी का उचित प्रबंध रखें और जैविक सुधार के लिए ट्राइकोडर्मा तथा सड़ी गोबर की खाद का उपयोग करें।";
        } else if ("bn".equals(lang)) {
            return "ফসলের সর্বোচ্চ ফলনের জন্য সুষম এনপিকে সার ব্যবহার করুন, সঠিক সেচ ও নিকাশি ব্যবস্থা রাখুন এবং ট্রাইকোডার্মা ও পচা গোবর সারের মতো জৈব উপাদান প্রয়োগ করুন।";
        } else {
            return "For optimal crop growth and yield, maintain balanced NPK nutrition based on soil tests, ensure proper drainage without waterlogging, and apply bio-fertilizers like Trichoderma and FYM.";
        }
    }

    private String extractCommodity(String question) {
        if (question == null || question.isBlank()) {
            return null;
        }

        // 1. Try resolving known commodity/crop first (supports English, Hindi, Bengali, Hinglish)
        String resolved = commodityResolverService.resolveCommodity(question);
        if (resolved != null && !resolved.isBlank()) {
            return resolved;
        }

        // 2. Fallback: Clean conversational filler words
        String q = question.trim();
        q = q.replaceAll("(?i)\\b(what|is|was|are|were|the|price|prices|rate|rates|of|today|today's|in|at|mandi|market|modal|give|me|near|nearby|tell|how|much|show|fertilizer|khad|spray|water|grow|faster|mere|aas|paas|pass|najdeek|amar|kache|ka|ke|ki|kya|hai|bhav|daam|dam|dor|koto|কত|দাম|দর|भाव|क्या|है|पास|नजदीक|আমার|কাছে)\\b", " ");
        q = q.replaceAll("[?.,!]", " ");
        q = q.replaceAll("\\s+", " ").trim();

        return q.isEmpty() ? null : q;
    }

    private String enrichWithContextualCrop(String question, String sessionId) {
        String lastCrop = sessionLastCrop.get(sessionId);
        if (lastCrop == null || lastCrop.isBlank()) {
            return question;
        }

        String qLower = question.toLowerCase();
        // If question doesn't specify a crop, but uses words like "it", "this", "fertilizer", "water", "spray"
        if (!qLower.contains(lastCrop.toLowerCase()) &&
                (qLower.contains("it") || qLower.contains("this") || qLower.contains("fertilizer") ||
                 qLower.contains("disease") || qLower.contains("spray") || qLower.contains("water") ||
                 qLower.contains("ise") || qLower.contains("isme") || qLower.contains("eti") || qLower.contains("khad"))) {
            return "[Context: Crop is " + lastCrop + "]. Farmer asks: " + question;
        }

        return question;
    }

    // =========================================================
    // MULTILINGUAL STRINGS & SPEECH CLEANERS
    // =========================================================

    private String getLanguageName(String code) {
        return switch (code.toLowerCase()) {
            case "hi" -> "Hindi (हिन्दी)";
            case "bn" -> "Bengali (বাংলা)";
            case "mr" -> "Marathi (मराठी)";
            case "ta" -> "Tamil (தமிழ்)";
            case "te" -> "Telugu (తెలుగు)";
            case "gu" -> "Gujarati (ગુજરાતી)";
            case "pa" -> "Punjabi (ਪੰਜਾਬੀ)";
            case "kn" -> "Kannada (ಕನ್ನಡ)";
            case "ml" -> "Malayalam (മലയാളം)";
            case "or" -> "Odia (ଓଡ଼ିଆ)";
            default -> "English";
        };
    }

    private String getOffTopicMessage(String lang) {
        return switch (lang.toLowerCase()) {
            case "hi" -> "मैं केवल कृषि, फसल और खेती से जुड़े सवालों में आपकी मदद कर सकता हूँ। कृपया फसल, खेती या मंडी भाव से संबंधित सवाल पूछें।";
            case "bn" -> "আমি শুধুমাত্র কৃষি, ফসল ও চাষাবাদ সংক্রান্ত প্রশ্নে সাহায্য করতে পারি। দয়া করে ফসল, চাষ বা মান্ডি সম্পর্কিত প্রশ্ন করুন।";
            default -> "I'm here to help with agriculture and farming-related questions. Please ask me something related to crops, farming, markets, or agriculture.";
        };
    }

    private String getEmptyQuestionMessage(String lang) {
        return switch (lang.toLowerCase()) {
            case "hi" -> "कृपया कृषि या मंडी भाव से जुड़ा कोई सवाल पूछें।";
            case "bn" -> "দয়া করে কৃষি বা মান্ডি দর সংক্রান্ত একটি প্রশ্ন জিজ্ঞাসা করুন।";
            default -> "Please ask a question related to agriculture or mandi prices.";
        };
    }

    private String getClarifyCropMessage(String lang) {
        return switch (lang.toLowerCase()) {
            case "hi" -> "कृपया उस फसल या सब्जी का नाम बताएं जिसका आप मंडी भाव जानना चाहते हैं।";
            case "bn" -> "দয়া করে সেই ফসল বা সবজির নাম বলুন যার মান্ডি দর আপনি জানতে চান।";
            default -> "Please mention the crop, vegetable or commodity whose mandi price you want.";
        };
    }

    private String getMandiNotFoundMessage(String commodity, String lang) {
        return switch (lang.toLowerCase()) {
            case "hi" -> commodity + " के लिए वर्तमान में कोई सत्यापित मंडी रिकॉर्ड उपलब्ध नहीं है।";
            case "bn" -> commodity + "-এর জন্য বর্তমানে কোনো যাচাইকৃত মান্ডি রেকর্ড পাওয়া যায়নি।";
            default -> "No recent verified mandi records were found for " + commodity + ".";
        };
    }

    private String getServiceUnavailableMessage(String lang) {
        return switch (lang.toLowerCase()) {
            case "hi" -> "कृषि सहायक सेवा अभी उपलब्ध नहीं है। कृपया कुछ देर बाद फिर से प्रयास करें।";
            case "bn" -> "কৃষি সহকারী পরিষেবা এই মুহূর্তে অনুপলব্ধ। দয়া করে কিছুক্ষণ পরে আবার চেষ্টা করুন।";
            default -> "Sorry, the agriculture AI service is temporarily unavailable. Please try again.";
        };
    }

    /**
     * Prepares clean, natural text for TTS by removing markdown formatting, bullet symbols,
     * asterisks, and converting currency symbols to spoken words.
     */
    private String cleanForSpeech(String text, String lang) {
        if (text == null) return "";

        String cleaned = text
                .replaceAll("\\*\\*", "")
                .replaceAll("\\*", "")
                .replaceAll("###?", "")
                .replaceAll("(?m)^[-•]\\s*", "")
                .replaceAll("[\\uD83C-\\uDBFF\\uDC00-\\uDFFF]+", "") // Emojis
                .replaceAll("\\s+", " ")
                .trim();

        if ("hi".equalsIgnoreCase(lang)) {
            cleaned = cleaned.replaceAll("₹\\s*", "").replaceAll("Rs\\.?\\s*", "");
        } else if ("bn".equalsIgnoreCase(lang)) {
            cleaned = cleaned.replaceAll("₹\\s*", "").replaceAll("Rs\\.?\\s*", "");
        } else {
            cleaned = cleaned.replaceAll("₹\\s*", "Rupees ");
        }

        return cleaned;
    }

    private String value(Map<String, Object> map, String key) {
        Object val = map.get(key);
        return val != null ? val.toString() : "";
    }

    // =========================================================
    // MEMORY MANAGEMENT
    // =========================================================

    private void addConversation(String sessionId, String role, String text) {
        List<ConversationMessage> history = conversationMemory.computeIfAbsent(
                sessionId, k -> new ArrayList<>()
        );
        synchronized (history) {
            history.add(new ConversationMessage(role, text));
            while (history.size() > MAX_HISTORY_MESSAGES) {
                history.remove(0);
            }
        }
    }

    private List<ConversationMessage> getConversation(String sessionId) {
        List<ConversationMessage> history = conversationMemory.get(sessionId);
        if (history == null) return new ArrayList<>();
        synchronized (history) {
            return new ArrayList<>(history);
        }
    }

    public void clearConversation(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) return;
        conversationMemory.remove(sessionId);
        sessionLastCrop.remove(sessionId);
        System.out.println("AI session cleared: " + sessionId);
    }

    private record ConversationMessage(String role, String text) {}
}