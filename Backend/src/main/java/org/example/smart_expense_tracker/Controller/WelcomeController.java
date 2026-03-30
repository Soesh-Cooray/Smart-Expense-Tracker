package org.example.smart_expense_tracker.Controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class WelcomeController {

    @GetMapping("/")
    public ResponseEntity<Map<String, String>> welcome() {
        return ResponseEntity.ok(Map.of(
            "message", "Welcome to Smart Expense Tracker API",
            "version", "1.0.0",
            "status", "Running",
            "database", "PostgreSQL (Neon)"
        ));
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of(
            "status", "UP",
            "timestamp", java.time.LocalDateTime.now().toString()
        ));
    }
}
