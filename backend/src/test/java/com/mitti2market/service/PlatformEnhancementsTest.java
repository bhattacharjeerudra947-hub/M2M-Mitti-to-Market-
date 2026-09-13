package com.mitti2market.service;

import com.mitti2market.dto.DealAnalysis;
import com.mitti2market.dto.StorageFacilityDto;
import com.mitti2market.exception.BadRequestException;
import com.mitti2market.model.*;
import com.mitti2market.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PlatformEnhancementsTest {

    @Mock
    private PaymentTransactionRepository paymentRepo;
    @Mock
    private DealRepository dealRepo;
    @Mock
    private UserRepository userRepo;
    @Mock
    private NotificationService notificationService;
    @Mock
    private WarehouseHubRepository hubRepository;
    @Mock
    private GoogleMapsService googleMapsService;
    @Mock
    private LogisticsIncidentRepository incidentRepo;

    @InjectMocks
    private PaymentService paymentService;

    @InjectMocks
    private StorageFacilityService storageFacilityService;

    @InjectMocks
    private LogisticsIncidentService incidentService;

    private User farmer;
    private User buyer;
    private Deal deal;
    private Produce produce;

    @BeforeEach
    void setUp() {
        farmer = User.builder().id(1L).name("Ramesh").role(User.Role.FARMER).build();
        buyer = User.builder().id(2L).name("Priya").role(User.Role.BUSINESS).build();

        produce = Produce.builder()
                .id(10L)
                .name("Organic Tomatoes")
                .quantity(100)
                .listedQuantity(100)
                .reservedQuantity(0)
                .soldQuantity(0)
                .unit("kg")
                .pricePerUnit(30.0)
                .farmer(farmer)
                .status(Produce.ProduceStatus.AVAILABLE)
                .build();

        deal = Deal.builder()
                .id(100L)
                .dealId("M2M-2026-100")
                .farmer(farmer)
                .buyer(buyer)
                .produce(produce)
                .quantity(30)
                .unit("kg")
                .agreedPrice(30.0)
                .totalAmount(900.0)
                .paymentStatus("UNPAID")
                .build();
    }

    @Test
    @DisplayName("Produce lifecycle: Available = Listed - Reserved - Sold and auto SOLD_OUT")
    void testProduceQuantityLifecycle() {
        assertEquals(100, produce.getAvailableQuantity());

        // Reserve 40kg
        produce.setReservedQuantity(40);
        produce.recalculateQuantityAndStatus();
        assertEquals(60, produce.getAvailableQuantity());
        assertEquals(60, produce.getQuantity());

        // Complete 40kg (move to sold)
        produce.setReservedQuantity(0);
        produce.setSoldQuantity(40);
        produce.recalculateQuantityAndStatus();
        assertEquals(60, produce.getAvailableQuantity());
        assertEquals(Produce.ProduceStatus.PARTIALLY_SOLD, produce.getStatus());

        // Sell all remaining 60kg
        produce.setSoldQuantity(100);
        produce.recalculateQuantityAndStatus();
        assertEquals(0, produce.getAvailableQuantity());
        assertEquals(Produce.ProduceStatus.SOLD_OUT, produce.getStatus());
    }

    @Test
    @DisplayName("PaymentService: Rejects mismatched payment amount")
    void testPaymentAmountMismatch() {
        when(dealRepo.findById(100L)).thenReturn(Optional.of(deal));
        when(userRepo.findById(2L)).thenReturn(Optional.of(buyer));

        // Expected is 900.0, attempt to pay 500.0
        assertThrows(BadRequestException.class, () ->
                paymentService.createDemoPayment(100L, 2L, 500.0, "UPI")
        );
    }

    @Test
    @DisplayName("PaymentService: Successfully creates and confirms sandbox demo payment")
    void testPaymentSuccess() {
        when(dealRepo.findById(100L)).thenReturn(Optional.of(deal));
        when(userRepo.findById(2L)).thenReturn(Optional.of(buyer));
        when(paymentRepo.save(any(PaymentTransaction.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PaymentTransaction txn = paymentService.createDemoPayment(100L, 2L, 900.0, "UPI");
        assertNotNull(txn);
        assertTrue(txn.getTransactionId().startsWith("M2M-DEMO-TXN-"));
        assertEquals(PaymentTransaction.PaymentStatus.PENDING, txn.getStatus());
        assertTrue(txn.getIsDemo());

        when(paymentRepo.findByTransactionId(txn.getTransactionId())).thenReturn(Optional.of(txn));
        PaymentTransaction confirmed = paymentService.confirmDemoPayment(txn.getTransactionId());
        assertEquals(PaymentTransaction.PaymentStatus.SUCCESS, confirmed.getStatus());
        assertEquals("PAID_ESCROW", deal.getPaymentStatus());
    }

    @Test
    @DisplayName("StorageFacilityService: Returns nearby verified partner hubs with distance")
    void testStorageFacilityLookup() {
        WarehouseHub hub = WarehouseHub.builder()
                .id(1L)
                .hubCode("M2M-HUB-PUN-01")
                .name("Pune Agro Cold Storage")
                .district("Pune")
                .state("Maharashtra")
                .latitude(18.5204)
                .longitude(73.8567)
                .operatingStatus(WarehouseHub.HubStatus.ACTIVE)
                .storageType(WarehouseHub.StorageType.COLD_STORAGE)
                .totalCapacityKg(50000.0)
                .availableCapacityKg(35000.0)
                .build();

        when(hubRepository.findByOperatingStatus(WarehouseHub.HubStatus.ACTIVE)).thenReturn(List.of(hub));

        List<StorageFacilityDto> results = storageFacilityService.findNearbyFacilities(
                18.5300, 73.8500, null, "Pune", 50000);

        assertFalse(results.isEmpty());
        StorageFacilityDto first = results.get(0);
        assertEquals("Pune Agro Cold Storage", first.getName());
        assertTrue(first.getIsPartnerHub());
        assertNotNull(first.getDistanceKm());
    }

    @Test
    @DisplayName("LogisticsIncidentService: Report transit incident and adjudicate liability")
    void testIncidentReportingAndLiability() {
        when(dealRepo.findById(100L)).thenReturn(Optional.of(deal));
        when(userRepo.findById(2L)).thenReturn(Optional.of(buyer));
        when(incidentRepo.save(any(LogisticsIncident.class))).thenAnswer(invocation -> {
            LogisticsIncident inc = invocation.getArgument(0);
            if (inc.getId() == null) inc.setId(501L);
            return inc;
        });

        LogisticsIncident incident = incidentService.reportIncident(
                100L, 2L, LogisticsIncident.IncidentType.TRANSIT_DAMAGE,
                "Crates damaged due to improper transit cooling", null, 1500.0);

        assertNotNull(incident);
        assertTrue(incident.getIncidentNumber().startsWith("INC-M2M-"));
        assertEquals(LogisticsIncident.LiabilityParty.UNDETERMINED, incident.getLiabilityParty());

        User admin = User.builder().id(99L).name("Admin").role(User.Role.ADMIN).build();
        when(incidentRepo.findById(501L)).thenReturn(Optional.of(incident));
        when(userRepo.findById(99L)).thenReturn(Optional.of(admin));

        LogisticsIncident resolved = incidentService.adjudicateLiability(
                501L, 99L, LogisticsIncident.LiabilityParty.THIRD_PARTY_LOGISTICS,
                "Transporter failed to maintain required cold chain",
                "Liability attributed to third-party transporter. Buyer reimbursed.");

        assertEquals(LogisticsIncident.LiabilityParty.THIRD_PARTY_LOGISTICS, resolved.getLiabilityParty());
        assertEquals(LogisticsIncident.IncidentStatus.RESOLVED, resolved.getStatus());
    }
}
