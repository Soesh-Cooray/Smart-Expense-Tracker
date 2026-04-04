package org.example.smart_expense_tracker.Service;

import java.util.List;

import org.example.smart_expense_tracker.Model.Income;
import org.example.smart_expense_tracker.Repository.IncomeRepository;
import org.springframework.stereotype.Service;

@Service
public class IncomeService {

    private final IncomeRepository incomeRepository;

    public IncomeService(IncomeRepository incomeRepository) {
        this.incomeRepository = incomeRepository;
    }

    public List<Income> getIncomeByUserId(Long userId) {
        return incomeRepository.findByUserId(userId);
    }

    public Income getIncomeByIdAndUserId(Long id, Long userId) {
        return incomeRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new RuntimeException("Income not found"));
    }

    public Income createIncome(Income income) {
        if (income.getUserId() == null) {
            throw new RuntimeException("User ID is required");
        }
        return incomeRepository.save(income);
    }

    public Income updateIncome(Long id, Income incomeDetails) {
        Income income = incomeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Income not found"));

        if (incomeDetails.getUserId() != null && !income.getUserId().equals(incomeDetails.getUserId())) {
            throw new RuntimeException("Income does not belong to the signed in user");
        }

        income.setTitle(incomeDetails.getTitle());
        income.setDescription(incomeDetails.getDescription());
        income.setCategory(incomeDetails.getCategory());
        income.setAmount(incomeDetails.getAmount());
        income.setDate(incomeDetails.getDate());
        income.setNotes(incomeDetails.getNotes());

        return incomeRepository.save(income);
    }

    public void deleteIncome(Long id, Long userId) {
        Income income = incomeRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new RuntimeException("Income not found"));
        incomeRepository.delete(income);
    }
}