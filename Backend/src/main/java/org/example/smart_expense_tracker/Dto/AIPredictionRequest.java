package org.example.smart_expense_tracker.Dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

public class AIPredictionRequest {

    @JsonProperty("user_id")
    private String userId;

    private List<AITransaction> transactions;

    @JsonProperty("historical_monthly_median")
    private Double historicalMonthlyMedian;

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public List<AITransaction> getTransactions() {
        return transactions;
    }

    public void setTransactions(List<AITransaction> transactions) {
        this.transactions = transactions;
    }

    public Double getHistoricalMonthlyMedian() {
        return historicalMonthlyMedian;
    }

    public void setHistoricalMonthlyMedian(Double historicalMonthlyMedian) {
        this.historicalMonthlyMedian = historicalMonthlyMedian;
    }
}
