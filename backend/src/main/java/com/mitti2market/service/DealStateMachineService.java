package com.mitti2market.service;

import com.mitti2market.exception.BadRequestException;
import com.mitti2market.model.Deal;
import com.mitti2market.model.Deal.DealStatus;
import com.mitti2market.model.DealEvent;
import com.mitti2market.repository.DealEventRepository;
import com.mitti2market.repository.DealRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Controlled deal state machine.
 *
 * Controllers and services must go through this class to change a deal's
 * status — arbitrary frontend-driven status changes are rejected.
 *
 * Every valid transition is recorded as a DealEvent (audit log + timeline source).
 */
@Service
@RequiredArgsConstructor
public class DealStateMachineService {

    private final DealRepository dealRepo;
    private final DealEventRepository eventRepo;

    /** Allowed transitions. A deal can always move to CANCELLED / DISPUTED (controlled). */
    private static final Map<DealStatus, Set<DealStatus>> TRANSITIONS = Map.ofEntries(
            Map.entry(DealStatus.NEGOTIATING, Set.of(DealStatus.LOCK_PENDING)),
            Map.entry(DealStatus.LOCK_PENDING, Set.of(DealStatus.LOCKED, DealStatus.CANCELLED)),
            Map.entry(DealStatus.LOCKED, Set.of(DealStatus.LOGISTICS_PENDING, DealStatus.CANCELLED, DealStatus.DISPUTED)),
            Map.entry(DealStatus.LOGISTICS_PENDING, Set.of(DealStatus.LOGISTICS_ASSIGNED, DealStatus.CANCELLED, DealStatus.DISPUTED)),
            Map.entry(DealStatus.LOGISTICS_ASSIGNED, Set.of(DealStatus.PICKUP_SCHEDULED, DealStatus.CANCELLED, DealStatus.DISPUTED)),
            Map.entry(DealStatus.PICKUP_SCHEDULED, Set.of(DealStatus.PICKED_UP, DealStatus.CANCELLED, DealStatus.DISPUTED)),
            Map.entry(DealStatus.PICKED_UP, Set.of(DealStatus.IN_TRANSIT, DealStatus.DISPUTED)),
            Map.entry(DealStatus.IN_TRANSIT, Set.of(DealStatus.OUT_FOR_DELIVERY, DealStatus.DISPUTED)),
            Map.entry(DealStatus.OUT_FOR_DELIVERY, Set.of(DealStatus.DELIVERED, DealStatus.COMPLETED, DealStatus.DISPUTED)),
            Map.entry(DealStatus.DELIVERED, Set.of(DealStatus.COMPLETED, DealStatus.DISPUTED)),
            Map.entry(DealStatus.COMPLETED, Set.of()),
            Map.entry(DealStatus.CANCELLED, Set.of()),
            Map.entry(DealStatus.DISPUTED, Set.of(DealStatus.COMPLETED, DealStatus.CANCELLED))
    );

    /**
     * Validate that a status transition is legal.
     */
    public boolean canTransition(DealStatus from, DealStatus to) {
        return TRANSITIONS.getOrDefault(from, Set.of()).contains(to);
    }

    /**
     * Apply a controlled transition. Throws if illegal.
     * Records a DealEvent for the timeline.
     */
    @Transactional
    public Deal transition(Long dealId, DealStatus target, Long actorId, String actorRole,
                           String description, String metadata) {
        Deal deal = dealRepo.findById(dealId)
                .orElseThrow(() -> new BadRequestException("Deal not found: " + dealId));

        DealStatus from = deal.getStatus();
        if (from == target) {
            return deal;
        }
        if (!canTransition(from, target)) {
            throw new BadRequestException("Illegal deal transition: " + from + " → " + target);
        }

        deal.setStatus(target);
        if (target == DealStatus.LOCKED) deal.setLockedAt(java.time.LocalDateTime.now());
        if (target == DealStatus.COMPLETED) deal.setCompletedAt(java.time.LocalDateTime.now());
        deal = dealRepo.save(deal);

        recordEvent(dealId, target.name(), actorId, actorRole, description, metadata);
        return deal;
    }

    /**
     * Record an audit event on a deal (used by all lifecycle services).
     */
    @Transactional
    public DealEvent recordEvent(Long dealId, String eventType, Long actorId, String actorRole,
                                 String description, String metadata) {
        DealEvent event = DealEvent.builder()
                .dealId(dealId)
                .eventType(eventType)
                .actorId(actorId)
                .actorRole(actorRole)
                .description(description)
                .metadata(metadata)
                .build();
        return eventRepo.save(event);
    }

    /**
     * Full timeline for a deal, oldest first.
     */
    public List<DealEvent> getTimeline(Long dealId) {
        return eventRepo.findByDealIdOrderByCreatedAtAsc(dealId);
    }
}