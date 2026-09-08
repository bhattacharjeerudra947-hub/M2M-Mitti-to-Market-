package com.mitti2market.config;

import com.mitti2market.model.BuyerInterest;
import com.mitti2market.model.Produce;
import com.mitti2market.model.Produce.ProduceStatus;
import com.mitti2market.model.User;
import com.mitti2market.model.User.Role;
import com.mitti2market.repository.BuyerInterestRepository;
import com.mitti2market.repository.ProduceRepository;
import com.mitti2market.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@Profile("dev")
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ProduceRepository produceRepository;
    private final BuyerInterestRepository interestRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        String hashed = passwordEncoder.encode("password123");

        // ─── ALWAYS ensure the platform admin account exists ───
        // (DB may already contain users from before the admin role was added;
        //  the demo-data block below still only runs on a fresh database.)
        if (userRepository.findByEmail("admin@mitti2market.com").isEmpty()) {
            userRepository.save(User.builder()
                    .name("System Admin")
                    .email("admin@mitti2market.com")
                    .passwordHash(hashed)
                    .phone("9999999999")
                    .role(Role.ADMIN)
                    .location("HQ - New Delhi")
                    .organizationName("Mitti2Market Admin Operations")
                    .verified(true)
                    .verificationStatus(User.VerificationStatus.VERIFIED)
                    .build());
            log.info("Created platform admin account: admin@mitti2market.com");
        }

        if (userRepository.count() > 1) {
            log.info("Demo data already present — skipping seed.");
            return;
        }

        log.info("Seeding demo data...");

        User admin = userRepository.findByEmail("admin@mitti2market.com").orElseThrow();

        User farmer1 = userRepository.save(User.builder()
                .name("Ramesh Kumar")
                .email("ramesh@farmer.com")
                .passwordHash(hashed)
                .phone("9876543210")
                .role(Role.FARMER)
                .location("Pune, Maharashtra")
                .organizationName("Kisan FPO Pune")
                .build());

        User farmer2 = userRepository.save(User.builder()
                .name("Sunita Devi")
                .email("sunita@farmer.com")
                .passwordHash(hashed)
                .phone("9876543211")
                .role(Role.FARMER)
                .location("Nashik, Maharashtra")
                .organizationName("Devi Farm Collective")
                .build());

        User business1 = userRepository.save(User.builder()
                .name("FreshMart Procurement")
                .email("procurement@freshmart.com")
                .passwordHash(hashed)
                .phone("9876543220")
                .role(Role.BUSINESS)
                .location("Mumbai, Maharashtra")
                .organizationName("FreshMart Pvt Ltd")
                .verified(true)
                .rating(4.2)
                .build());

        User business2 = userRepository.save(User.builder()
                .name("CityFresh Foods")
                .email("purchase@cityfresh.com")
                .passwordHash(hashed)
                .phone("9876543221")
                .role(Role.BUSINESS)
                .location("Pune, Maharashtra")
                .organizationName("CityFresh Foods Pvt Ltd")
                .verified(true)
                .rating(4.6)
                .build());

        User business3 = userRepository.save(User.builder()
                .name("GreenBasket Retail")
                .email("buying@greenbasket.com")
                .passwordHash(hashed)
                .phone("9876543222")
                .role(Role.BUSINESS)
                .location("Nashik, Maharashtra")
                .organizationName("GreenBasket Retail Chain")
                .verified(false)
                .rating(3.4)
                .build());

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

        // ─── Demo listing for AI Deal Advisor ─────────────────────────
        // 3 buyers make different offers on the SAME produce.
        // FreshMart offers the HIGHEST price but is far (Mumbai, 150 km).
        // CityFresh offers less but is close (Pune, ~10 km).
        // This demonstrates: HIGHEST OFFER ≠ HIGHEST NET REALIZATION.
        Produce tomato = produceRepository.save(Produce.builder()
                .farmer(farmer1)
                .name("Tomato")
                .category("Vegetables")
                .quantity(2000)
                .unit("kg")
                .pricePerUnit(25.0)
                .description("Fresh farm tomatoes, Grade A, harvest-ready")
                .location("Pune, Maharashtra")
                .imageUrl("https://example.com/tomato.jpg")
                .status(ProduceStatus.AVAILABLE)
                .aiSuggestedMinPrice(22.5)
                .aiSuggestedMaxPrice(27.5)
                .build());

        // Highest quoted price (₹29) but far away — higher logistics cost
        interestRepository.save(BuyerInterest.builder()
                .buyer(business1)
                .farmer(farmer1)
                .produce(tomato)
                .offeredPrice(29.0)
                .offeredQuantity(2000)
                .message("We can take full quantity at ₹29/kg")
                .status(BuyerInterest.InterestStatus.PENDING)
                .build());

        // Lower price (₹27) but very close — best estimated net realization
        interestRepository.save(BuyerInterest.builder()
                .buyer(business2)
                .farmer(farmer1)
                .produce(tomato)
                .offeredPrice(27.0)
                .offeredQuantity(1500)
                .message("Pune pickup, ₹27/kg for 1500 kg")
                .status(BuyerInterest.InterestStatus.PENDING)
                .build());

        // Mid price (₹28) but far (Nashik, 210 km)
        interestRepository.save(BuyerInterest.builder()
                .buyer(business3)
                .farmer(farmer1)
                .produce(tomato)
                .offeredPrice(28.0)
                .offeredQuantity(1000)
                .message("Interested in 1000 kg at ₹28/kg")
                .status(BuyerInterest.InterestStatus.PENDING)
                .build());

        log.info("Demo data seeded: 2 farmers, 3 buyers, 7 produce listings, 3 buyer offers for AI Deal Advisor.");
    }
}
