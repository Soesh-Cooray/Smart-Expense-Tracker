package org.example.smart_expense_tracker.Dto;

public class ForecastRequest {

    private String category;
    private int monthsAhead = 3;

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public int getMonthsAhead() {
        return monthsAhead;
    }

    public void setMonthsAhead(int monthsAhead) {
        this.monthsAhead = monthsAhead;
    }
}