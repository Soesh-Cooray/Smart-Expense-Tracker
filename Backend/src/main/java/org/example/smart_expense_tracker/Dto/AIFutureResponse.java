package org.example.smart_expense_tracker.Dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

public class AIFutureResponse {

    private String category;

    private List<FuturePredictionPoint> predictions;

    @JsonProperty("months_ahead")
    private Integer monthsAhead;

    private String note;

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public List<FuturePredictionPoint> getPredictions() {
        return predictions;
    }

    public void setPredictions(List<FuturePredictionPoint> predictions) {
        this.predictions = predictions;
    }

    public Integer getMonthsAhead() {
        return monthsAhead;
    }

    public void setMonthsAhead(Integer monthsAhead) {
        this.monthsAhead = monthsAhead;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public static class FuturePredictionPoint {

        @JsonProperty("year_month")
        private String yearMonth;

        @JsonProperty("predicted_amount")
        private Double predictedAmount;

        private Integer step;

        public String getYearMonth() {
            return yearMonth;
        }

        public void setYearMonth(String yearMonth) {
            this.yearMonth = yearMonth;
        }

        public Double getPredictedAmount() {
            return predictedAmount;
        }

        public void setPredictedAmount(Double predictedAmount) {
            this.predictedAmount = predictedAmount;
        }

        public Integer getStep() {
            return step;
        }

        public void setStep(Integer step) {
            this.step = step;
        }
    }
}