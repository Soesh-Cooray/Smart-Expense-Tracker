package org.example.smart_expense_tracker.Controller;

import lombok.Data;

@Data
public class VerifyRequest {
    private String email;
    private int code;
}
