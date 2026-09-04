package com.mitti2market.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentResponse {
    private Long id;
    private String documentType;
    private String originalFilename;
    private String cloudinaryUrl;
    private String cloudinaryPublicId;
    private Long fileSize;
    private String mimeType;
    private String verificationStatus;
    private String rejectionReason;
    private LocalDateTime uploadedAt;
    private LocalDateTime reviewedAt;
}
