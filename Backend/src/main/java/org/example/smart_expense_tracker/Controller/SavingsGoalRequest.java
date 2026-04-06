package org.example.smart_expense_tracker.Controller;

import java.time.LocalDate;

import lombok.Data;

@Data
public class SavingsGoalRequest {
    private Long userId;
    private String name;
    private double targetAmount;
    private LocalDate dueDate;
    private String icon;
    private String color;
}
