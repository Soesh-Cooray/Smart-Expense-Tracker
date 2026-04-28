package org.example.smart_expense_tracker.Repository;

import java.time.LocalDate;
import java.util.List;

import org.example.smart_expense_tracker.Model.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    List<Expense> findByUserId(Long userId);
    List<Expense> findByUserIdAndDateGreaterThanEqual(Long userId, LocalDate startDate);
    void deleteByUserId(Long userId);
}