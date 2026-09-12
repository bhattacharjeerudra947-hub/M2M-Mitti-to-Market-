package com.mitti2market.repository;

import com.mitti2market.model.ReturnInspection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ReturnInspectionRepository extends JpaRepository<ReturnInspection, Long> {

    Optional<ReturnInspection> findByReverseLogisticsId(Long reverseLogisticsId);
}
