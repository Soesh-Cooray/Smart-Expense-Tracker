package org.example.smart_expense_tracker.Repository;

import java.util.List;

import org.example.smart_expense_tracker.Model.Budget;
import org.example.smart_expense_tracker.Model.BudgetCycle;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BudgetRepository extends JpaRepository<Budget, Long> {
    List<Budget> findByUserId(Long userId);
    List<Budget> findByUserIdAndMonthYear(Long userId, String monthYear);
    Budget findByUserIdAndCategory(Long userId, String category);
    Budget findByUserIdAndCategoryAndMonthYear(Long userId, String category, String monthYear);
    List<Budget> findByUserIdAndCategoryIgnoreCase(Long userId, String category);
    Budget findByUserIdAndCategoryIgnoreCaseAndCycleAndStartDay(Long userId, String category, BudgetCycle cycle, Integer startDay);
}