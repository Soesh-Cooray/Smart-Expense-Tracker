package org.example.smart_expense_tracker.Service;

import java.util.List;

import org.example.smart_expense_tracker.Model.Expense;
import org.example.smart_expense_tracker.Repository.ExpenseRepository;
import org.springframework.stereotype.Service;

@Service
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final BudgetService budgetService;

    public ExpenseService(ExpenseRepository expenseRepository, BudgetService budgetService) {
        this.expenseRepository = expenseRepository;
        this.budgetService = budgetService;
    }

    public List<Expense> getAllExpenses() {
        return expenseRepository.findAll();
    }

    public List<Expense> getExpensesByUserId(Long userId) {
        return expenseRepository.findByUserId(userId);
    }

    public List<String> getDistinctCategoriesByUserId(Long userId) {
        return expenseRepository.findDistinctCategoriesByUserId(userId);
    }

    public Expense getExpenseById(Long id) {
        return expenseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Expense not found"));
    }

    public Expense createExpense(Expense expense) {
        if (expense.getUserId() == null) {
            throw new RuntimeException("User ID is required");
        }
        Expense saved = expenseRepository.save(expense);
        budgetService.syncBudgetsForUserAndCategory(saved.getUserId(), saved.getCategory());
        return saved;
    }

    public Expense updateExpense(Long id, Expense expenseDetails) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Expense not found"));

        String oldCategory = expense.getCategory();

        expense.setDescription(expenseDetails.getDescription());
        expense.setCategory(expenseDetails.getCategory());
        expense.setAmount(expenseDetails.getAmount());
        expense.setPaymentMethod(expenseDetails.getPaymentMethod());
        expense.setDate(expenseDetails.getDate());
        expense.setNotes(expenseDetails.getNotes());

        Expense saved = expenseRepository.save(expense);
        budgetService.syncBudgetsAfterExpenseUpdate(saved.getUserId(), oldCategory, saved.getCategory());
        return saved;
    }

    public void deleteExpense(Long id) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Expense not found"));
        expenseRepository.deleteById(id);
        budgetService.syncBudgetsForUserAndCategory(expense.getUserId(), expense.getCategory());
    }
}