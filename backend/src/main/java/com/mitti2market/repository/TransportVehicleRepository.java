package com.mitti2market.repository;

import com.mitti2market.model.TransportVehicle;
import com.mitti2market.model.TransportVehicle.AvailabilityStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TransportVehicleRepository extends JpaRepository<TransportVehicle, Long> {

    List<TransportVehicle> findByActiveTrueOrderByVehicleNumber();

    List<TransportVehicle> findByAvailabilityStatusAndActiveTrueOrderByCapacityKg(AvailabilityStatus status);

    /** Returns AVAILABLE vehicles with enough capacity for the given cargo weight. */
    @Query("SELECT v FROM TransportVehicle v WHERE v.active = true " +
           "AND v.availabilityStatus = 'AVAILABLE' " +
           "AND v.capacityKg >= :minCapacityKg " +
           "ORDER BY v.capacityKg ASC")
    List<TransportVehicle> findEligibleVehicles(@Param("minCapacityKg") double minCapacityKg);

    /** All AVAILABLE vehicles regardless of capacity. */
    @Query("SELECT v FROM TransportVehicle v WHERE v.active = true " +
           "AND v.availabilityStatus = 'AVAILABLE' " +
           "ORDER BY v.capacityKg ASC")
    List<TransportVehicle> findAllAvailable();

    boolean existsByVehicleNumber(String vehicleNumber);
}