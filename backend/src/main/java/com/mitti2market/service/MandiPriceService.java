package com.mitti2market.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class MandiPriceService {

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    @Value("${mandi.api.key}")
    private String apiKey;

    @Value("${mandi.api.url}")
    private String apiUrl;

    public MandiPriceService(
            WebClient.Builder webClientBuilder,
            ObjectMapper objectMapper) {

        this.webClient = webClientBuilder.build();
        this.objectMapper = objectMapper;
    }

    /**
     * Search government mandi prices.
     *
     * @param commodity Commodity/crop/fruit/vegetable name
     * @param state Optional state
     * @param district Optional district
     * @param market Optional market/APMC
     */
    public Map<String, Object> searchPrices(
            String commodity,
            String state,
            String district,
            String market) {

        Map<String, Object> result = new HashMap<>();

        try {

            if (commodity == null || commodity.isBlank()) {

                result.put("success", false);
                result.put(
                        "message",
                        "Commodity is required"
                );
                result.put(
                        "prices",
                        List.of()
                );

                return result;
            }

            commodity = commodity.trim();

            /*
             * =====================================================
             * BUILD GOVERNMENT API URL
             * =====================================================
             */

            UriComponentsBuilder builder =
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
                                    100
                            )
                            .queryParam(
                                    "offset",
                                    0
                            )
                            .queryParam(
                                    "filters[commodity]",
                                    commodity
                            );

            URI uri =
                    builder
                            .build()
                            .encode()
                            .toUri();

            System.out.println("=================================");
            System.out.println("GOVERNMENT MANDI API");
            System.out.println("Commodity : " + commodity);
            System.out.println("State     : " + state);
            System.out.println("District  : " + district);
            System.out.println("Market    : " + market);
            System.out.println("=================================");

            /*
             * =====================================================
             * CALL DATA.GOV.IN
             * =====================================================
             */

            String response =
                    webClient
                            .get()
                            .uri(uri)
                            .header(
                                    "Accept",
                                    "application/json"
                            )
                            .retrieve()
                            .bodyToMono(String.class)
                            .block();

            if (response == null
                    || response.isBlank()) {

                result.put(
                        "success",
                        false
                );

                result.put(
                        "message",
                        "Empty response from government mandi API"
                );

                result.put(
                        "prices",
                        List.of()
                );

                return result;
            }

            /*
             * =====================================================
             * PARSE RESPONSE
             * =====================================================
             */

            JsonNode root =
                    objectMapper.readTree(response);

            JsonNode records =
                    root.path("records");

            List<Map<String, Object>> prices =
                    new ArrayList<>();

            if (records.isArray()) {

                for (JsonNode record : records) {

                    /*
                     * =================================================
                     * VERIFY COMMODITY
                     * =================================================
                     */

                    String recordCommodity =
                            record
                                    .path("commodity")
                                    .asText("");

                    if (!commodityMatches(
                            commodity,
                            recordCommodity)) {

                        continue;
                    }

                    /*
                     * =================================================
                     * STATE FILTER
                     * =================================================
                     */

                    if (state != null
                            && !state.isBlank()) {

                        String recordState =
                                record
                                        .path("state")
                                        .asText("");

                        if (!recordState
                                .equalsIgnoreCase(state.trim())) {

                            continue;
                        }
                    }

                    /*
                     * =================================================
                     * DISTRICT FILTER
                     * =================================================
                     */

                    if (district != null
                            && !district.isBlank()) {

                        String recordDistrict =
                                record
                                        .path("district")
                                        .asText("");

                        if (!recordDistrict
                                .equalsIgnoreCase(
                                        district.trim())) {

                            continue;
                        }
                    }

                    /*
                     * =================================================
                     * MARKET FILTER
                     * =================================================
                     */

                    if (market != null
                            && !market.isBlank()) {

                        String recordMarket =
                                record
                                        .path("market")
                                        .asText("");

                        if (!recordMarket
                                .equalsIgnoreCase(
                                        market.trim())) {

                            continue;
                        }
                    }

                    /*
                     * =================================================
                     * CREATE PRICE OBJECT
                     * =================================================
                     */

                    Map<String, Object> price =
                            new HashMap<>();

                    price.put(
                            "state",
                            record
                                    .path("state")
                                    .asText("")
                    );

                    price.put(
                            "district",
                            record
                                    .path("district")
                                    .asText("")
                    );

                    price.put(
                            "market",
                            record
                                    .path("market")
                                    .asText("")
                    );

                    price.put(
                            "commodity",
                            recordCommodity
                    );

                    price.put(
                            "variety",
                            record
                                    .path("variety")
                                    .asText("")
                    );

                    price.put(
                            "grade",
                            record
                                    .path("grade")
                                    .asText("")
                    );

                    price.put(
                            "arrivalDate",
                            record
                                    .path("arrival_date")
                                    .asText("")
                    );

                    price.put(
                            "minPrice",
                            record
                                    .path("min_price")
                                    .asText("")
                    );

                    price.put(
                            "maxPrice",
                            record
                                    .path("max_price")
                                    .asText("")
                    );

                    price.put(
                            "modalPrice",
                            record
                                    .path("modal_price")
                                    .asText("")
                    );

                    prices.add(price);
                }
            }

            /*
             * =====================================================
             * RETURN RESULT
             * =====================================================
             */

            result.put(
                    "success",
                    true
            );

            result.put(
                    "count",
                    prices.size()
            );

            result.put(
                    "prices",
                    prices
            );

            System.out.println(
                    "Mandi records found: "
                            + prices.size()
            );

            return result;

        } catch (Exception e) {

            System.err.println(
                    "================================="
            );

            System.err.println(
                    "MANDI API ERROR"
            );

            System.err.println(
                    e.getMessage()
            );

            System.err.println(
                    "================================="
            );

            e.printStackTrace();

            result.put(
                    "success",
                    false
            );

            result.put(
                    "message",
                    e.getMessage() != null
                            ? e.getMessage()
                            : "Unable to retrieve mandi prices"
            );

            result.put(
                    "prices",
                    List.of()
            );

            return result;
        }
    }

    /**
     * Compare commodity names safely.
     *
     * Example:
     * "tomato" == "Tomato"
     *
     * We deliberately use exact normalized matching here
     * so that an unrelated commodity is never returned.
     */
    private boolean commodityMatches(
            String requested,
            String actual) {

        if (requested == null
                || actual == null) {

            return false;
        }

        String normalizedRequested =
                normalizeCommodity(requested);

        String normalizedActual =
                normalizeCommodity(actual);

        return normalizedRequested
                .equals(normalizedActual);
    }

    /**
     * Normalize commodity names.
     */
    private String normalizeCommodity(
            String value) {

        return value
                .trim()
                .toLowerCase()
                .replaceAll(
                        "\\s+",
                        " "
                );
    }
}