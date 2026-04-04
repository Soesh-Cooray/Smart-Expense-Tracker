package org.example.smart_expense_tracker.Controller;

import lombok.Data;

@Data
public class ResetPasswordRequest {
    private String email;
    private Integer code;
    private String newPassword;
}