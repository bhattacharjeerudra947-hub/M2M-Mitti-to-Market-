package com.mitti2market.dto.appeal;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppealRequest {

    @JsonAlias({"contactPhone", "phone"})
    private String phone;

    @JsonAlias({"contactEmail", "email"})
    private String email;

    @NotBlank(message = "Appeal reason is required")
    private String reason;

    @JsonAlias({"details", "explanation", "description"})
    private String message;

    @JsonAlias({"attachmentUrl", "documentUrl"})
    private String documentUrl;
}

