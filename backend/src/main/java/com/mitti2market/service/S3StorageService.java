package com.mitti2market.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.time.Duration;
import java.util.UUID;

/**
 * S3-compatible cloud storage — used in production.
 * Works with AWS S3, MinIO, DigitalOcean Spaces, Cloudflare R2, etc.
 *
 * Config via environment variables:
 *   STORAGE_ENDPOINT, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY,
 *   STORAGE_BUCKET, STORAGE_REGION
 */
@Service
@ConditionalOnProperty(name = "app.storage.type", havingValue = "s3")
public class S3StorageService implements FileStorageService {

    @Value("${STORAGE_ENDPOINT}")
    private String endpoint;

    @Value("${STORAGE_ACCESS_KEY}")
    private String accessKey;

    @Value("${STORAGE_SECRET_KEY}")
    private String secretKey;

    @Value("${STORAGE_BUCKET}")
    private String bucket;

    @Value("${STORAGE_REGION:us-east-1}")
    private String region;

    private S3Client s3Client;
    private S3Presigner presigner;

    @PostConstruct
    public void init() {
        AwsBasicCredentials credentials = AwsBasicCredentials.create(accessKey, secretKey);

        Region awsRegion = Region.of(region);

        s3Client = S3Client.builder()
                .endpointOverride(URI.create(endpoint))
                .region(awsRegion)
                .credentialsProvider(StaticCredentialsProvider.create(credentials))
                .forcePathStyle(true) // Required for MinIO / S3-compatible
                .build();

        presigner = S3Presigner.builder()
                .endpointOverride(URI.create(endpoint))
                .region(awsRegion)
                .credentialsProvider(StaticCredentialsProvider.create(credentials))
                .build();
    }

    @PreDestroy
    public void cleanup() {
        if (s3Client != null) s3Client.close();
        if (presigner != null) presigner.close();
    }

    @Override
    public String store(String directory, MultipartFile file) {
        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        String storageKey = directory + "/" + UUID.randomUUID() + extension;

        try {
            s3Client.putObject(
                    PutObjectRequest.builder()
                            .bucket(bucket)
                            .key(storageKey)
                            .contentType(file.getContentType())
                            .build(),
                    RequestBody.fromInputStream(file.getInputStream(), file.getSize())
            );
        } catch (IOException e) {
            throw new RuntimeException("Failed to upload file to S3: " + e.getMessage(), e);
        }

        return storageKey;
    }

    @Override
    public InputStream retrieve(String storageKey) {
        try {
            return s3Client.getObject(
                    GetObjectRequest.builder()
                            .bucket(bucket)
                            .key(storageKey)
                            .build()
            );
        } catch (Exception e) {
            throw new RuntimeException("Failed to retrieve file from S3: " + e.getMessage(), e);
        }
    }

    @Override
    public void delete(String storageKey) {
        try {
            s3Client.deleteObject(
                    DeleteObjectRequest.builder()
                            .bucket(bucket)
                            .key(storageKey)
                            .build()
            );
        } catch (Exception e) {
            throw new RuntimeException("Failed to delete file from S3: " + e.getMessage(), e);
        }
    }

    @Override
    public boolean exists(String storageKey) {
        try {
            s3Client.headObject(
                    HeadObjectRequest.builder()
                            .bucket(bucket)
                            .key(storageKey)
                            .build()
            );
            return true;
        } catch (NoSuchKeyException e) {
            return false;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Generate a temporary presigned URL for secure file access.
     * URL expires after the given duration.
     */
    public String getPresignedUrl(String storageKey, Duration expiration) {
        software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest presignRequest =
                software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest.builder()
                        .signatureDuration(expiration)
                        .getObjectRequest(GetObjectRequest.builder()
                                .bucket(bucket)
                                .key(storageKey)
                                .build())
                        .build();
        return presigner.presignGetObject(presignRequest).url().toString();
    }
}
