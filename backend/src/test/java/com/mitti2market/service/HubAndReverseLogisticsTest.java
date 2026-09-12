package com.mitti2market.service;

import com.mitti2market.exception.BadRequestException;
import com.mitti2market.model.*;
import com.mitti2market.repository.WarehouseHubRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Example;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.repository.query.FluentQuery;

import java.util.*;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.*;

public class HubAndReverseLogisticsTest {

    private InMemoryWarehouseHubRepository hubRepo;
    private StubNotificationService notificationService;
    private WarehouseHubService hubService;
    private WarehouseHub puneHub;

    @BeforeEach
    void setUp() {
        hubRepo = new InMemoryWarehouseHubRepository();
        notificationService = new StubNotificationService();
        hubService = new WarehouseHubService(hubRepo, notificationService);

        puneHub = WarehouseHub.builder()
                .id(101L)
                .hubCode("M2M-HUB-PUN-01")
                .name("Sahyadri FPO Aggregation Hub")
                .location("Pune, Maharashtra")
                .latitude(18.5089)
                .longitude(73.9259)
                .totalCapacityKg(10000.0)
                .occupiedCapacityKg(5000.0)
                .reservedCapacityKg(1500.0)
                .availableCapacityKg(3500.0)
                .storageType(WarehouseHub.StorageType.COLD_STORAGE)
                .supportedCrops("Potato, Tomato, Onion, Mango")
                .operatingStatus(WarehouseHub.HubStatus.ACTIVE)
                .build();

        hubRepo.save(puneHub);
    }

    @Test
    void testCapacityReservation_SuccessWhenCapacityAvailable() {
        WarehouseHub updated = hubService.reserveCapacity(101L, 2000.0);

        assertEquals(3500.0, updated.getReservedCapacityKg(), "Reserved capacity should increase from 1500 to 3500");
        assertEquals(1500.0, updated.getAvailableCapacityKg(), "Available capacity should decrease from 3500 to 1500");
    }

    @Test
    void testCapacityReservation_FailsWhenExceedingAvailable() {
        // Available is 3500 kg, attempting to reserve 4000 kg must throw BadRequestException
        BadRequestException ex = assertThrows(BadRequestException.class, () -> {
            hubService.reserveCapacity(101L, 4000.0);
        });

        assertTrue(ex.getMessage().contains("Insufficient capacity"), "Error message should report insufficient capacity");
    }

    @Test
    void testReverseLogisticsOptimization_RecommendsNearestHubWhenCloserThanFarmer() {
        // Buyer at Pune (18.5204, 73.8567)
        // Hub at Hadapsar Pune (18.5089, 73.9259) ~ 7.5 km
        // Farmer at Nashik (19.9975, 73.7898) ~ 165 km
        double buyerLat = 18.5204;
        double buyerLng = 73.8567;
        double farmerLat = 19.9975;
        double farmerLng = 73.7898;

        ReverseLogisticsService revService = new ReverseLogisticsService(
                null, null, null, null,
                hubRepo, hubService, null, null,
                notificationService, null
        );

        Map<String, Object> opt = revService.optimizeReverseDestination(
                buyerLat, buyerLng, "Pune Warehouse",
                farmerLat, farmerLng, "Nashik Farm",
                "Potato", 500.0
        );

        assertEquals("NEAREST_HUB", opt.get("recommendedType"), "Should recommend NEAREST_HUB rather than hauling 165 km back to farmer");
        assertEquals(101L, opt.get("recommendedHubId"));
        assertTrue(((Double) opt.get("distanceSavedKm")) > 100.0, "Should save over 100 km of unnecessary reverse transportation");
    }

    @Test
    void testReverseLogisticsOptimization_RecommendsFarmerWhenFarmerIsNearby() {
        // Buyer at Pune, Farmer also nearby in Pune (~1.1 km away)
        double buyerLat = 18.5204;
        double buyerLng = 73.8567;
        double farmerLat = 18.5300;
        double farmerLng = 73.8600;

        ReverseLogisticsService revService = new ReverseLogisticsService(
                null, null, null, null,
                hubRepo, hubService, null, null,
                notificationService, null
        );

        Map<String, Object> opt = revService.optimizeReverseDestination(
                buyerLat, buyerLng, "Pune Center",
                farmerLat, farmerLng, "Pune Farm",
                "Potato", 500.0
        );

        assertEquals("FARMER", opt.get("recommendedType"), "Should recommend direct return to farmer when farmer is nearby");
    }

    // ================= In-memory Test Doubles =================

    static class InMemoryWarehouseHubRepository implements WarehouseHubRepository {
        private final Map<Long, WarehouseHub> data = new HashMap<>();

        @Override
        public Optional<WarehouseHub> findByHubCode(String hubCode) {
            return data.values().stream().filter(h -> h.getHubCode().equalsIgnoreCase(hubCode)).findFirst();
        }

        @Override
        public Optional<WarehouseHub> findByIdWithLock(Long id) {
            return Optional.ofNullable(data.get(id));
        }

        @Override
        public List<WarehouseHub> findByOperatingStatus(WarehouseHub.HubStatus operatingStatus) {
            return data.values().stream().filter(h -> h.getOperatingStatus() == operatingStatus).toList();
        }

        @Override
        public List<WarehouseHub> findByStateIgnoreCase(String state) {
            return data.values().stream().filter(h -> h.getState() != null && h.getState().equalsIgnoreCase(state)).toList();
        }

        @Override
        public List<WarehouseHub> findByDistrictIgnoreCase(String district) {
            return data.values().stream().filter(h -> h.getDistrict() != null && h.getDistrict().equalsIgnoreCase(district)).toList();
        }

        @Override
        public List<WarehouseHub> findActiveWithAvailableCapacity(Double minCapacity) {
            return data.values().stream().filter(h -> h.getOperatingStatus() == WarehouseHub.HubStatus.ACTIVE && h.getAvailableCapacityKg() > minCapacity).toList();
        }

        @Override
        public <S extends WarehouseHub> S save(S entity) {
            data.put(entity.getId(), entity);
            return entity;
        }

        @Override
        public Optional<WarehouseHub> findById(Long id) {
            return Optional.ofNullable(data.get(id));
        }

        @Override
        public List<WarehouseHub> findAll() {
            return new ArrayList<>(data.values());
        }

        @Override
        public void flush() {}

        @Override
        public <S extends WarehouseHub> S saveAndFlush(S entity) {
            return save(entity);
        }

        @Override
        public <S extends WarehouseHub> List<S> saveAllAndFlush(Iterable<S> entities) {
            return Collections.emptyList();
        }

        @Override
        public void deleteAllInBatch(Iterable<WarehouseHub> entities) {}

        @Override
        public void deleteAllByIdInBatch(Iterable<Long> longs) {}

        @Override
        public void deleteAllInBatch() {}

        @Override
        public WarehouseHub getOne(Long aLong) {
            return data.get(aLong);
        }

        @Override
        public WarehouseHub getById(Long aLong) {
            return data.get(aLong);
        }

        @Override
        public WarehouseHub getReferenceById(Long aLong) {
            return data.get(aLong);
        }

        @Override
        public <S extends WarehouseHub> Optional<S> findOne(Example<S> example) {
            return Optional.empty();
        }

        @Override
        public <S extends WarehouseHub> List<S> findAll(Example<S> example) {
            return Collections.emptyList();
        }

        @Override
        public <S extends WarehouseHub> List<S> findAll(Example<S> example, Sort sort) {
            return Collections.emptyList();
        }

        @Override
        public <S extends WarehouseHub> Page<S> findAll(Example<S> example, Pageable pageable) {
            return null;
        }

        @Override
        public <S extends WarehouseHub> long count(Example<S> example) {
            return 0;
        }

        @Override
        public <S extends WarehouseHub> boolean exists(Example<S> example) {
            return false;
        }

        @Override
        public <S extends WarehouseHub, R> R findBy(Example<S> example, Function<FluentQuery.FetchableFluentQuery<S>, R> queryFunction) {
            return null;
        }

        @Override
        public <S extends WarehouseHub> List<S> saveAll(Iterable<S> entities) {
            return Collections.emptyList();
        }

        @Override
        public boolean existsById(Long aLong) {
            return data.containsKey(aLong);
        }

        @Override
        public List<WarehouseHub> findAllById(Iterable<Long> longs) {
            return Collections.emptyList();
        }

        @Override
        public long count() {
            return data.size();
        }

        @Override
        public void deleteById(Long aLong) {
            data.remove(aLong);
        }

        @Override
        public void delete(WarehouseHub entity) {
            data.remove(entity.getId());
        }

        @Override
        public void deleteAllById(Iterable<? extends Long> longs) {}

        @Override
        public void deleteAll(Iterable<? extends WarehouseHub> entities) {}

        @Override
        public void deleteAll() {
            data.clear();
        }

        @Override
        public List<WarehouseHub> findAll(Sort sort) {
            return findAll();
        }

        @Override
        public Page<WarehouseHub> findAll(Pageable pageable) {
            return null;
        }
    }

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
}
