package org.example.smart_expense_tracker.Repository;

import org.example.smart_expense_tracker.Model.SavingsGoal;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SavingsGoalRepository extends JpaRepository<SavingsGoal, Long> {
}
