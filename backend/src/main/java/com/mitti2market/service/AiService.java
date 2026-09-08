package com.mitti2market.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

@Service
public class AiService {

    private final WebClient webClient;
    private final ObjectMapper objectMapper;
    private final MandiPriceService mandiPriceService;
    private final CommodityResolverService commodityResolverService;

    /*
     * =========================================================
     * CONVERSATION MEMORY
     * =========================================================
     *
     * sessionId -> conversation history
     *
     * Each user gets a separate conversation.
     */
    private final Map<String, List<ConversationMessage>>
            conversationMemory =
            new ConcurrentHashMap<>();

    /*
     * Maximum messages remembered per session.
     *
     * 10 messages = approximately 5 user/AI exchanges.
     */
    private static final int MAX_HISTORY_MESSAGES = 10;

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    @Value("${gemini.model:gemini-3.6-flash}")
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

    // =========================================================
    // MAIN AI METHOD
    // =========================================================

    public String askAgricultureAI(
            String question,
            String language,
            String sessionId,
            Double latitude,
            Double longitude) {

        /*
         * Validate question.
         */
        if (question == null || question.trim().isEmpty()) {
            return "Please enter an agriculture-related question.";
        }

        String q = question.trim();

        /*
         * If sessionId is missing, use temporary session.
         */
        if (sessionId == null || sessionId.trim().isEmpty()) {
            sessionId = "temporary-session";
        }

        try {

            // =====================================================
            // MANDI PRICE QUESTIONS
            // =====================================================
            //
            // IMPORTANT:
            //
            // Mandi price questions NEVER go to Gemini.
            //
            // They use verified government mandi data.
            //
            // There is NO hardcoded crop list here.
            //
            // Example:
            //
            // "What is the tomato price?"
            // "Potato mandi rate?"
            // "What is the price of dragon fruit?"
            //
            // CommodityResolverService determines whether the
            // commodity exists in the government dataset.
            // =====================================================

            if (looksLikeMandiPriceQuestion(q)) {

                String answer =
                        handleMandiPriceQuestion(
                                q,
                                language
                        );

                /*
                 * Store price conversation too.
                 *
                 * This allows:
                 *
                 * User:
                 * "What is tomato price?"
                 *
                 * AI:
                 * ...
                 *
                 * User:
                 * "Which market is better?"
                 *
                 * Gemini can understand the context.
                 */
                addConversation(
                        sessionId,
                        "user",
                        q
                );

                addConversation(
                        sessionId,
                        "model",
                        answer
                );

                return answer;
            }

            // =====================================================
            // AGRICULTURE / GENERAL AI
            // =====================================================
            //
            // There is intentionally NO hardcoded crop list.
            //
            // Gemini itself determines whether the question is
            // agriculture-related.
            //
            // Conversation history is also provided, so questions
            // such as:
            //
            // "What should I do?"
            //
            // can refer to the previous agriculture discussion.
            //
            // This makes the AI dynamic.
            // =====================================================

            String answer =
                    callGemini(
                            q,
                            language,
                            sessionId
                    );

            /*
             * Save conversation only after successful response.
             */
            addConversation(
                    sessionId,
                    "user",
                    q
            );

            addConversation(
                    sessionId,
                    "model",
                    answer
            );

            return answer;

        } catch (Exception e) {

            System.err.println("=================================");
            System.err.println("AI ERROR");
            System.err.println(e.getMessage());
            System.err.println("=================================");

            e.printStackTrace();

            return "Sorry, the agriculture AI service is temporarily unavailable. Please try again.";
        }
    }

    // =========================================================
    // CONVERSATION MEMORY
    // =========================================================

    private void addConversation(
            String sessionId,
            String role,
            String text) {

        List<ConversationMessage> history =
                conversationMemory.computeIfAbsent(
                        sessionId,
                        key -> new ArrayList<>()
                );

        synchronized (history) {

            history.add(
                    new ConversationMessage(
                            role,
                            text
                    )
            );

            /*
             * Keep only latest messages.
             */
            while (history.size() > MAX_HISTORY_MESSAGES) {
                history.remove(0);
            }
        }
    }

    private List<ConversationMessage> getConversation(
            String sessionId) {

        List<ConversationMessage> history =
                conversationMemory.get(sessionId);

        if (history == null) {
            return new ArrayList<>();
        }

        synchronized (history) {
            return new ArrayList<>(history);
        }
    }

    public void clearConversation(String sessionId) {

        if (sessionId == null || sessionId.trim().isEmpty()) {
            return;
        }

        conversationMemory.remove(sessionId);

        System.out.println(
                "Conversation memory cleared for session: "
                        + sessionId
        );
    }

    // =========================================================
    // MANDI PRICE DETECTION
    // =========================================================

    /*
     * This detects PRICE INTENT only.
     *
     * IMPORTANT:
     *
     * This is NOT a crop list.
     *
     * We are not checking:
     *
     * tomato
     * potato
     * wheat
     * rice
     * onion
     * etc.
     *
     * Any commodity can be handled dynamically by
     * CommodityResolverService.
     */

    private boolean looksLikeMandiPriceQuestion(
            String question) {

        String q =
                question.toLowerCase();

        String[] priceTerms = {

                "price",
                "prices",
                "rate",
                "rates",

                "bhav",
                "भाव",

                "daam",
                "दाम",

                "mandi price",
                "mandi rate",

                "market price",
                "market rate",

                "apmc price",
                "apmc rate",

                "modal price",

                "wholesale price",
                "wholesale rate"
        };

        for (String term : priceTerms) {

            if (containsWholeWord(q, term)) {
                return true;
            }
        }

        return false;
    }

    // =========================================================
    // HANDLE MANDI PRICE
    // =========================================================

    private String handleMandiPriceQuestion(
            String question,
            String language) {

        /*
         * Extract whatever commodity the user mentioned.
         *
         * There is NO hardcoded crop list.
         */
        String userCommodity =
                extractCommodity(question);

        if (userCommodity == null
                || userCommodity.isBlank()) {

            return "Please mention the crop, fruit, vegetable, or agricultural commodity whose mandi price you want.";
        }

        System.out.println("=================================");
        System.out.println("MANDI PRICE REQUEST");
        System.out.println("Question  : " + question);
        System.out.println("Input     : " + userCommodity);
        System.out.println("=================================");

        /*
         * =====================================================
         * DYNAMIC COMMODITY RESOLUTION
         * =====================================================
         *
         * CommodityResolverService checks the government
         * mandi dataset instead of a hardcoded Java list.
         *
         * Therefore new commodities can be supported without
         * editing this AiService.
         */

        String commodity =
                commodityResolverService
                        .resolveWithVariations(
                                userCommodity
                        );

        /*
         * Commodity not found.
         */
        if (commodity == null) {

            return "I could not find a verified government mandi record for \""
                    + userCommodity
                    + "\". Please check the commodity name and try again.";
        }

        System.out.println(
                "Resolved commodity: "
                        + commodity
        );

        /*
         * =====================================================
         * GET VERIFIED GOVERNMENT PRICE
         * =====================================================
         */

        Map<String, Object> data =
                mandiPriceService.searchPrices(
                        commodity,
                        null,
                        null,
                        null
                );

        /*
         * Government API failed.
         */
        if (!Boolean.TRUE.equals(
                data.get("success"))) {

            return "I could not retrieve the latest verified mandi price for "
                    + commodity
                    + " right now. Please try again shortly.";
        }

        /*
         * Get number of records.
         */
        Object countObject =
                data.get("count");

        int count = 0;

        if (countObject instanceof Number) {

            count =
                    ((Number) countObject)
                            .intValue();
        }

        /*
         * No records.
         */
        if (count == 0) {

            return "I could not find a verified mandi price for "
                    + commodity
                    + " in the available government market records.";
        }

        /*
         * IMPORTANT:
         *
         * DO NOT CALL GEMINI HERE.
         *
         * The response must come directly from verified
         * government market data.
         */

        return formatMandiPrices(
                commodity,
                data
        );
    }

    // =========================================================
    // COMMODITY EXTRACTION
    // =========================================================

    /*
     * Removes common price-query words and leaves the commodity.
     *
     * Example:
     *
     * "What is tomato price today?"
     *
     * becomes approximately:
     *
     * "tomato"
     *
     * No crop names are hardcoded here.
     */

    private String extractCommodity(
            String question) {

        String q =
                question.trim();

        /*
         * Question words.
         */

        q = q.replaceAll(
                "(?i)\\bwhat\\s+(is|was|are|were)\\b",
                " "
        );

        q = q.replaceAll(
                "(?i)\\bhow\\s+much\\b",
                " "
        );

        q = q.replaceAll(
                "(?i)\\bwhat's\\b",
                " "
        );

        /*
         * Price words.
         */

        q = q.replaceAll(
                "(?i)\\bprice(s)?\\b",
                " "
        );

        q = q.replaceAll(
                "(?i)\\brate(s)?\\b",
                " "
        );

        q = q.replaceAll(
                "(?i)\\bmandi\\b",
                " "
        );

        q = q.replaceAll(
                "(?i)\\bmarket\\b",
                " "
        );

        q = q.replaceAll(
                "(?i)\\bapmc\\b",
                " "
        );

        q = q.replaceAll(
                "(?i)\\bmodal\\b",
                " "
        );

        q = q.replaceAll(
                "(?i)\\bwholesale\\b",
                " "
        );

        q = q.replaceAll(
                "(?i)\\bbhav\\b",
                " "
        );

        q = q.replaceAll(
                "(?i)\\bdaam\\b",
                " "
        );

        /*
         * Common contextual words.
         */

        q = q.replaceAll(
                "(?i)\\bof\\b",
                " "
        );

        q = q.replaceAll(
                "(?i)\\bthe\\b",
                " "
        );

        q = q.replaceAll(
                "(?i)\\btoday's\\b",
                " "
        );

        q = q.replaceAll(
                "(?i)\\btoday\\b",
                " "
        );

        q = q.replaceAll(
                "(?i)\\bcurrent\\b",
                " "
        );

        q = q.replaceAll(
                "(?i)\\bnow\\b",
                " "
        );

        q = q.replaceAll(
                "(?i)\\bnear\\s+me\\b",
                " "
        );

        q = q.replaceAll(
                "(?i)\\bnearby\\b",
                " "
        );

        q = q.replaceAll(
                "(?i)\\bnear\\b",
                " "
        );

        q = q.replaceAll(
                "(?i)\\bin\\b",
                " "
        );

        /*
         * Remove punctuation.
         */
        q = q.replaceAll(
                "[?.,!]",
                " "
        );

        /*
         * Normalize spaces.
         */
        q = q.replaceAll(
                "\\s+",
                " "
        ).trim();

        if (q.isBlank()) {
            return null;
        }

        return q;
    }

    // =========================================================
    // DIRECT MANDI RESPONSE
    // =========================================================

    @SuppressWarnings("unchecked")
    private String formatMandiPrices(
            String commodity,
            Map<String, Object> data) {

        StringBuilder answer =
                new StringBuilder();

        answer.append(
                "🌾 Latest verified mandi prices for "
        )
                .append(commodity)
                .append("\n\n");

        Object pricesObject =
                data.get("prices");

        if (!(pricesObject instanceof java.util.List<?>)) {

            return "Verified mandi data was retrieved, but no price records could be displayed.";
        }

        java.util.List<?> prices =
                (java.util.List<?>) pricesObject;

        int displayed = 0;

        for (Object item : prices) {

            if (!(item instanceof Map<?, ?>)) {
                continue;
            }

            Map<String, Object> price =
                    (Map<String, Object>) item;

            /*
             * Market.
             */
            answer.append("📍 ")
                    .append(value(price, "market"))
                    .append("\n");

            /*
             * Location.
             */
            String state =
                    value(price, "state");

            String district =
                    value(price, "district");

            if (!state.isBlank()
                    || !district.isBlank()) {

                answer.append("Location: ");

                if (!district.isBlank()) {

                    answer.append(district);

                    if (!state.isBlank()) {
                        answer.append(", ");
                    }
                }

                if (!state.isBlank()) {
                    answer.append(state);
                }

                answer.append("\n");
            }

            /*
             * Variety.
             */
            String variety =
                    value(price, "variety");

            if (!variety.isBlank()) {

                answer.append("Variety: ")
                        .append(variety)
                        .append("\n");
            }

            /*
             * Minimum price.
             */
            String min =
                    value(price, "minPrice");

            if (!min.isBlank()) {

                answer.append("Minimum: ₹")
                        .append(min)
                        .append("/quintal\n");
            }

            /*
             * Maximum price.
             */
            String max =
                    value(price, "maxPrice");

            if (!max.isBlank()) {

                answer.append("Maximum: ₹")
                        .append(max)
                        .append("/quintal\n");
            }

            /*
             * Modal price.
             */
            String modal =
                    value(price, "modalPrice");

            if (!modal.isBlank()) {

                answer.append("Modal: ₹")
                        .append(modal)
                        .append("/quintal\n");
            }

            /*
             * Arrival/report date.
             */
            String date =
                    value(price, "arrivalDate");

            if (!date.isBlank()) {

                answer.append("Reported: ")
                        .append(date)
                        .append("\n");
            }

            answer.append("\n");

            displayed++;

            /*
             * Display maximum 10 markets.
             */
            if (displayed >= 10) {
                break;
            }
        }

        if (displayed == 0) {

            return "Verified mandi data was retrieved, but no usable price records were found.";
        }

        answer.append(
                "ℹ️ Prices are reported from the government mandi dataset and can vary by market, variety and quality."
        );

        return answer.toString();
    }

    // =========================================================
    // MAP VALUE HELPER
    // =========================================================

    private String value(
            Map<String, Object> map,
            String key) {

        Object value =
                map.get(key);

        if (value == null) {
            return "";
        }

        return value.toString();
    }

    // =========================================================
    // GEMINI PROMPT
    // =========================================================

    private String buildAgriculturePrompt(
            String question,
            String language) {

        return """
                You are Mitti2Market Agriculture AI.

                You are an agriculture decision-support assistant
                designed primarily for Indian farmers.

                =====================================================
                MOST IMPORTANT RULE
                =====================================================

                You are NOT a general-purpose chatbot.

                You ONLY answer questions that are related to
                agriculture, farming, farmers, agricultural production,
                agricultural business, agricultural markets, or
                agriculture-related problems.

                The agriculture domain is OPEN-ENDED.

                DO NOT use a fixed list of crops, fruits, vegetables,
                diseases, fertilizers, animals, or commodities.

                A user may ask about ANY agricultural crop,
                commodity, plant, animal, farming method, disease,
                pest, soil condition, fertilizer, irrigation method,
                agricultural technology, market, storage method,
                transportation issue, government scheme, or farming
                business problem.

                Determine agriculture relevance from the MEANING of
                the question, not from a hardcoded word list.

                =====================================================
                AGRICULTURE DOMAIN
                =====================================================

                Agriculture-related questions may include:

                - crop cultivation
                - fruit cultivation
                - vegetable cultivation
                - cereals
                - pulses
                - oilseeds
                - spices
                - commercial crops
                - horticulture
                - floriculture
                - seeds
                - nurseries
                - soil
                - fertilizers
                - manure
                - compost
                - irrigation
                - water management
                - crop nutrition
                - crop diseases
                - plant diseases
                - pests
                - insects
                - fungal problems
                - bacterial problems
                - plant health
                - weed management
                - sowing
                - transplanting
                - harvesting
                - post-harvest handling
                - storage
                - agricultural machinery
                - farm equipment
                - greenhouse farming
                - protected cultivation
                - organic farming
                - natural farming
                - precision agriculture
                - agricultural technology
                - weather impact on crops
                - rainfall impact
                - heat or cold stress
                - drought
                - flood
                - agricultural markets
                - mandi
                - APMC
                - crop selling
                - agricultural buyers
                - farm transportation
                - farm logistics
                - agricultural economics
                - government agriculture schemes
                - farmer subsidies
                - livestock
                - dairy
                - poultry
                - fisheries
                - farm business

                This is an explanation of the domain, NOT a fixed
                whitelist.

                =====================================================
                AGRICULTURE BOUNDARY
                =====================================================

                You must semantically determine whether the CURRENT
                user question is agriculture-related.

                Do NOT answer unrelated questions.

                For example, unrelated questions about:

                - programming
                - coding
                - mathematics
                - entertainment
                - celebrities
                - politics
                - general technology
                - general history
                - general finance
                - games
                - unrelated personal topics

                should NOT be answered unless they are directly
                connected to agriculture.

                If the current question is unrelated to agriculture,
                respond EXACTLY:

                Sorry, I can help only with agriculture-related problems.

                Do not add anything before or after that sentence.

                =====================================================
                CONVERSATION MEMORY
                =====================================================

                Previous conversation messages are provided before
                the current user question.

                Use the conversation context intelligently.

                The user may refer to something indirectly using
                words such as:

                "it"
                "this"
                "that"
                "they"
                "them"
                "this crop"
                "this plant"
                "this disease"
                "this problem"
                "this fertilizer"
                "this treatment"
                "the crop"
                "the plant"
                "the field"
                "the farmer"
                "the market"

                Resolve these references using the previous
                conversation.

                DO NOT force the user to repeat information that is
                already clear from the conversation.

                For example:

                User:
                My tomato leaves are turning yellow.

                Assistant:
                [agriculture advice]

                User:
                What should I do?

                Understand that "What should I do?" refers to the
                previously discussed tomato problem.

                Another example:

                User:
                My wheat field has poor irrigation.

                Assistant:
                [irrigation advice]

                User:
                How often should I do this?

                Understand that "this" refers to the relevant
                irrigation practice.

                Do NOT rely on a fixed list of follow-up phrases.

                =====================================================
                IMPORTANT CONVERSATION BOUNDARY
                =====================================================

                Previous agriculture context does NOT mean that every
                future question is agriculture-related.

                If the user changes to an unrelated subject, reject
                the new question using the exact agriculture-only
                response.

                =====================================================
                MANDI PRICE RULE
                =====================================================

                NEVER invent current mandi prices.

                Current mandi prices are retrieved separately by the
                application from verified government market data.

                If verified mandi data is already provided by the
                application, use those values.

                Do NOT create or guess current market prices.

                Do NOT claim that a price is current unless it was
                provided by verified market data.

                =====================================================
                FARMER-FRIENDLY ANSWERS
                =====================================================

                Give practical, clear and easy-to-understand advice
                suitable for Indian farmers.

                Avoid unnecessary technical terminology.

                When useful, structure the answer as:

                1. Possible cause
                2. What the farmer should check
                3. Recommended action
                4. Prevention
                5. When expert or field inspection is needed

                For crop disease questions:

                - Do not claim a certain diagnosis without enough
                  information.
                - Explain possible causes.
                - Ask for relevant details only when genuinely needed.
                - If a crop image would help, say so.
                - Do not claim a pesticide, fertilizer, medicine,
                  treatment or practice is guaranteed to work.

                =====================================================
                SELLING AND MARKET QUESTIONS
                =====================================================

                When the user asks how or where to sell agricultural
                produce, help them think about:

                - commodity
                - quantity
                - quality
                - location
                - nearby markets
                - mandi prices
                - buyers
                - transportation
                - storage
                - timing
                - estimated realization

                Do not invent buyer information, market prices,
                transportation costs, or availability.

                =====================================================
                LANGUAGE
                =====================================================

                Answer in the requested language.

                If the requested language is Hindi, answer in Hindi.

                If the user uses Hinglish, natural Hinglish is allowed.

                If the requested language is English, answer in English.

                =====================================================
                CURRENT USER QUESTION
                =====================================================

                %s

                =====================================================
                REQUESTED LANGUAGE
                =====================================================

                %s
                """.formatted(
                question,
                language == null || language.isBlank()
                        ? "English"
                        : language
        );
    }

    // =========================================================
    // GEMINI API WITH CONVERSATION MEMORY
    // =========================================================

    private String callGemini(
            String question,
            String language,
            String sessionId) {

        /*
         * Get previous conversation.
         */
        List<ConversationMessage> history =
                getConversation(sessionId);

        /*
         * Gemini contents.
         */
        List<Map<String, Object>> contents =
                new ArrayList<>();

        /*
         * =====================================================
         * PREVIOUS CONVERSATION
         * =====================================================
         */

        for (ConversationMessage message : history) {

            Map<String, Object> part =
                    new HashMap<>();

            part.put(
                    "text",
                    message.text()
            );

            Map<String, Object> content =
                    new HashMap<>();

            /*
             * Gemini roles:
             *
             * user
             * model
             */

            content.put(
                    "role",
                    message.role()
            );

            content.put(
                    "parts",
                    new Object[]{part}
            );

            contents.add(content);
        }

        /*
         * =====================================================
         * CURRENT QUESTION + AI INSTRUCTIONS
         * =====================================================
         */

        String instructionPrompt =
                buildAgriculturePrompt(
                        question,
                        language
                );

        Map<String, Object> currentPart =
                new HashMap<>();

        currentPart.put(
                "text",
                instructionPrompt
        );

        Map<String, Object> currentContent =
                new HashMap<>();

        currentContent.put(
                "role",
                "user"
        );

        currentContent.put(
                "parts",
                new Object[]{currentPart}
        );

        contents.add(currentContent);

        /*
         * =====================================================
         * BUILD GEMINI REQUEST
         * =====================================================
         */

        Map<String, Object> request =
                new HashMap<>();

        request.put(
                "contents",
                contents.toArray()
        );

        /*
         * Gemini REST endpoint.
         */
        String url =
                "https://generativelanguage.googleapis.com/v1beta/models/"
                        + geminiModel
                        + ":generateContent";

        System.out.println("=================================");
        System.out.println("GEMINI REQUEST");
        System.out.println("Model: " + geminiModel);
        System.out.println("Session: " + sessionId);
        System.out.println("History messages: " + history.size());
        System.out.println("=================================");

        /*
         * =====================================================
         * CALL GEMINI
         * =====================================================
         */

        String response =
                webClient
                        .post()
                        .uri(url)
                        .header(
                                "x-goog-api-key",
                                geminiApiKey
                        )
                        .header(
                                "Content-Type",
                                "application/json"
                        )
                        .bodyValue(request)
                        .exchangeToMono(
                                clientResponse -> {

                                    int status =
                                            clientResponse
                                                    .statusCode()
                                                    .value();

                                    return clientResponse
                                            .bodyToMono(
                                                    String.class
                                            )
                                            .defaultIfEmpty("")
                                            .map(body -> {

                                                if (status < 200
                                                        || status >= 300) {

                                                    throw new RuntimeException(
                                                            "Gemini HTTP "
                                                                    + status
                                                                    + " Response: "
                                                                    + body
                                                    );
                                                }

                                                return body;
                                            });
                                }
                        )
                        .block();

        /*
         * Empty response.
         */
        if (response == null
                || response.isBlank()) {

            throw new RuntimeException(
                    "Gemini returned an empty response."
            );
        }

        /*
         * =====================================================
         * PARSE GEMINI RESPONSE
         * =====================================================
         */

        try {

            JsonNode root =
                    objectMapper.readTree(response);

            JsonNode answer =
                    root.path("candidates")
                            .path(0)
                            .path("content")
                            .path("parts")
                            .path(0)
                            .path("text");

            if (!answer.isMissingNode()
                    && !answer.isNull()) {

                String text =
                        answer.asText();

                if (text != null
                        && !text.isBlank()) {

                    return text.trim();
                }
            }

            throw new RuntimeException(
                    "Gemini did not return a usable answer."
            );

        } catch (Exception e) {

            throw new RuntimeException(
                    "Unable to parse Gemini response: "
                            + e.getMessage(),
                    e
            );
        }
    }

    // =========================================================
    // CONVERSATION MESSAGE
    // =========================================================

    private record ConversationMessage(
            String role,
            String text) {
    }

    // =========================================================
    // WHOLE WORD MATCHING
    // =========================================================

    private boolean containsWholeWord(
            String text,
            String word) {

        if (word == null || word.isBlank()) {
            return false;
        }

        /*
         * Hindi/local language phrases.
         */
        if (word.matches(".*[^\\x00-\\x7F].*")) {
            return text.contains(word);
        }

        String regex =
                "\\b"
                        + Pattern.quote(word)
                        + "\\b";

        return Pattern
                .compile(regex)
                .matcher(text)
                .find();
    }
}