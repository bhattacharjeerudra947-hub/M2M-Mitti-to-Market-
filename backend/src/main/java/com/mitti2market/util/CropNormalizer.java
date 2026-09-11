package com.mitti2market.util;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

public class CropNormalizer {

    private static final Map<String, String> CROP_SYNONYMS = new HashMap<>();

    static {
        // Wheat / Gehu
        addSynonym("wheat", "wheat");
        addSynonym("gehu", "wheat");
        addSynonym("gehun", "wheat");
        addSynonym("kanak", "wheat");

        // Rice / Chawal / Paddy / Dhan
        addSynonym("rice", "rice");
        addSynonym("chawal", "rice");
        addSynonym("paddy", "rice");
        addSynonym("dhan", "rice");
        addSynonym("basmati", "rice");

        // Potato / Aloo
        addSynonym("potato", "potato");
        addSynonym("potatoes", "potato");
        addSynonym("aloo", "potato");
        addSynonym("alu", "potato");

        // Onion / Pyaz
        addSynonym("onion", "onion");
        addSynonym("onions", "onion");
        addSynonym("pyaz", "onion");
        addSynonym("pyaaz", "onion");
        addSynonym("kanda", "onion");

        // Tomato / Tamatar
        addSynonym("tomato", "tomato");
        addSynonym("tomatoes", "tomato");
        addSynonym("tamatar", "tomato");

        // Maize / Corn / Makka
        addSynonym("maize", "corn");
        addSynonym("corn", "corn");
        addSynonym("makka", "corn");
        addSynonym("makki", "corn");
        addSynonym("bhutta", "corn");

        // Cotton / Kapas
        addSynonym("cotton", "cotton");
        addSynonym("kapas", "cotton");

        // Sugarcane / Ganna
        addSynonym("sugarcane", "sugarcane");
        addSynonym("sugar cane", "sugarcane");
        addSynonym("ganna", "sugarcane");

        // Pulses / Dal / Gram / Chana
        addSynonym("chana", "chana");
        addSynonym("gram", "chana");
        addSynonym("chickpea", "chana");
        addSynonym("chickpeas", "chana");
        addSynonym("moong", "moong");
        addSynonym("mung", "moong");
        addSynonym("urad", "urad");
        addSynonym("toor", "toor");
        addSynonym("tur", "toor");
        addSynonym("arhar", "toor");

        // Soybean / Soyabean
        addSynonym("soybean", "soybean");
        addSynonym("soyabean", "soybean");
        addSynonym("soya", "soybean");

        // Mustard / Sarson
        addSynonym("mustard", "mustard");
        addSynonym("sarson", "mustard");
        addSynonym("rai", "mustard");

        // Garlic / Lehsun
        addSynonym("garlic", "garlic");
        addSynonym("lehsun", "garlic");
        addSynonym("lahsun", "garlic");

        // Ginger / Adrak
        addSynonym("ginger", "ginger");
        addSynonym("adrak", "ginger");

        // Chilli / Mirch
        addSynonym("chilli", "chilli");
        addSynonym("chili", "chilli");
        addSynonym("chillies", "chilli");
        addSynonym("mirch", "chilli");
        addSynonym("mirchi", "chilli");
    }

    private static void addSynonym(String key, String canonical) {
        CROP_SYNONYMS.put(key.toLowerCase(Locale.ROOT).trim(), canonical);
    }

    /**
     * Normalizes a crop name by trimming, lowercasing, stripping punctuation,
     * and mapping known Indian agricultural synonyms (e.g. Gehu -> wheat, Aloo -> potato).
     */
    public static String normalize(String cropName) {
        if (cropName == null) {
            return "";
        }
        String cleaned = cropName.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-zA-Z0-9\\s]", " ")
                .replaceAll("\\s+", " ")
                .trim();

        if (cleaned.isEmpty()) {
            return "";
        }

        // Direct synonym match
        if (CROP_SYNONYMS.containsKey(cleaned)) {
            return CROP_SYNONYMS.get(cleaned);
        }

        // Check if any word in the crop name is a known synonym
        String[] words = cleaned.split(" ");
        for (String word : words) {
            if (CROP_SYNONYMS.containsKey(word)) {
                return CROP_SYNONYMS.get(word);
            }
        }

        return cleaned;
    }

    /**
     * Checks if two crop names refer to the same crop.
     */
    public static boolean matches(String crop1, String crop2) {
        if (crop1 == null || crop2 == null) {
            return false;
        }
        String norm1 = normalize(crop1);
        String norm2 = normalize(crop2);
        if (norm1.isEmpty() || norm2.isEmpty()) {
            return false;
        }
        return norm1.equals(norm2) || norm1.contains(norm2) || norm2.contains(norm1);
    }
}
