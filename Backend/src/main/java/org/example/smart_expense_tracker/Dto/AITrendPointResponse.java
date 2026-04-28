package org.example.smart_expense_tracker.Dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class AITrendPointResponse {

    @JsonProperty("window_start")
    private String windowStart;

    @JsonProperty("window_end")
    private String windowEnd;

    private double probability;

    @JsonProperty("is_overspender")
    private boolean overspender;

    @JsonProperty("risk_level")
    private String riskLevel;

    @JsonProperty("top_expense_category")
    private String topExpenseCategory;

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

    public double getProbability() {
        return probability;
    }

    public void setProbability(double probability) {
        this.probability = probability;
    }

    public boolean isOverspender() {
        return overspender;
    }

    public void setOverspender(boolean overspender) {
        this.overspender = overspender;
    }

    public String getRiskLevel() {
        return riskLevel;
    }

    public void setRiskLevel(String riskLevel) {
        this.riskLevel = riskLevel;
    }

    public String getTopExpenseCategory() {
        return topExpenseCategory;
    }

    public void setTopExpenseCategory(String topExpenseCategory) {
        this.topExpenseCategory = topExpenseCategory;
    }
}