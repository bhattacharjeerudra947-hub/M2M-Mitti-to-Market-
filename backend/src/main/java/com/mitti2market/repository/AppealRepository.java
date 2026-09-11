package com.mitti2market.repository;

import com.mitti2market.model.Appeal;
import com.mitti2market.model.Appeal.AppealStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface AppealRepository extends JpaRepository<Appeal, Long> {

    List<Appeal> findByUserIdOrderByCreatedAtDesc(Long userId);

    boolean existsByUserIdAndStatusIn(Long userId, Collection<AppealStatus> statuses);

    Optional<Appeal> findFirstByUserIdAndStatusInOrderByCreatedAtDesc(Long userId, Collection<AppealStatus> statuses);

    List<Appeal> findAllByOrderByCreatedAtDesc();

    List<Appeal> findByStatusOrderByCreatedAtDesc(AppealStatus status);

    long countByStatus(AppealStatus status);
}
