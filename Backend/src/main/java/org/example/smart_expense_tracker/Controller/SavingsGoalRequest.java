package org.example.smart_expense_tracker.Controller;

import java.time.LocalDate;

import lombok.Data;

@Data
public class SavingsGoalRequest {
    private String name;
    private double targetAmount;
    private double savedAmount;
    private LocalDate dueDate;
    private String icon;
    private String color;
}
