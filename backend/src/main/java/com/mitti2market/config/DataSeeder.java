
package com.mitti2market.config;

import com.mitti2market.model.BuyerInterest;
import com.mitti2market.model.BuyerRequirement;
import com.mitti2market.model.Produce;
import com.mitti2market.model.Produce.ProduceStatus;
import com.mitti2market.model.User;
import com.mitti2market.model.User.BuyerType;
import com.mitti2market.model.User.FarmerType;
import com.mitti2market.model.User.Role;
import com.mitti2market.model.WarehouseHub;
import com.mitti2market.repository.BuyerInterestRepository;
import com.mitti2market.repository.BuyerRequirementRepository;
import com.mitti2market.repository.ProduceRepository;
import com.mitti2market.repository.UserRepository;
import com.mitti2market.repository.WarehouseHubRepository;
import com.mitti2market.model.Message;
import com.mitti2market.model.Notification;
import com.mitti2market.repository.MessageRepository;
import com.mitti2market.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Slf4j
@Component
@Profile("dev")
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ProduceRepository produceRepository;
    private final BuyerInterestRepository interestRepository;
    private final BuyerRequirementRepository requirementRepository;
    private final WarehouseHubRepository warehouseHubRepository;
    private final MessageRepository messageRepository;
    private final NotificationRepository notificationRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {

        log.info("==========================================================");
        log.info("Starting Mitti2Market Master Data Seeder (Real Agricultural Data)");
        log.info("==========================================================");

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
        // 1. SYSTEM OPERATIONAL ROLES
        // ============================================================

        User admin = getOrCreateUser(
                "admin@mitti2market.com",
                () -> User.builder()
                        .name("System Operations Admin")
                        .email("admin@mitti2market.com")
                        .passwordHash(hashedPassword)
                        .phone("9999999999")
                        .role(Role.ADMIN)
                        .location("New Delhi Central, Delhi")
                        .district("New Delhi")
                        .state("Delhi")
                        .pincode("110001")
                        .latitude(28.6139)
                        .longitude(77.2090)
                        .organizationName("Mitti2Market Platform Operations")
                        .verified(true)
                        .verificationStatus(User.VerificationStatus.VERIFIED)
                        .build()
        );

        User observer1 = getOrCreateUser(
                "observer@mitti2market.com",
                () -> User.builder()
                        .name("Rajesh Sharma (Field Inspector)")
                        .email("observer@mitti2market.com")
                        .passwordHash(hashedPassword)
                        .phone("9876543299")
                        .role(Role.OBSERVER)
                        .location("Nashik Quality Hub, Maharashtra")
                        .district("Nashik")
                        .state("Maharashtra")
                        .pincode("422001")
                        .latitude(19.9975)
                        .longitude(73.7898)
                        .organizationName("M2M Bureau of Quality Inspection")
                        .verified(true)
                        .verificationStatus(User.VerificationStatus.VERIFIED)
                        .build()
        );

        User hubOp = getOrCreateUser(
                "huboperator@mitti2market.com",
                () -> User.builder()
                        .name("Vikram Patil (Hub Operations Manager)")
                        .email("huboperator@mitti2market.com")
                        .passwordHash(hashedPassword)
                        .phone("9876543298")
                        .role(Role.HUB_OPERATOR)
                        .location("Pune Agro Logistics Terminal, Maharashtra")
                        .district("Pune")
                        .state("Maharashtra")
                        .pincode("411028")
                        .latitude(18.5089)
                        .longitude(73.9259)
                        .organizationName("Sahyadri Agro-Logistics Partner")
                        .verified(true)
                        .verificationStatus(User.VerificationStatus.VERIFIED)
                        .build()
        );

        // ============================================================
        // 2. FARMERS (West Bengal, Maharashtra, Punjab, Gujarat, UP, Karnataka)
        // ============================================================

        // --- Maharashtra Farmers ---
        User farmer1 = getOrCreateUser(
                "ramesh@farmer.com",
                () -> User.builder()
                        .name("Ramesh Kumar")
                        .email("ramesh@farmer.com")
                        .passwordHash(hashedPassword)
                        .phone("9876543210")
                        .role(Role.FARMER)
                        .farmerType(FarmerType.MULTI_CROP)
                        .location("Haveli, Pune, Maharashtra")
                        .district("Pune")
                        .state("Maharashtra")
                        .tehsil("Haveli")
                        .pincode("412207")
                        .latitude(18.5204)
                        .longitude(73.8567)
                        .organizationName("Kisan Agro Producer Society")
                        .verified(true)
                        .verificationStatus(User.VerificationStatus.VERIFIED)
                        .build()
        );

        User farmer2 = getOrCreateUser(
                "sunita@farmer.com",
                () -> User.builder()
                        .name("Sunita Devi")
                        .email("sunita@farmer.com")
                        .passwordHash(hashedPassword)
                        .phone("9876543211")
                        .role(Role.FARMER)
                        .farmerType(FarmerType.MULTI_CROP)
                        .location("Pimpalgaon, Nashik, Maharashtra")
                        .district("Nashik")
                        .state("Maharashtra")
                        .tehsil("Niphad")
                        .pincode("422209")
                        .latitude(20.1744)
                        .longitude(73.9856)
                        .organizationName("Devi Agri Cooperative")
                        .verified(true)
                        .verificationStatus(User.VerificationStatus.VERIFIED)
                        .build()
        );

        // --- Punjab Farmer ---
        User farmer3 = getOrCreateUser(
                "balwinder@farmer.com",
                () -> User.builder()
                        .name("Balwinder Singh")
                        .email("balwinder@farmer.com")
                        .passwordHash(hashedPassword)
                        .phone("9876543212")
                        .role(Role.FARMER)
                        .farmerType(FarmerType.MULTI_CROP)
                        .location("Khanna, Ludhiana, Punjab")
                        .district("Ludhiana")
                        .state("Punjab")
                        .tehsil("Khanna")
                        .pincode("141401")
                        .latitude(30.7073)
                        .longitude(76.2166)
                        .organizationName("Punjab Agro Farmers Producer Co.")
                        .verified(true)
                        .verificationStatus(User.VerificationStatus.VERIFIED)
                        .build()
        );

        // --- Gujarat Farmer ---
        User farmer4 = getOrCreateUser(
                "anusuiya@farmer.com",
                () -> User.builder()
                        .name("Anusuiya Patel")
                        .email("anusuiya@farmer.com")
                        .passwordHash(hashedPassword)
                        .phone("9876543213")
                        .role(Role.FARMER)
                        .farmerType(FarmerType.MULTI_CROP)
                        .location("Petlad, Anand, Gujarat")
                        .district("Anand")
                        .state("Gujarat")
                        .tehsil("Petlad")
                        .pincode("388450")
                        .latitude(22.5645)
                        .longitude(72.9289)
                        .organizationName("Amrut Krishi FPO")
                        .verified(true)
                        .verificationStatus(User.VerificationStatus.VERIFIED)
                        .build()
        );

        // --- West Bengal Farmers ---
        User wbFarmer1 = getOrCreateUser(
                "subhas.ghosh@fpo.org.in",
                () -> User.builder()
                        .name("Subhas Ghosh")
                        .email("subhas.ghosh@fpo.org.in")
                        .passwordHash(hashedPassword)
                        .phone("9830112233")
                        .role(Role.FARMER)
                        .farmerType(FarmerType.MULTI_CROP)
                        .location("Tarakeswar, Hooghly, West Bengal")
                        .district("Hooghly")
                        .state("West Bengal")
                        .tehsil("Tarakeswar")
                        .village("Talpur")
                        .pincode("712410")
                        .latitude(22.8863)
                        .longitude(88.0197)
                        .organizationName("Hooghly Progressive Potato & Cash Crops FPO")
                        .verified(true)
                        .verificationStatus(User.VerificationStatus.VERIFIED)
                        .build()
        );

        User wbFarmer2 = getOrCreateUser(
                "debabrata.mondal@fpo.org.in",
                () -> User.builder()
                        .name("Debabrata Mondal")
                        .email("debabrata.mondal@fpo.org.in")
                        .passwordHash(hashedPassword)
                        .phone("9830223344")
                        .role(Role.FARMER)
                        .farmerType(FarmerType.MULTI_CROP)
                        .location("Memari, Purba Bardhaman, West Bengal")
                        .district("Purba Bardhaman")
                        .state("West Bengal")
                        .tehsil("Memari I")
                        .village("Rasulpur")
                        .pincode("713146")
                        .latitude(23.1824)
                        .longitude(88.1132)
                        .organizationName("Burdwan Dhanya Utpadak Samity FPO")
                        .verified(true)
                        .verificationStatus(User.VerificationStatus.VERIFIED)
                        .build()
        );

        User wbFarmer3 = getOrCreateUser(
                "pranab.mukherjee@fpo.org.in",
                () -> User.builder()
                        .name("Pranab Mukherjee")
                        .email("pranab.mukherjee@fpo.org.in")
                        .passwordHash(hashedPassword)
                        .phone("9830334455")
                        .role(Role.FARMER)
                        .farmerType(FarmerType.MULTI_CROP)
                        .location("English Bazar, Malda, West Bengal")
                        .district("Malda")
                        .state("West Bengal")
                        .tehsil("English Bazar")
                        .village("Kotwali")
                        .pincode("732101")
                        .latitude(25.0069)
                        .longitude(88.1408)
                        .organizationName("Malda Mango & Horticulture Growers Cooperative")
                        .verified(true)
                        .verificationStatus(User.VerificationStatus.VERIFIED)
                        .build()
        );

        User wbFarmer4 = getOrCreateUser(
                "aparna.barman@fpo.org.in",
                () -> User.builder()
                        .name("Aparna Barman")
                        .email("aparna.barman@fpo.org.in")
                        .passwordHash(hashedPassword)
                        .phone("9830445566")
                        .role(Role.FARMER)
                        .farmerType(FarmerType.MULTI_CROP)
                        .location("Dhupguri, Jalpaiguri, West Bengal")
                        .district("Jalpaiguri")
                        .state("West Bengal")
                        .tehsil("Dhupguri")
                        .village("Banarhat")
                        .pincode("735210")
                        .latitude(26.5986)
                        .longitude(89.0142)
                        .organizationName("Dooars Agri Collective Producer Society")
                        .verified(true)
                        .verificationStatus(User.VerificationStatus.VERIFIED)
                        .build()
        );

        User wbFarmer5 = getOrCreateUser(
                "anirban.halder@fpo.org.in",
                () -> User.builder()
                        .name("Anirban Halder")
                        .email("anirban.halder@fpo.org.in")
                        .passwordHash(hashedPassword)
                        .phone("9830556677")
                        .role(Role.FARMER)
                        .farmerType(FarmerType.MULTI_CROP)
                        .location("Ranaghat, Nadia, West Bengal")
                        .district("Nadia")
                        .state("West Bengal")
                        .tehsil("Ranaghat II")
                        .village("Habibpur")
                        .pincode("741201")
                        .latitude(23.1789)
                        .longitude(88.5807)
                        .organizationName("Nadia Sabji Utpadak Cooperative")
                        .verified(true)
                        .verificationStatus(User.VerificationStatus.VERIFIED)
                        .build()
        );

        // --- Uttar Pradesh & Karnataka Farmers ---
        User upFarmer = getOrCreateUser(
                "ramsewak.yadav@fpo.org.in",
                () -> User.builder()
                        .name("Ram Sewak Yadav")
                        .email("ramsewak.yadav@fpo.org.in")
                        .passwordHash(hashedPassword)
                        .phone("9876543214")
                        .role(Role.FARMER)
                        .farmerType(FarmerType.MULTI_CROP)
                        .location("Rohaniya, Varanasi, Uttar Pradesh")
                        .district("Varanasi")
                        .state("Uttar Pradesh")
                        .tehsil("Rohaniya")
                        .pincode("221108")
                        .latitude(25.2758)
                        .longitude(82.9344)
                        .organizationName("Kashi Kisan Samriddhi FPO")
                        .verified(true)
                        .verificationStatus(User.VerificationStatus.VERIFIED)
                        .build()
        );

        User karFarmer = getOrCreateUser(
                "manjunath.hegde@fpo.org.in",
                () -> User.builder()
                        .name("Manjunath Hegde")
                        .email("manjunath.hegde@fpo.org.in")
                        .passwordHash(hashedPassword)
                        .phone("9876543215")
                        .role(Role.FARMER)
                        .farmerType(FarmerType.MULTI_CROP)
                        .location("Thirthahalli, Shimoga, Karnataka")
                        .district("Shimoga")
                        .state("Karnataka")
                        .tehsil("Thirthahalli")
                        .pincode("577432")
                        .latitude(13.6934)
                        .longitude(75.2415)
                        .organizationName("Malnad Spices & Plantation FPO")
                        .verified(true)
                        .verificationStatus(User.VerificationStatus.VERIFIED)
                        .build()
        );

        // ============================================================
        // 3. BUYERS & AGRI-ENTERPRISES
        // ============================================================

        User business1 = getOrCreateUser(
                "procurement@freshmart.com",
                () -> User.builder()
                        .name("FreshMart Agro Procurement")
                        .email("procurement@freshmart.com")
                        .passwordHash(hashedPassword)
                        .phone("9876543220")
                        .role(Role.BUSINESS)
                        .buyerType(BuyerType.CORPORATE)
                        .location("Vashi, Navi Mumbai, Maharashtra")
                        .district("Thane")
                        .state("Maharashtra")
                        .pincode("400703")
                        .latitude(19.0760)
                        .longitude(72.9980)
                        .organizationName("FreshMart Agro Procurement Pvt Ltd")
                        .verified(true)
                        .verificationStatus(User.VerificationStatus.VERIFIED)
                        .rating(4.6)
                        .build()
        );

        User business2 = getOrCreateUser(
                "purchase@reliancefresh.com",
                () -> User.builder()
                        .name("Reliance Fresh Sourcing")
                        .email("purchase@reliancefresh.com")
                        .passwordHash(hashedPassword)
                        .phone("9876543221")
                        .role(Role.BUSINESS)
                        .buyerType(BuyerType.CORPORATE)
                        .location("Ghansoli, Navi Mumbai, Maharashtra")
                        .district("Thane")
                        .state("Maharashtra")
                        .pincode("400701")
                        .latitude(19.1254)
                        .longitude(73.0011)
                        .organizationName("Reliance Retail Agri Supply Ltd")
                        .verified(true)
                        .verificationStatus(User.VerificationStatus.VERIFIED)
                        .rating(4.8)
                        .build()
        );

        User business3 = getOrCreateUser(
                "sourcing@bigbasket.com",
                () -> User.builder()
                        .name("BigBasket Farmer Connect")
                        .email("sourcing@bigbasket.com")
                        .passwordHash(hashedPassword)
                        .phone("9876543222")
                        .role(Role.BUSINESS)
                        .buyerType(BuyerType.CORPORATE)
                        .location("Domlur, Bengaluru, Karnataka")
                        .district("Bengaluru Urban")
                        .state("Karnataka")
                        .pincode("560071")
                        .latitude(12.9609)
                        .longitude(77.6387)
                        .organizationName("Supermarket Grocery Supplies Pvt Ltd (BigBasket)")
                        .verified(true)
                        .verificationStatus(User.VerificationStatus.VERIFIED)
                        .rating(4.7)
                        .build()
        );

        User business4 = getOrCreateUser(
                "procure@itcchoupal.com",
                () -> User.builder()
                        .name("ITC e-Choupal Procurement")
                        .email("procure@itcchoupal.com")
                        .passwordHash(hashedPassword)
                        .phone("9876543223")
                        .role(Role.BUSINESS)
                        .buyerType(BuyerType.CORPORATE)
                        .location("Scheme 54, Indore, Madhya Pradesh")
                        .district("Indore")
                        .state("Madhya Pradesh")
                        .pincode("452010")
                        .latitude(22.7533)
                        .longitude(75.8937)
                        .organizationName("ITC Limited - Agri Business Division")
                        .verified(true)
                        .verificationStatus(User.VerificationStatus.VERIFIED)
                        .rating(4.9)
                        .build()
        );

        // --- West Bengal Buyers ---
        User wbBuyer1 = getOrCreateUser(
                "procurement@keventeragro.com",
                () -> User.builder()
                        .name("Keventer Agro Direct Sourcing")
                        .email("procurement@keventeragro.com")
                        .passwordHash(hashedPassword)
                        .phone("9831001122")
                        .role(Role.BUSINESS)
                        .buyerType(BuyerType.CORPORATE)
                        .location("Barasat Logistics Park, North 24 Parganas, West Bengal")
                        .district("North 24 Parganas")
                        .state("West Bengal")
                        .pincode("700125")
                        .latitude(22.7214)
                        .longitude(88.4816)
                        .organizationName("Keventer Agro Limited")
                        .verified(true)
                        .verificationStatus(User.VerificationStatus.VERIFIED)
                        .rating(4.8)
                        .build()
        );

        User wbBuyer2 = getOrCreateUser(
                "sourcing@spencersretail.com",
                () -> User.builder()
                        .name("Spencer's Retail East Zone")
                        .email("sourcing@spencersretail.com")
                        .passwordHash(hashedPassword)
                        .phone("9831002233")
                        .role(Role.BUSINESS)
                        .buyerType(BuyerType.CORPORATE)
                        .location("Alipore & Dhulagarh Hub, Kolkata, West Bengal")
                        .district("Kolkata")
                        .state("West Bengal")
                        .pincode("700027")
                        .latitude(22.5312)
                        .longitude(88.3245)
                        .organizationName("Spencer's Retail Limited (RP-Sanjiv Goenka Group)")
                        .verified(true)
                        .verificationStatus(User.VerificationStatus.VERIFIED)
                        .rating(4.9)
                        .build()
        );

        User wbBuyer3 = getOrCreateUser(
                "trade@postamandi.com",
                () -> User.builder()
                        .name("Posta Wholesale Mandi Merchants Association")
                        .email("trade@postamandi.com")
                        .passwordHash(hashedPassword)
                        .phone("9831003344")
                        .role(Role.BUSINESS)
                        .buyerType(BuyerType.PRIVATE_BUSINESS)
                        .location("Posta Bazar, Burrabazar, Kolkata, West Bengal")
                        .district("Kolkata")
                        .state("West Bengal")
                        .pincode("700007")
                        .latitude(22.5855)
                        .longitude(88.3582)
                        .organizationName("Posta Agri Wholesale Consortium")
                        .verified(true)
                        .verificationStatus(User.VerificationStatus.VERIFIED)
                        .rating(4.6)
                        .build()
        );

        User wbBuyer4 = getOrCreateUser(
                "supplies@arambaghfoodmart.com",
                () -> User.builder()
                        .name("Arambagh Foodmart Sourcing")
                        .email("supplies@arambaghfoodmart.com")
                        .passwordHash(hashedPassword)
                        .phone("9831004455")
                        .role(Role.BUSINESS)
                        .buyerType(BuyerType.PRIVATE_BUSINESS)
                        .location("Arambagh Central Depot, Hooghly, West Bengal")
                        .district("Hooghly")
                        .state("West Bengal")
                        .pincode("712601")
                        .latitude(22.8804)
                        .longitude(87.7812)
                        .organizationName("Arambagh Foodmart Limited")
                        .verified(true)
                        .verificationStatus(User.VerificationStatus.VERIFIED)
                        .rating(4.7)
                        .build()
        );

        // ============================================================
        // 4. PRODUCE CATALOGUE (Realistic Regional Indian Commodities)
        // ============================================================

        // --- Maharashtra Produce ---
        createProduceIfMissing(farmer1, "Alphonso Mango", "Fruits", 500, "kg", 120.0,
                "Fresh Ratnagiri Alphonso mangoes, Grade A naturally ripened",
                "Pune, Maharashtra", "https://images.unsplash.com/photo-1553279768-865429fa0078?w=500&q=80",
                ProduceStatus.AVAILABLE, 108.0, 132.0);

        createProduceIfMissing(farmer1, "Red Onion", "Vegetables", 2000, "kg", 25.0,
                "Nashik red onions, freshly harvested and cured",
                "Pune, Maharashtra", "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=500&q=80",
                ProduceStatus.AVAILABLE, 22.5, 27.5);

        createProduceIfMissing(farmer1, "Turmeric Powder", "Spices", 100, "kg", 180.0,
                "Pure Salem variety turmeric powder, 3.8% curcumin content",
                "Pune, Maharashtra", "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=500&q=80",
                ProduceStatus.AVAILABLE, 162.0, 198.0);

        Produce tomato = createProduceIfMissing(farmer1, "Tomato", "Vegetables", 2000, "kg", 25.0,
                "Firm hybrid field tomatoes, Grade A harvest",
                "Pune, Maharashtra", "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&q=80",
                ProduceStatus.AVAILABLE, 22.5, 27.5);

        createProduceIfMissing(farmer2, "Thompson Seedless Grapes", "Fruits", 800, "kg", 60.0,
                "Nashik export-grade sweet seedless table grapes",
                "Nashik, Maharashtra", "https://images.unsplash.com/photo-1596363505729-4190a9506133?w=500&q=80",
                ProduceStatus.AVAILABLE, 54.0, 66.0);

        createProduceIfMissing(farmer2, "Green Chilli", "Vegetables", 300, "kg", 40.0,
                "Fresh hot green chillies, medium pungent",
                "Nashik, Maharashtra", "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=500&q=80",
                ProduceStatus.AVAILABLE, 36.0, 44.0);

        createProduceIfMissing(farmer2, "Jowar (Sorghum)", "Grains", 1500, "kg", 32.0,
                "Premium white jowar grain, unpolished and dry",
                "Nashik, Maharashtra", "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=500&q=80",
                ProduceStatus.AVAILABLE, 28.8, 35.2);

        // --- Punjab Produce ---
        createProduceIfMissing(farmer3, "Sharbati Wheat", "Grains", 3000, "kg", 28.0,
                "Heavy-kernel golden Sharbati wheat, harvest bagged",
                "Ludhiana, Punjab", "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=500&q=80",
                ProduceStatus.AVAILABLE, 26.0, 31.0);

        Produce basmati = createProduceIfMissing(farmer3, "Basmati Rice 1121", "Grains", 2500, "kg", 85.0,
                "Aromatic extra long grain Basmati 1121 steam aged rice",
                "Ludhiana, Punjab", "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&q=80",
                ProduceStatus.AVAILABLE, 80.0, 92.0);

        // --- Gujarat Produce ---
        createProduceIfMissing(farmer4, "Castor Seeds", "Oilseeds", 1200, "kg", 62.0,
                "High oil content Grade-A Gujarat castor seeds",
                "Anand, Gujarat", "https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=500&q=80",
                ProduceStatus.AVAILABLE, 58.0, 66.0);

        createProduceIfMissing(farmer4, "Cumin Seeds (Jeera)", "Spices", 600, "kg", 240.0,
                "Machine sorted, cleaned bold Unjha cumin seeds",
                "Anand, Gujarat", "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500&q=80",
                ProduceStatus.AVAILABLE, 225.0, 260.0);

        // --- West Bengal Produce ---
        Produce jyotiPotato = createProduceIfMissing(wbFarmer1, "Jyoti Potato", "Vegetables", 8000, "kg", 18.0,
                "Freshly dug Hooghly cold-storage grade Jyoti table potatoes. Thin skin, solid pulp.",
                "Tarakeswar, Hooghly, West Bengal", "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=500&q=80",
                ProduceStatus.AVAILABLE, 16.5, 20.0);

        createProduceIfMissing(wbFarmer1, "Chandramukhi Potato", "Vegetables", 5000, "kg", 24.0,
                "Premium culinary table potato Chandramukhi from Hooghly. Rich taste, ideal for institutional kitchens.",
                "Tarakeswar, Hooghly, West Bengal", "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=500&q=80",
                ProduceStatus.AVAILABLE, 22.0, 26.5);

        createProduceIfMissing(wbFarmer1, "Raw Jute TD-5", "Fibres", 3500, "kg", 58.0,
                "Golden retting Grade TD-5 Tossa Jute fibre bundles. Ready for textile mills and packaging units.",
                "Tarakeswar, Hooghly, West Bengal", "https://images.unsplash.com/photo-1533038590840-1cde6e668a91?w=500&q=80",
                ProduceStatus.AVAILABLE, 54.0, 63.0);

        Produce gobindobhog = createProduceIfMissing(wbFarmer2, "Gobindobhog Rice", "Grains", 4000, "kg", 72.0,
                "Geographical Indication GI tagged aromatic Gobindobhog fragrant rice from Raina-Khandaghosh belt, Burdwan.",
                "Memari, Purba Bardhaman, West Bengal", "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&q=80",
                ProduceStatus.AVAILABLE, 68.0, 78.0);

        createProduceIfMissing(wbFarmer2, "Swarna Minikit Paddy", "Grains", 10000, "kg", 26.5,
                "Clean dry moisture-controlled Swarna Minikit parboiled grade paddy from Burdwan fertile delta.",
                "Memari, Purba Bardhaman, West Bengal", "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=500&q=80",
                ProduceStatus.AVAILABLE, 24.5, 28.5);

        createProduceIfMissing(wbFarmer2, "Yellow Mustard Seed", "Oilseeds", 1500, "kg", 62.0,
                "Bold yellow mustard seed with high oil content and strong aroma. Ideal for cold pressed oil expellers.",
                "Memari, Purba Bardhaman, West Bengal", "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500&q=80",
                ProduceStatus.AVAILABLE, 58.0, 67.0);

        Produce himsagar = createProduceIfMissing(wbFarmer3, "Himsagar Mango", "Fruits", 3000, "kg", 95.0,
                "GI-tagged Malda Himsagar sweet table mangoes. Fibre-free pulp, rich aroma, harvested from old orchards.",
                "English Bazar, Malda, West Bengal", "https://images.unsplash.com/photo-1553279768-865429fa0078?w=500&q=80",
                ProduceStatus.AVAILABLE, 88.0, 105.0);

        createProduceIfMissing(wbFarmer3, "Fazli Mango", "Fruits", 4500, "kg", 65.0,
                "Large table size Malda Fazli mangoes. Thick sweet pulp suitable for both direct consumption and pulp preservation.",
                "English Bazar, Malda, West Bengal", "https://images.unsplash.com/photo-1553279768-865429fa0078?w=500&q=80",
                ProduceStatus.AVAILABLE, 58.0, 72.0);

        createProduceIfMissing(wbFarmer3, "Shahi Litchi", "Fruits", 1200, "kg", 140.0,
                "Juicy, translucent crimson Shahi litchis from Malda orchards. Handpicked and packed in ventilated crates.",
                "English Bazar, Malda, West Bengal", "https://images.unsplash.com/photo-1528825871115-3581a5387919?w=500&q=80",
                ProduceStatus.AVAILABLE, 128.0, 155.0);

        Produce pineapple = createProduceIfMissing(wbFarmer4, "Queen Pineapple", "Fruits", 3500, "kg", 38.0,
                "Jalpaiguri Dooars Queen pineapples with high brix sweetness and golden yellow flesh.",
                "Dhupguri, Jalpaiguri, West Bengal", "https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=500&q=80",
                ProduceStatus.AVAILABLE, 34.0, 42.0);

        createProduceIfMissing(wbFarmer4, "Dooars Organic Green Tea", "Plantation", 1500, "kg", 220.0,
                "Handpicked seasonal Dooars foothill high-grown unfermented whole leaf green tea.",
                "Dhupguri, Jalpaiguri, West Bengal", "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=500&q=80",
                ProduceStatus.AVAILABLE, 200.0, 245.0);

        createProduceIfMissing(wbFarmer4, "Fresh Hill Ginger (Ada)", "Spices", 2000, "kg", 75.0,
                "Bold, fiber-rich spicy organic hill ginger roots freshly dug from North Bengal soils.",
                "Dhupguri, Jalpaiguri, West Bengal", "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=500&q=80",
                ProduceStatus.AVAILABLE, 68.0, 82.0);

        Produce potol = createProduceIfMissing(wbFarmer5, "Pointed Gourd (Potol)", "Vegetables", 1800, "kg", 34.0,
                "Fresh crisp green pointed gourd (Potol) from Nadia alluvial fields. Tender seeds, uniform size.",
                "Ranaghat, Nadia, West Bengal", "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&q=80",
                ProduceStatus.AVAILABLE, 30.0, 38.0);

        createProduceIfMissing(wbFarmer5, "Snowball Cauliflower", "Vegetables", 2500, "kg", 22.0,
                "Compact, snow-white cauliflower curds from Nadia river basin. Crisp texture and high freshness.",
                "Ranaghat, Nadia, West Bengal", "https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=500&q=80",
                ProduceStatus.AVAILABLE, 19.0, 25.0);

        // --- Uttar Pradesh & Karnataka Produce ---
        createProduceIfMissing(upFarmer, "Banarasi Langra Mango", "Fruits", 2500, "kg", 85.0,
                "Authentic Varanasi GI-belt Langra mangoes. Exceptional aroma, distinct green skin when ripe.",
                "Rohaniya, Varanasi, Uttar Pradesh", "https://images.unsplash.com/photo-1553279768-865429fa0078?w=500&q=80",
                ProduceStatus.AVAILABLE, 78.0, 94.0);

        createProduceIfMissing(karFarmer, "Black Pepper Malabar Bold", "Spices", 1200, "kg", 520.0,
                "Sun-cured heavy density Malabar garbled bold black peppercorns from Western Ghats plantations.",
                "Thirthahalli, Shimoga, Karnataka", "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500&q=80",
                ProduceStatus.AVAILABLE, 490.0, 560.0);

        // ============================================================
        // 5. BUYER REQUIREMENTS (Demand Signals)
        // ============================================================

        createRequirementIfMissing(wbBuyer3, "Jyoti Potato", 25000, "kg", 16.0, 19.0,
                "Grade A Table Quality (Medium to Large)", "Posta Wholesale Mandi, Burrabazar, Kolkata",
                "Posta Mandi Consortium bulk requirement for local wholesale distribution. Cleaned bags preferred.");

        createRequirementIfMissing(wbBuyer2, "Gobindobhog Rice", 5000, "kg", 70.0, 76.0,
                "Aged 1-year Heritage Grade", "Spencer's Central Fulfillment Center, Dhulagarh, WB",
                "Spencer's East retail stores packaging requirement. Moisture below 12%, clean fragrant kernels.");

        createRequirementIfMissing(wbBuyer1, "Himsagar Mango", 12000, "kg", 90.0, 102.0,
                "Table & Pulp Processing Grade", "Keventer Agro Processing Facility, Barasat, WB",
                "Keventer Food Division seasonal procurement. Crate delivered, no chemical ripening agents.");

        createRequirementIfMissing(wbBuyer4, "Pointed Gourd (Potol)", 3000, "kg", 30.0, 36.0,
                "Fresh Daily Harvest (Tender)", "Arambagh Foodmart Distribution Center, Hooghly, WB",
                "Daily dispatch requirement across retail foodmart outlets in South Bengal.");

        createRequirementIfMissing(business3, "Queen Pineapple", 4000, "kg", 36.0, 42.0,
                "Brix 14+ Export Grade", "BigBasket Eastern Distribution Depot, Dankuni, WB",
                "Direct farmer sourcing for quick commerce distribution in Kolkata metropolitan region.");

        createRequirementIfMissing(business2, "Basmati Rice 1121", 10000, "kg", 82.0, 88.0,
                "Steam Aged Extra Long Grain", "Reliance Retail Agro Consolidation Center, Ludhiana, Punjab",
                "National retail private label packaging contract.");

        createRequirementIfMissing(business1, "Red Onion", 15000, "kg", 22.0, 26.0,
                "50mm+ Medium-Large Bulb", "FreshMart Vashi APMC Terminal, Navi Mumbai, Maharashtra",
                "Daily supply contract for western India retail chain.");

        // ============================================================
        // 6. BUYER OFFERS / INTERESTS
        // ============================================================

        // Offers on Tomato (Pune)
        createInterestIfMissing(business1, farmer1, tomato, 29.0, 2000,
                "FreshMart offers ₹29/kg with Mumbai terminal delivery and 48-hour settlement.");
        createInterestIfMissing(business2, farmer1, tomato, 27.0, 1500,
                "Reliance Fresh offers ₹27/kg for 1500 kg with Pune agro hub staging pickup.");
        createInterestIfMissing(business3, farmer1, tomato, 28.0, 1000,
                "BigBasket sourcing offers ₹28/kg for 1000 kg Grade A sorted.");
        createInterestIfMissing(business4, farmer1, tomato, 28.5, 1200,
                "ITC Choupal direct procurement offers ₹28.5/kg for 1200 kg.");

        // Offers on West Bengal Produce
        createInterestIfMissing(wbBuyer3, wbFarmer1, jyotiPotato, 18.5, 6000,
                "Posta Mandi Traders Consortium offers ₹18.5/kg for 6,000 kg with Dankuni cold hub delivery.");
        createInterestIfMissing(wbBuyer2, wbFarmer2, gobindobhog, 73.5, 3000,
                "Spencer's Retail East offers ₹73.5/kg for 3,000 kg with Dhulagarh warehouse drop.");
        createInterestIfMissing(wbBuyer1, wbFarmer3, himsagar, 97.0, 2500,
                "Keventer Agro Food Division offers ₹97.0/kg for 2,500 kg Malda GI Himsagar mangoes.");
        createInterestIfMissing(wbBuyer4, wbFarmer5, potol, 35.0, 1500,
                "Arambagh Foodmart offers ₹35.0/kg for 1,500 kg fresh daily harvest pointed gourd.");
        createInterestIfMissing(business3, wbFarmer4, pineapple, 39.0, 2000,
                "BigBasket Farmer Connect offers ₹39.0/kg for 2,000 kg Queen Pineapples.");

        // ============================================================
        // 7. INITIAL CONVERSATIONS & NOTIFICATIONS (CLICKABLE NOTIFICATIONS)
        // ============================================================
        seedConversationsAndNotifications(farmer1, business1, tomato,
                wbFarmer1, wbBuyer3, jyotiPotato,
                wbFarmer2, wbBuyer2, gobindobhog,
                wbFarmer3, wbBuyer1, himsagar);

        // ============================================================
        // 8. PARTNER WAREHOUSE & COLLECTION HUBS
        // ============================================================
        seedWarehouseHubs();

        log.info("==========================================================");
        log.info("Mitti2Market Production Seed Data Successfully Initialized");
        log.info("  - Operational Accounts : Admin, Quality Inspector, Hub Operator");
        log.info("  - Farmers Profiled     : 11 Farmers (West Bengal, Maharashtra, Punjab, Gujarat, UP, Karnataka)");
        log.info("  - Buyers Profiled      : 8 Corporate & Wholesale Buyers (Keventer, Spencer's, Posta Mandi, Arambagh, etc.)");
        log.info("  - Produce Catalogue    : 20 Regional Indian Agricultural Commodities");
        log.info("  - Buyer Requirements   : 7 Open Demand Postings");
        log.info("  - Warehouse & Cold Hubs: 7 Hubs across West Bengal, Maharashtra, Punjab, MP");
        log.info("==========================================================");
    }

    // ================================================================
    // USER HELPER
    // ================================================================

    private User getOrCreateUser(String email, java.util.function.Supplier<User> userSupplier) {
        return userRepository.findByEmail(email)
                .map(existing -> {
                    User fresh = userSupplier.get();
                    boolean changed = false;
                    if (existing.getDistrict() == null && fresh.getDistrict() != null) {
                        existing.setDistrict(fresh.getDistrict());
                        changed = true;
                    }
                    if (existing.getState() == null && fresh.getState() != null) {
                        existing.setState(fresh.getState());
                        changed = true;
                    }
                    if (existing.getLatitude() == null && fresh.getLatitude() != null) {
                        existing.setLatitude(fresh.getLatitude());
                        existing.setLongitude(fresh.getLongitude());
                        changed = true;
                    }
                    if (existing.getPincode() == null && fresh.getPincode() != null) {
                        existing.setPincode(fresh.getPincode());
                        changed = true;
                    }
                    if (existing.getOrganizationName() == null && fresh.getOrganizationName() != null) {
                        existing.setOrganizationName(fresh.getOrganizationName());
                        changed = true;
                    }
                    if (changed) {
                        return userRepository.save(existing);
                    }
                    return existing;
                })
                .orElseGet(() -> {
                    User user = userSupplier.get();
                    User savedUser = userRepository.save(user);
                    log.info("Created user: {} ({})", user.getName(), email);
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
                    log.info("Created produce listing: {} for {}", produceName, farmer.getName());
                    return savedProduce;
                });
    }

    private Produce createProduceIfMissing(
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

        return getOrCreateProduce(
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
    // BUYER REQUIREMENT HELPER
    // ================================================================

    private void createRequirementIfMissing(
            User buyer,
            String crop,
            int quantity,
            String unit,
            double minPrice,
            double maxPrice,
            String quality,
            String deliveryLocation,
            String notes) {

        boolean exists = requirementRepository.findByBuyerIdOrderByCreatedAtDesc(buyer.getId())
                .stream()
                .anyMatch(r -> r.getCrop().equalsIgnoreCase(crop));

        if (!exists) {
            requirementRepository.save(
                    BuyerRequirement.builder()
                            .buyer(buyer)
                            .crop(crop)
                            .quantity(quantity)
                            .requiredQuantity(quantity)
                            .fulfilledQuantity(0)
                            .reservedQuantity(0)
                            .remainingQuantity(quantity)
                            .unit(unit)
                            .minPrice(minPrice)
                            .maxPrice(maxPrice)
                            .quality(quality)
                            .requiredBy(LocalDate.now().plusWeeks(3))
                            .deliveryLocation(deliveryLocation)
                            .transportPreference(BuyerRequirement.TransportPreference.PLATFORM)
                            .notes(notes)
                            .status(BuyerRequirement.RequirementStatus.OPEN)
                            .build()
            );

            log.info("Created buyer requirement: {} needs {} {} of {}", buyer.getName(), quantity, unit, crop);
        }
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

            log.info("Created buyer offer: {} -> {} at ₹{}/kg", buyer.getName(), produce.getName(), offeredPrice);
        }
    }

    // ================================================================
    // WAREHOUSE & COLD STORAGE HUBS
    // ================================================================

    private void seedWarehouseHubs() {
        // Maharashtra Hubs
        createHubIfMissing("M2M-HUB-PUN-01", "Sahyadri FPO Aggregation & Cold Hub", "Sahyadri Farmers Producer Co.",
                "Pune, Maharashtra", "Gat No. 42, Hadapsar Agro Terminal, Pune", "Pune", "Maharashtra", "411028",
                18.5089, 73.9259, 25000.0, WarehouseHub.StorageType.COLD_STORAGE,
                "Potato, Tomato, Onion, Grapes, Pomegranate, Mango, Capsicum", 0.60, 0.12);

        createHubIfMissing("M2M-HUB-NSK-02", "Nashik Agro-Logistics Partner Center", "Mahindra Agri Logistics Partner",
                "Nashik, Maharashtra", "Pimpalgaon Baswant APMC Staging Yard, Nashik", "Nashik", "Maharashtra", "422209",
                20.1744, 73.9856, 40000.0, WarehouseHub.StorageType.CONTROLLED_ATMOSPHERE,
                "Onion, Tomato, Grapes, Pomegranate, Pepper, Green Chilli", 0.50, 0.10);

        // Punjab Hub
        createHubIfMissing("M2M-HUB-KHA-03", "Khanna Grain Terminal & Silos", "Punjab State Warehousing Partner",
                "Ludhiana, Punjab", "GT Road Agro Logistics Complex, Khanna", "Ludhiana", "Punjab", "141401",
                30.7073, 76.2166, 80000.0, WarehouseHub.StorageType.VENTILATED_GRAIN_SILO,
                "Wheat, Rice, Barley, Maize, Mustard, Basmati", 0.40, 0.08);

        // Madhya Pradesh Hub
        createHubIfMissing("M2M-HUB-IND-04", "Malwa Consolidation Warehouse", "Central Warehousing Corp Partner",
                "Indore, Madhya Pradesh", "Sanwer Road Industrial Area Sector E, Indore", "Indore", "Madhya Pradesh", "452015",
                22.7533, 75.8937, 35000.0, WarehouseHub.StorageType.DRY_STORAGE,
                "Soybean, Wheat, Chickpea, Garlic, Onion, Potato", 0.45, 0.09);

        // West Bengal Hubs
        createHubIfMissing("M2M-HUB-KOL-05", "Bengal Cold Chain & Dankuni Logistics Terminal", "Bengal State Warehousing & Cold Chain",
                "Dankuni, Hooghly, West Bengal", "NH-19 Expressway Agro Complex, Dankuni", "Hooghly", "West Bengal", "712311",
                22.6841, 88.3015, 60000.0, WarehouseHub.StorageType.COLD_STORAGE,
                "Jyoti Potato, Chandramukhi Potato, Himsagar Mango, Pointed Gourd, Cauliflower, Tomato", 0.55, 0.11);

        createHubIfMissing("M2M-HUB-SLG-06", "Siliguri North Bengal Multi-Commodity Agro Hub", "North Bengal Agro-Logistics Corp",
                "Siliguri, Jalpaiguri, West Bengal", "Eastern Bypass Agro Terminal, Siliguri", "Jalpaiguri", "West Bengal", "734008",
                26.7271, 88.3953, 45000.0, WarehouseHub.StorageType.CONTROLLED_ATMOSPHERE,
                "Queen Pineapple, Dooars Tea, Fresh Ginger, Potato, Spices", 0.50, 0.10);

        createHubIfMissing("M2M-HUB-BDN-07", "Burdwan Central Grain & Rice Silo Complex", "Damodar Valley Agri Warehouse Consortium",
                "Galsi, Purba Bardhaman, West Bengal", "Galsi Industrial Agro Park, Burdwan", "Purba Bardhaman", "West Bengal", "713406",
                23.3275, 87.6948, 95000.0, WarehouseHub.StorageType.VENTILATED_GRAIN_SILO,
                "Gobindobhog Rice, Swarna Minikit Paddy, Yellow Mustard, Wheat, Maize", 0.38, 0.07);
    }

    private void createHubIfMissing(String hubCode, String name, String partner, String loc, String addr,
                                   String dist, String state, String pin, double lat, double lng,
                                   double cap, WarehouseHub.StorageType type, String crops, double fee, double rate) {
        if (warehouseHubRepository.findByHubCode(hubCode).isEmpty()) {
            warehouseHubRepository.save(WarehouseHub.builder()
                    .hubCode(hubCode)
                    .name(name)
                    .partnerName(partner)
                    .location(loc)
                    .address(addr)
                    .district(dist)
                    .state(state)
                    .pincode(pin)
                    .latitude(lat)
                    .longitude(lng)
                    .totalCapacityKg(cap)
                    .occupiedCapacityKg(0.0)
                    .reservedCapacityKg(0.0)
                    .availableCapacityKg(cap)
                    .storageType(type)
                    .supportedCrops(crops)
                    .operatingStatus(WarehouseHub.HubStatus.ACTIVE)
                    .handlingFeePerKg(fee)
                    .storageRatePerDayPerKg(rate)
                    .contactPerson("Facility Manager")
                    .contactPhone("9876543200")
                    .contactEmail("hub." + hubCode.toLowerCase() + "@mitti2market.com")
                    .build());
            log.info("Created partner warehouse hub: {} ({})", name, hubCode);
        }
    }

    private void seedConversationsAndNotifications(User farmer1, User buyer1, Produce tomato,
                                                  User wbFarmer1, User wbBuyer3, Produce jyotiPotato,
                                                  User wbFarmer2, User wbBuyer2, Produce gobindobhog,
                                                  User wbFarmer3, User wbBuyer1, Produce himsagar) {
        seedSingleConversation(farmer1, buyer1, tomato,
                "Hello Ramesh ji! We are looking to procure 1,000 kg of fresh greenhouse tomatoes for our weekly distribution. What is the current dispatch availability?",
                "Namaste sir! We have freshly harvested Grade A tomatoes ready. Available for immediate dispatch from Nashik hub.",
                "Sounds great! Can we agree on ₹26/kg for 1,000 kg? Let us finalize the terms.");

        seedSingleConversation(wbFarmer1, wbBuyer3, jyotiPotato,
                "Namaskar Subhas babu! We reviewed your Jyoti Potato listing. What is the cold storage packing size?",
                "Namaskar! Standard 50 kg gunny bags, stored at Tarakeswar cold terminal. Graded and sorted.",
                "Perfect. We want to place an initial order of 3,000 kg. Can you do ₹18/kg with loading included?");

        seedSingleConversation(wbFarmer2, wbBuyer2, gobindobhog,
                "Greetings Ananda babu. We need 2,000 kg authentic Burdwan Gobindobhog Rice for festive packaging. Is moisture below 12%?",
                "Greetings! Yes madam, traditional sun-dried Gobindobhog, moisture is 11.4%. Superb fragrance and premium polish.",
                "Wonderful! We are ready to place a firm offer of ₹74/kg for 2,000 kg. Please confirm when we can inspect.");

        seedSingleConversation(wbFarmer3, wbBuyer1, himsagar,
                "Namaskar Mihir babu, Keventer Agro is planning weekly procurement of GI Malda Himsagar mangoes for pulp and table retail.",
                "Namaskar! Tree-ripened, naturally harvested from English Bazar orchards. Premium sizing.",
                "We would like to book 2,500 kg at ₹97/kg. Let's start the deal negotiation.");
    }

    private void seedSingleConversation(User farmer, User buyer, Produce produce,
                                       String buyerInquiry, String farmerReply, String buyerFollowUp) {
        String convId = "conv-" + Math.min(farmer.getId(), buyer.getId()) + "-" + Math.max(farmer.getId(), buyer.getId())
                + (produce != null ? "-p" + produce.getId() : "");

        if (messageRepository.findByConversationIdOrderByCreatedAtAsc(convId).isEmpty()) {
            Message m1 = messageRepository.save(Message.builder()
                    .conversationId(convId)
                    .sender(buyer)
                    .receiver(farmer)
                    .produce(produce)
                    .content(buyerInquiry)
                    .read(true)
                    .createdAt(LocalDateTime.now().minusHours(4))
                    .build());

            Message m2 = messageRepository.save(Message.builder()
                    .conversationId(convId)
                    .sender(farmer)
                    .receiver(buyer)
                    .produce(produce)
                    .content(farmerReply)
                    .read(true)
                    .createdAt(LocalDateTime.now().minusHours(2))
                    .build());

            Message m3 = messageRepository.save(Message.builder()
                    .conversationId(convId)
                    .sender(buyer)
                    .receiver(farmer)
                    .produce(produce)
                    .content(buyerFollowUp)
                    .read(false)
                    .createdAt(LocalDateTime.now().minusMinutes(20))
                    .build());

            // Unread Notification for Farmer about the buyer's latest message
            String metaFarmer = String.format("{\"conversationId\":\"%s\",\"senderId\":%d,\"senderName\":\"%s\"}",
                    convId, buyer.getId(), buyer.getName().replace("\"", "\\\""));
            notificationRepository.save(Notification.builder()
                    .user(farmer)
                    .type(Notification.NotificationType.NEW_MESSAGE)
                    .title("New message from " + buyer.getName())
                    .body(buyerFollowUp)
                    .referenceId(m3.getId())
                    .referenceType("MESSAGE")
                    .metadata(metaFarmer)
                    .isRead(false)
                    .createdAt(LocalDateTime.now().minusMinutes(20))
                    .build());

            // Unread Notification for Buyer about the farmer's response
            String metaBuyer = String.format("{\"conversationId\":\"%s\",\"senderId\":%d,\"senderName\":\"%s\"}",
                    convId, farmer.getId(), farmer.getName().replace("\"", "\\\""));
            notificationRepository.save(Notification.builder()
                    .user(buyer)
                    .type(Notification.NotificationType.NEW_MESSAGE)
                    .title("New message from " + farmer.getName())
                    .body(farmerReply)
                    .referenceId(m2.getId())
                    .referenceType("MESSAGE")
                    .metadata(metaBuyer)
                    .isRead(false)
                    .createdAt(LocalDateTime.now().minusHours(2))
                    .build());

            log.info("Seeded conversation and notifications between {} and {}", farmer.getName(), buyer.getName());
        }
    }
}

