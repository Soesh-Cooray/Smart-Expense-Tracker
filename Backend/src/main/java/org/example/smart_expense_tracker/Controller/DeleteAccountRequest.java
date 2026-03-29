package org.example.smart_expense_tracker.Controller;

import lombok.Data;

@Data
public class DeleteAccountRequest {
    private Integer userId;
    private String currentPassword;
}
