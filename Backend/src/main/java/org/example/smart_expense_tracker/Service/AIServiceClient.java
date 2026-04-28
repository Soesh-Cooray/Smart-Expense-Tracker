package org.example.smart_expense_tracker.Service;

import org.example.smart_expense_tracker.Dto.AIFutureResponse;
import org.example.smart_expense_tracker.Dto.AIPredictionRequest;
import org.example.smart_expense_tracker.Dto.AIPredictionResponse;
import org.example.smart_expense_tracker.Dto.AITrendResponse;
import org.example.smart_expense_tracker.Dto.MonthlyRecordDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.fasterxml.jackson.annotation.JsonProperty;

@Service
public class AIServiceClient {

    private final RestClient restClient;

    public AIServiceClient(
            RestClient.Builder restClientBuilder,
            @Value("${ai.service.base-url}") String baseUrl,
            @Value("${ai.service.timeout-ms:5000}") int timeoutMs
    ) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(timeoutMs);
        requestFactory.setReadTimeout(timeoutMs);

        this.restClient = restClientBuilder
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .build();
    }

    public AIPredictionResponse predict(AIPredictionRequest request) {
        try {
            AIPredictionResponse response = restClient.post()
                    .uri("/overspend/predict")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(AIPredictionResponse.class);

            if (response == null) {
                throw new AIServiceUnavailableException("AI service returned an empty response.");
            }
            return response;
        } catch (RestClientException ex) {
            throw new AIServiceUnavailableException(
                    "Unable to reach AI prediction service. Make sure Python service is running.", ex);
        }
    }

    public AITrendResponse predictTrend(AIPredictionRequest request) {
        try {
            AITrendResponse response = restClient.post()
                    .uri("/overspend/predict/trend")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(AITrendResponse.class);

            if (response == null) {
                throw new AIServiceUnavailableException("AI service returned an empty trend response.");
            }
            return response;
        } catch (RestClientException ex) {
            throw new AIServiceUnavailableException(
                    "Unable to reach AI prediction trend service. Make sure Python service is running.", ex);
        }
    }

    public AIFutureResponse predictFuture(String category, java.util.List<MonthlyRecordDto> history, int monthsAhead) {
        try {
            AIFutureRequest request = new AIFutureRequest(category, history, monthsAhead);

            AIFutureResponse response = restClient.post()
                    .uri("/predict/future")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(AIFutureResponse.class);

            if (response == null) {
                throw new AIServiceUnavailableException("AI service returned an empty future response.");
            }
            return response;
        } catch (RestClientException ex) {
            throw new AIServiceUnavailableException(
                    "Unable to reach AI future prediction service. Make sure Python service is running.", ex);
        }
    }

    private record AIFutureRequest(
            String category,
            java.util.List<MonthlyRecordDto> history,
            @JsonProperty("months_ahead") int monthsAhead
    ) {}
}
