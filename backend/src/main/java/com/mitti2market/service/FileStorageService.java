package com.mitti2market.service;

import org.springframework.web.multipart.MultipartFile;
import java.io.InputStream;

/**
 * Abstraction for file storage.
 * Implementations: LocalFileStorageService (dev), S3StorageService (prod).
 * Swap implementations by changing a Spring profile or config property.
 */
public interface FileStorageService {

    /**
     * Store a file and return the storage key (unique path/reference).
     * @param directory sub-directory (e.g. "profiles", "documents")
     * @param file the uploaded file
     * @return storage key to retrieve the file later
     */
    String store(String directory, MultipartFile file);

    /**
     * Retrieve a file as an InputStream.
     * @param storageKey the key returned by store()
     * @return InputStream of the file content
     */
    InputStream retrieve(String storageKey);

    /**
     * Delete a file by storage key.
     * @param storageKey the key returned by store()
     */
    void delete(String storageKey);

    /**
     * Check if a file exists at the given storage key.
     */
    boolean exists(String storageKey);
}
