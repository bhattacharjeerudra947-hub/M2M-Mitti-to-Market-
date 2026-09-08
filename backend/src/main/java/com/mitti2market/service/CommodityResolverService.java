package com.mitti2market.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class CommodityResolverService {

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public CommodityResolverService(
            WebClient.Builder webClientBuilder,
            ObjectMapper objectMapper) {

        this.webClient = webClientBuilder.build();
        this.objectMapper = objectMapper;
    }

    @Value("${mandi.api.key}")
    private String apiKey;

    @Value("${mandi.api.url}")
    private String apiUrl;

    /*
     * =========================================================
     * RESOLVE USER COMMODITY
     * =========================================================
     *
     * Example:
     *
     * tomato
     * Tomatoes
     * TOMATO
     *
     * can resolve to the official commodity name:
     *
     * Tomato
     */

    public String resolveCommodity(String userCommodity) {

        if (userCommodity == null
                || userCommodity.isBlank()) {

            return null;
        }

        String cleaned =
                cleanCommodity(userCommodity);

        if (cleaned.isBlank()) {
            return null;
        }

        System.out.println("=================================");
        System.out.println("COMMODITY RESOLVER");
        System.out.println("User commodity : " + userCommodity);
        System.out.println("Cleaned        : " + cleaned);
        System.out.println("=================================");

        /*
         * First try exact government API filtering.
         *
         * This is the fastest and safest path.
         */

        String exact =
                findExactCommodity(cleaned);

        if (exact != null) {
            return exact;
        }

        /*
         * If exact matching fails, load commodity names from
         * the government dataset and perform dynamic matching.
         */

        return findFromGovernmentCatalog(cleaned);
    }

    // =========================================================
    // EXACT GOVERNMENT SEARCH
    // =========================================================

    private String findExactCommodity(
            String commodity) {

        try {

            URI uri =
                    UriComponentsBuilder
                            .fromHttpUrl(apiUrl)
                            .queryParam(
                                    "api-key",
                                    apiKey
                            )
                            .queryParam(
                                    "format",
                                    "json"
                            )
                            .queryParam(
                                    "limit",
                                    10
                            )
                            .queryParam(
                                    "offset",
                                    0
                            )
                            .queryParam(
                                    "filters[commodity]",
                                    commodity
                            )
                            .build()
                            .encode()
                            .toUri();

            String response =
                    webClient
                            .get()
                            .uri(uri)
                            .header(
                                    "Accept",
                                    "application/json"
                            )
                            .retrieve()
                            .bodyToMono(
                                    String.class
                            )
                            .block();

            if (response == null
                    || response.isBlank()) {

                return null;
            }

            JsonNode root =
                    objectMapper.readTree(response);

            JsonNode records =
                    root.path("records");

            if (!records.isArray()
                    || records.isEmpty()) {

                return null;
            }

            for (JsonNode record : records) {

                String commodityName =
                        record
                                .path("commodity")
                                .asText("")
                                .trim();

                if (!commodityName.isBlank()) {

                    System.out.println(
                            "Exact commodity match: "
                                    + commodityName
                    );

                    return commodityName;
                }
            }

        } catch (Exception e) {

            System.err.println(
                    "Exact commodity search error: "
                            + e.getMessage()
            );
        }

        return null;
    }

    // =========================================================
    // DYNAMIC GOVERNMENT CATALOG
    // =========================================================

    private String findFromGovernmentCatalog(
            String userCommodity) {

        try {

            /*
             * The API supports pagination.
             *
             * We retrieve only the commodity field instead of
             * downloading prices, markets and other fields.
             *
             * This keeps the response relatively small.
             */

            Set<String> commodities =
                    new HashSet<>();

            int offset = 0;

            int pageSize = 1000;

            /*
             * Safety limit.
             *
             * We don't want an accidental huge API download.
             */

            int maxRecords = 10000;

            while (offset < maxRecords) {

                URI uri =
                        UriComponentsBuilder
                                .fromHttpUrl(apiUrl)
                                .queryParam(
                                        "api-key",
                                        apiKey
                                )
                                .queryParam(
                                        "format",
                                        "json"
                                )
                                .queryParam(
                                        "limit",
                                        pageSize
                                )
                                .queryParam(
                                        "offset",
                                        offset
                                )
                                .queryParam(
                                        "fields",
                                        "commodity"
                                )
                                .build()
                                .encode()
                                .toUri();

                String response =
                        webClient
                                .get()
                                .uri(uri)
                                .header(
                                        "Accept",
                                        "application/json"
                                )
                                .retrieve()
                                .bodyToMono(
                                        String.class
                                )
                                .block();

                if (response == null
                        || response.isBlank()) {

                    break;
                }

                JsonNode root =
                        objectMapper.readTree(response);

                JsonNode records =
                        root.path("records");

                if (!records.isArray()
                        || records.isEmpty()) {

                    break;
                }

                int recordsReceived = 0;

                for (JsonNode record : records) {

                    String commodity =
                            record
                                    .path("commodity")
                                    .asText("")
                                    .trim();

                    if (!commodity.isBlank()) {

                        commodities.add(
                                commodity
                        );
                    }

                    recordsReceived++;
                }

                /*
                 * If fewer records than the requested page
                 * size were returned, we reached the end.
                 */

                if (recordsReceived < pageSize) {
                    break;
                }

                offset += pageSize;
            }

            System.out.println(
                    "Government commodity catalog size: "
                            + commodities.size()
            );

            return findBestMatch(
                    userCommodity,
                    new ArrayList<>(commodities)
            );

        } catch (Exception e) {

            System.err.println(
                    "Dynamic commodity catalog error: "
                            + e.getMessage()
            );

            return null;
        }
    }

    // =========================================================
    // DYNAMIC MATCHING
    // =========================================================

    private String findBestMatch(
            String userCommodity,
            List<String> commodities) {

        if (commodities.isEmpty()) {
            return null;
        }

        String input =
                normalize(userCommodity);

        /*
         * -----------------------------------------------------
         * 1. Exact normalized match
         * -----------------------------------------------------
         */

        for (String commodity : commodities) {

            if (normalize(commodity)
                    .equals(input)) {

                System.out.println(
                        "Dynamic exact match: "
                                + commodity
                );

                return commodity;
            }
        }

        /*
         * -----------------------------------------------------
         * 2. Singular/plural matching
         * -----------------------------------------------------
         */

        String singular =
                singularize(input);

        for (String commodity : commodities) {

            String normalized =
                    normalize(commodity);

            if (normalized.equals(singular)) {

                System.out.println(
                        "Dynamic singular match: "
                                + commodity
                );

                return commodity;
            }
        }

        /*
         * -----------------------------------------------------
         * 3. Containment matching
         * -----------------------------------------------------
         *
         * Example:
         *
         * user:
         * "dragon fruit"
         *
         * government:
         * "Dragon Fruit"
         */

        List<String> candidates =
                new ArrayList<>();

        for (String commodity : commodities) {

            String normalized =
                    normalize(commodity);

            if (normalized.contains(input)
                    || input.contains(normalized)) {

                candidates.add(commodity);
            }
        }

        if (!candidates.isEmpty()) {

            candidates.sort(
                    Comparator.comparingInt(
                            value ->
                                    normalize(value)
                                            .length()
                    )
            );

            String result =
                    candidates.get(0);

            System.out.println(
                    "Dynamic containment match: "
                            + result
            );

            return result;
        }

        /*
         * -----------------------------------------------------
         * 4. Token matching
         * -----------------------------------------------------
         */

        String[] inputTokens =
                input.split("\\s+");

        String bestMatch = null;

        int bestScore = 0;

        for (String commodity : commodities) {

            String normalized =
                    normalize(commodity);

            String[] tokens =
                    normalized.split("\\s+");

            int score = 0;

            for (String inputToken : inputTokens) {

                for (String token : tokens) {

                    if (token.equals(inputToken)) {
                        score++;
                    }
                }
            }

            if (score > bestScore) {

                bestScore = score;

                bestMatch = commodity;
            }
        }

        /*
         * Require at least one meaningful token.
         */

        if (bestScore > 0) {

            System.out.println(
                    "Dynamic token match: "
                            + bestMatch
            );

            return bestMatch;
        }

        return null;
    }

    // =========================================================
    // NORMALIZATION
    // =========================================================

    private String normalize(String value) {

        if (value == null) {
            return "";
        }

        String result =
                value
                        .trim()
                        .toLowerCase();

        result =
                result.replaceAll(
                        "[^a-z0-9\\s]",
                        " "
                );

        result =
                result.replaceAll(
                        "\\s+",
                        " "
                )
                .trim();

        return result;
    }

    // =========================================================
    // SINGULARIZATION
    // =========================================================

    private String singularize(
            String value) {

        if (value == null
                || value.isBlank()) {

            return value;
        }

        if (value.endsWith("ies")
                && value.length() > 4) {

            return value.substring(
                    0,
                    value.length() - 3
            ) + "y";
        }

        if (value.endsWith("es")
                && value.length() > 4) {

            return value.substring(
                    0,
                    value.length() - 2
            );
        }

        if (value.endsWith("s")
                && value.length() > 3) {

            return value.substring(
                    0,
                    value.length() - 1
            );
        }

        return value;
    }

    // =========================================================
    // CLEAN USER INPUT
    // =========================================================

    private String cleanCommodity(
            String value) {

        String result =
                value
                        .trim()
                        .toLowerCase();

        result =
                result.replaceAll(
                        "[?.,!]+",
                        " "
                );

        result =
                result.replaceAll(
                        "\\s+",
                        " "
                )
                .trim();

        return result;
    }

    // =========================================================
    // PUBLIC VARIATION SUPPORT
    // =========================================================

    public String resolveWithVariations(
            String userCommodity) {

        if (userCommodity == null
                || userCommodity.isBlank()) {

            return null;
        }

        return resolveCommodity(
                userCommodity
        );
    }
}