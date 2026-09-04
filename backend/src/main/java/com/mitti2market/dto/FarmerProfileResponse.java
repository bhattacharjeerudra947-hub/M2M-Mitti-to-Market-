package com.mitti2market.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FarmerProfileResponse {
    private Long id;
    private String farmerCategory;
    private String farmingSeason;
    private String crops;
    private Double landAreaAcres;
    private String landOwnership;
    private String farmAddress;
    private String aadhaarLast4;
    private String identityDocType;
    private String identityDocStorageKey;
    private String identityDocFilename;
    private String profileStatus;
    private LocalDateTime createdAt;
}
