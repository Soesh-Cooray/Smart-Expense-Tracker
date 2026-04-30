package org.example.smart_expense_tracker.Repository;

import java.util.List;

import org.example.smart_expense_tracker.Model.SavingsGoal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface SavingsGoalRepository extends JpaRepository<SavingsGoal, Long> {
    List<SavingsGoal> findByUserId(Long userId);
    void deleteByUserId(Long userId);
    
    @Query("SELECT sg FROM SavingsGoal sg WHERE sg.dueDate = CURRENT_DATE + 7")
    List<SavingsGoal> findGoalsDueIn7Days();
}
