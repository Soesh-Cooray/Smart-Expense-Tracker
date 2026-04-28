package org.example.smart_expense_tracker.Controller;

import org.example.smart_expense_tracker.Model.Budget;
import org.example.smart_expense_tracker.Service.BudgetService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/budget")
@CrossOrigin(origins = "http://localhost:5173")
public class BudgetController {

    @Autowired
    private BudgetService budgetService;

    @PostMapping("/create")
    public ResponseEntity<?> createBudget(@Valid @RequestBody Budget budget) {
        try {
            return ResponseEntity.ok(budgetService.createBudget(budget));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/user/{userId}")
    public List<Budget> getUserBudgets(@PathVariable Long userId) {
        return budgetService.getUserBudgets(userId);
    }

    @GetMapping("/user/{userId}/month/{monthYear}")
    public List<Budget> getBudgetsByMonth(@PathVariable Long userId, @PathVariable String monthYear) {
        return budgetService.getUserBudgetsByMonth(userId, monthYear);
    }

    @PutMapping("/update/{budgetId}")
    public ResponseEntity<?> updateBudget(@PathVariable Long budgetId, @Valid @RequestBody Budget budget) {
        try {
            return ResponseEntity.ok(budgetService.updateBudget(budgetId, budget));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/delete/{budgetId}")
    public String deleteBudget(@PathVariable Long budgetId) {
        budgetService.deleteBudget(budgetId);
        return "Budget deleted successfully";
    }

    @PutMapping("/update-spent/{userId}/{category}/{amount}")
    public ResponseEntity<?> updateSpent(@PathVariable Long userId, @PathVariable String category, @PathVariable Double amount) {
        try {
            return ResponseEntity.ok(budgetService.updateSpentAmount(userId, category, amount));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}