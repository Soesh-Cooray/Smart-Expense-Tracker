package org.example.smart_expense_tracker.Controller;

import lombok.Data;

@Data
public class UpdateProfileRequest {
    private Integer userId;
    private String name;
}
