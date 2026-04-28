package org.example.smart_expense_tracker.Controller;

import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.example.smart_expense_tracker.Dto.OverspendingPredictionResponse;
import org.example.smart_expense_tracker.Dto.OverspendingTrendResponse;
import org.example.smart_expense_tracker.Dto.OverspendingWindowOptionResponse;
import org.example.smart_expense_tracker.Service.AIServiceUnavailableException;
import org.example.smart_expense_tracker.Service.OverspendingPredictionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/prediction/overspending")
public class OverspendingPredictionController {

    private final OverspendingPredictionService overspendingPredictionService;

    public OverspendingPredictionController(OverspendingPredictionService overspendingPredictionService) {
        this.overspendingPredictionService = overspendingPredictionService;
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> predictUserOverspending(
            @PathVariable Long userId,
            @RequestParam(required = false) String windowStartMonth
    ) {
        try {
            if (userId == null || userId <= 0) {
                Map<String, String> error = new HashMap<>();
                error.put("message", "A valid userId is required.");
                return ResponseEntity.badRequest().body(error);
            }

            OverspendingPredictionResponse response = overspendingPredictionService.predictForUser(userId, windowStartMonth);
            return ResponseEntity.ok(response);
        } catch (DateTimeParseException ex) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Invalid windowStartMonth format. Use yyyy-MM.");
            return ResponseEntity.badRequest().body(error);
        } catch (AIServiceUnavailableException ex) {
            Map<String, String> error = new HashMap<>();
            error.put("message", ex.getMessage());
            return ResponseEntity.status(503).body(error);
        } catch (Exception ex) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Failed to generate overspending prediction.");
            return ResponseEntity.internalServerError().body(error);
        }
    }

    @GetMapping("/user/{userId}/windows")
    public ResponseEntity<?> getAvailableWindows(@PathVariable Long userId) {
        try {
            if (userId == null || userId <= 0) {
                Map<String, String> error = new HashMap<>();
                error.put("message", "A valid userId is required.");
                return ResponseEntity.badRequest().body(error);
            }

            List<OverspendingWindowOptionResponse> windows = overspendingPredictionService.getAvailableWindows(userId);
            return ResponseEntity.ok(windows);
        } catch (Exception ex) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Failed to load available analysis windows.");
            return ResponseEntity.internalServerError().body(error);
        }
    }

    @GetMapping("/user/{userId}/trend")
    public ResponseEntity<?> predictUserOverspendingTrend(@PathVariable Long userId) {
        try {
            if (userId == null || userId <= 0) {
                Map<String, String> error = new HashMap<>();
                error.put("message", "A valid userId is required.");
                return ResponseEntity.badRequest().body(error);
            }

            OverspendingTrendResponse response = overspendingPredictionService.predictTrendForUser(userId);
            return ResponseEntity.ok(response);
        } catch (AIServiceUnavailableException ex) {
            Map<String, String> error = new HashMap<>();
            error.put("message", ex.getMessage());
            return ResponseEntity.status(503).body(error);
        } catch (Exception ex) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Failed to generate overspending trend.");
            return ResponseEntity.internalServerError().body(error);
        }
    }
}
