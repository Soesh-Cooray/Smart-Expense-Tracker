package org.example.smart_expense_tracker.Service;

import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

import org.example.smart_expense_tracker.Dto.AIFutureResponse;
import org.example.smart_expense_tracker.Dto.MonthlyRecordDto;
import org.example.smart_expense_tracker.Model.Expense;
import org.example.smart_expense_tracker.Repository.ExpenseRepository;
import org.springframework.stereotype.Service;

@Service
public class ForecastService {

    private static final Set<String> SUPPORTED_CATEGORIES = Set.of(
            "food",
            "travel",
            "health",
            "utilities",
            "rent",
            "entertainment",
            "education",
            "misc",
            "others"
    );

    private static final DateTimeFormatter YEAR_MONTH_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM");

    private final ExpenseRepository expenseRepository;
    private final AIServiceClient aiServiceClient;

    public ForecastService(ExpenseRepository expenseRepository, AIServiceClient aiServiceClient) {
        this.expenseRepository = expenseRepository;
        this.aiServiceClient = aiServiceClient;
    }

    public AIFutureResponse forecastForUser(Long userId, String category, int monthsAhead) {
        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException("A valid userId is required.");
        }

        String normalizedCategory = normalizeCategory(category);
        if (!SUPPORTED_CATEGORIES.contains(normalizedCategory)) {
            throw new IllegalArgumentException("Unsupported category. Supported categories: " + SUPPORTED_CATEGORIES);
        }

        if (monthsAhead < 1 || monthsAhead > 12) {
            throw new IllegalArgumentException("monthsAhead must be between 1 and 12.");
        }

        List<MonthlyRecordDto> history = buildMonthlyHistory(userId, normalizedCategory);
        if (history.size() < 12) {
            throw new IllegalArgumentException("At least 12 months of category history are required for forecasting.");
        }

        return aiServiceClient.predictFuture(normalizedCategory, history, monthsAhead);
    }

    public List<String> getSupportedCategories() {
        return List.copyOf(SUPPORTED_CATEGORIES);
    }

    private List<MonthlyRecordDto> buildMonthlyHistory(Long userId, String category) {
        List<Expense> expenses = expenseRepository.findByUserId(userId);
        Map<YearMonth, MonthlyAggregate> monthlyTotals = new TreeMap<>();

        for (Expense expense : expenses) {
            if (expense.getDate() == null || expense.getAmount() == null) {
                continue;
            }
            if (!category.equals(normalizeCategory(mapExpenseCategory(expense.getCategory())))) {
                continue;
            }

            YearMonth month = YearMonth.from(expense.getDate());
            MonthlyAggregate aggregate = monthlyTotals.computeIfAbsent(month, ignored -> new MonthlyAggregate());
            aggregate.totalAmount += expense.getAmount();
            aggregate.transactionCount += 1;
        }

        if (monthlyTotals.isEmpty()) {
            return List.of();
        }

        YearMonth firstMonth = monthlyTotals.keySet().iterator().next();
        YearMonth lastMonth = null;
        for (YearMonth month : monthlyTotals.keySet()) {
            lastMonth = month;
        }

        List<MonthlyRecordDto> history = new ArrayList<>();
        for (YearMonth month = firstMonth; !month.isAfter(lastMonth); month = month.plusMonths(1)) {
            MonthlyAggregate aggregate = monthlyTotals.getOrDefault(month, new MonthlyAggregate());
            MonthlyRecordDto record = new MonthlyRecordDto();
            record.setYearMonth(month.format(YEAR_MONTH_FORMAT));
            record.setTotalAmount(roundMoney(aggregate.totalAmount));
            record.setTransactionCount(aggregate.transactionCount);
            record.setUniqueUsers(1);
            history.add(record);
        }

        return history;
    }

    private String normalizeCategory(String value) {
        if (value == null) {
            return "";
        }
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private String mapExpenseCategory(String rawCategory) {
        String normalized = normalizeCategory(rawCategory);
        return switch (normalized) {
            case "housing" -> "rent";
            case "rent" -> "rent";
            case "food" -> "food";
            case "transport", "travel" -> "travel";
            case "entertainment" -> "entertainment";
            case "health" -> "health";
            case "utilities" -> "utilities";
            case "shopping", "misc" -> "misc";
            case "education" -> "education";
            case "others", "other" -> "others";
            default -> "others";
        };
    }

    private double roundMoney(Double value) {
        if (value == null) {
            return 0.0;
        }
        return Math.round(value * 100.0) / 100.0;
    }

    private static class MonthlyAggregate {
        private double totalAmount;
        private int transactionCount;
    }
}