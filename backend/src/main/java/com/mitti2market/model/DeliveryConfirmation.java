package com.mitti2market.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "delivery_confirmations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliveryConfirmation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "deal_id", nullable = false)
    private Deal deal;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "confirmed_by", nullable = false)
    private User confirmedBy;

    @Builder.Default
    private Boolean confirmed = false;

    private String deliveryOtp;
    private String proofUrl; // photo or signature
    private Integer receivedQuantity;
    private String qualityNotes;

    @CreationTimestamp
    private LocalDateTime confirmedAt;
}
