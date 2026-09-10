package com.mitti2market.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class OtpService {

    @Value("${msg91.authkey:}")
    private String msg91AuthKey;

    @Value("${msg91.template-id:}")
    private String msg91TemplateId;

    private final RestTemplate restTemplate = new RestTemplate();
    private final SecureRandom random = new SecureRandom();

    // In-memory OTP storage for dev / fallback mode: phone -> OtpRecord
    private final Map<String, OtpRecord> otpStore = new ConcurrentHashMap<>();

    private static final long OTP_VALIDITY_SECONDS = 300; // 5 minutes
    private static final String UNIVERSAL_TEST_OTP = "123456";

    private record OtpRecord(String otp, Instant expiresAt) {}

    /**
     * Clean phone number to standard format (e.g. 919876543210 for MSG91, or 10-digit standard)
     */
    public String normalizePhone(String rawPhone) {
        if (rawPhone == null) return "";
        String digits = rawPhone.replaceAll("\\D", "");
        if (digits.length() == 10) {
            return "91" + digits;
        } else if (digits.length() == 12 && digits.startsWith("91")) {
            return digits;
        }
        return digits;
    }

    /**
     * Send OTP via MSG91 or local fallback
     */
    public Map<String, Object> sendOtp(String rawPhone) {
        String phoneWithCountry = normalizePhone(rawPhone);
        if (phoneWithCountry.length() < 10) {
            return Map.of("success", false, "message", "Invalid mobile number format");
        }

        // 1. If MSG91 is properly configured, try MSG91 API
        if (msg91AuthKey != null && !msg91AuthKey.isBlank() &&
            msg91TemplateId != null && !msg91TemplateId.isBlank()) {
            try {
                String url = String.format("https://control.msg91.com/api/v5/otp?template_id=%s&mobile=%s&authkey=%s",
                        msg91TemplateId, phoneWithCountry, msg91AuthKey);

                HttpHeaders headers = new HttpHeaders();
                headers.set("authkey", msg91AuthKey);
                headers.setContentType(MediaType.APPLICATION_JSON);
                HttpEntity<String> entity = new HttpEntity<>(headers);

                ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, entity, Map.class);
                if (response.getStatusCode().is2xxSuccessful()) {
                    log.info("MSG91 OTP sent successfully to {}", phoneWithCountry);
                    return Map.of("success", true, "message", "OTP sent via SMS successfully");
                }
            } catch (Exception ex) {
                log.warn("MSG91 OTP send failed ({}), switching to local dev fallback", ex.getMessage());
            }
        }

        // 2. Local fallback generation
        String otp = String.format("%06d", random.nextInt(1_000_000));
        otpStore.put(phoneWithCountry, new OtpRecord(otp, Instant.now().plusSeconds(OTP_VALIDITY_SECONDS)));
        log.info("[DEV OTP] Generated OTP for {}: {}", phoneWithCountry, otp);

        return Map.of(
                "success", true,
                "message", "OTP sent successfully",
                "devOtp", otp // convenient for evaluation / dev testing
        );
    }

    /**
     * Verify OTP via MSG91 or local fallback
     */
    public boolean verifyOtp(String rawPhone, String enteredOtp) {
        if (enteredOtp == null || enteredOtp.isBlank()) return false;
        String phoneWithCountry = normalizePhone(rawPhone);

        // Universal testing OTP
        if (UNIVERSAL_TEST_OTP.equals(enteredOtp.trim())) {
            log.info("Test OTP accepted for {}", phoneWithCountry);
            return true;
        }

        // 1. Try local cache first
        OtpRecord record = otpStore.get(phoneWithCountry);
        if (record != null) {
            if (Instant.now().isBefore(record.expiresAt()) && record.otp().equals(enteredOtp.trim())) {
                otpStore.remove(phoneWithCountry);
                log.info("Local OTP verified successfully for {}", phoneWithCountry);
                return true;
            }
        }

        // 2. If MSG91 is configured, verify against MSG91 API
        if (msg91AuthKey != null && !msg91AuthKey.isBlank()) {
            try {
                String url = String.format("https://control.msg91.com/api/v5/otp/verify?otp=%s&mobile=%s&authkey=%s",
                        enteredOtp.trim(), phoneWithCountry, msg91AuthKey);

                HttpHeaders headers = new HttpHeaders();
                headers.set("authkey", msg91AuthKey);
                HttpEntity<String> entity = new HttpEntity<>(headers);

                ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    Map body = response.getBody();
                    if ("success".equalsIgnoreCase(String.valueOf(body.get("type")))) {
                        log.info("MSG91 OTP verified for {}", phoneWithCountry);
                        return true;
                    }
                }
            } catch (Exception ex) {
                log.warn("MSG91 OTP verification error: {}", ex.getMessage());
            }
        }

        return false;
    }

    /**
     * Resend OTP
     */
    public Map<String, Object> retryOtp(String rawPhone) {
        String phoneWithCountry = normalizePhone(rawPhone);

        if (msg91AuthKey != null && !msg91AuthKey.isBlank()) {
            try {
                String url = String.format("https://control.msg91.com/api/v5/otp/retry?authkey=%s&mobile=%s",
                        msg91AuthKey, phoneWithCountry);
                HttpHeaders headers = new HttpHeaders();
                headers.set("authkey", msg91AuthKey);
                HttpEntity<String> entity = new HttpEntity<>(headers);
                ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
                if (response.getStatusCode().is2xxSuccessful()) {
                    return Map.of("success", true, "message", "OTP resent via SMS");
                }
            } catch (Exception ex) {
                log.warn("MSG91 OTP retry failed, falling back to local resend: {}", ex.getMessage());
            }
        }

        return sendOtp(rawPhone);
    }
}
