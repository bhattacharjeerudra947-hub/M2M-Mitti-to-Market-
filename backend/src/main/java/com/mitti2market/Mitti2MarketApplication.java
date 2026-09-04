package com.mitti2market;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class Mitti2MarketApplication {

    public static void main(String[] args) {
        // Load .env file into system properties BEFORE Spring starts
        // This ensures @Value("${...}") can resolve .env variables
        try {
            Dotenv dotenv = Dotenv.configure()
                    .directory(".")  // look in working directory (backend/)
                    .ignoreIfMissing()
                    .load();
            dotenv.entries().forEach(entry -> {
                if (System.getenv(entry.getKey()) == null) {
                    System.setProperty(entry.getKey(), entry.getValue());
                }
            });
            System.out.println("[Dotenv] Loaded " + dotenv.entries().size() + " variables from .env");
        } catch (Exception e) {
            System.out.println("[Dotenv] .env not found: " + e.getMessage());
        }

        SpringApplication.run(Mitti2MarketApplication.class, args);
    }
}
