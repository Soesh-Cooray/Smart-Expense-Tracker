package org.example.smart_expense_tracker.Service;

import java.time.LocalDate;
import java.util.List;

import org.example.smart_expense_tracker.Controller.SavingsGoalRequest;
import org.example.smart_expense_tracker.Model.SavingsGoal;
import org.example.smart_expense_tracker.Repository.Auth;
import org.example.smart_expense_tracker.Repository.SavingsGoalRepository;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SavingsGoalService {

    private final SavingsGoalRepository repository;
    private final Auth userRepository;
    private final EmailService emailService;

    public List<SavingsGoal> findAll() {
        return repository.findAll();
    }

    public List<SavingsGoal> findByUserId(Long userId) {
        return repository.findByUserId(userId);
    }

    public SavingsGoal create(Long userId, SavingsGoalRequest request) {
        if (userId == null) {
            throw new RuntimeException("User ID is required");
        }
        if (request.getTargetAmount() <= 0) {
            throw new RuntimeException("Target amount must be greater than 0");
        }
        SavingsGoal goal = new SavingsGoal();
        goal.setUserId(userId);
        goal.setName(request.getName());
        goal.setTargetAmount(request.getTargetAmount());
        goal.setSavedAmount(0);
        goal.setDueDate(request.getDueDate());
        goal.setIcon(request.getIcon());
        goal.setColor(request.getColor());
        SavingsGoal saved = repository.save(goal);

        // If the due date is within the next 7 days (inclusive), send an immediate reminder
        try {
            LocalDate due = request.getDueDate();
            if (due != null && !due.isAfter(LocalDate.now().plusDays(7))) {
                if (userId != null) {
                    userRepository.findById(userId.intValue()).ifPresent(user -> {
                        try {
                            emailService.sendSavingsGoalReminder(
                                    user.getUsername(),
                                    saved.getName(),
                                    saved.getTargetAmount(),
                                    saved.getSavedAmount());
                        } catch (Exception e) {
                            // ignore email failures for create
                        }
                    });
                }
            }
        } catch (Exception ignored) {
        }

        return saved;
    }

    public SavingsGoal update(Long id, SavingsGoalRequest request) {
        SavingsGoal goal = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Savings goal not found with id: " + id));
        if (request.getTargetAmount() <= 0) {
            throw new RuntimeException("Target amount must be greater than 0");
        }
        goal.setName(request.getName());
        goal.setTargetAmount(request.getTargetAmount());
        goal.setDueDate(request.getDueDate());
        goal.setIcon(request.getIcon());
        goal.setColor(request.getColor());
        return repository.save(goal);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }
}
