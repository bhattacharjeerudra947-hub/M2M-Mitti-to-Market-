package com.mitti2market.dto.appeal;

import com.mitti2market.model.Appeal.AppealStatus;
import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppealResponse {

    private Long id;
    private Long userId;
    private String userName;
    private String userRole;
    private String userEmail;
    private String userPhone;
    private String userAccountStatus;
    private String userSuspensionReason;
    private LocalDateTime userSuspendedAt;

    private String phone;
    private String email;
    private String reason;
    private String message;
    private String documentUrl;
    private AppealStatus status;
    private String adminDecision;
    private String adminDecisionReason;
    private Long reviewedById;
    private String reviewedByName;
    private LocalDateTime reviewedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
