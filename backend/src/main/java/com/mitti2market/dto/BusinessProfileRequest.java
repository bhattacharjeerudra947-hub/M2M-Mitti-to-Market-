package com.mitti2market.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BusinessProfileRequest {
    private String businessType;        // GOVERNMENT, PRIVATE_BUSINESS, FPO_COOPERATIVE, OTHER
    private String officialName;
    private String gstin;
    private String registrationNumber;
    private String businessAddress;
    private String departmentName;      // for GOVERNMENT type
    private String authorizedPerson;
    private String requiredCrops;       // comma-separated: "Rice,Wheat"
    private Long monthlyRequirementKg;
}
