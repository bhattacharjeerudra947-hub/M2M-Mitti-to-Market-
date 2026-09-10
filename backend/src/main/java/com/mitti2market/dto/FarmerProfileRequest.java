package com.mitti2market.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FarmerProfileRequest {
    private String farmerCategory;      // SINGLE_CROP, MULTI_CROP
    private String farmingSeason;       // KHARIF, RABI, ZAID, MULTIPLE
    private String crops;               // comma-separated: "Rice,Wheat,Onion"
    private Double landAreaAcres;
    private String landOwnership;       // OWNED, LEASED, COMMON_LAND, FPO_MANAGED
    private String farmAddress;
    private String aadhaarLast4;        // last 4 digits only
    private String identityDocType;     // type of identity document

    private String aadhaarNumber;
    private String bankAccountNumber;
    private String bankIfscCode;
    private String bankBranchName;
    private String bankName;

    private String state;
    private String district;
    private String tehsil;
    private String village;
    private String pincode;

    private Double latitude;
    private Double longitude;
}
