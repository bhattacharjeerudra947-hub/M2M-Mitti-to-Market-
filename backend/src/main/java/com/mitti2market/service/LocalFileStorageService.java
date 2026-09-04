package com.mitti2market.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.*;
import java.util.UUID;

/**
 * Local filesystem storage — used in development.
 * Stores files under app.upload.storage-root (default: storage/).
 * NOT suitable for production — use S3StorageService instead.
 */
@Service
@ConditionalOnProperty(name = "app.storage.type", havingValue = "local", matchIfMissing = true)
public class LocalFileStorageService implements FileStorageService {

    @Value("${app.storage.root:storage}")
    private String storageRoot;

    @Override
    public String store(String directory, MultipartFile file) {
        try {
            Path dirPath = Paths.get(storageRoot, directory);
            Files.createDirectories(dirPath);

            // Generate safe unique filename
            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String storageKey = directory + "/" + UUID.randomUUID() + extension;

            Path filePath = Paths.get(storageRoot, storageKey);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            return storageKey;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file: " + e.getMessage(), e);
        }
    }

    @Override
    public InputStream retrieve(String storageKey) {
        try {
            Path filePath = Paths.get(storageRoot, storageKey);
            if (!Files.exists(filePath)) {
                throw new RuntimeException("File not found: " + storageKey);
            }
            return Files.newInputStream(filePath);
        } catch (IOException e) {
            throw new RuntimeException("Failed to retrieve file: " + e.getMessage(), e);
        }
    }

    @Override
    public void delete(String storageKey) {
        try {
            Path filePath = Paths.get(storageRoot, storageKey);
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            throw new RuntimeException("Failed to delete file: " + e.getMessage(), e);
        }
    }

    @Override
    public boolean exists(String storageKey) {
        return Files.exists(Paths.get(storageRoot, storageKey));
    }
}
