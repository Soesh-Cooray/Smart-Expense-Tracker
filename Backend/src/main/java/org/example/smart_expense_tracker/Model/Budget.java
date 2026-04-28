package org.example.smart_expense_tracker.Model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Data;

@Entity
@Table(name = "budgets")
@Data
public class Budget {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long budgetId;

    private Long userId;

    @NotBlank(message = "Category cannot be empty")
    private String category;

    @NotNull(message = "Budget amount is required")
    @Positive(message = "Budget amount must be greater than 0")
    private Double budgetAmount;

    @PositiveOrZero(message = "Spent amount cannot be negative")
    private Double spentAmount;

    private Double remainingAmount;

    @NotBlank(message = "Month is required")
    private String monthYear;
}