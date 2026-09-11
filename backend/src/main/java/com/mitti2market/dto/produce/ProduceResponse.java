package com.mitti2market.dto.produce;

import com.mitti2market.model.Produce.ProduceStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProduceResponse {

    private Long id;
    private Long farmerId;
    private String farmerName;
    private String farmerProfilePhotoUrl;
    private Boolean farmerVerified;
    private Double farmerRating;
    private String farmerType;
    private String name;
    private String category;
    private Integer quantity;
    private Integer listedQuantity;
    private Integer reservedQuantity;
    private Integer soldQuantity;
    private Integer availableQuantity;
    private String unit;
    private Double pricePerUnit;
    private String description;
    private String location;
    private String imageUrl;
    private Double aiSuggestedMinPrice;
    private Double aiSuggestedMaxPrice;
    private java.time.LocalDate readyDate;
    private ProduceStatus status;
    private String adminRemovalReason;
    private FarmerDto farmer;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FarmerDto {
        private Long id;
        private String name;
        private String profilePhotoUrl;
        private Boolean verified;
        private Double rating;
        private String location;
    }
}
