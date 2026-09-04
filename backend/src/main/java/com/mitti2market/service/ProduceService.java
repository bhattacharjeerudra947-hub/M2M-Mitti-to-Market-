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

@Service
@RequiredArgsConstructor
public class ProduceService {

    private final ProduceRepository produceRepository;
    private final UserRepository userRepository;
    private final MarketDataService marketDataService;

    public ProduceResponse create(ProduceRequest request) {
        User farmer = userRepository.findById(request.getFarmerId())
                .orElseThrow(() -> new ResourceNotFoundException("Farmer", "id", request.getFarmerId()));

        if (farmer.getRole() != User.Role.FARMER) {
            throw new BadRequestException("User is not a farmer");
        }

        Produce produce = Produce.builder()
                .farmer(farmer)
                .name(request.getName())
                .category(request.getCategory())
                .quantity(request.getQuantity())
                .unit(request.getUnit())
                .pricePerUnit(request.getPricePerUnit())
                .description(request.getDescription())
                .location(request.getLocation())
                .imageUrl(request.getImageUrl())
                .status(ProduceStatus.AVAILABLE)
                .build();

        // AI Price Advisor: compute suggested price based on market demand data
        computeAiPriceBand(produce);

        Produce saved = produceRepository.save(produce);
        return toResponse(saved);
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

        if (Boolean.TRUE.equals(availableOnly)) {
            produceList = produceList.stream()
                    .filter(p -> p.getStatus() == ProduceStatus.AVAILABLE || p.getStatus() == ProduceStatus.LOW_STOCK)
                    .toList();
        }

        return produceList.stream().map(this::toResponse).toList();
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

    public ProduceResponse update(Long id, ProduceRequest request) {
        Produce produce = produceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Produce", "id", id));

        produce.setName(request.getName());
        produce.setCategory(request.getCategory());
        produce.setQuantity(request.getQuantity());
        produce.setUnit(request.getUnit());
        produce.setPricePerUnit(request.getPricePerUnit());
        produce.setDescription(request.getDescription());
        produce.setLocation(request.getLocation());
        produce.setImageUrl(request.getImageUrl());

        // Recompute AI price band on update
        computeAiPriceBand(produce);

        Produce saved = produceRepository.save(produce);
        return toResponse(saved);
    }

    public ProduceResponse updateStatus(Long id, ProduceStatus status) {
        Produce produce = produceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Produce", "id", id));

        produce.setStatus(status);
        Produce saved = produceRepository.save(produce);
        return toResponse(saved);
    }

    public void delete(Long id) {
        if (!produceRepository.existsById(id)) {
            throw new ResourceNotFoundException("Produce", "id", id);
        }
        produceRepository.deleteById(id);
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
        return ProduceResponse.builder()
                .id(produce.getId())
                .farmerId(produce.getFarmer().getId())
                .farmerName(produce.getFarmer().getName())
                .name(produce.getName())
                .category(produce.getCategory())
                .quantity(produce.getQuantity())
                .unit(produce.getUnit())
                .pricePerUnit(produce.getPricePerUnit())
                .description(produce.getDescription())
                .location(produce.getLocation())
                .imageUrl(produce.getImageUrl())
                .aiSuggestedMinPrice(produce.getAiSuggestedMinPrice())
                .aiSuggestedMaxPrice(produce.getAiSuggestedMaxPrice())
                .status(produce.getStatus())
                .createdAt(produce.getCreatedAt())
                .updatedAt(produce.getUpdatedAt())
                .build();
    }
}
