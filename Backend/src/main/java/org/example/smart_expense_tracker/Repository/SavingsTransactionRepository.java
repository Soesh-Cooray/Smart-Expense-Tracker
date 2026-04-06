package org.example.smart_expense_tracker.Repository;

import java.util.List;
import java.util.Optional;

import org.example.smart_expense_tracker.Model.SavingsTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SavingsTransactionRepository extends JpaRepository<SavingsTransaction, Long> {
    List<SavingsTransaction> findByUserIdOrderByDateDescCreatedAtDesc(Long userId);
    List<SavingsTransaction> findBySavingsGoalIdOrderByDateDescCreatedAtDesc(Long savingsGoalId);
    Optional<SavingsTransaction> findByIdAndUserId(Long id, Long userId);
    void deleteByUserId(Long userId);
}
