package org.example.smart_expense_tracker.Dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class AIPredictionResponse {

    @JsonProperty("user_id")
    private String userId;

    @JsonProperty("is_overspender")
    private boolean isOverspender;

    private double probability;

    @JsonProperty("risk_level")
    private String riskLevel;

    @JsonProperty("window_expense")
    private double windowExpense;

    @JsonProperty("window_income")
    private double windowIncome;

    @JsonProperty("top_expense_category")
    private String topExpenseCategory;

    @JsonProperty("window_start")
    private String windowStart;

    @JsonProperty("window_end")
    private String windowEnd;

    private String message;

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public boolean isOverspender() {
        return isOverspender;
    }

    public void setOverspender(boolean overspender) {
        isOverspender = overspender;
    }

    public double getProbability() {
        return probability;
    }

    public void setProbability(double probability) {
        this.probability = probability;
    }

    public String getRiskLevel() {
        return riskLevel;
    }

    public void setRiskLevel(String riskLevel) {
        this.riskLevel = riskLevel;
    }

    public double getWindowExpense() {
        return windowExpense;
    }

    public void setWindowExpense(double windowExpense) {
        this.windowExpense = windowExpense;
    }

    public double getWindowIncome() {
        return windowIncome;
    }

    public void setWindowIncome(double windowIncome) {
        this.windowIncome = windowIncome;
    }

    public String getTopExpenseCategory() {
        return topExpenseCategory;
    }

    public void setTopExpenseCategory(String topExpenseCategory) {
        this.topExpenseCategory = topExpenseCategory;
    }

    public String getWindowStart() {
        return windowStart;
    }

    public void setWindowStart(String windowStart) {
        this.windowStart = windowStart;
    }

    public String getWindowEnd() {
        return windowEnd;
    }

    public void setWindowEnd(String windowEnd) {
        this.windowEnd = windowEnd;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
