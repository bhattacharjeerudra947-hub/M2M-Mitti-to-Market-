package com.mitti2market.config;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.util.HashMap;
import java.util.Map;

/**
 * Loads .env file into Spring environment properties.
 * Runs BEFORE @Value annotations are resolved, so all env vars are available.
 *
 * Priority: System env vars > .env values (existing env vars are NOT overwritten).
 */
public class DotenvLoader implements EnvironmentPostProcessor {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        try {
            Dotenv dotenv = Dotenv.configure()
                    .ignoreIfMissing()
                    .load();

            Map<String, Object> dotenvMap = new HashMap<>();
            dotenv.entries().forEach(entry ->
                    dotenvMap.put(entry.getKey(), entry.getValue())
            );

            // Only add properties that aren't already set as system/env vars
            // This means system env vars take priority over .env
            Map<String, Object> filtered = new HashMap<>();
            for (Map.Entry<String, Object> entry : dotenvMap.entrySet()) {
                if (System.getenv(entry.getKey()) == null
                        && System.getProperty(entry.getKey()) == null) {
                    filtered.put(entry.getKey(), entry.getValue());
                }
            }

            if (!filtered.isEmpty()) {
                environment.getPropertySources()
                        .addLast(new MapPropertySource("dotenv", filtered));
                System.out.println("[DotenvLoader] Loaded " + filtered.size() + " properties from .env");
            }
        } catch (Exception e) {
            System.out.println("[DotenvLoader] .env file not found or failed to load: " + e.getMessage());
        }
    }
}
