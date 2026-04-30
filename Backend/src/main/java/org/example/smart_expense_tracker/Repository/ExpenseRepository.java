package org.example.smart_expense_tracker.Repository;

import java.time.LocalDate;
import java.util.List;

import org.example.smart_expense_tracker.Model.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    List<Expense> findByUserId(Long userId);
    List<Expense> findByUserIdAndDateGreaterThanEqual(Long userId, LocalDate startDate);

    @Query("SELECT DISTINCT e.category FROM Expense e WHERE e.userId = :userId AND e.category IS NOT NULL AND TRIM(e.category) <> '' ORDER BY e.category")
    List<String> findDistinctCategoriesByUserId(@Param("userId") Long userId);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.userId = :userId AND LOWER(e.category) = LOWER(:category) AND e.date BETWEEN :startDate AND :endDate")
    Double sumAmountByUserCategoryAndDateRange(
            @Param("userId") Long userId,
            @Param("category") String category,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    void deleteByUserId(Long userId);
}