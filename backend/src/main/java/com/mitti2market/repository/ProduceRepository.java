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

    List<Produce> findByStatus(ProduceStatus status);

    List<Produce> findByNameContainingIgnoreCase(String name);

    List<Produce> findByCategory(String category);

    List<Produce> findByLocationContainingIgnoreCase(String location);

    List<Produce> findByFarmerAndStatus(User farmer, ProduceStatus status);

    List<Produce> findByCategoryAndLocationContainingIgnoreCase(String category, String location);
}
