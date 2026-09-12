package com.mitti2market.service;

import com.mitti2market.exception.BadRequestException;
import com.mitti2market.exception.ResourceNotFoundException;
import com.mitti2market.model.*;
import com.mitti2market.repository.EvidenceRepository;
import com.mitti2market.repository.InventoryLotRepository;
import com.mitti2market.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

@Service
@RequiredArgsConstructor
public class InventoryLotService {

    private final InventoryLotRepository lotRepo;
    private final WarehouseHubService hubService;
    private final EvidenceRepository evidenceRepo;
    private final UserRepository userRepo;
    private final NotificationService notificationService;

    private final AtomicLong lotSeq = new AtomicLong(100);

    @Transactional(readOnly = true)
    public List<InventoryLot> getLotsByHub(Long hubId) {
        return lotRepo.findByHubIdOrderByCreatedAtDesc(hubId);
    }

    @Transactional(readOnly = true)
    public List<InventoryLot> getLotsByFarmer(Long farmerId) {
        return lotRepo.findByFarmerIdOrderByCreatedAtDesc(farmerId);
    }

    @Transactional(readOnly = true)
    public InventoryLot getLotById(Long id) {
        return lotRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("InventoryLot", "id", id));
    }

    @Transactional(readOnly = true)
    public InventoryLot getLotByLotId(String lotId) {
        return lotRepo.findByLotId(lotId)
                .orElseThrow(() -> new ResourceNotFoundException("InventoryLot", "lotId", lotId));
    }

    /**
     * Record inbound agricultural lot arriving at a partner hub.
     */
    @Transactional
    public InventoryLot recordInbound(
            Long hubId,
            Long userId,
            String cropName,
            String grade,
            Double receivedQuantityKg,
            Double expectedQuantityKg,
            InventoryLot.LotCondition condition,
            InventoryLot.PackagingType packagingType,
            String storageLocationBay,
            Long dealId,
            Long orderId,
            Long farmerId,
            String notes,
            String evidenceImageUrl
    ) {
        WarehouseHub hub = hubService.getHubById(hubId);
        User verifier = userRepo.findById(userId).orElseThrow();

        if (receivedQuantityKg == null || receivedQuantityKg <= 0) {
            throw new BadRequestException("Received quantity in kg must be greater than zero");
        }

        User farmer = null;
        if (farmerId != null) {
            farmer = userRepo.findById(farmerId).orElse(null);
        }

        String dateStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String lotId = "LOT-M2M-" + dateStr + "-" + lotSeq.incrementAndGet();

        InventoryLot lot = InventoryLot.builder()
                .lotId(lotId)
                .hub(hub)
                .cropName(cropName)
                .grade(grade != null ? grade : "Standard")
                .initialQuantityKg(receivedQuantityKg)
                .availableQuantityKg(receivedQuantityKg)
                .reservedQuantityKg(0.0)
                .dispatchedQuantityKg(0.0)
                .quarantinedQuantityKg(0.0)
                .inboundCondition(condition != null ? condition : InventoryLot.LotCondition.GOOD)
                .packagingType(packagingType != null ? packagingType : InventoryLot.PackagingType.GUNNY_BAGS)
                .status(InventoryLot.LotStatus.IN_STORAGE)
                .storageLocationBay(storageLocationBay != null ? storageLocationBay : "General Staging")
                .dealId(dealId)
                .orderId(orderId)
                .farmer(farmer)
                .inboundDate(LocalDateTime.now())
                .inboundVerifiedBy(verifier)
                .inboundNotes(notes)
                .build();

        lot = lotRepo.save(lot);

        // Update hub capacity (transition expected reserved capacity to occupied stock)
        double previouslyReserved = expectedQuantityKg != null ? expectedQuantityKg : receivedQuantityKg;
        hubService.recordInboundOccupied(hubId, receivedQuantityKg, previouslyReserved);

        // Record inbound evidence if photographic proof is attached
        if (evidenceImageUrl != null && !evidenceImageUrl.isBlank()) {
            Evidence ev = Evidence.builder()
                    .dealId(dealId != null ? dealId : 0L)
                    .orderId(orderId)
                    .lotId(lotId)
                    .hubId(hubId)
                    .stage(Evidence.EvidenceStage.HUB_INBOUND)
                    .uploader(verifier)
                    .uploaderRole(verifier.getRole() != null ? verifier.getRole().name() : "HUB_OPERATOR")
                    .imageUrl(evidenceImageUrl)
                    .lotQuantity(receivedQuantityKg)
                    .grade(grade)
                    .location(hub.getName() + ", " + hub.getLocation())
                    .latitude(hub.getLatitude())
                    .longitude(hub.getLongitude())
                    .description("Hub Inbound Verification: " + lotId + " (" + receivedQuantityKg + " kg " + cropName + ")")
                    .verificationStatus(Evidence.VerificationStatus.VERIFIED)
                    .verifiedBy(verifier)
                    .verifiedAt(LocalDateTime.now())
                    .observerNotes(notes)
                    .build();
            evidenceRepo.save(ev);
        }

        // Notify farmer if linked
        if (farmer != null) {
            notificationService.createNotification(
                    farmer.getId(),
                    Notification.NotificationType.HUB_INBOUND_RECORDED,
                    "Produce Stored at Hub",
                    "Your " + receivedQuantityKg + " kg of " + cropName + " has been received and verified at " + hub.getName() + " (Lot " + lotId + ")."
            );
        }

        return lot;
    }

    /**
     * Reserve lot inventory when buyer places an order from a warehouse lot.
     * Pessimistic locking eliminates race conditions and overselling.
     */
    @Transactional
    public InventoryLot reserveLotQuantity(String lotId, double requestedQtyKg) {
        if (requestedQtyKg <= 0) throw new BadRequestException("Requested quantity must be positive");

        InventoryLot lot = lotRepo.findByLotIdWithLock(lotId)
                .orElseThrow(() -> new ResourceNotFoundException("InventoryLot", "lotId", lotId));

        if (lot.getStatus() == InventoryLot.LotStatus.QUARANTINED || lot.getStatus() == InventoryLot.LotStatus.REJECTED) {
            throw new BadRequestException("Lot " + lotId + " is currently " + lot.getStatus());
        }

        if (lot.getAvailableQuantityKg() < requestedQtyKg) {
            throw new BadRequestException("Insufficient available stock in Lot " + lotId
                    + ": requested " + (int) requestedQtyKg + " kg, available " + (int) (double) lot.getAvailableQuantityKg() + " kg");
        }

        lot.setAvailableQuantityKg(lot.getAvailableQuantityKg() - requestedQtyKg);
        lot.setReservedQuantityKg(lot.getReservedQuantityKg() + requestedQtyKg);
        lot.setStatus(lot.getAvailableQuantityKg() <= 0 ? InventoryLot.LotStatus.RESERVED : InventoryLot.LotStatus.PARTIALLY_DISPATCHED);

        return lotRepo.save(lot);
    }

    /**
     * Record outbound dispatch from hub.
     */
    @Transactional
    public InventoryLot recordOutboundDispatch(
            String lotId,
            Long userId,
            Double dispatchQuantityKg,
            String destinationLocation,
            String buyerName,
            Long dealId,
            String dispatchNotes,
            String evidenceImageUrl
    ) {
        InventoryLot lot = lotRepo.findByLotIdWithLock(lotId)
                .orElseThrow(() -> new ResourceNotFoundException("InventoryLot", "lotId", lotId));
        User verifier = userRepo.findById(userId).orElseThrow();

        if (dispatchQuantityKg == null || dispatchQuantityKg <= 0) {
            throw new BadRequestException("Dispatch quantity must be greater than zero");
        }

        // Deduct from reserved (or available if direct dispatch)
        if (lot.getReservedQuantityKg() >= dispatchQuantityKg) {
            lot.setReservedQuantityKg(lot.getReservedQuantityKg() - dispatchQuantityKg);
        } else {
            double remainingNeeded = dispatchQuantityKg - lot.getReservedQuantityKg();
            lot.setReservedQuantityKg(0.0);
            if (lot.getAvailableQuantityKg() < remainingNeeded) {
                throw new BadRequestException("Insufficient stock in Lot " + lotId + " for dispatch");
            }
            lot.setAvailableQuantityKg(lot.getAvailableQuantityKg() - remainingNeeded);
        }

        lot.setDispatchedQuantityKg(lot.getDispatchedQuantityKg() + dispatchQuantityKg);
        if (lot.getAvailableQuantityKg() <= 0 && lot.getReservedQuantityKg() <= 0) {
            lot.setStatus(InventoryLot.LotStatus.DISPATCHED);
        } else {
            lot.setStatus(InventoryLot.LotStatus.PARTIALLY_DISPATCHED);
        }

        lot = lotRepo.save(lot);

        // Update hub occupied capacity
        hubService.recordOutboundDispatched(lot.getHub().getId(), dispatchQuantityKg);

        // Record outbound evidence
        if (evidenceImageUrl != null && !evidenceImageUrl.isBlank()) {
            Evidence ev = Evidence.builder()
                    .dealId(dealId != null ? dealId : (lot.getDealId() != null ? lot.getDealId() : 0L))
                    .lotId(lotId)
                    .hubId(lot.getHub().getId())
                    .stage(Evidence.EvidenceStage.HUB_OUTBOUND)
                    .uploader(verifier)
                    .uploaderRole(verifier.getRole() != null ? verifier.getRole().name() : "HUB_OPERATOR")
                    .imageUrl(evidenceImageUrl)
                    .lotQuantity(dispatchQuantityKg)
                    .location(lot.getHub().getName() + " → " + destinationLocation)
                    .description("Hub Outbound Dispatch: " + lotId + " (" + dispatchQuantityKg + " kg to " + buyerName + ")")
                    .verificationStatus(Evidence.VerificationStatus.VERIFIED)
                    .verifiedBy(verifier)
                    .verifiedAt(LocalDateTime.now())
                    .observerNotes(dispatchNotes)
                    .build();
            evidenceRepo.save(ev);
        }

        return lot;
    }
}
