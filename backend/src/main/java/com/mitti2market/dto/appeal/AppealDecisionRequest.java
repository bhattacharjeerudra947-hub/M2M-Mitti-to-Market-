package com.mitti2market.dto.appeal;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppealDecisionRequest {

    @NotBlank(message = "Decision status is required")
    private String status; // UNDER_REVIEW, APPROVED, REJECTED

    private String adminDecision;

    private String adminDecisionReason;
}
