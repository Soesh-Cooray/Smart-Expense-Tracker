package org.example.smart_expense_tracker.Service;

import org.example.smart_expense_tracker.Dto.AIPredictionRequest;
import org.example.smart_expense_tracker.Dto.AIPredictionResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

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
                    .uri("/predict")
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
}
