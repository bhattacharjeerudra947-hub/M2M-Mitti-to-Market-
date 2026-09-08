package com.mitti2market.repository;

import com.mitti2market.model.BuyerRequirement;
import com.mitti2market.model.BuyerRequirement.RequirementStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BuyerRequirementRepository extends JpaRepository<BuyerRequirement, Long> {

    List<BuyerRequirement> findByBuyerIdOrderByCreatedAtDesc(Long buyerId);

    List<BuyerRequirement> findByBuyerIdAndStatusInOrderByCreatedAtDesc(Long buyerId, List<RequirementStatus> statuses);

    List<BuyerRequirement> findByBuyerIdAndStatusNotInOrderByCreatedAtDesc(Long buyerId, List<RequirementStatus> statuses);

    List<BuyerRequirement> findByStatusOrderByCreatedAtDesc(RequirementStatus status);

    List<BuyerRequirement> findByStatusInOrderByCreatedAtDesc(List<RequirementStatus> statuses);

    long countByStatusIn(List<RequirementStatus> statuses);

    List<BuyerRequirement> findByCropIgnoreCaseAndStatus(String crop, RequirementStatus status);

    List<BuyerRequirement> findByStatusAndCropIgnoreCaseOrderByCreatedAtDesc(RequirementStatus status, String crop);

    /** Open requirements matching a crop, for matching against farmer supply */
    List<BuyerRequirement> findByStatusAndCropIgnoreCase(RequirementStatus status, String crop);
}