package org.example.smart_expense_tracker.Service;

import org.example.smart_expense_tracker.Model.Budget;
import org.example.smart_expense_tracker.Model.BudgetCycle;
import org.example.smart_expense_tracker.Repository.BudgetRepository;
import org.example.smart_expense_tracker.Repository.ExpenseRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Service
public class BudgetService {

    @Autowired
    private BudgetRepository budgetRepository;

    @Autowired
    private ExpenseRepository expenseRepository;

    public Budget createBudget(Budget budget) {
        normalizeAndValidateCycleFields(budget, true);

        Budget existing = budgetRepository.findByUserIdAndCategoryIgnoreCaseAndCycleAndStartDay(
                budget.getUserId(), budget.getCategory(), budget.getCycle(), budget.getStartDay()
        );
        if (existing != null) {
            throw new IllegalArgumentException("A budget with the same category, cycle, and start day already exists");
        }

        refreshCycleAndAmounts(budget);
        return budgetRepository.save(budget);
    }

    public List<Budget> getUserBudgets(Long userId) {
        List<Budget> budgets = budgetRepository.findByUserId(userId);
        List<Budget> updatedBudgets = new ArrayList<>();
        for (Budget budget : budgets) {
            refreshCycleAndAmounts(budget);
            updatedBudgets.add(budgetRepository.save(budget));
        }
        return updatedBudgets;
    }

    public List<Budget> getUserBudgetsByMonth(Long userId, String monthYear) {
        List<Budget> budgets = getUserBudgets(userId);
        return budgets.stream()
                .filter(b -> b.getCurrentCycleStart() != null)
                .filter(b -> {
                    YearMonth ym = YearMonth.from(b.getCurrentCycleStart());
                    return ym.toString().equals(monthYear);
                })
                .toList();
    }

    public Budget updateBudget(Long budgetId, Budget updatedBudget) {
        Budget existing = budgetRepository.findById(budgetId)
                .orElseThrow(() -> new IllegalArgumentException("Budget not found"));

        normalizeAndValidateCycleFields(updatedBudget, false);

        Budget duplicate = budgetRepository.findByUserIdAndCategoryIgnoreCaseAndCycleAndStartDay(
                existing.getUserId(), updatedBudget.getCategory(), updatedBudget.getCycle(), updatedBudget.getStartDay()
        );
        if (duplicate != null && !Objects.equals(duplicate.getBudgetId(), budgetId)) {
            throw new IllegalArgumentException("Another budget with same category, cycle, and start day already exists");
        }

        if (updatedBudget.getBudgetAmount() == null || updatedBudget.getBudgetAmount() <= 0) {
            throw new IllegalArgumentException("Budget amount must be greater than 0");
        }

        existing.setBudgetAmount(updatedBudget.getBudgetAmount());
        existing.setCategory(updatedBudget.getCategory());
        existing.setCycle(updatedBudget.getCycle());
        existing.setStartDay(updatedBudget.getStartDay());
        existing.setStartDate(updatedBudget.getStartDate());
        existing.setMonthYear(updatedBudget.getMonthYear());

        refreshCycleAndAmounts(existing);
        return budgetRepository.save(existing);
    }

    public void deleteBudget(Long budgetId) {
        budgetRepository.deleteById(budgetId);
    }

    public Budget updateSpentAmount(Long userId, String category, Double amount) {
        if (amount == null || amount < 0) {
            throw new IllegalArgumentException("Amount must be a non-negative value");
        }

        List<Budget> budgets = budgetRepository.findByUserIdAndCategoryIgnoreCase(userId, category);
        if (budgets.isEmpty()) {
            return null;
        }

        Budget lastSaved = null;
        for (Budget budget : budgets) {
            refreshCycleAndAmounts(budget);
            lastSaved = budgetRepository.save(budget);
        }
        return lastSaved;
    }

    public void syncBudgetsForUserAndCategory(Long userId, String category) {
        if (category == null || category.isBlank()) {
            return;
        }

        List<Budget> budgets = budgetRepository.findByUserIdAndCategoryIgnoreCase(userId, category);
        for (Budget budget : budgets) {
            refreshCycleAndAmounts(budget);
            budgetRepository.save(budget);
        }
    }

    public void syncBudgetsAfterExpenseUpdate(Long userId, String oldCategory, String newCategory) {
        if (oldCategory != null && !oldCategory.isBlank()) {
            syncBudgetsForUserAndCategory(userId, oldCategory);
        }
        if (newCategory != null && !newCategory.isBlank() && !newCategory.equalsIgnoreCase(oldCategory)) {
            syncBudgetsForUserAndCategory(userId, newCategory);
        }
    }

    private void normalizeAndValidateCycleFields(Budget budget, boolean validateLegacyMonth) {
        if (budget.getCycle() == null) {
            throw new IllegalArgumentException("Cycle is required");
        }
        if (budget.getStartDay() == null || budget.getStartDay() < 1 || budget.getStartDay() > 31) {
            throw new IllegalArgumentException("Start day must be between 1 and 31");
        }
        if (budget.getBudgetAmount() == null || budget.getBudgetAmount() <= 0) {
            throw new IllegalArgumentException("Budget amount must be greater than 0");
        }

        LocalDate baseDate = budget.getStartDate() == null
                ? deriveStartDateFromDay(budget.getStartDay())
                : budget.getStartDate();
        budget.setStartDate(alignStartDate(baseDate, budget.getStartDay()));

        if (validateLegacyMonth && budget.getMonthYear() != null && !budget.getMonthYear().isBlank()) {
            try {
                YearMonth current = YearMonth.now();
                YearMonth budgetMonth = YearMonth.parse(budget.getMonthYear());
                if (budgetMonth.isBefore(current)) {
                    throw new IllegalArgumentException("Month cannot be in the past");
                }
            } catch (DateTimeParseException ignored) {
                // Ignore invalid legacy month values and rely on cycle fields.
            }
        }
    }

    private void refreshCycleAndAmounts(Budget budget) {
        LocalDate today = LocalDate.now();
        LocalDate currentStart = calculateCurrentCycleStart(budget.getStartDate(), budget.getCycle(), budget.getStartDay(), today);
        LocalDate nextStart = calculateNextCycleStart(currentStart, budget.getCycle(), budget.getStartDay());
        LocalDate currentEnd = nextStart.minusDays(1);

        budget.setCurrentCycleStart(currentStart);
        budget.setCurrentCycleEnd(currentEnd);

        Double spent = expenseRepository.sumAmountByUserCategoryAndDateRange(
                budget.getUserId(),
                budget.getCategory(),
                currentStart,
                currentEnd
        );
        double safeSpent = spent == null ? 0.0 : spent;
        budget.setSpentAmount(safeSpent);
        budget.setRemainingAmount(budget.getBudgetAmount() - safeSpent);
    }

    private LocalDate calculateCurrentCycleStart(LocalDate initialStart, BudgetCycle cycle, Integer startDay, LocalDate today) {
        LocalDate start = initialStart;
        while (!calculateNextCycleStart(start, cycle, startDay).isAfter(today)) {
            start = calculateNextCycleStart(start, cycle, startDay);
        }
        return start;
    }

    private LocalDate calculateNextCycleStart(LocalDate start, BudgetCycle cycle, Integer startDay) {
        if (cycle == BudgetCycle.WEEKLY) {
            return start.plusWeeks(1);
        }

        LocalDate nextMonth = start.plusMonths(1);
        int expectedDay = Math.min(startDay, YearMonth.from(nextMonth).lengthOfMonth());
        return LocalDate.of(nextMonth.getYear(), nextMonth.getMonth(), expectedDay);
    }

    private LocalDate alignStartDate(LocalDate baseDate, Integer startDay) {
        int safeDay = Math.min(startDay, YearMonth.from(baseDate).lengthOfMonth());
        return LocalDate.of(baseDate.getYear(), baseDate.getMonth(), safeDay);
    }

    private LocalDate deriveStartDateFromDay(Integer startDay) {
        LocalDate now = LocalDate.now();
        int safeDay = Math.min(startDay, now.lengthOfMonth());
        return LocalDate.of(now.getYear(), now.getMonth(), safeDay);
    }
}