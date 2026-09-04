package com.mitti2market.repository;

import com.mitti2market.model.SupportingDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SupportingDocumentRepository extends JpaRepository<SupportingDocument, Long> {
    List<SupportingDocument> findByUserId(Long userId);
    List<SupportingDocument> findByUserIdAndDocumentType(Long userId, SupportingDocument.DocumentType type);
    long countByUserIdAndVerificationStatus(Long userId, SupportingDocument.VerificationStatus status);
    List<SupportingDocument> findByVerificationStatus(SupportingDocument.VerificationStatus status);
}
