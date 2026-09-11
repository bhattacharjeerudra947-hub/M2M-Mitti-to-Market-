
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

        log.info("==============================================");
        log.info("Starting Mitti2Market development data seeder");
        log.info("==============================================");

        String hashedPassword = passwordEncoder.encode("password123");

        /*
         * IMPORTANT:
         *
         * This seeder NEVER deletes users.
         *
         * Earlier implementation deleted every user except a few demo accounts.
         * That caused MySQL foreign-key errors because tables such as notifications,
         * orders, messages, appeals, documents, etc. can reference users.
         *
         * The new implementation is idempotent:
         *
         *     User exists     -> reuse existing user
         *     User missing    -> create user
         *
         * The same approach is used for demo produce and buyer interests.
         */

        // ============================================================
        // 1. ADMIN
        // ============================================================

        User admin = getOrCreateUser(
                "admin@mitti2market.com",
                () -> User.builder()
                        .name("System Admin")
                        .email("admin@mitti2market.com")
                        .passwordHash(hashedPassword)
                        .phone("9999999999")
                        .role(Role.ADMIN)
                        .location("HQ - New Delhi")
                        .organizationName("Mitti2Market Admin Operations")
                        .verified(true)
                        .verificationStatus(User.VerificationStatus.VERIFIED)
                        .build()
        );

        // ============================================================
        // 2. FARMERS (4 Realistic Indian Names: 2 Male, 2 Female)
        // ============================================================

        // Male Farmer 1: Ramesh Kumar
        User farmer1 = getOrCreateUser(
                "ramesh@farmer.com",
                () -> User.builder()
                        .name("Ramesh Kumar")
                        .email("ramesh@farmer.com")
                        .passwordHash(hashedPassword)
                        .phone("9876543210")
                        .role(Role.FARMER)
                        .location("Pune, Maharashtra")
                        .organizationName("Kisan FPO Pune")
                        .verified(true)
                        .verificationStatus(User.VerificationStatus.VERIFIED)
                        .build()
        );

        // Female Farmer 1: Sunita Devi
        User farmer2 = getOrCreateUser(
                "sunita@farmer.com",
                () -> User.builder()
                        .name("Sunita Devi")
                        .email("sunita@farmer.com")
                        .passwordHash(hashedPassword)
                        .phone("9876543211")
                        .role(Role.FARMER)
                        .location("Nashik, Maharashtra")
                        .organizationName("Devi Farm Collective")
                        .verified(true)
                        .verificationStatus(User.VerificationStatus.VERIFIED)
                        .build()
        );

        // Male Farmer 2: Balwinder Singh
        User farmer3 = getOrCreateUser(
                "balwinder@farmer.com",
                () -> User.builder()
                        .name("Balwinder Singh")
                        .email("balwinder@farmer.com")
                        .passwordHash(hashedPassword)
                        .phone("9876543212")
                        .role(Role.FARMER)
                        .location("Ludhiana, Punjab")
                        .organizationName("Punjab Agro Farmers Producer Co.")
                        .verified(true)
                        .verificationStatus(User.VerificationStatus.VERIFIED)
                        .build()
        );

        // Female Farmer 2: Anusuiya Patel
        User farmer4 = getOrCreateUser(
                "anusuiya@farmer.com",
                () -> User.builder()
                        .name("Anusuiya Patel")
                        .email("anusuiya@farmer.com")
                        .passwordHash(hashedPassword)
                        .phone("9876543213")
                        .role(Role.FARMER)
                        .location("Anand, Gujarat")
                        .organizationName("Amrut Krishi FPO")
                        .verified(true)
                        .verificationStatus(User.VerificationStatus.VERIFIED)
                        .build()
        );

        // ============================================================
        // 3. BUSINESSES (4 Realistic Business Accounts)
        // ============================================================

        // Business 1: FreshMart Agro Procurement Pvt Ltd
        User business1 = getOrCreateUser(
                "procurement@freshmart.com",
                () -> User.builder()
                        .name("FreshMart Agro Procurement")
                        .email("procurement@freshmart.com")
                        .passwordHash(hashedPassword)
                        .phone("9876543220")
                        .role(Role.BUSINESS)
                        .location("Mumbai, Maharashtra")
                        .organizationName("FreshMart Agro Procurement Pvt Ltd")
                        .verified(true)
                        .verificationStatus(User.VerificationStatus.VERIFIED)
                        .rating(4.5)
                        .build()
        );

        // Business 2: Reliance Fresh Retail Ltd
        User business2 = getOrCreateUser(
                "purchase@reliancefresh.com",
                () -> User.builder()
                        .name("Reliance Fresh Sourcing")
                        .email("purchase@reliancefresh.com")
                        .passwordHash(hashedPassword)
                        .phone("9876543221")
                        .role(Role.BUSINESS)
                        .location("Navi Mumbai, Maharashtra")
                        .organizationName("Reliance Retail Agri Supply Ltd")
                        .verified(true)
                        .verificationStatus(User.VerificationStatus.VERIFIED)
                        .rating(4.8)
                        .build()
        );

        // Business 3: BigBasket Wholesale India
        User business3 = getOrCreateUser(
                "sourcing@bigbasket.com",
                () -> User.builder()
                        .name("BigBasket Farmer Connect")
                        .email("sourcing@bigbasket.com")
                        .passwordHash(hashedPassword)
                        .phone("9876543222")
                        .role(Role.BUSINESS)
                        .location("Bengaluru, Karnataka")
                        .organizationName("Supermarket Grocery Supplies Pvt Ltd (BigBasket)")
                        .verified(true)
                        .verificationStatus(User.VerificationStatus.VERIFIED)
                        .rating(4.7)
                        .build()
        );

        // Business 4: ITC Choupal Fresh Ltd
        User business4 = getOrCreateUser(
                "procure@itcchoupal.com",
                () -> User.builder()
                        .name("ITC e-Choupal Procurement")
                        .email("procure@itcchoupal.com")
                        .passwordHash(hashedPassword)
                        .phone("9876543223")
                        .role(Role.BUSINESS)
                        .location("Indore, Madhya Pradesh")
                        .organizationName("ITC Limited - Agri Business Division")
                        .verified(true)
                        .verificationStatus(User.VerificationStatus.VERIFIED)
                        .rating(4.9)
                        .build()
        );

        // ============================================================
        // 4. DEMO PRODUCE
        // ============================================================

        // Farmer 1 (Ramesh Kumar - Pune) Produce
        createProduceIfMissing(
                farmer1,
                "Alphonso Mango",
                "Fruits",
                500,
                "kg",
                120.0,
                "Fresh Ratnagiri Alphonso mangoes, Grade A",
                "Pune, Maharashtra",
                "https://example.com/alphonso.jpg",
                ProduceStatus.AVAILABLE,
                108.0,
                132.0
        );

        createProduceIfMissing(
                farmer1,
                "Red Onion",
                "Vegetables",
                2000,
                "kg",
                25.0,
                "Nashik red onions, freshly harvested",
                "Pune, Maharashtra",
                "https://example.com/onion.jpg",
                ProduceStatus.AVAILABLE,
                22.5,
                27.5
        );

        createProduceIfMissing(
                farmer1,
                "Turmeric Powder",
                "Spices",
                100,
                "kg",
                180.0,
                "Organic turmeric, high curcumin content",
                "Pune, Maharashtra",
                "https://example.com/turmeric.jpg",
                ProduceStatus.AVAILABLE,
                162.0,
                198.0
        );

        // Farmer 2 (Sunita Devi - Nashik) Produce
        createProduceIfMissing(
                farmer2,
                "Thompson Seedless Grapes",
                "Fruits",
                800,
                "kg",
                60.0,
                "Nashik valley grapes, export quality",
                "Nashik, Maharashtra",
                "https://example.com/grapes.jpg",
                ProduceStatus.LOW_STOCK,
                54.0,
                66.0
        );

        createProduceIfMissing(
                farmer2,
                "Green Chilli",
                "Vegetables",
                300,
                "kg",
                40.0,
                "Fresh green chillies, medium hot",
                "Nashik, Maharashtra",
                "https://example.com/chilli.jpg",
                ProduceStatus.AVAILABLE,
                36.0,
                44.0
        );

        createProduceIfMissing(
                farmer2,
                "Jowar (Sorghum)",
                "Grains",
                1500,
                "kg",
                32.0,
                "Premium jowar grain, pesticide-free",
                "Nashik, Maharashtra",
                "https://example.com/jowar.jpg",
                ProduceStatus.AVAILABLE,
                28.8,
                35.2
        );

        // Farmer 3 (Balwinder Singh - Ludhiana, Punjab) Produce
        createProduceIfMissing(
                farmer3,
                "Sharbati Wheat",
                "Grains",
                3000,
                "kg",
                28.0,
                "Golden grain premium Sharbati wheat, harvest freshly bagged",
                "Ludhiana, Punjab",
                "https://example.com/wheat.jpg",
                ProduceStatus.AVAILABLE,
                26.0,
                31.0
        );

        createProduceIfMissing(
                farmer3,
                "Basmati Rice 1121",
                "Grains",
                2500,
                "kg",
                85.0,
                "Aromatic extra long grain Basmati 1121 steam paddy",
                "Ludhiana, Punjab",
                "https://example.com/basmati.jpg",
                ProduceStatus.AVAILABLE,
                80.0,
                92.0
        );

        // Farmer 4 (Anusuiya Patel - Anand, Gujarat) Produce
        createProduceIfMissing(
                farmer4,
                "Castor Seeds",
                "Oilseeds",
                1200,
                "kg",
                62.0,
                "High oil-content Grade-A castor seeds",
                "Anand, Gujarat",
                "https://example.com/castor.jpg",
                ProduceStatus.AVAILABLE,
                58.0,
                66.0
        );

        createProduceIfMissing(
                farmer4,
                "Cumin Seeds (Jeera)",
                "Spices",
                600,
                "kg",
                240.0,
                "Cleaned, machine-sorted Gujarat export cumin seed",
                "Anand, Gujarat",
                "https://example.com/cumin.jpg",
                ProduceStatus.AVAILABLE,
                225.0,
                260.0
        );

        // ============================================================
        // 5. TOMATO DEMO LISTING FOR AI DEAL ADVISOR
        // ============================================================

        Produce tomato = getOrCreateProduce(
                farmer1,
                "Tomato",
                () -> Produce.builder()
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
                        .build()
        );

        // ============================================================
        // 6. BUYER OFFERS FOR TOMATO
        // ============================================================

        createInterestIfMissing(
                business1,
                farmer1,
                tomato,
                29.0,
                2000,
                "FreshMart can take full quantity at ₹29/kg with Mumbai warehouse delivery."
        );

        createInterestIfMissing(
                business2,
                farmer1,
                tomato,
                27.0,
                1500,
                "Reliance Fresh Pune hub pickup, ₹27/kg for 1500 kg instant payment."
        );

        createInterestIfMissing(
                business3,
                farmer1,
                tomato,
                28.0,
                1000,
                "BigBasket sourcing 1000 kg Grade A sorting at ₹28/kg."
        );

        createInterestIfMissing(
                business4,
                farmer1,
                tomato,
                28.5,
                1200,
                "ITC Choupal direct procurement at ₹28.5/kg for 1200 kg."
        );

        log.info("==============================================");
        log.info("Mitti2Market development data seeding complete");
        log.info("Admin     : admin@mitti2market.com");
        log.info("Farmers   : Ramesh Kumar, Sunita Devi, Balwinder Singh, Anusuiya Patel");
        log.info("Businesses: FreshMart, Reliance Fresh, BigBasket, ITC e-Choupal");
        log.info("All passwords: password123");
        log.info("==============================================");
    }

    // ================================================================
    // USER HELPER
    // ================================================================

    private User getOrCreateUser(
            String email,
            java.util.function.Supplier<User> userSupplier) {

        return userRepository.findByEmail(email)
                .orElseGet(() -> {
                    User user = userSupplier.get();
                    User savedUser = userRepository.save(user);

                    log.info("Created demo user: {}", email);

                    return savedUser;
                });
    }

    // ================================================================
    // PRODUCE HELPER
    // ================================================================

    private Produce getOrCreateProduce(
            User farmer,
            String produceName,
            java.util.function.Supplier<Produce> produceSupplier) {

        return produceRepository.findAll()
                .stream()
                .filter(produce -> produce.getFarmer() != null)
                .filter(produce -> produce.getFarmer().getId() != null)
                .filter(produce -> farmer.getId() != null)
                .filter(produce -> produce.getFarmer().getId().equals(farmer.getId()))
                .filter(produce -> produce.getName() != null)
                .filter(produce -> produce.getName().equalsIgnoreCase(produceName))
                .findFirst()
                .orElseGet(() -> {
                    Produce produce = produceSupplier.get();
                    Produce savedProduce = produceRepository.save(produce);

                    log.info(
                            "Created demo produce: {} for {}",
                            produceName,
                            farmer.getEmail()
                    );

                    return savedProduce;
                });
    }

    // ================================================================
    // NORMAL PRODUCE HELPER
    // ================================================================

    private void createProduceIfMissing(
            User farmer,
            String name,
            String category,
            Integer quantity,
            String unit,
            double pricePerUnit,
            String description,
            String location,
            String imageUrl,
            ProduceStatus status,
            double aiMinPrice,
            double aiMaxPrice) {

        getOrCreateProduce(
                farmer,
                name,
                () -> Produce.builder()
                        .farmer(farmer)
                        .name(name)
                        .category(category)
                        .quantity(quantity)
                        .unit(unit)
                        .pricePerUnit(pricePerUnit)
                        .description(description)
                        .location(location)
                        .imageUrl(imageUrl)
                        .status(status)
                        .aiSuggestedMinPrice(aiMinPrice)
                        .aiSuggestedMaxPrice(aiMaxPrice)
                        .build()
        );
    }

    // ================================================================
    // BUYER INTEREST HELPER
    // ================================================================

    private void createInterestIfMissing(
            User buyer,
            User farmer,
            Produce produce,
            double offeredPrice,
            Integer offeredQuantity,
            String message) {

        boolean exists = interestRepository.findAll()
                .stream()
                .anyMatch(interest ->
                        interest.getBuyer() != null
                                && interest.getBuyer().getId() != null
                                && buyer.getId() != null
                                && interest.getBuyer().getId().equals(buyer.getId())

                                && interest.getFarmer() != null
                                && interest.getFarmer().getId() != null
                                && farmer.getId() != null
                                && interest.getFarmer().getId().equals(farmer.getId())

                                && interest.getProduce() != null
                                && interest.getProduce().getId() != null
                                && produce.getId() != null
                                && interest.getProduce().getId().equals(produce.getId())

                                && Double.compare(
                                        interest.getOfferedPrice(),
                                        offeredPrice
                                ) == 0
                );

        if (!exists) {

            interestRepository.save(
                    BuyerInterest.builder()
                            .buyer(buyer)
                            .farmer(farmer)
                            .produce(produce)
                            .offeredPrice(offeredPrice)
                            .offeredQuantity(offeredQuantity)
                            .message(message)
                            .status(BuyerInterest.InterestStatus.PENDING)
                            .build()
            );

            log.info(
                    "Created demo buyer offer: {} -> {} at ₹{}/kg",
                    buyer.getEmail(),
                    produce.getName(),
                    offeredPrice
            );
        }
    }
}

