package com.mitti2market.repository;

import com.mitti2market.model.Produce;
import com.mitti2market.model.Produce.ProduceStatus;
import com.mitti2market.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProduceRepository extends JpaRepository<Produce, Long> {

    List<Produce> findByFarmer(User farmer);

    List<Produce> findByFarmerId(Long farmerId);

    List<Produce> findByFarmerIdAndStatusIn(Long farmerId, List<ProduceStatus> statuses);

    List<Produce> findByFarmerIdAndStatusNotIn(Long farmerId, List<ProduceStatus> statuses);

    List<Produce> findByStatus(ProduceStatus status);

    List<Produce> findByStatusIn(List<ProduceStatus> statuses);

    long countByStatusIn(List<ProduceStatus> statuses);

    List<Produce> findByNameContainingIgnoreCase(String name);

    List<Produce> findByCategory(String category);

    List<Produce> findByLocationContainingIgnoreCase(String location);

    List<Produce> findByFarmerAndStatus(User farmer, ProduceStatus status);

    List<Produce> findByCategoryAndLocationContainingIgnoreCase(String category, String location);

    /** Offline-sync idempotency: same key ⇒ same logical listing */
    java.util.Optional<Produce> findByIdempotencyKey(String idempotencyKey);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT p FROM Produce p WHERE p.id = :id")
    java.util.Optional<Produce> findByIdWithLock(@org.springframework.data.repository.query.Param("id") Long id);

    List<Produce> findByStatusInAndExpiryDateBefore(List<ProduceStatus> statuses, java.time.LocalDate date);

    List<Produce> findByStatusInAndExpiryDateBetweenAndExpiryWarningSentFalse(
            List<ProduceStatus> statuses, java.time.LocalDate fromDate, java.time.LocalDate toDate);
}
