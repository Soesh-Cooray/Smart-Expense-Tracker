package org.example.smart_expense_tracker.Dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class AITransaction {

    private String date;

    @JsonProperty("transaction_type")
    private String transactionType;

    @JsonProperty("payment_mode")
    private String paymentMode;

    private Double amount;

    @JsonProperty("refined_category")
    private String refinedCategory;

    private String location;

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public String getTransactionType() {
        return transactionType;
    }

    public void setTransactionType(String transactionType) {
        this.transactionType = transactionType;
    }

    public String getPaymentMode() {
        return paymentMode;
    }

    public void setPaymentMode(String paymentMode) {
        this.paymentMode = paymentMode;
    }

    public Double getAmount() {
        return amount;
    }

    public void setAmount(Double amount) {
        this.amount = amount;
    }

    public String getRefinedCategory() {
        return refinedCategory;
    }

    public void setRefinedCategory(String refinedCategory) {
        this.refinedCategory = refinedCategory;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }
}
