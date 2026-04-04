package org.example.smart_expense_tracker.Repository;

import java.util.List;

import org.example.smart_expense_tracker.Model.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    List<Expense> findByUserId(Long userId);
    void deleteByUserId(Long userId);
}