package org.example.smart_expense_tracker.Repository;

import java.time.LocalDate;
import java.util.List;

import org.example.smart_expense_tracker.Model.SavingsGoal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SavingsGoalRepository extends JpaRepository<SavingsGoal, Long> {
    List<SavingsGoal> findByUserId(Long userId);
    void deleteByUserId(Long userId);
    
    @Query("SELECT sg FROM SavingsGoal sg WHERE sg.dueDate BETWEEN :startDate AND :endDate")
    List<SavingsGoal> findGoalsDueWithinDays(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);
}
