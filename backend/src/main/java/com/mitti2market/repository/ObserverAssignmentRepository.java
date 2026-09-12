package com.mitti2market.repository;

import com.mitti2market.model.ObserverAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ObserverAssignmentRepository extends JpaRepository<ObserverAssignment, Long> {

    List<ObserverAssignment> findByObserverIdOrderByAssignedAtDesc(Long observerId);

    List<ObserverAssignment> findByDisputeIdOrderByAssignedAtDesc(Long disputeId);

    List<ObserverAssignment> findByDealIdOrderByAssignedAtDesc(Long dealId);
}
