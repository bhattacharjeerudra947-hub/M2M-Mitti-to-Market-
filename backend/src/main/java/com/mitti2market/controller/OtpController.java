package com.mitti2market.controller;

import com.mitti2market.dto.ApiResponse;
import com.mitti2market.service.OtpService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth/otp")
@RequiredArgsConstructor
public class OtpController {

    private final OtpService otpService;

    @PostMapping("/send")
    public ResponseEntity<?> sendOtp(@RequestBody Map<String, String> body) {
        String phone = body.get("phone");
        if (phone == null || phone.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Mobile number is required"));
        }

        Map<String, Object> result = otpService.sendOtp(phone.trim());
        boolean success = Boolean.TRUE.equals(result.get("success"));
        if (!success) {
            return ResponseEntity.badRequest().body(ApiResponse.error((String) result.get("message")));
        }

        return ResponseEntity.ok(ApiResponse.ok((String) result.get("message"), result));
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> body) {
        String phone = body.get("phone");
        String otp = body.get("otp");

        if (phone == null || phone.trim().isEmpty() || otp == null || otp.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Mobile number and OTP code are required"));
        }

        boolean verified = otpService.verifyOtp(phone.trim(), otp.trim());
        if (!verified) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid or expired OTP"));
        }

        return ResponseEntity.ok(ApiResponse.ok("Mobile number verified successfully", Map.of("verified", true, "phone", phone.trim())));
    }

    @PostMapping("/retry")
    public ResponseEntity<?> retryOtp(@RequestBody Map<String, String> body) {
        String phone = body.get("phone");
        if (phone == null || phone.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Mobile number is required"));
        }

        Map<String, Object> result = otpService.retryOtp(phone.trim());
        return ResponseEntity.ok(ApiResponse.ok((String) result.get("message"), result));
    }
}
