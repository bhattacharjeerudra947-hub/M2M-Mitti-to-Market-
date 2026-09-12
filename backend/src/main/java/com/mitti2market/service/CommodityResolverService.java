package com.mitti2market.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Duration;
import java.util.*;

@Service
public class CommodityResolverService {

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    @Value("${mandi.api.key}")
    private String apiKey;

    @Value("${mandi.api.url}")
    private String apiUrl;

    // Multilingual dictionary mapping aliases (English, Hindi, Bengali, Hinglish, etc.)
    // directly to official mandi commodity names
    private static final Map<String, String> COMMODITY_DICTIONARY = new HashMap<>();

    static {
        // VEGETABLES
        mapAliases("Tomato", "tomato", "tomatoes", "tamatar", "tometo", "tomata", "टमाटर", "টমেটো", "বিলিতি");
        mapAliases("Potato", "potato", "potatoes", "alu", "aaloo", "aalu", "batata", "आलू", "আলু");
        mapAliases("Onion", "onion", "onions", "pyaj", "pyaaz", "pyaz", "kanda", "dungri", "प्याज़", "प्याज", "পেঁয়াজ");
        mapAliases("Green Chilli", "green chilli", "green chili", "chilli", "chili", "mirch", "hari mirch", "mirchi", "हरी मिर्च", "मिर्च", "কাঁচা লঙ্কা", "লঙ্কা");
        mapAliases("Chilli Red", "red chilli", "red chili", "lal mirch", "dry chilli", "लाल मिर्च", "শুকনো লঙ্কা");
        mapAliases("Ginger(Green)", "ginger", "adrak", "adrakh", "ale", "अदरक", "আদা");
        mapAliases("Garlic", "garlic", "lahsun", "lasun", "lehasun", "लहसुन", "রসুন");
        mapAliases("Cauliflower", "cauliflower", "phool gobhi", "phool gobi", "gobhi", "gobi", "फूलगोभी", "ফুলকপি");
        mapAliases("Cabbage", "cabbage", "patta gobhi", "patta gobi", "bandha gobhi", "पत्तागोभी", "বাঁধাকপি");
        mapAliases("Brinjal", "brinjal", "eggplant", "aubergine", "baingan", "baigan", "vangi", "बैंगन", "বেগুন");
        mapAliases("Bhindi(Ladies Finger)", "bhindi", "okra", "ladies finger", "ladyfinger", "bhendi", "भिंडी", "ঢ্যাঁড়শ");
        mapAliases("Cucumbar(Kheera)", "cucumber", "kheera", "khira", "kakdi", "shosha", "खीरा", "শসা");
        mapAliases("Carrot", "carrot", "gajar", "गाजर", "গাজর");
        mapAliases("Radish", "radish", "mooli", "muli", "मूली", "মুলো");
        mapAliases("Bottle Gourd", "bottle gourd", "lauki", "ghiya", "doodhi", "lau", "लौकी", "লাউ");
        mapAliases("Bitter Gourd", "bitter gourd", "karela", "karala", "करेला", "করলা");
        mapAliases("Capsicum", "capsicum", "shimla mirch", "bell pepper", "शिमला मिर्च", "ক্যাপসিকাম");
        mapAliases("Green Peas", "green peas", "peas", "matar", "हरी मटर", "मटर", "মটরশুঁটি");
        mapAliases("Spinach", "spinach", "palak", "पालक", "পালংশাক");

        // GRAINS & CEREALS
        mapAliases("Wheat", "wheat", "gehu", "gehun", "kanak", "गेहूं", "गेहूँ", "গম");
        mapAliases("Paddy(Dhan)(Common)", "rice", "paddy", "dhan", "chawal", "tandul", "chaanwal", "धान", "चावल", "ধান", "চাল");
        mapAliases("Maize", "maize", "corn", "makka", "makkai", "makai", "मक्का", "ভুট্টা");
        mapAliases("Bajra(Pearl Millet/Cumbu)", "bajra", "pearl millet", "cumbu", "बाजरा", "বাজরা");
        mapAliases("Jowar(Sorghum)", "jowar", "sorghum", "jowari", "ज्वार", "জোয়ার");
        mapAliases("Barley (Jau)", "barley", "jau", "जौ", "বার্লি");

        // PULSES
        mapAliases("Bengal Gram(Gram)(Whole)", "chana", "gram", "bengal gram", "kala chana", "चना", "ছোলা");
        mapAliases("Arhar (Tur/Red Gram)(Whole)", "tur", "toor", "arhar", "tur dal", "toor dal", "तुअर", "अरहर", "তুড় ডাল");
        mapAliases("Moong(Green Gram)(Whole)", "moong", "mung", "moong dal", "mung bean", "मूंग", "মুগ");
        mapAliases("Mash(Urd/Black Gram)(Whole)", "urad", "mash", "urad dal", "black gram", "उड़द", "বিউলি");
        mapAliases("Masur(Lentil)(Whole)", "masur", "masoor", "lentil", "masoor dal", "मसूर", "মসুর");

        // OILSEEDS
        mapAliases("Mustard", "mustard", "sarson", "sarso", "rai", "toria", "सरसों", "সর্ষে", "রাই");
        mapAliases("Soyabean", "soyabean", "soybean", "soya", "सोयाबीन", "সয়াবিন");
        mapAliases("Groundnut", "groundnut", "peanut", "moongphali", "mungfali", "singdana", "मूंगफली", "বাদাম", "চীনাবাদাম");
        mapAliases("Sesamum(Sesame,Gingelly,Til)", "sesame", "til", "gingelly", "तिल", "তিল");
        mapAliases("Sunflower", "sunflower", "surajmukhi", "सूरजमुखी", "সূর্যমুখী");

        // FRUITS
        mapAliases("Apple", "apple", "seb", "saeb", "सेब", "আপেল");
        mapAliases("Banana", "banana", "kela", "केला", "কলা");
        mapAliases("Mango", "mango", "aam", "আম", "आम");
        mapAliases("Grapes", "grapes", "angoor", "angur", "draksh", "अंगूर", "আঙুর");
        mapAliases("Orange", "orange", "santara", "santre", "narangi", "santola", "संतरा", "কমলালেবু");
        mapAliases("Pomegranate", "pomegranate", "anaar", "anar", "dalim", "bedana", "अनार", "বেদানা", "ডালিম");
        mapAliases("Water Melon", "watermelon", "water melon", "tarbooj", "tarbuz", "तरबूज", "তরমুজ");
        mapAliases("Papaya", "papaya", "papita", "पपीता", "পেঁপে");
        mapAliases("Guava", "guava", "amrood", "amrud", "peyara", "अमरूद", "পেয়ারা");
        mapAliases("Pineapple", "pineapple", "ananas", "अनानास", "আনারস");
        mapAliases("Lemon", "lemon", "nimbu", "neebu", "lebu", "नींबू", "লেবু");

        // COMMERCIAL & SPICES
        mapAliases("Cotton", "cotton", "kapas", "rui", "कपास", "তুলা");
        mapAliases("Sugarcane", "sugarcane", "ganna", "aakh", "गन्ना", "আখ");
        mapAliases("Turmeric", "turmeric", "haldi", "हल्दी", "হলুদ");
        mapAliases("Coriander(Leaves)", "coriander", "dhaniya", "dhoniya", "ধনে", "धनिया");
        mapAliases("Cumin Seed(Jeera)", "cumin", "jeera", "jira", "जीरा", "জিরে");
        mapAliases("Black Pepper", "black pepper", "kali mirch", "gol morich", "काली मिर्च", "গোলমরিচ");
        mapAliases("Cardamoms", "cardamom", "elaichi", "elachi", "इलायची", "এলাচ");
        mapAliases("Tea", "tea", "chai", "चाय", "চা");
        mapAliases("Coffee", "coffee", "कॉफ़ी", "কফি");
        mapAliases("Coconut", "coconut", "nariyal", "narkel", "नारियल", "নারকেল");
    }

    private static void mapAliases(String officialName, String... aliases) {
        COMMODITY_DICTIONARY.put(normalize(officialName), officialName);
        for (String alias : aliases) {
            COMMODITY_DICTIONARY.put(normalize(alias), officialName);
        }
    }

    public CommodityResolverService(
            WebClient.Builder webClientBuilder,
            ObjectMapper objectMapper) {
        this.webClient = webClientBuilder.build();
        this.objectMapper = objectMapper;
    }

    /**
     * Instantly resolves user input to official mandi commodity name.
     * Checks in-memory dictionary first (<1ms), then clean title-casing.
     */
    public String resolveCommodity(String userCommodity) {
        if (userCommodity == null || userCommodity.isBlank()) {
            return null;
        }

        String cleaned = cleanCommodity(userCommodity);
        if (cleaned.isBlank()) {
            return null;
        }

        String normalized = normalize(cleaned);

        // 1. Direct dictionary match (<0.1 ms)
        if (COMMODITY_DICTIONARY.containsKey(normalized)) {
            return COMMODITY_DICTIONARY.get(normalized);
        }

        // 2. Word-by-word exact token matching from cleaned input
        String[] words = cleaned.split("[^a-zA-Z0-9\\u0900-\\u097F\\u0980-\\u09FF]+");
        for (String word : words) {
            String normWord = normalize(word);
            if (!normWord.isBlank() && COMMODITY_DICTIONARY.containsKey(normWord)) {
                return COMMODITY_DICTIONARY.get(normWord);
            }
        }

        // Multi-word alias matching (e.g. "green chilli", "bottle gourd", "hari mirch")
        for (Map.Entry<String, String> entry : COMMODITY_DICTIONARY.entrySet()) {
            String key = entry.getKey();
            if (normalized.contains(key) && key.length() >= 4) {
                return entry.getValue();
            }
        }

        // 3. Fast exact API check with 2-second timeout (only 1 single request, no pagination loops)
        String onlineMatch = findExactCommodityQuick(cleaned);
        if (onlineMatch != null) {
            COMMODITY_DICTIONARY.put(normalized, onlineMatch);
            return onlineMatch;
        }

        // 4. Default to Capitalized title case as standard commodity representation
        return toTitleCase(cleaned);
    }

    public String resolveWithVariations(String userCommodity) {
        return resolveCommodity(userCommodity);
    }

    private String findExactCommodityQuick(String commodity) {
        try {
            URI uri = UriComponentsBuilder
                    .fromHttpUrl(apiUrl)
                    .queryParam("api-key", apiKey)
                    .queryParam("format", "json")
                    .queryParam("limit", 2)
                    .queryParam("offset", 0)
                    .queryParam("filters[commodity]", toTitleCase(commodity))
                    .build()
                    .encode()
                    .toUri();

            String response = webClient
                    .get()
                    .uri(uri)
                    .header("Accept", "application/json")
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofMillis(2000))
                    .block();

            if (response != null && !response.isBlank()) {
                JsonNode root = objectMapper.readTree(response);
                JsonNode records = root.path("records");
                if (records.isArray() && !records.isEmpty()) {
                    String name = records.get(0).path("commodity").asText("").trim();
                    if (!name.isBlank()) {
                        return name;
                    }
                }
            }
        } catch (Exception ignored) {
            // Fast failure to avoid UI latency
        }
        return null;
    }

    private static String normalize(String value) {
        if (value == null) return "";
        return value.trim().toLowerCase().replaceAll("[^a-zA-Z0-9\u0900-\u097F\u0980-\u09FF]", "");
    }

    private static String cleanCommodity(String value) {
        if (value == null) return "";
        return value.trim().toLowerCase()
                .replaceAll("[?.,!]+", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private static String toTitleCase(String input) {
        if (input == null || input.isBlank()) return input;
        String[] words = input.trim().split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String word : words) {
            if (!word.isEmpty()) {
                sb.append(Character.toUpperCase(word.charAt(0)))
                  .append(word.substring(1).toLowerCase())
                  .append(" ");
            }
        }
        return sb.toString().trim();
    }
}