package com.mitti2market.repository;

import com.mitti2market.model.InventoryLot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;

@Repository
public interface InventoryLotRepository extends JpaRepository<InventoryLot, Long> {

    Optional<InventoryLot> findByLotId(String lotId);

    List<InventoryLot> findByHubIdOrderByCreatedAtDesc(Long hubId);

    List<InventoryLot> findByHubIdAndStatus(Long hubId, InventoryLot.LotStatus status);

    List<InventoryLot> findByFarmerIdOrderByCreatedAtDesc(Long farmerId);

    List<InventoryLot> findByDealId(Long dealId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT l FROM InventoryLot l WHERE l.id = :id")
    Optional<InventoryLot> findByIdWithLock(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT l FROM InventoryLot l WHERE l.lotId = :lotId")
    Optional<InventoryLot> findByLotIdWithLock(@Param("lotId") String lotId);

    @Query("SELECT l FROM InventoryLot l WHERE l.hub.id = :hubId AND l.cropName = :cropName AND l.availableQuantityKg > 0 AND l.status IN ('IN_STORAGE', 'PARTIALLY_DISPATCHED')")
    List<InventoryLot> findAvailableForCrop(@Param("hubId") Long hubId, @Param("cropName") String cropName);
}
