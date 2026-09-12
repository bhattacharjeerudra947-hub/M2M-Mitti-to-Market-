package com.mitti2market.repository;

import com.mitti2market.model.Evidence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EvidenceRepository extends JpaRepository<Evidence, Long> {

    List<Evidence> findByDealIdOrderByCreatedAtAsc(Long dealId);

    List<Evidence> findByDealIdAndStageOrderByCreatedAtAsc(Long dealId, Evidence.EvidenceStage stage);

    long countByDealIdAndStage(Long dealId, Evidence.EvidenceStage stage);
}
