package com.mitti2market.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "produce")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Produce {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String emoji;

    @ManyToOne
    @JoinColumn(name = "farmer_id", nullable = false)
    private User farmer;

    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false)
    private String unit;

    private String grade;

    @Column(nullable = false)
    private Double pricePerKg;

    @Enumerated(EnumType.STRING)
    private ProduceStatus status = ProduceStatus.AVAILABLE;

    private LocalDate harvestDate;

    private LocalDate expectedSellingDate;

    private String location;

    private String description;

    private String imageUrl;

    private LocalDateTime createdAt = LocalDateTime.now();

    public enum ProduceStatus {
        AVAILABLE,
        RESERVED,
        SOLD
    }
}
