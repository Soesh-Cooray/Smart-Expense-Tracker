package org.example.smart_expense_tracker.Service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.example.smart_expense_tracker.Dto.AIPredictionRequest;
import org.example.smart_expense_tracker.Dto.AIPredictionResponse;
import org.example.smart_expense_tracker.Dto.AITransaction;
import org.example.smart_expense_tracker.Dto.OverspendingPredictionResponse;
import org.example.smart_expense_tracker.Model.Expense;
import org.example.smart_expense_tracker.Model.Income;
import org.example.smart_expense_tracker.Repository.ExpenseRepository;
import org.example.smart_expense_tracker.Repository.IncomeRepository;
import org.springframework.stereotype.Service;

@Service
public class OverspendingPredictionService {

    private final ExpenseRepository expenseRepository;
    private final IncomeRepository incomeRepository;
    private final AIServiceClient aiServiceClient;

    public OverspendingPredictionService(
            ExpenseRepository expenseRepository,
            IncomeRepository incomeRepository,
            AIServiceClient aiServiceClient
    ) {
        this.expenseRepository = expenseRepository;
        this.incomeRepository = incomeRepository;
        this.aiServiceClient = aiServiceClient;
    }

    public OverspendingPredictionResponse predictForUser(Long userId) {
        LocalDate minDate = LocalDate.now().minusMonths(3);
        List<Expense> recentExpenses = expenseRepository.findByUserIdAndDateGreaterThanEqual(userId, minDate);
        List<Income> recentIncomes = incomeRepository.findByUserIdAndDateGreaterThanEqual(userId, minDate);

        List<AITransaction> transactions = new ArrayList<>();
        for (Expense expense : recentExpenses) {
            AITransaction tx = mapExpense(expense);
            if (tx != null) {
                transactions.add(tx);
            }
        }
        for (Income income : recentIncomes) {
            AITransaction tx = mapIncome(income);
            if (tx != null) {
                transactions.add(tx);
            }
        }

        if (transactions.isEmpty()) {
            OverspendingPredictionResponse response = new OverspendingPredictionResponse();
            response.setUserId(userId);
            response.setPredictionAvailable(false);
            response.setOverspender(false);
            response.setProbability(0.0);
            response.setRiskLevel("Unknown");
            response.setWindowExpense(0.0);
            response.setWindowIncome(0.0);
            response.setTopExpenseCategory("unknown");
            response.setMessage("Not enough recent transactions to run overspending prediction.");
            return response;
        }

        AIPredictionRequest request = new AIPredictionRequest();
        request.setUserId(userId.toString());
        request.setTransactions(transactions);
        request.setHistoricalMonthlyMedian(computeHistoricalMedianExpense(userId));

        AIPredictionResponse aiResponse = aiServiceClient.predict(request);

        OverspendingPredictionResponse response = new OverspendingPredictionResponse();
        response.setUserId(userId);
        response.setPredictionAvailable(true);
        response.setOverspender(aiResponse.isOverspender());
        response.setProbability(aiResponse.getProbability());
        response.setRiskLevel(aiResponse.getRiskLevel());
        response.setWindowExpense(aiResponse.getWindowExpense());
        response.setWindowIncome(aiResponse.getWindowIncome());
        response.setTopExpenseCategory(aiResponse.getTopExpenseCategory());
        response.setMessage(aiResponse.getMessage());
        return response;
    }

    private AITransaction mapExpense(Expense expense) {
        if (expense.getDate() == null || expense.getAmount() == null) {
            return null;
        }
        AITransaction transaction = new AITransaction();
        transaction.setDate(expense.getDate().toString());
        transaction.setTransactionType("Expense");
        transaction.setPaymentMode(mapPaymentMode(expense.getPaymentMethod()));
        transaction.setAmount(expense.getAmount());
        transaction.setRefinedCategory(mapExpenseCategory(expense.getCategory()));
        transaction.setLocation("unknown");
        return transaction;
    }

    private AITransaction mapIncome(Income income) {
        if (income.getDate() == null || income.getAmount() == null) {
            return null;
        }
        AITransaction transaction = new AITransaction();
        transaction.setDate(income.getDate().toString());
        transaction.setTransactionType("Income");
        transaction.setPaymentMode("Other");
        transaction.setAmount(income.getAmount());
        transaction.setRefinedCategory(mapIncomeCategory(income.getCategory()));
        transaction.setLocation("unknown");
        return transaction;
    }

    private Double computeHistoricalMedianExpense(Long userId) {
        List<Expense> allExpenses = expenseRepository.findByUserId(userId);
        Map<YearMonth, Double> monthlyTotals = new HashMap<>();

        for (Expense expense : allExpenses) {
            if (expense.getDate() == null || expense.getAmount() == null) {
                continue;
            }
            YearMonth month = YearMonth.from(expense.getDate());
            monthlyTotals.merge(month, expense.getAmount(), Double::sum);
        }

        if (monthlyTotals.isEmpty()) {
            return null;
        }

        List<Double> totals = new ArrayList<>(monthlyTotals.values());
        Collections.sort(totals);

        int n = totals.size();
        if (n % 2 == 1) {
            return totals.get(n / 2);
        }
        return (totals.get((n / 2) - 1) + totals.get(n / 2)) / 2.0;
    }

    private String mapExpenseCategory(String rawCategory) {
        String normalized = normalize(rawCategory);
        return switch (normalized) {
            case "housing" -> "rent";
            case "food" -> "food";
            case "transport" -> "travel";
            case "entertainment" -> "entertainment";
            case "health" -> "health";
            case "utilities" -> "utilities";
            case "shopping" -> "misc";
            case "savings" -> "savings";
            case "rent" -> "rent";
            case "education" -> "education";
            case "travel" -> "travel";
            case "misc" -> "misc";
            default -> "others";
        };
    }

    private String mapIncomeCategory(String rawCategory) {
        String normalized = normalize(rawCategory);
        return switch (normalized) {
            case "salary" -> "salary";
            case "freelance" -> "freelance";
            case "investments" -> "investment";
            case "investment" -> "investment";
            case "bonus" -> "bonus";
            default -> "bonus";
        };
    }

    private String mapPaymentMode(String rawPaymentMethod) {
        String normalized = normalize(rawPaymentMethod);
        return switch (normalized) {
            case "credit card", "debit card", "card" -> "Card";
            case "cash" -> "Cash";
            case "digital wallet", "online", "online transfer", "wallet" -> "Online";
            default -> "Other";
        };
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }
        return value.trim().replace("_", " ").toLowerCase(Locale.ROOT);
    }
}
