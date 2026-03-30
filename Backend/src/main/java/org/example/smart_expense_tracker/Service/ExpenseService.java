package org.example.smart_expense_tracker.Service;

import org.example.smart_expense_tracker.Model.Expense;
import org.example.smart_expense_tracker.Repository.ExpenseRepository;
import org.example.smart_expense_tracker.dto.ExpenseCreateRequest;
import org.example.smart_expense_tracker.dto.ExpenseResponse;
import org.example.smart_expense_tracker.dto.ExpenseUpdateRequest;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ExpenseService {

    private final ExpenseRepository expenseRepository;

    public ExpenseService(ExpenseRepository expenseRepository) {
        this.expenseRepository = expenseRepository;
    }

    public List<ExpenseResponse> getAllExpenses() {
        return expenseRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public ExpenseResponse getExpenseById(Long id) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Expense not found"));
        return mapToResponse(expense);
    }

    public ExpenseResponse createExpense(ExpenseCreateRequest request) {
        Expense expense = new Expense();
        expense.setDescription(request.getDescription());
        expense.setCategory(request.getCategory());
        expense.setAmount(request.getAmount());
        expense.setPaymentMethod(request.getPaymentMethod());
        expense.setDate(request.getDate());
        expense.setNotes(request.getNotes());

        Expense saved = expenseRepository.save(expense);
        return mapToResponse(saved);
    }

    public ExpenseResponse updateExpense(Long id, ExpenseUpdateRequest request) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Expense not found"));

        expense.setDescription(request.getDescription());
        expense.setCategory(request.getCategory());
        expense.setAmount(request.getAmount());
        expense.setPaymentMethod(request.getPaymentMethod());
        expense.setDate(request.getDate());
        expense.setNotes(request.getNotes());

        Expense updated = expenseRepository.save(expense);
        return mapToResponse(updated);
    }

    public void deleteExpense(Long id) {
        if (!expenseRepository.existsById(id)) {
            throw new RuntimeException("Expense not found");
        }
        expenseRepository.deleteById(id);
    }

    private ExpenseResponse mapToResponse(Expense expense) {
        ExpenseResponse response = new ExpenseResponse();
        response.setId(expense.getId());
        response.setDescription(expense.getDescription());
        response.setCategory(expense.getCategory());
        response.setAmount(expense.getAmount());
        response.setPaymentMethod(expense.getPaymentMethod());
        response.setDate(expense.getDate());
        response.setNotes(expense.getNotes());
        response.setCreatedAt(expense.getCreatedAt());
        return response;
    }
}