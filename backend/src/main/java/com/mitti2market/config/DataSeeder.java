package com.mitti2market.config;

import com.mitti2market.model.Produce;
import com.mitti2market.model.Produce.ProduceStatus;
import com.mitti2market.model.User;
import com.mitti2market.model.User.Role;
import com.mitti2market.repository.ProduceRepository;
import com.mitti2market.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Seeds demo data in the dev profile only.
 * Guards with count() > 0 to prevent duplication on restart.
 * Must never run against production.
 */
@Slf4j
@Component
@Profile("dev")
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ProduceRepository produceRepository;

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) {
            log.info("Demo data already present — skipping seed.");
            return;
        }

        log.info("Seeding demo data for dev profile...");

        // --- Farmers ---
        User farmer1 = userRepository.save(User.builder()
                .name("Ramesh Kumar")
                .email("ramesh@farmer.com")
                .password("password123")
                .phone("9876543210")
                .role(Role.FARMER)
                .location("Pune, Maharashtra")
                .organizationName("Kisan FPO Pune")
                .build());

        User farmer2 = userRepository.save(User.builder()
                .name("Sunita Devi")
                .email("sunita@farmer.com")
                .password("password123")
                .phone("9876543211")
                .role(Role.FARMER)
                .location("Nashik, Maharashtra")
                .organizationName("Devi Farm Collective")
                .build());

        // --- Business Buyer ---
        User business1 = userRepository.save(User.builder()
                .name("FreshMart Procurement")
                .email("procurement@freshmart.com")
                .password("password123")
                .phone("9876543220")
                .role(Role.BUSINESS)
                .location("Mumbai, Maharashtra")
                .organizationName("FreshMart Pvt Ltd")
                .build());

        // --- Produce Listings ---
        produceRepository.save(Produce.builder()
                .farmer(farmer1)
                .name("Alphonso Mango")
                .category("Fruits")
                .quantity(500)
                .unit("kg")
                .pricePerUnit(120.0)
                .description("Fresh Ratnagiri Alphonso mangoes, Grade A")
                .location("Pune, Maharashtra")
                .imageUrl("https://example.com/alphonso.jpg")
                .status(ProduceStatus.AVAILABLE)
                .aiSuggestedMinPrice(108.0)
                .aiSuggestedMaxPrice(132.0)
                .build());

        produceRepository.save(Produce.builder()
                .farmer(farmer1)
                .name("Red Onion")
                .category("Vegetables")
                .quantity(2000)
                .unit("kg")
                .pricePerUnit(25.0)
                .description("Nashik red onions, freshly harvested")
                .location("Pune, Maharashtra")
                .imageUrl("https://example.com/onion.jpg")
                .status(ProduceStatus.AVAILABLE)
                .aiSuggestedMinPrice(22.5)
                .aiSuggestedMaxPrice(27.5)
                .build());

        produceRepository.save(Produce.builder()
                .farmer(farmer1)
                .name("Turmeric Powder")
                .category("Spices")
                .quantity(100)
                .unit("kg")
                .pricePerUnit(180.0)
                .description("Organic turmeric, high curcumin content")
                .location("Pune, Maharashtra")
                .imageUrl("https://example.com/turmeric.jpg")
                .status(ProduceStatus.AVAILABLE)
                .aiSuggestedMinPrice(162.0)
                .aiSuggestedMaxPrice(198.0)
                .build());

        produceRepository.save(Produce.builder()
                .farmer(farmer2)
                .name("Thompson Seedless Grapes")
                .category("Fruits")
                .quantity(800)
                .unit("kg")
                .pricePerUnit(60.0)
                .description("Nashik valley grapes, export quality")
                .location("Nashik, Maharashtra")
                .imageUrl("https://example.com/grapes.jpg")
                .status(ProduceStatus.LOW_STOCK)
                .aiSuggestedMinPrice(54.0)
                .aiSuggestedMaxPrice(66.0)
                .build());

        produceRepository.save(Produce.builder()
                .farmer(farmer2)
                .name("Green Chilli")
                .category("Vegetables")
                .quantity(300)
                .unit("kg")
                .pricePerUnit(40.0)
                .description("Fresh green chillies, medium hot")
                .location("Nashik, Maharashtra")
                .imageUrl("https://example.com/chilli.jpg")
                .status(ProduceStatus.AVAILABLE)
                .aiSuggestedMinPrice(36.0)
                .aiSuggestedMaxPrice(44.0)
                .build());

        produceRepository.save(Produce.builder()
                .farmer(farmer2)
                .name("Jowar (Sorghum)")
                .category("Grains")
                .quantity(1500)
                .unit("kg")
                .pricePerUnit(32.0)
                .description("Premium jowar grain, pesticide-free")
                .location("Nashik, Maharashtra")
                .imageUrl("https://example.com/jowar.jpg")
                .status(ProduceStatus.AVAILABLE)
                .aiSuggestedMinPrice(28.8)
                .aiSuggestedMaxPrice(35.2)
                .build());

        log.info("Demo data seeded: 2 farmers, 1 business, 6 produce listings.");
    }
}
