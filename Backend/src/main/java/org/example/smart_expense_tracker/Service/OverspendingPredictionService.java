package org.example.smart_expense_tracker.Service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.example.smart_expense_tracker.Dto.AIPredictionRequest;
import org.example.smart_expense_tracker.Dto.AIPredictionResponse;
import org.example.smart_expense_tracker.Dto.AITransaction;
import org.example.smart_expense_tracker.Dto.AITrendResponse;
import org.example.smart_expense_tracker.Dto.OverspendingPredictionResponse;
import org.example.smart_expense_tracker.Dto.OverspendingTrendResponse;
import org.example.smart_expense_tracker.Dto.OverspendingWindowOptionResponse;
import org.example.smart_expense_tracker.Model.Expense;
import org.example.smart_expense_tracker.Model.Income;
import org.example.smart_expense_tracker.Repository.ExpenseRepository;
import org.example.smart_expense_tracker.Repository.IncomeRepository;
import org.springframework.stereotype.Service;

@Service
public class OverspendingPredictionService {

    private static final DateTimeFormatter ISO_DATE = DateTimeFormatter.ISO_LOCAL_DATE;

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

    public OverspendingPredictionResponse predictForUser(Long userId, String windowStartMonthText) {
        YearMonth selectedWindowStart = resolveWindowStartMonth(userId, windowStartMonthText);
        LocalDate windowStart = selectedWindowStart.atDay(1);
        LocalDate windowEnd = selectedWindowStart.plusMonths(2).atEndOfMonth();
        LocalDate historicalCutoff = windowStart.minusDays(1);

        List<AITransaction> transactions = buildTransactionsInRange(userId, windowStart, windowEnd);

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
            response.setWindowStart(formatMonth(windowStart));
            response.setWindowEnd(formatMonth(windowEnd));
            response.setMessage("Not enough recent transactions to run overspending prediction.");
            return response;
        }

        Double historicalMedian = computeHistoricalMedianExpenseBefore(userId, historicalCutoff);
        AIPredictionRequest request = new AIPredictionRequest();
        request.setUserId(userId.toString());
        request.setTransactions(transactions);
        request.setHistoricalMonthlyMedian(historicalMedian);

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
        response.setWindowStart(formatMonth(windowStart));
        response.setWindowEnd(formatMonth(windowEnd));
        response.setMessage(aiResponse.getMessage());
        return response;
    }

    public List<OverspendingWindowOptionResponse> getAvailableWindows(Long userId) {
        List<LocalDate> allDates = getAllTransactionDates(userId);
        if (allDates.isEmpty()) {
            return List.of();
        }

        YearMonth minMonth = YearMonth.from(Collections.min(allDates));
        YearMonth maxMonth = YearMonth.from(Collections.max(allDates));
        YearMonth latestWindowStart = maxMonth.minusMonths(2);

        List<OverspendingWindowOptionResponse> windows = new ArrayList<>();
        for (YearMonth month = minMonth; !month.isAfter(latestWindowStart); month = month.plusMonths(1)) {
            OverspendingWindowOptionResponse option = new OverspendingWindowOptionResponse();
            option.setWindowStartMonth(month.toString());
            option.setWindowEndMonth(month.plusMonths(2).toString());
            option.setLabel(formatWindowLabel(month.atDay(1), month.plusMonths(2).atEndOfMonth()));
            windows.add(option);
        }

        return windows;
    }

    public OverspendingTrendResponse predictTrendForUser(Long userId) {
        List<AITransaction> transactions = buildTransactions(
            expenseRepository.findByUserId(userId),
            incomeRepository.findByUserId(userId)
        );

        if (transactions.size() < 4) {
            OverspendingTrendResponse response = new OverspendingTrendResponse();
            response.setUserId(userId);
            response.setTrendAvailable(false);
            response.setTrend(List.of());
            response.setMessage("Trend analysis available after 3 months of transaction data.");
            return response;
        }

        AIPredictionRequest request = new AIPredictionRequest();
        request.setUserId(userId.toString());
        request.setTransactions(transactions);
        request.setHistoricalMonthlyMedian(computeHistoricalMedianExpenseBefore(userId, LocalDate.now()));

        AITrendResponse aiTrendResponse = aiServiceClient.predictTrend(request);

        OverspendingTrendResponse response = new OverspendingTrendResponse();
        response.setUserId(userId);
        response.setTrendAvailable(aiTrendResponse.isTrendAvailable());
        response.setTrend(aiTrendResponse.getTrend());
        response.setMessage(aiTrendResponse.getMessage());
        return response;
    }

    private List<AITransaction> buildTransactionsInRange(Long userId, LocalDate windowStart, LocalDate windowEnd) {
        List<Expense> expenses = expenseRepository.findByUserIdAndDateGreaterThanEqual(userId, windowStart)
                .stream()
                .filter(expense -> expense.getDate() != null && !expense.getDate().isAfter(windowEnd))
                .toList();

        List<Income> incomes = incomeRepository.findByUserIdAndDateGreaterThanEqual(userId, windowStart)
                .stream()
                .filter(income -> income.getDate() != null && !income.getDate().isAfter(windowEnd))
                .toList();

        return buildTransactions(expenses, incomes);
    }

    private List<LocalDate> getAllTransactionDates(Long userId) {
        List<LocalDate> dates = new ArrayList<>();
        for (Expense expense : expenseRepository.findByUserId(userId)) {
            if (expense.getDate() != null) {
                dates.add(expense.getDate());
            }
        }
        for (Income income : incomeRepository.findByUserId(userId)) {
            if (income.getDate() != null) {
                dates.add(income.getDate());
            }
        }
        return dates;
    }

    private List<AITransaction> buildTransactions(List<Expense> expenses, List<Income> incomes) {
        List<AITransaction> transactions = new ArrayList<>();
        for (Expense expense : expenses) {
            AITransaction tx = mapExpense(expense);
            if (tx != null) {
                transactions.add(tx);
            }
        }
        for (Income income : incomes) {
            AITransaction tx = mapIncome(income);
            if (tx != null) {
                transactions.add(tx);
            }
        }
        transactions.sort((left, right) -> left.getDate().compareTo(right.getDate()));
        return transactions;
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

    private Double computeHistoricalMedianExpenseBefore(Long userId, LocalDate cutoffDate) {
        List<Expense> allExpenses = expenseRepository.findByUserId(userId).stream()
                .filter(expense -> expense.getDate() != null && !expense.getDate().isAfter(cutoffDate))
                .toList();
        Map<YearMonth, Double> monthlyTotals = new HashMap<>();

        for (Expense expense : allExpenses) {
            if (expense.getDate() == null || expense.getAmount() == null) {
                continue;
            }
            YearMonth month = YearMonth.from(expense.getDate());
            monthlyTotals.merge(month, expense.getAmount(), (existing, current) -> existing + current);
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

    private YearMonth resolveWindowStartMonth(Long userId, String windowStartMonthText) {
        if (windowStartMonthText != null && !windowStartMonthText.isBlank()) {
            return YearMonth.parse(windowStartMonthText.trim());
        }

        List<LocalDate> dates = getAllTransactionDates(userId);
        if (dates.isEmpty()) {
            return YearMonth.now().minusMonths(2);
        }

        YearMonth maxMonth = YearMonth.from(Collections.max(dates));
        return maxMonth.minusMonths(2);
    }

    private String formatMonth(LocalDate date) {
        return date == null ? null : date.format(DateTimeFormatter.ISO_LOCAL_DATE);
    }

    private String formatWindowLabel(LocalDate windowStart, LocalDate windowEnd) {
        return windowStart.format(java.time.format.DateTimeFormatter.ofPattern("MMM yyyy", Locale.ENGLISH))
            + " — "
            + windowEnd.format(java.time.format.DateTimeFormatter.ofPattern("MMM yyyy", Locale.ENGLISH));
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

    public String formatDate(LocalDate date) {
        return date == null ? null : date.format(ISO_DATE);
    }
}
