package org.example.smart_expense_tracker.Dto;

public class OverspendingPredictionResponse {

    private Long userId;
    private boolean predictionAvailable;
    private boolean overspender;
    private double probability;
    private String riskLevel;
    private double windowExpense;
    private double windowIncome;
    private String topExpenseCategory;
    private String windowStart;
    private String windowEnd;
    private String message;

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public boolean isPredictionAvailable() {
        return predictionAvailable;
    }

    public void setPredictionAvailable(boolean predictionAvailable) {
        this.predictionAvailable = predictionAvailable;
    }

    public boolean isOverspender() {
        return overspender;
    }

    public void setOverspender(boolean overspender) {
        this.overspender = overspender;
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
