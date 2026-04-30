package org.example.smart_expense_tracker.Model;

import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonFormat;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;

@Entity
@Table(name = "budgets")
@Data
public class Budget {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long budgetId;

    @NotNull(message = "User is required")
    private Long userId;

    @NotBlank(message = "Category cannot be empty")
    private String category;

    @Enumerated(EnumType.STRING)
    @jakarta.persistence.Column(nullable = true)
    private BudgetCycle cycle;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @jakarta.persistence.Column(nullable = true)
    private LocalDate startDate;

    @Min(value = 1, message = "Start day must be between 1 and 31")
    @Max(value = 31, message = "Start day must be between 1 and 31")
    @jakarta.persistence.Column(nullable = true)
    private Integer startDay;

    @NotNull(message = "Budget amount is required")
    @Positive(message = "Budget amount must be greater than 0")
    private Double budgetAmount;

    @PositiveOrZero(message = "Spent amount cannot be negative")
    private Double spentAmount;

    private Double remainingAmount;

    // Kept for backward compatibility with existing rows and clients.
    private String monthYear;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate currentCycleStart;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate currentCycleEnd;
}