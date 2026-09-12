package com.mitti2market.config;

import com.mitti2market.model.TransportVehicle;
import com.mitti2market.model.TransportVehicle.AvailabilityStatus;
import com.mitti2market.model.TransportVehicle.VehicleType;
import com.mitti2market.repository.TransportVehicleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Seeds initial platform transport vehicle inventory if none exists.
 *
 * IMPORTANT:
 * Clearly labeled as Platform Logistics Availability (inventory demonstration),
 * not live external GPS fleet data.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class VehicleSeedRunner implements ApplicationRunner {

    private final TransportVehicleRepository vehicleRepo;

    @Override
    public void run(ApplicationArguments args) {
        if (vehicleRepo.count() > 0) {
            return;
        }

        log.info("Seeding initial Mitti2Market platform transport vehicle inventory...");

        List<TransportVehicle> seeds = List.of(
                TransportVehicle.builder()
                        .vehicleNumber("M2M-101")
                        .vehicleLabel("Mini Truck – M2M-101 (Tata Ace)")
                        .vehicleType(VehicleType.MINI_TRUCK)
                        .capacityKg(1200.0)
                        .currentArea("Nashik Rural")
                        .currentState("Maharashtra")
                        .availabilityStatus(AvailabilityStatus.AVAILABLE)
                        .costPerKm(18.0)
                        .baseCostRupees(400.0)
                        .loadingChargeRupees(300.0)
                        .active(true)
                        .notes("Best for small farm harvests and local mandi runs")
                        .build(),

                TransportVehicle.builder()
                        .vehicleNumber("M2M-104")
                        .vehicleLabel("Mini Truck – M2M-104 (Mahindra Bolero Maxi)")
                        .vehicleType(VehicleType.MINI_TRUCK)
                        .capacityKg(2500.0)
                        .currentArea("Pune District")
                        .currentState("Maharashtra")
                        .availabilityStatus(AvailabilityStatus.AVAILABLE)
                        .costPerKm(22.0)
                        .baseCostRupees(500.0)
                        .loadingChargeRupees(400.0)
                        .active(true)
                        .notes("Reliable agricultural pickup truck")
                        .build(),

                TransportVehicle.builder()
                        .vehicleNumber("M2M-118")
                        .vehicleLabel("Medium Truck – M2M-118 (Eicher Pro 2049)")
                        .vehicleType(VehicleType.TRUCK)
                        .capacityKg(5000.0)
                        .currentArea("Nashik Central")
                        .currentState("Maharashtra")
                        .availabilityStatus(AvailabilityStatus.AVAILABLE)
                        .costPerKm(28.0)
                        .baseCostRupees(750.0)
                        .loadingChargeRupees(500.0)
                        .active(true)
                        .notes("Insulated tarp cover suitable for perishables and onions")
                        .build(),

                TransportVehicle.builder()
                        .vehicleNumber("M2M-127")
                        .vehicleLabel("Heavy Cargo Truck – M2M-127 (Ashok Leyland 1618)")
                        .vehicleType(VehicleType.LARGE_TRUCK)
                        .capacityKg(10000.0)
                        .currentArea("Burdwan APMC Hub")
                        .currentState("West Bengal")
                        .availabilityStatus(AvailabilityStatus.AVAILABLE)
                        .costPerKm(35.0)
                        .baseCostRupees(1200.0)
                        .loadingChargeRupees(800.0)
                        .active(true)
                        .notes("Interstate bulk transport with GPS lock")
                        .build(),

                TransportVehicle.builder()
                        .vehicleNumber("M2M-135")
                        .vehicleLabel("Truck – M2M-135 (Tata 407 Gold)")
                        .vehicleType(VehicleType.TRUCK)
                        .capacityKg(3500.0)
                        .currentArea("Kolkata Logistics Park")
                        .currentState("West Bengal")
                        .availabilityStatus(AvailabilityStatus.AVAILABLE)
                        .costPerKm(24.0)
                        .baseCostRupees(600.0)
                        .loadingChargeRupees(450.0)
                        .active(true)
                        .notes("Standard agricultural crate hauler")
                        .build(),

                TransportVehicle.builder()
                        .vehicleNumber("M2M-142")
                        .vehicleLabel("Heavy Truck – M2M-142 (BharatBenz 1923C)")
                        .vehicleType(VehicleType.LARGE_TRUCK)
                        .capacityKg(12000.0)
                        .currentArea("Azadpur Mandi Yard")
                        .currentState("Delhi")
                        .availabilityStatus(AvailabilityStatus.MAINTENANCE)
                        .costPerKm(38.0)
                        .baseCostRupees(1500.0)
                        .loadingChargeRupees(1000.0)
                        .active(true)
                        .notes("Scheduled maintenance – back in service soon")
                        .build()
        );

        vehicleRepo.saveAll(seeds);
        log.info("Successfully seeded {} platform transport vehicles.", seeds.size());
    }
}
