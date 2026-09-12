package com.mitti2market.service;

import com.mitti2market.dto.produce.ProduceRequest;
import com.mitti2market.dto.produce.ProduceResponse;
import com.mitti2market.exception.BadRequestException;
import com.mitti2market.exception.ResourceNotFoundException;
import com.mitti2market.model.Produce;
import com.mitti2market.model.Produce.ProduceStatus;
import com.mitti2market.model.User;
import com.mitti2market.repository.ProduceRepository;
import com.mitti2market.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ProduceService {

    private final ProduceRepository produceRepository;
    private final UserRepository userRepository;
    private final MarketDataService marketDataService;
    private final MatchingService matchingService;

    public ProduceResponse create(ProduceRequest request) {
        User farmer = userRepository.findById(request.getFarmerId())
                .orElseThrow(() -> new ResourceNotFoundException("Farmer", "id", request.getFarmerId()));

        if (farmer.getRole() != User.Role.FARMER) {
            throw new BadRequestException("User is not a farmer");
        }

        // ── Offline-sync idempotency ──────────────────────────────
        // The same idempotency key must always resolve to the same listing,
        // so retries after network loss never create duplicate produce.
        String key = request.getIdempotencyKey();
        if (key != null && !key.isBlank()) {
            java.util.Optional<Produce> existing = produceRepository.findByIdempotencyKey(key);
            if (existing.isPresent()) {
                return toResponse(existing.get());
            }
        }

        java.time.LocalDate expDate = calculateExpiryDate(request.getHarvestDate(), request.getShelfLife(), request.getExpiryDate());

        Produce produce = Produce.builder()
                .farmer(farmer)
                .name(request.getName())
                .category(request.getCategory())
                .quantity(request.getQuantity())
                .listedQuantity(request.getQuantity())
                .reservedQuantity(0)
                .soldQuantity(0)
                .unit(request.getUnit())
                .pricePerUnit(request.getPricePerUnit())
                .description(request.getDescription())
                .location(request.getLocation())
                .imageUrl(request.getImageUrl())
                .readyDate(request.getReadyDate())
                .harvestDate(request.getHarvestDate())
                .shelfLife(request.getShelfLife())
                .expiryDate(expDate)
                .expiryWarningSent(false)
                .idempotencyKey(key)
                .status(ProduceStatus.AVAILABLE)
                .build();

        // AI Price Advisor: compute suggested price based on market demand data
        computeAiPriceBand(produce);

        try {
            Produce saved = produceRepository.save(produce);
            // Two-way matching Trigger A: match against existing active bulk requirements
            matchingService.matchProduceAgainstRequirements(saved);
            return toResponse(saved);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            // Unique-constraint race: two identical requests arrived concurrently.
            // Return the already-created record instead of failing.
            if (key != null && !key.isBlank()) {
                return produceRepository.findByIdempotencyKey(key)
                        .map(this::toResponse)
                        .orElseThrow(() -> new BadRequestException("Could not create produce listing"));
            }
            throw e;
        }
    }

    public List<ProduceResponse> listAll(String category, String keyword, String location, Boolean availableOnly) {
        List<Produce> produceList;

        if (category != null && !category.isBlank() && location != null && !location.isBlank()) {
            produceList = produceRepository.findByCategoryAndLocationContainingIgnoreCase(category, location);
        } else if (category != null && !category.isBlank()) {
            produceList = produceRepository.findByCategory(category);
        } else if (location != null && !location.isBlank()) {
            produceList = produceRepository.findByLocationContainingIgnoreCase(location);
        } else if (keyword != null && !keyword.isBlank()) {
            produceList = produceRepository.findByNameContainingIgnoreCase(keyword);
        } else {
            produceList = produceRepository.findAll();
        }

        // By default or when availableOnly is true, filter out SOLD_OUT, REMOVED, ADMIN_REMOVED, INACTIVE, EXPIRED, and past expiryDate
        List<ProduceStatus> activeStatuses = List.of(
                ProduceStatus.AVAILABLE,
                ProduceStatus.LOW_STOCK,
                ProduceStatus.PARTIALLY_SOLD
        );

        java.time.LocalDate today = java.time.LocalDate.now();
        produceList = produceList.stream()
                .filter(p -> activeStatuses.contains(p.getStatus())
                        && (p.getQuantity() == null || p.getQuantity() > 0)
                        && (p.getExpiryDate() == null || !p.getExpiryDate().isBefore(today)))
                .toList();

        return produceList.stream().map(this::toResponse).toList();
    }

    /**
     * Paged marketplace browse with filters.
     * Returns a map with content, page, size, totalElements, totalPages.
     */
    public Map<String, Object> listAllPaged(String category, String keyword, String location,
                                            Boolean availableOnly, int page, int size) {
        List<ProduceResponse> all = listAll(category, keyword, location, availableOnly);

        int total = all.size();
        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(size, 50));
        int from = Math.min(safePage * safeSize, total);
        int to = Math.min(from + safeSize, total);

        List<ProduceResponse> content = all.subList(from, to);

        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("content", content);
        result.put("page", safePage);
        result.put("size", safeSize);
        result.put("totalElements", total);
        result.put("totalPages", safeSize > 0 ? (int) Math.ceil((double) total / safeSize) : 0);
        result.put("hasMore", to < total);
        return result;
    }

    public ProduceResponse getById(Long id) {
        Produce produce = produceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Produce", "id", id));
        return toResponse(produce);
    }

    public List<ProduceResponse> getByFarmer(Long farmerId) {
        if (!userRepository.existsById(farmerId)) {
            throw new ResourceNotFoundException("Farmer", "id", farmerId);
        }
        return produceRepository.findByFarmerId(farmerId).stream()
                .map(this::toResponse)
                .toList();
    }

    public List<ProduceResponse> getActiveByFarmer(Long farmerId) {
        List<ProduceStatus> activeStatuses = List.of(
                ProduceStatus.AVAILABLE,
                ProduceStatus.LOW_STOCK,
                ProduceStatus.PARTIALLY_SOLD
        );
        java.time.LocalDate today = java.time.LocalDate.now();
        return produceRepository.findByFarmerId(farmerId).stream()
                .filter(p -> activeStatuses.contains(p.getStatus())
                        && p.getQuantity() != null && p.getQuantity() > 0
                        && (p.getExpiryDate() == null || !p.getExpiryDate().isBefore(today)))
                .map(this::toResponse).toList();
    }

    public List<ProduceResponse> getHistoryByFarmer(Long farmerId) {
        List<ProduceStatus> activeStatuses = List.of(
                ProduceStatus.AVAILABLE,
                ProduceStatus.LOW_STOCK,
                ProduceStatus.PARTIALLY_SOLD
        );
        java.time.LocalDate today = java.time.LocalDate.now();
        return produceRepository.findByFarmerId(farmerId).stream()
                .filter(p -> !activeStatuses.contains(p.getStatus())
                        || p.getQuantity() == null || p.getQuantity() <= 0
                        || (p.getExpiryDate() != null && p.getExpiryDate().isBefore(today)))
                .map(this::toResponse).toList();
    }

    public ProduceResponse update(Long id, ProduceRequest request) {
        Produce produce = produceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Produce", "id", id));

        produce.setName(request.getName());
        produce.setCategory(request.getCategory());
        produce.setQuantity(request.getQuantity());
        produce.setListedQuantity(request.getQuantity());
        produce.setUnit(request.getUnit());
        produce.setPricePerUnit(request.getPricePerUnit());
        produce.setDescription(request.getDescription());
        produce.setLocation(request.getLocation());
        produce.setImageUrl(request.getImageUrl());
        produce.setReadyDate(request.getReadyDate());
        produce.setHarvestDate(request.getHarvestDate());
        produce.setShelfLife(request.getShelfLife());

        java.time.LocalDate expDate = calculateExpiryDate(request.getHarvestDate(), request.getShelfLife(), request.getExpiryDate());
        produce.setExpiryDate(expDate);

        // Recompute AI price band on update
        computeAiPriceBand(produce);

        Produce saved = produceRepository.save(produce);
        // Retrigger matching on changes
        matchingService.matchProduceAgainstRequirements(saved);
        return toResponse(saved);
    }

    public ProduceResponse updateStatus(Long id, ProduceStatus status) {
        Produce produce = produceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Produce", "id", id));

        produce.setStatus(status);
        Produce saved = produceRepository.save(produce);
        matchingService.handleProduceStatusChange(saved);
        return toResponse(saved);
    }

    public void delete(Long id) {
        Produce produce = produceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Produce", "id", id));
        // Soft delete: mark status as REMOVED instead of dropping row
        produce.setStatus(ProduceStatus.REMOVED);
        produceRepository.save(produce);
        matchingService.handleProduceStatusChange(produce);
    }

    /**
     * Compute expiry date based on harvest date and shelf life string.
     */
    public static java.time.LocalDate calculateExpiryDate(java.time.LocalDate harvestDate, String shelfLife, java.time.LocalDate explicitExpiry) {
        if (explicitExpiry != null) return explicitExpiry;
        java.time.LocalDate base = harvestDate != null ? harvestDate : java.time.LocalDate.now();
        if (shelfLife == null || shelfLife.isBlank()) return base.plusDays(15);

        String normalized = shelfLife.trim().toUpperCase();
        return switch (normalized) {
            case "3_DAYS" -> base.plusDays(3);
            case "5_DAYS" -> base.plusDays(5);
            case "7_DAYS" -> base.plusDays(7);
            case "10_DAYS" -> base.plusDays(10);
            case "15_DAYS" -> base.plusDays(15);
            case "1_MONTH" -> base.plusMonths(1);
            case "2_MONTHS" -> base.plusMonths(2);
            case "3_MONTHS" -> base.plusMonths(3);
            case "6_MONTHS" -> base.plusMonths(6);
            case "1_YEAR" -> base.plusYears(1);
            default -> {
                try {
                    String digits = shelfLife.replaceAll("[^0-9]", "");
                    yield digits.isEmpty() ? base.plusDays(15) : base.plusDays(Long.parseLong(digits));
                } catch (Exception e) {
                    yield base.plusDays(15);
                }
            }
        };
    }

    /**
     * AI Price Advisor — uses MarketDataService to compute suggested price based on
     * market demand, supply, seasonality, and regional factors.
     */
    private void computeAiPriceBand(Produce produce) {
        if (produce.getPricePerUnit() != null && produce.getName() != null) {
            double suggested = marketDataService.getAiSuggestedPrice(
                    produce.getName(), produce.getLocation(), produce.getPricePerUnit());
            if (suggested > 0) {
                produce.setAiSuggestedMinPrice(Math.round(suggested * 0.92 * 100.0) / 100.0);
                produce.setAiSuggestedMaxPrice(Math.round(suggested * 1.08 * 100.0) / 100.0);
            } else {
                // Fallback for unknown crops
                double price = produce.getPricePerUnit();
                produce.setAiSuggestedMinPrice(Math.round(price * 0.9 * 100.0) / 100.0);
                produce.setAiSuggestedMaxPrice(Math.round(price * 1.1 * 100.0) / 100.0);
            }
        }
    }

    private ProduceResponse toResponse(Produce produce) {
        int listed = produce.getListedQuantity() != null ? produce.getListedQuantity() : produce.getQuantity();
        int reserved = produce.getReservedQuantity() != null ? produce.getReservedQuantity() : 0;
        int sold = produce.getSoldQuantity() != null ? produce.getSoldQuantity() : 0;
        int available = Math.max(0, produce.getQuantity());

        User farmer = produce.getFarmer();
        String photoUrl = farmer != null ? farmer.getProfilePhotoUrl() : null;
        Boolean isVer = farmer != null ? (Boolean.TRUE.equals(farmer.getVerified()) || farmer.getVerificationStatus() == User.VerificationStatus.VERIFIED) : false;
        Double rating = farmer != null ? farmer.getRating() : 0.0;
        String farmerType = farmer != null && farmer.getFarmerType() != null ? farmer.getFarmerType().name() : null;

        ProduceResponse.FarmerDto farmerDto = farmer != null ? ProduceResponse.FarmerDto.builder()
                .id(farmer.getId())
                .name(farmer.getName())
                .profilePhotoUrl(photoUrl)
                .verified(isVer)
                .rating(rating)
                .location(farmer.getLocation())
                .build() : null;

        java.time.LocalDate today = java.time.LocalDate.now();
        Long daysUntilExpiry = null;
        Boolean isExpiringSoon = false;
        Boolean isExpired = produce.getStatus() == ProduceStatus.EXPIRED;

        if (produce.getExpiryDate() != null) {
            daysUntilExpiry = java.time.temporal.ChronoUnit.DAYS.between(today, produce.getExpiryDate());
            if (daysUntilExpiry < 0) {
                isExpired = true;
            } else if (daysUntilExpiry <= 3) {
                isExpiringSoon = true;
            }
        }

        return ProduceResponse.builder()
                .id(produce.getId())
                .farmerId(farmer != null ? farmer.getId() : null)
                .farmerName(farmer != null ? farmer.getName() : null)
                .farmerProfilePhotoUrl(photoUrl)
                .farmer(farmerDto)
                .farmerVerified(isVer)
                .farmerRating(rating)
                .farmerType(farmerType)
                .name(produce.getName())
                .category(produce.getCategory())
                .quantity(produce.getQuantity())
                .listedQuantity(listed)
                .reservedQuantity(reserved)
                .soldQuantity(sold)
                .availableQuantity(available)
                .unit(produce.getUnit())
                .pricePerUnit(produce.getPricePerUnit())
                .description(produce.getDescription())
                .location(produce.getLocation())
                .imageUrl(produce.getImageUrl())
                .readyDate(produce.getReadyDate())
                .harvestDate(produce.getHarvestDate())
                .shelfLife(produce.getShelfLife())
                .expiryDate(produce.getExpiryDate())
                .daysUntilExpiry(daysUntilExpiry)
                .isExpiringSoon(isExpiringSoon)
                .isExpired(isExpired)
                .aiSuggestedMinPrice(produce.getAiSuggestedMinPrice())
                .aiSuggestedMaxPrice(produce.getAiSuggestedMaxPrice())
                .status(produce.getStatus())
                .adminRemovalReason(produce.getAdminRemovalReason())
                .createdAt(produce.getCreatedAt())
                .updatedAt(produce.getUpdatedAt())
                .build();
    }
}
