package org.example.smart_expense_tracker.Dto;

public class OverspendingWindowOptionResponse {

    private String windowStartMonth;
    private String windowEndMonth;
    private String label;

    public String getWindowStartMonth() {
        return windowStartMonth;
    }

    public void setWindowStartMonth(String windowStartMonth) {
        this.windowStartMonth = windowStartMonth;
    }

    public String getWindowEndMonth() {
        return windowEndMonth;
    }

    public void setWindowEndMonth(String windowEndMonth) {
        this.windowEndMonth = windowEndMonth;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }
}