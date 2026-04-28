package org.example.smart_expense_tracker.Service;

import org.example.smart_expense_tracker.Model.Budget;
import org.example.smart_expense_tracker.Repository.BudgetRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.YearMonth;
import java.util.List;

@Service
public class BudgetService {

    @Autowired
    private BudgetRepository budgetRepository;

    public Budget createBudget(Budget budget) {
        // Check month is not in the past
        YearMonth current = YearMonth.now();
        YearMonth budgetMonth = YearMonth.parse(budget.getMonthYear());
        if (budgetMonth.isBefore(current)) {
            throw new IllegalArgumentException("Month cannot be in the past");
        }

        // Check no duplicate category for same month
        Budget existing = budgetRepository.findByUserIdAndCategoryAndMonthYear(
                budget.getUserId(), budget.getCategory(), budget.getMonthYear()
        );
        if (existing != null) {
            throw new IllegalArgumentException("Budget for this category and month already exists");
        }

        // Check spent does not exceed budget
        if (budget.getSpentAmount() != null && budget.getSpentAmount() > budget.getBudgetAmount()) {
            throw new IllegalArgumentException("Spent amount cannot exceed budget amount");
        }

        budget.setSpentAmount(budget.getSpentAmount() == null ? 0.0 : budget.getSpentAmount());
        budget.setRemainingAmount(budget.getBudgetAmount() - budget.getSpentAmount());
        return budgetRepository.save(budget);
    }

    public List<Budget> getUserBudgets(Long userId) {
        return budgetRepository.findByUserId(userId);
    }

    public List<Budget> getUserBudgetsByMonth(Long userId, String monthYear) {
        return budgetRepository.findByUserIdAndMonthYear(userId, monthYear);
    }

    public Budget updateBudget(Long budgetId, Budget updatedBudget) {
        Budget existing = budgetRepository.findById(budgetId).orElseThrow();

        // Check spent does not exceed new budget amount
        if (existing.getSpentAmount() != null && existing.getSpentAmount() > updatedBudget.getBudgetAmount()) {
            throw new IllegalArgumentException("Budget amount cannot be less than already spent amount");
        }

        existing.setBudgetAmount(updatedBudget.getBudgetAmount());
        existing.setCategory(updatedBudget.getCategory());
        existing.setMonthYear(updatedBudget.getMonthYear());
        existing.setRemainingAmount(updatedBudget.getBudgetAmount() - existing.getSpentAmount());
        return budgetRepository.save(existing);
    }

    public void deleteBudget(Long budgetId) {
        budgetRepository.deleteById(budgetId);
    }

    public Budget updateSpentAmount(Long userId, String category, Double amount) {
        Budget budget = budgetRepository.findByUserIdAndCategory(userId, category);
        if (budget != null) {
            double newSpent = budget.getSpentAmount() + amount;
            if (newSpent > budget.getBudgetAmount()) {
                throw new IllegalArgumentException("Spent amount cannot exceed budget amount");
            }
            budget.setSpentAmount(newSpent);
            budget.setRemainingAmount(budget.getBudgetAmount() - newSpent);
            return budgetRepository.save(budget);
        }
        return null;
    }
}