package org.example.smart_expense_tracker.Dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class MonthlyRecordDto {

    @JsonProperty("year_month")
    private String yearMonth;

    @JsonProperty("total_amount")
    private Double totalAmount;

    @JsonProperty("transaction_count")
    private Integer transactionCount;

    @JsonProperty("unique_users")
    private Integer uniqueUsers;

    public String getYearMonth() {
        return yearMonth;
    }

    public void setYearMonth(String yearMonth) {
        this.yearMonth = yearMonth;
    }

    public Double getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(Double totalAmount) {
        this.totalAmount = totalAmount;
    }

    public Integer getTransactionCount() {
        return transactionCount;
    }

    public void setTransactionCount(Integer transactionCount) {
        this.transactionCount = transactionCount;
    }

    public Integer getUniqueUsers() {
        return uniqueUsers;
    }

    public void setUniqueUsers(Integer uniqueUsers) {
        this.uniqueUsers = uniqueUsers;
    }
}