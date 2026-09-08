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

@Service
public class MarketPriceService {

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    @Value("${mandi.api.key}")
    private String apiKey;

    @Value("${mandi.api.url}")
    private String apiUrl;

    public MarketPriceService(
            WebClient.Builder webClientBuilder,
            ObjectMapper objectMapper) {

        this.webClient = webClientBuilder.build();
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> searchPrices(
            String commodity,
            String state,
            String district,
            String market) {

        Map<String, Object> result = new HashMap<>();

        try {

            String response = webClient
                    .get()
                    .uri(uriBuilder -> {

                        var builder = uriBuilder
                                .path(apiUrl)
                                .queryParam("api-key", apiKey)
                                .queryParam("format", "json")
                                .queryParam("limit", 20);

                        if (commodity != null && !commodity.isBlank()) {
                            builder.queryParam(
                                    "filters[commodity]",
                                    commodity
                            );
                        }

                        if (state != null && !state.isBlank()) {
                            builder.queryParam(
                                    "filters[state.keyword]",
                                    state
                            );
                        }

                        if (district != null && !district.isBlank()) {
                            builder.queryParam(
                                    "filters[district]",
                                    district
                            );
                        }

                        if (market != null && !market.isBlank()) {
                            builder.queryParam(
                                    "filters[market]",
                                    market
                            );
                        }

                        return builder.build();
                    })
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            JsonNode root = objectMapper.readTree(response);

            JsonNode records = root.path("records");

            List<Map<String, Object>> prices = new ArrayList<>();

            if (records.isArray()) {

                for (JsonNode record : records) {

                    Map<String, Object> price = new HashMap<>();

                    price.put(
                            "state",
                            record.path("state").asText("")
                    );

                    price.put(
                            "district",
                            record.path("district").asText("")
                    );

                    price.put(
                            "market",
                            record.path("market").asText("")
                    );

                    price.put(
                            "commodity",
                            record.path("commodity").asText("")
                    );

                    price.put(
                            "variety",
                            record.path("variety").asText("")
                    );

                    price.put(
                            "grade",
                            record.path("grade").asText("")
                    );

                    price.put(
                            "arrivalDate",
                            record.path("arrival_date").asText("")
                    );

                    price.put(
                            "minPrice",
                            record.path("min_price").asText("")
                    );

                    price.put(
                            "maxPrice",
                            record.path("max_price").asText("")
                    );

                    price.put(
                            "modalPrice",
                            record.path("modal_price").asText("")
                    );

                    prices.add(price);
                }
            }

            result.put("success", true);
            result.put("count", prices.size());
            result.put("prices", prices);

            return result;

        } catch (Exception e) {

            e.printStackTrace();

            result.put("success", false);
            result.put(
                    "message",
                    "Unable to retrieve mandi prices"
            );
            result.put("prices", List.of());

            return result;
        }
    }
}