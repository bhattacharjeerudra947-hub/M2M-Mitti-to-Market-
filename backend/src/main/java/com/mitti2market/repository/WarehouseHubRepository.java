package com.mitti2market.repository;

import com.mitti2market.model.WarehouseHub;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;

@Repository
public interface WarehouseHubRepository extends JpaRepository<WarehouseHub, Long> {

    Optional<WarehouseHub> findByHubCode(String hubCode);

    List<WarehouseHub> findByOperatingStatus(WarehouseHub.HubStatus status);

    List<WarehouseHub> findByStateIgnoreCase(String state);

    List<WarehouseHub> findByDistrictIgnoreCase(String district);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT h FROM WarehouseHub h WHERE h.id = :id")
    Optional<WarehouseHub> findByIdWithLock(@Param("id") Long id);

    @Query("SELECT h FROM WarehouseHub h WHERE h.operatingStatus = 'ACTIVE' AND h.availableCapacityKg > :minCapacity")
    List<WarehouseHub> findActiveWithAvailableCapacity(@Param("minCapacity") Double minCapacity);
}
