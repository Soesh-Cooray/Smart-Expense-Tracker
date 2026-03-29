package org.example.smart_expense_tracker.Service;

import java.util.List;

import org.example.smart_expense_tracker.Controller.SavingsGoalRequest;
import org.example.smart_expense_tracker.Model.SavingsGoal;
import org.example.smart_expense_tracker.Repository.SavingsGoalRepository;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SavingsGoalService {

    private final SavingsGoalRepository repository;

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
        SavingsGoal goal = new SavingsGoal();
        goal.setUserId(userId);
        goal.setName(request.getName());
        goal.setTargetAmount(request.getTargetAmount());
        goal.setSavedAmount(request.getSavedAmount());
        goal.setDueDate(request.getDueDate());
        goal.setIcon(request.getIcon());
        goal.setColor(request.getColor());
        return repository.save(goal);
    }

    public SavingsGoal update(Long id, SavingsGoalRequest request) {
        SavingsGoal goal = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Savings goal not found with id: " + id));
        goal.setName(request.getName());
        goal.setTargetAmount(request.getTargetAmount());
        goal.setSavedAmount(request.getSavedAmount());
        goal.setDueDate(request.getDueDate());
        goal.setIcon(request.getIcon());
        goal.setColor(request.getColor());
        return repository.save(goal);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }
}
