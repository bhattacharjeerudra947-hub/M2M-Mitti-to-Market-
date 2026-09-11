package com.mitti2market.service;

import com.mitti2market.exception.BadRequestException;
import com.mitti2market.model.*;
import com.mitti2market.model.BuyerMatch.MatchStatus;
import com.mitti2market.model.BuyerMatch.MatchType;
import com.mitti2market.model.Produce.ProduceStatus;
import com.mitti2market.repository.BuyerMatchRepository;
import com.mitti2market.repository.BuyerRequirementRepository;
import com.mitti2market.repository.ProduceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Example;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.repository.query.FluentQuery;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Robust unit and integration test for Two-Way Matching and Farmer-Initiated Deal System.
 * Uses lightweight in-memory repositories for 100% JVM-independent execution.
 */
public class TwoWayMatchingAndDealTest {

    private InMemoryBuyerMatchRepository matchRepo;
    private InMemoryProduceRepository produceRepo;
    private InMemoryRequirementRepository requirementRepo;
    private StubNotificationService notificationService;
    private StubMessageService messageService;

    private MatchingService matchingService;
    private BuyerMatchService buyerMatchService;

    private User farmer;
    private User buyer;

    @BeforeEach
    void setUp() {
        matchRepo = new InMemoryBuyerMatchRepository();
        produceRepo = new InMemoryProduceRepository();
        requirementRepo = new InMemoryRequirementRepository();
        notificationService = new StubNotificationService();
        messageService = new StubMessageService();

        matchingService = new MatchingService(matchRepo, produceRepo, requirementRepo, notificationService);
        buyerMatchService = new BuyerMatchService(matchRepo, produceRepo, requirementRepo, messageService, notificationService);

        farmer = User.builder()
                .id(1L)
                .name("Ramesh Kumar")
                .email("farmer@example.com")
                .role(User.Role.FARMER)
                .verified(true)
                .build();

        buyer = User.builder()
                .id(2L)
                .name("ABC Foods")
                .email("buyer@example.com")
                .role(User.Role.BUSINESS)
                .verified(true)
                .build();
    }

    /**
     * TEST SCENARIO A: FARMER LISTS FIRST
     * Day 1: Farmer lists Mango, 100 kg, ₹105/kg, ready in 4 days.
     * Day 6: Buyer posts bulk requirement: Mango, 80 kg, budget ₹110/kg.
     * Expected:
     * - Live matching detects match
     * - AI score >= 90%
     * - Notification created for Farmer
     * - Only Farmer can initiate deal
     */
    @Test
    void testScenarioA_FarmerListsFirst_BuyerCreatesRequirementLater() {
        LocalDate today = LocalDate.now();

        // 1. Existing farmer produce listing
        Produce produce = Produce.builder()
                .id(101L)
                .farmer(farmer)
                .name("Mango")
                .quantity(100)
                .unit("kg")
                .pricePerUnit(105.0)
                .location("Kolkata, WB")
                .readyDate(today.plusDays(4))
                .status(ProduceStatus.AVAILABLE)
                .build();
        produceRepo.save(produce);

        // 2. Buyer requirement created later
        BuyerRequirement requirement = BuyerRequirement.builder()
                .id(201L)
                .buyer(buyer)
                .crop("Mango")
                .quantity(80)
                .requiredQuantity(80)
                .remainingQuantity(80)
                .unit("kg")
                .minPrice(100.0)
                .maxPrice(110.0)
                .deliveryLocation("Kolkata, WB")
                .requiredBy(today.plusDays(7))
                .status(BuyerRequirement.RequirementStatus.OPEN)
                .build();
        requirementRepo.save(requirement);

        // Trigger B: Requirement created -> searches existing active produce
        List<BuyerMatch> matches = matchingService.matchRequirementAgainstProduces(requirement);

        assertNotNull(matches);
        assertEquals(1, matches.size());
        BuyerMatch match = matches.get(0);
        assertTrue(match.getMatchScore() >= 90, "AI match score should be >= 90%, actual: " + match.getMatchScore());

        // Verify Notification sent to FARMER
        assertEquals(1, notificationService.notifications.size());
        Notification n = notificationService.notifications.get(0);
        assertEquals(farmer.getId(), n.getUser().getId());
        assertEquals(Notification.NotificationType.NEW_MATCH, n.getType());
        assertTrue(n.getTitle().contains("MATCH FOUND"));
        assertTrue(n.getBody().contains("ABC Foods"));

        // 3. Absolute Rule Test: Buyer cannot start deal
        assertThrows(BadRequestException.class, () -> {
            buyerMatchService.startDeal(buyer.getId(), match.getId());
        }, "Buyer attempting to start deal must throw BadRequestException");

        // 4. Farmer initiates deal
        Map<String, Object> dealStartResult = buyerMatchService.startDeal(farmer.getId(), match.getId());
        assertNotNull(dealStartResult);
        assertEquals("conv-1-2-p101", dealStartResult.get("conversationId"));
        assertEquals(MatchStatus.DEAL_STARTED.name(), dealStartResult.get("status"));

        // Verify buyer is notified that farmer started the deal
        assertEquals(2, notificationService.notifications.size());
        Notification buyerNotif = notificationService.notifications.get(1);
        assertEquals(buyer.getId(), buyerNotif.getUser().getId());
        assertEquals(Notification.NotificationType.DEAL_STARTED, buyerNotif.getType());
        assertTrue(buyerNotif.getTitle().contains("Deal Initiated"));
    }

    /**
     * TEST SCENARIO B: BUYER POSTS REQUIREMENT FIRST
     * Day 1: Buyer posts bulk requirement: Mango, 100 kg, budget ₹105-₹110/kg.
     * Day 5: Farmer creates Mango, 120 kg, ₹108/kg, ready in 7 days.
     * Expected:
     * - Live matching automatically detects match
     * - AI score >= 90%
     * - Notification sent to Farmer
     * - Farmer initiates deal
     */
    @Test
    void testScenarioB_BuyerPostsFirst_FarmerListsLater() {
        LocalDate today = LocalDate.now();

        // 1. Existing buyer requirement
        BuyerRequirement requirement = BuyerRequirement.builder()
                .id(202L)
                .buyer(buyer)
                .crop("Mango")
                .quantity(100)
                .requiredQuantity(100)
                .remainingQuantity(100)
                .unit("kg")
                .minPrice(105.0)
                .maxPrice(110.0)
                .deliveryLocation("Kolkata")
                .requiredBy(today.plusDays(9))
                .status(BuyerRequirement.RequirementStatus.OPEN)
                .build();
        requirementRepo.save(requirement);

        // 2. Farmer creates produce later
        Produce produce = Produce.builder()
                .id(102L)
                .farmer(farmer)
                .name("Mango")
                .quantity(120)
                .unit("kg")
                .pricePerUnit(108.0)
                .location("Kolkata")
                .readyDate(today.plusDays(7))
                .status(ProduceStatus.AVAILABLE)
                .build();
        produceRepo.save(produce);

        // Trigger A: Farmer creates produce -> searches existing active requirements
        List<BuyerMatch> matches = matchingService.matchProduceAgainstRequirements(produce);

        assertNotNull(matches);
        assertEquals(1, matches.size());
        BuyerMatch match = matches.get(0);
        assertTrue(match.getMatchScore() >= 90, "AI match score should be >= 90%, actual: " + match.getMatchScore());

        // Verify Farmer receives match notification
        assertEquals(1, notificationService.notifications.size());
        Notification n = notificationService.notifications.get(0);
        assertEquals(farmer.getId(), n.getUser().getId());
        assertEquals(Notification.NotificationType.NEW_MATCH, n.getType());
        assertTrue(n.getTitle().contains("MATCH FOUND"));
    }

    /**
     * TEST: Incompatible crops must not match
     */
    @Test
    void testIncompatibleCropsDoNotMatch() {
        Produce produce = Produce.builder()
                .id(103L)
                .farmer(farmer)
                .name("Potato")
                .quantity(500)
                .unit("kg")
                .pricePerUnit(20.0)
                .status(ProduceStatus.AVAILABLE)
                .build();
        produceRepo.save(produce);

        BuyerRequirement requirement = BuyerRequirement.builder()
                .id(203L)
                .buyer(buyer)
                .crop("Mango")
                .quantity(100)
                .remainingQuantity(100)
                .unit("kg")
                .status(BuyerRequirement.RequirementStatus.OPEN)
                .build();
        requirementRepo.save(requirement);

        List<BuyerMatch> matches = matchingService.matchRequirementAgainstProduces(requirement);
        assertTrue(matches.isEmpty(), "Incompatible crops must not produce matches");
    }

    // ── In-Memory Test Doubles ──

    static class StubNotificationService extends NotificationService {
        public List<Notification> notifications = new ArrayList<>();

        public StubNotificationService() {
            super(null, null, null);
        }

        @Override
        public Notification createNotification(Long userId, Notification.NotificationType type, String title, String body, Long refId, String refType, String metadata) {
            Notification n = Notification.builder()
                    .user(User.builder().id(userId).build())
                    .type(type)
                    .title(title)
                    .body(body)
                    .referenceId(refId)
                    .referenceType(refType)
                    .metadata(metadata)
                    .build();
            notifications.add(n);
            return n;
        }
    }

    static class StubMessageService extends MessageService {
        public List<Message> sentMessages = new ArrayList<>();

        public StubMessageService() {
            super(null, null, null, null, null);
        }

        @Override
        public Message sendMessage(Long senderId, Long receiverId, String content, Long produceId) {
            Message msg = Message.builder()
                    .conversationId("conv-" + Math.min(senderId, receiverId) + "-" + Math.max(senderId, receiverId) + "-p" + produceId)
                    .sender(User.builder().id(senderId).build())
                    .receiver(User.builder().id(receiverId).build())
                    .content(content)
                    .build();
            sentMessages.add(msg);
            return msg;
        }

        @Override
        public String getOrCreateConversation(Long user1, Long user2, Long produceId) {
            return "conv-" + Math.min(user1, user2) + "-" + Math.max(user1, user2) + (produceId != null ? "-p" + produceId : "");
        }
    }

    static class InMemoryBuyerMatchRepository implements BuyerMatchRepository {
        private final Map<Long, BuyerMatch> data = new HashMap<>();
        private long idSeq = 1000;

        @Override
        public Optional<BuyerMatch> findByProduceIdAndBuyerRequirementId(Long produceId, Long reqId) {
            return data.values().stream()
                    .filter(m -> m.getProduce().getId().equals(produceId) && m.getBuyerRequirement().getId().equals(reqId))
                    .findFirst();
        }

        @Override
        public List<BuyerMatch> findByFarmerIdOrderByCreatedAtDesc(Long farmerId) {
            return data.values().stream().filter(m -> m.getFarmer().getId().equals(farmerId)).toList();
        }

        @Override
        public List<BuyerMatch> findByFarmerIdAndStatusInOrderByCreatedAtDesc(Long farmerId, Collection<MatchStatus> statuses) {
            return data.values().stream().filter(m -> m.getFarmer().getId().equals(farmerId) && statuses.contains(m.getStatus())).toList();
        }

        @Override
        public List<BuyerMatch> findByFarmerIdOrderByMatchScoreDesc(Long farmerId) {
            return data.values().stream()
                    .filter(m -> m.getFarmer().getId().equals(farmerId))
                    .sorted((a, b) -> Integer.compare(b.getMatchScore(), a.getMatchScore()))
                    .toList();
        }

        @Override
        public List<BuyerMatch> findByBuyerRequirementId(Long reqId) {
            return data.values().stream().filter(m -> m.getBuyerRequirement().getId().equals(reqId)).toList();
        }

        @Override
        public List<BuyerMatch> findByBuyerRequirementIdAndStatusNot(Long reqId, MatchStatus status) {
            return data.values().stream().filter(m -> m.getBuyerRequirement().getId().equals(reqId) && m.getStatus() != status).toList();
        }

        @Override
        public List<BuyerMatch> findByProduceId(Long produceId) {
            return data.values().stream().filter(m -> m.getProduce().getId().equals(produceId)).toList();
        }

        @Override
        public List<BuyerMatch> findByProduceIdAndStatusNot(Long produceId, MatchStatus status) {
            return data.values().stream().filter(m -> m.getProduce().getId().equals(produceId) && m.getStatus() != status).toList();
        }

        @Override
        public long countByFarmerIdAndStatus(Long farmerId, MatchStatus status) {
            return data.values().stream().filter(m -> m.getFarmer().getId().equals(farmerId) && m.getStatus() == status).count();
        }

        @Override
        public <S extends BuyerMatch> S save(S entity) {
            if (entity.getId() == null) {
                entity.setId(++idSeq);
                entity.setCreatedAt(LocalDateTime.now());
            }
            entity.setUpdatedAt(LocalDateTime.now());
            data.put(entity.getId(), entity);
            return entity;
        }

        @Override
        public Optional<BuyerMatch> findById(Long id) {
            return Optional.ofNullable(data.get(id));
        }

        @Override
        public List<BuyerMatch> findAll() { return new ArrayList<>(data.values()); }
        @Override
        public boolean existsById(Long aLong) { return data.containsKey(aLong); }
        @Override
        public long count() { return data.size(); }
        @Override
        public void deleteById(Long aLong) { data.remove(aLong); }
        @Override
        public void delete(BuyerMatch entity) { data.remove(entity.getId()); }
        @Override
        public void deleteAllById(Iterable<? extends Long> longs) { longs.forEach(data::remove); }
        @Override
        public void deleteAll(Iterable<? extends BuyerMatch> entities) { entities.forEach(e -> data.remove(e.getId())); }
        @Override
        public void deleteAll() { data.clear(); }
        @Override
        public List<BuyerMatch> findAll(Sort sort) { return findAll(); }
        @Override
        public Page<BuyerMatch> findAll(Pageable pageable) { return null; }
        @Override
        public <S extends BuyerMatch> List<S> saveAll(Iterable<S> entities) {
            List<S> res = new ArrayList<>();
            entities.forEach(e -> res.add(save(e)));
            return res;
        }
        @Override
        public void flush() {}
        @Override
        public <S extends BuyerMatch> S saveAndFlush(S entity) { return save(entity); }
        @Override
        public <S extends BuyerMatch> List<S> saveAllAndFlush(Iterable<S> entities) { return saveAll(entities); }
        @Override
        public void deleteAllInBatch(Iterable<BuyerMatch> entities) { deleteAll(entities); }
        @Override
        public void deleteAllByIdInBatch(Iterable<Long> longs) { deleteAllById(longs); }
        @Override
        public void deleteAllInBatch() { deleteAll(); }
        @Override
        public BuyerMatch getOne(Long aLong) { return data.get(aLong); }
        @Override
        public BuyerMatch getById(Long aLong) { return data.get(aLong); }
        @Override
        public BuyerMatch getReferenceById(Long aLong) { return data.get(aLong); }
        @Override
        public <S extends BuyerMatch> Optional<S> findOne(Example<S> example) { return Optional.empty(); }
        @Override
        public <S extends BuyerMatch> List<S> findAll(Example<S> example) { return Collections.emptyList(); }
        @Override
        public <S extends BuyerMatch> List<S> findAll(Example<S> example, Sort sort) { return Collections.emptyList(); }
        @Override
        public <S extends BuyerMatch> Page<S> findAll(Example<S> example, Pageable pageable) { return null; }
        @Override
        public <S extends BuyerMatch> long count(Example<S> example) { return 0; }
        @Override
        public <S extends BuyerMatch> boolean exists(Example<S> example) { return false; }
        @Override
        public <S extends BuyerMatch, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
        @Override
        public List<BuyerMatch> findAllById(Iterable<Long> longs) { return Collections.emptyList(); }
    }

    static class InMemoryProduceRepository implements ProduceRepository {
        private final Map<Long, Produce> data = new HashMap<>();

        @Override
        public List<Produce> findAll() { return new ArrayList<>(data.values()); }
        @Override
        public <S extends Produce> S save(S entity) { data.put(entity.getId(), entity); return entity; }
        @Override
        public Optional<Produce> findById(Long id) { return Optional.ofNullable(data.get(id)); }
        @Override
        public List<Produce> findByFarmerId(Long farmerId) {
            return data.values().stream().filter(p -> p.getFarmer().getId().equals(farmerId)).toList();
        }
        @Override
        public List<Produce> findByNameContainingIgnoreCase(String name) {
            return data.values().stream().filter(p -> p.getName().toLowerCase().contains(name.toLowerCase())).toList();
        }
        @Override
        public List<Produce> findByCategory(String category) { return Collections.emptyList(); }
        @Override
        public List<Produce> findByLocationContainingIgnoreCase(String location) { return Collections.emptyList(); }
        @Override
        public List<Produce> findByCategoryAndLocationContainingIgnoreCase(String category, String location) { return Collections.emptyList(); }
        @Override
        public List<Produce> findByFarmerAndStatus(User farmer, Produce.ProduceStatus status) {
            return data.values().stream().filter(p -> p.getFarmer() != null && p.getFarmer().getId().equals(farmer.getId()) && p.getStatus() == status).toList();
        }
        @Override
        public List<Produce> findByFarmer(User farmer) {
            return data.values().stream().filter(p -> p.getFarmer() != null && p.getFarmer().getId().equals(farmer.getId())).toList();
        }
        @Override
        public List<Produce> findByFarmerIdAndStatusIn(Long farmerId, List<Produce.ProduceStatus> statuses) {
            return data.values().stream().filter(p -> p.getFarmer() != null && p.getFarmer().getId().equals(farmerId) && statuses.contains(p.getStatus())).toList();
        }
        @Override
        public List<Produce> findByFarmerIdAndStatusNotIn(Long farmerId, List<Produce.ProduceStatus> statuses) {
            return data.values().stream().filter(p -> p.getFarmer() != null && p.getFarmer().getId().equals(farmerId) && !statuses.contains(p.getStatus())).toList();
        }
        @Override
        public List<Produce> findByStatus(Produce.ProduceStatus status) {
            return data.values().stream().filter(p -> p.getStatus() == status).toList();
        }
        @Override
        public List<Produce> findByStatusIn(List<Produce.ProduceStatus> statuses) {
            return data.values().stream().filter(p -> statuses.contains(p.getStatus())).toList();
        }
        @Override
        public long countByStatusIn(List<Produce.ProduceStatus> statuses) {
            return data.values().stream().filter(p -> statuses.contains(p.getStatus())).count();
        }
        @Override
        public Optional<Produce> findByIdempotencyKey(String idempotencyKey) { return Optional.empty(); }
        @Override
        public void flush() {}
        @Override
        public <S extends Produce> S saveAndFlush(S entity) { return save(entity); }
        @Override
        public <S extends Produce> List<S> saveAllAndFlush(Iterable<S> entities) { return Collections.emptyList(); }
        @Override
        public void deleteAllInBatch(Iterable<Produce> entities) {}
        @Override
        public void deleteAllByIdInBatch(Iterable<Long> longs) {}
        @Override
        public void deleteAllInBatch() {}
        @Override
        public Produce getOne(Long aLong) { return data.get(aLong); }
        @Override
        public Produce getById(Long aLong) { return data.get(aLong); }
        @Override
        public Produce getReferenceById(Long aLong) { return data.get(aLong); }
        @Override
        public <S extends Produce> Optional<S> findOne(Example<S> example) { return Optional.empty(); }
        @Override
        public <S extends Produce> List<S> findAll(Example<S> example) { return Collections.emptyList(); }
        @Override
        public <S extends Produce> List<S> findAll(Example<S> example, Sort sort) { return Collections.emptyList(); }
        @Override
        public <S extends Produce> Page<S> findAll(Example<S> example, Pageable pageable) { return null; }
        @Override
        public <S extends Produce> long count(Example<S> example) { return 0; }
        @Override
        public <S extends Produce> boolean exists(Example<S> example) { return false; }
        @Override
        public <S extends Produce, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
        @Override
        public <S extends Produce> List<S> saveAll(Iterable<S> entities) { return Collections.emptyList(); }
        @Override
        public boolean existsById(Long aLong) { return data.containsKey(aLong); }
        @Override
        public List<Produce> findAllById(Iterable<Long> longs) { return Collections.emptyList(); }
        @Override
        public long count() { return data.size(); }
        @Override
        public void deleteById(Long aLong) { data.remove(aLong); }
        @Override
        public void delete(Produce entity) { data.remove(entity.getId()); }
        @Override
        public void deleteAllById(Iterable<? extends Long> longs) {}
        @Override
        public void deleteAll(Iterable<? extends Produce> entities) {}
        @Override
        public void deleteAll() { data.clear(); }
        @Override
        public List<Produce> findAll(Sort sort) { return findAll(); }
        @Override
        public Page<Produce> findAll(Pageable pageable) { return null; }
    }

    static class InMemoryRequirementRepository implements BuyerRequirementRepository {
        private final Map<Long, BuyerRequirement> data = new HashMap<>();

        @Override
        public List<BuyerRequirement> findByStatusInOrderByCreatedAtDesc(List<BuyerRequirement.RequirementStatus> statuses) {
            return data.values().stream().filter(r -> statuses.contains(r.getStatus())).toList();
        }
        @Override
        public List<BuyerRequirement> findByBuyerIdOrderByCreatedAtDesc(Long buyerId) {
            return data.values().stream().filter(r -> r.getBuyer().getId().equals(buyerId)).toList();
        }
        @Override
        public List<BuyerRequirement> findByBuyerIdAndStatusInOrderByCreatedAtDesc(Long buyerId, List<BuyerRequirement.RequirementStatus> statuses) {
            return data.values().stream().filter(r -> r.getBuyer().getId().equals(buyerId) && statuses.contains(r.getStatus())).toList();
        }
        @Override
        public List<BuyerRequirement> findByBuyerIdAndStatusNotInOrderByCreatedAtDesc(Long buyerId, List<BuyerRequirement.RequirementStatus> statuses) {
            return data.values().stream().filter(r -> r.getBuyer().getId().equals(buyerId) && !statuses.contains(r.getStatus())).toList();
        }
        @Override
        public List<BuyerRequirement> findByStatusAndCropIgnoreCaseOrderByCreatedAtDesc(BuyerRequirement.RequirementStatus status, String crop) {
            return data.values().stream().filter(r -> r.getStatus() == status && r.getCrop().equalsIgnoreCase(crop)).toList();
        }
        @Override
        public List<BuyerRequirement> findByStatusAndCropIgnoreCase(BuyerRequirement.RequirementStatus status, String crop) {
            return data.values().stream().filter(r -> r.getStatus() == status && r.getCrop().equalsIgnoreCase(crop)).toList();
        }
        @Override
        public List<BuyerRequirement> findByCropIgnoreCaseAndStatus(String crop, BuyerRequirement.RequirementStatus status) {
            return data.values().stream().filter(r -> r.getStatus() == status && r.getCrop().equalsIgnoreCase(crop)).toList();
        }
        @Override
        public List<BuyerRequirement> findByStatusOrderByCreatedAtDesc(BuyerRequirement.RequirementStatus status) {
            return data.values().stream().filter(r -> r.getStatus() == status).toList();
        }
        @Override
        public long countByStatusIn(List<BuyerRequirement.RequirementStatus> statuses) {
            return data.values().stream().filter(r -> statuses.contains(r.getStatus())).count();
        }
        @Override
        public <S extends BuyerRequirement> S save(S entity) { data.put(entity.getId(), entity); return entity; }
        @Override
        public Optional<BuyerRequirement> findById(Long id) { return Optional.ofNullable(data.get(id)); }
        @Override
        public List<BuyerRequirement> findAll() { return new ArrayList<>(data.values()); }
        @Override
        public void flush() {}
        @Override
        public <S extends BuyerRequirement> S saveAndFlush(S entity) { return save(entity); }
        @Override
        public <S extends BuyerRequirement> List<S> saveAllAndFlush(Iterable<S> entities) { return Collections.emptyList(); }
        @Override
        public void deleteAllInBatch(Iterable<BuyerRequirement> entities) {}
        @Override
        public void deleteAllByIdInBatch(Iterable<Long> longs) {}
        @Override
        public void deleteAllInBatch() {}
        @Override
        public BuyerRequirement getOne(Long aLong) { return data.get(aLong); }
        @Override
        public BuyerRequirement getById(Long aLong) { return data.get(aLong); }
        @Override
        public BuyerRequirement getReferenceById(Long aLong) { return data.get(aLong); }
        @Override
        public <S extends BuyerRequirement> Optional<S> findOne(Example<S> example) { return Optional.empty(); }
        @Override
        public <S extends BuyerRequirement> List<S> findAll(Example<S> example) { return Collections.emptyList(); }
        @Override
        public <S extends BuyerRequirement> List<S> findAll(Example<S> example, Sort sort) { return Collections.emptyList(); }
        @Override
        public <S extends BuyerRequirement> Page<S> findAll(Example<S> example, Pageable pageable) { return null; }
        @Override
        public <S extends BuyerRequirement> long count(Example<S> example) { return 0; }
        @Override
        public <S extends BuyerRequirement> boolean exists(Example<S> example) { return false; }
        @Override
        public <S extends BuyerRequirement, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { return null; }
        @Override
        public <S extends BuyerRequirement> List<S> saveAll(Iterable<S> entities) { return Collections.emptyList(); }
        @Override
        public boolean existsById(Long aLong) { return data.containsKey(aLong); }
        @Override
        public List<BuyerRequirement> findAllById(Iterable<Long> longs) { return Collections.emptyList(); }
        @Override
        public long count() { return data.size(); }
        @Override
        public void deleteById(Long aLong) { data.remove(aLong); }
        @Override
        public void delete(BuyerRequirement entity) { data.remove(entity.getId()); }
        @Override
        public void deleteAllById(Iterable<? extends Long> longs) {}
        @Override
        public void deleteAll(Iterable<? extends BuyerRequirement> entities) {}
        @Override
        public void deleteAll() { data.clear(); }
        @Override
        public List<BuyerRequirement> findAll(Sort sort) { return findAll(); }
        @Override
        public Page<BuyerRequirement> findAll(Pageable pageable) { return null; }
    }
}
