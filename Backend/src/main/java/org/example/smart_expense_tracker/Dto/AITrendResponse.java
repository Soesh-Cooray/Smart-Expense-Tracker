package org.example.smart_expense_tracker.Dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

public class AITrendResponse {

    @JsonProperty("user_id")
    private String userId;

    @JsonProperty("trend")
    private List<AITrendPointResponse> trend;

    @JsonProperty("trend_available")
    private boolean trendAvailable;

    private String message;

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public List<AITrendPointResponse> getTrend() {
        return trend;
    }

    public void setTrend(List<AITrendPointResponse> trend) {
        this.trend = trend;
    }

    public boolean isTrendAvailable() {
        return trendAvailable;
    }

    public void setTrendAvailable(boolean trendAvailable) {
        this.trendAvailable = trendAvailable;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}