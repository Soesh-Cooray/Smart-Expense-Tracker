package org.example.smart_expense_tracker.Service;

import java.util.List;

import org.example.smart_expense_tracker.Controller.SavingsTransactionRequest;
import org.example.smart_expense_tracker.Model.SavingsGoal;
import org.example.smart_expense_tracker.Model.SavingsTransaction;
import org.example.smart_expense_tracker.Repository.SavingsGoalRepository;
import org.example.smart_expense_tracker.Repository.SavingsTransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SavingsTransactionService {

    private final SavingsTransactionRepository savingsTransactionRepository;
    private final SavingsGoalRepository savingsGoalRepository;

    public List<SavingsTransaction> findByUserId(Long userId) {
        return savingsTransactionRepository.findByUserIdOrderByDateDescCreatedAtDesc(userId);
    }

    @Transactional
    public SavingsTransaction create(SavingsTransactionRequest request) {
        validateRequest(request);

        SavingsGoal goal = savingsGoalRepository.findById(request.getSavingsGoalId())
                .orElseThrow(() -> new RuntimeException("Savings goal not found"));

        if (!goal.getUserId().equals(request.getUserId())) {
            throw new RuntimeException("Savings goal does not belong to the user");
        }

        SavingsTransaction transaction = new SavingsTransaction();
        transaction.setUserId(request.getUserId());
        transaction.setSavingsGoalId(request.getSavingsGoalId());
        transaction.setAmount(request.getAmount());
        transaction.setDate(request.getDate());

        SavingsTransaction savedTransaction = savingsTransactionRepository.save(transaction);

        goal.setSavedAmount(goal.getSavedAmount() + request.getAmount());
        savingsGoalRepository.save(goal);

        return savedTransaction;
    }

    @Transactional
    public SavingsTransaction update(Long id, SavingsTransactionRequest request) {
        validateRequest(request);

        SavingsTransaction existingTransaction = savingsTransactionRepository
                .findByIdAndUserId(id, request.getUserId())
                .orElseThrow(() -> new RuntimeException("Savings transaction not found"));

        SavingsGoal oldGoal = savingsGoalRepository.findById(existingTransaction.getSavingsGoalId())
                .orElseThrow(() -> new RuntimeException("Original savings goal not found"));

        SavingsGoal newGoal = savingsGoalRepository.findById(request.getSavingsGoalId())
                .orElseThrow(() -> new RuntimeException("Savings goal not found"));

        if (!newGoal.getUserId().equals(request.getUserId())) {
            throw new RuntimeException("Savings goal does not belong to the user");
        }

        if (oldGoal.getId().equals(newGoal.getId())) {
            oldGoal.setSavedAmount(Math.max(0, oldGoal.getSavedAmount() - existingTransaction.getAmount() + request.getAmount()));
            savingsGoalRepository.save(oldGoal);
        } else {
            oldGoal.setSavedAmount(Math.max(0, oldGoal.getSavedAmount() - existingTransaction.getAmount()));
            newGoal.setSavedAmount(newGoal.getSavedAmount() + request.getAmount());
            savingsGoalRepository.save(oldGoal);
            savingsGoalRepository.save(newGoal);
        }

        existingTransaction.setSavingsGoalId(request.getSavingsGoalId());
        existingTransaction.setAmount(request.getAmount());
        existingTransaction.setDate(request.getDate());

        return savingsTransactionRepository.save(existingTransaction);
    }

    @Transactional
    public void delete(Long id, Long userId) {
        if (userId == null) {
            throw new RuntimeException("User ID is required");
        }

        SavingsTransaction transaction = savingsTransactionRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new RuntimeException("Savings transaction not found"));

        SavingsGoal goal = savingsGoalRepository.findById(transaction.getSavingsGoalId())
                .orElseThrow(() -> new RuntimeException("Savings goal not found"));

        if (!goal.getUserId().equals(userId)) {
            throw new RuntimeException("Savings goal does not belong to the user");
        }

        goal.setSavedAmount(Math.max(0, goal.getSavedAmount() - transaction.getAmount()));
        savingsGoalRepository.save(goal);
        savingsTransactionRepository.delete(transaction);
    }

    private void validateRequest(SavingsTransactionRequest request) {
        if (request.getUserId() == null) {
            throw new RuntimeException("User ID is required");
        }
        if (request.getSavingsGoalId() == null) {
            throw new RuntimeException("Savings goal is required");
        }
        if (request.getDate() == null) {
            throw new RuntimeException("Transaction date is required");
        }
        if (request.getAmount() <= 0) {
            throw new RuntimeException("Amount must be greater than 0");
        }
    }
}
