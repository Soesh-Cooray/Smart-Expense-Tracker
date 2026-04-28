package org.example.smart_expense_tracker.Dto;

import java.util.List;

public class OverspendingTrendResponse {

    private Long userId;
    private boolean trendAvailable;
    private List<AITrendPointResponse> trend;
    private String message;

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public boolean isTrendAvailable() {
        return trendAvailable;
    }

    public void setTrendAvailable(boolean trendAvailable) {
        this.trendAvailable = trendAvailable;
    }

    public List<AITrendPointResponse> getTrend() {
        return trend;
    }

    public void setTrend(List<AITrendPointResponse> trend) {
        this.trend = trend;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}