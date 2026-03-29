package org.example.smart_expense_tracker.Controller;

import lombok.Data;

@Data
public class ChangePasswordRequest {
    private Integer userId;
    private String currentPassword;
    private String newPassword;
}
