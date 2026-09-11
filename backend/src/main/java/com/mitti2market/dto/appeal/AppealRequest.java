package com.mitti2market.dto.appeal;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppealRequest {

    private String phone;

    private String email;

    @NotBlank(message = "Appeal reason is required")
    private String reason;

    @NotBlank(message = "Detailed explanation is required")
    private String message;

    private String documentUrl;
}
