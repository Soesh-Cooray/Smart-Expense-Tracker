package org.example.smart_expense_tracker.Controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.example.smart_expense_tracker.Model.Income;
import org.example.smart_expense_tracker.Service.IncomeService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/income")
@CrossOrigin(origins = "http://localhost:5173")
public class IncomeController {

    private static final Logger LOGGER = LoggerFactory.getLogger(IncomeController.class);

    private final IncomeService incomeService;

    public IncomeController(IncomeService incomeService) {
        this.incomeService = incomeService;
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Income>> getIncomeByUserId(@PathVariable Long userId) {
        List<Income> income = incomeService.getIncomeByUserId(userId);
        return ResponseEntity.ok(income);
    }

    @PostMapping
    public ResponseEntity<?> createIncome(@RequestBody Income income) {
        try {
            Income saved = incomeService.createIncome(income);
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (Exception e) {
            LOGGER.error("Error creating income", e);
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            error.put("type", e.getClass().getSimpleName());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateIncome(@PathVariable Long id, @RequestBody Income income) {
        try {
            Income updated = incomeService.updateIncome(id, income);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            LOGGER.error("Error updating income with id {}", id, e);
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteIncome(@PathVariable Long id, @RequestParam Long userId) {
        incomeService.deleteIncome(id, userId);
        return ResponseEntity.noContent().build();
    }
}