package com.mitti2market.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "logistics_events")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LogisticsEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "logistics_id", nullable = false)
    private Logistics logistics;

    @Enumerated(EnumType.STRING)
    private Logistics.LogisticsStatus status;

    private String description;
    private String location;
    private Double latitude;
    private Double longitude;

    @CreationTimestamp
    private LocalDateTime timestamp;
}
