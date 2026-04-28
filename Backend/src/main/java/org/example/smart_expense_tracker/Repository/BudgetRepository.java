package org.example.smart_expense_tracker.Repository;

import org.example.smart_expense_tracker.Model.Budget;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BudgetRepository extends JpaRepository<Budget, Long> {
    List<Budget> findByUserId(Long userId);
    List<Budget> findByUserIdAndMonthYear(Long userId, String monthYear);
    Budget findByUserIdAndCategory(Long userId, String category);
    Budget findByUserIdAndCategoryAndMonthYear(Long userId, String category, String monthYear);
}