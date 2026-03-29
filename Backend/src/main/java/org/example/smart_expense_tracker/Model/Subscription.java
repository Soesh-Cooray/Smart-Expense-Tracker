package org.example.smart_expense_tracker.Model;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
@Entity
@Table(name = "subscriptions")
@Data


public class Subscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;
    private String name;
    private String category;
    private Double amount;
    private String billingCycle; // Monthly / Yearly
    private LocalDate startDate;
    private LocalDate nextPaymentDate;
    private String status; // Active / Cancelled
}
