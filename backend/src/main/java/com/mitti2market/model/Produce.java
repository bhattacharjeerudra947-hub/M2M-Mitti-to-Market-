package com.mitti2market.model;

import jakarta.persistence.*;
import lombok.*;
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

    @ManyToOne
    @JoinColumn(name = "farmer_id", nullable = false)
    private User farmer;

    @Column(nullable = false)
    private String name;

    private String category;

    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false)
    private String unit;

    @Column(nullable = false)
    private Double pricePerUnit;

    private String description;

    private String location;

    private String imageUrl;

    private Double aiSuggestedMinPrice;

    private Double aiSuggestedMaxPrice;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ProduceStatus status = ProduceStatus.AVAILABLE;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public enum ProduceStatus {
        AVAILABLE,
        LOW_STOCK,
        SOLD_OUT,
        INACTIVE
    }
}
