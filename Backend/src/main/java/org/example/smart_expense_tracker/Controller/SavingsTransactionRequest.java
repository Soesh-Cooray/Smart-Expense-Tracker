package org.example.smart_expense_tracker.Controller;

import java.time.LocalDate;

import lombok.Data;

@Data
public class SavingsTransactionRequest {
    private Long userId;
    private Long savingsGoalId;
    private double amount;
    private LocalDate date;
}
