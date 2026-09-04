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
public class BusinessProfileResponse {
    private Long id;
    private String businessType;
    private String officialName;
    private String gstin;
    private String registrationNumber;
    private String businessAddress;
    private String departmentName;
    private String authorizedPerson;
    private String registrationDocStorageKey;
    private String registrationDocFilename;
    private String requiredCrops;
    private Long monthlyRequirementKg;
    private String profileStatus;
    private LocalDateTime createdAt;
}
