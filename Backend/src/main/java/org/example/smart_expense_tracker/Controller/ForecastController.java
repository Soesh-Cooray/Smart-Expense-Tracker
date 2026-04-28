package org.example.smart_expense_tracker.Controller;

import java.util.HashMap;
import java.util.Map;

import org.example.smart_expense_tracker.Dto.AIFutureResponse;
import org.example.smart_expense_tracker.Dto.ForecastRequest;
import org.example.smart_expense_tracker.Service.AIServiceUnavailableException;
import org.example.smart_expense_tracker.Service.ForecastService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/prediction/forecast")
@CrossOrigin(origins = "http://localhost:5173")
public class ForecastController {

    private final ForecastService forecastService;

    public ForecastController(ForecastService forecastService) {
        this.forecastService = forecastService;
    }

    @PostMapping("/user/{userId}")
    public ResponseEntity<?> forecastForUser(
            @PathVariable Long userId,
            @RequestBody ForecastRequest request
    ) {
        try {
            if (request == null) {
                return ResponseEntity.badRequest().body(error("Request body is required."));
            }

            AIFutureResponse response = forecastService.forecastForUser(userId, request.getCategory(), request.getMonthsAhead());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(error(ex.getMessage()));
        } catch (AIServiceUnavailableException ex) {
            return ResponseEntity.status(503).body(error(ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.internalServerError().body(error("Failed to generate future forecast."));
        }
    }

    private Map<String, String> error(String message) {
        Map<String, String> error = new HashMap<>();
        error.put("message", message);
        return error;
    }
}