package com.mitti2market.repository;

import com.mitti2market.model.DisputeResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DisputeResponseRepository extends JpaRepository<DisputeResponse, Long> {

    List<DisputeResponse> findByDisputeIdOrderByCreatedAtAsc(Long disputeId);
}
