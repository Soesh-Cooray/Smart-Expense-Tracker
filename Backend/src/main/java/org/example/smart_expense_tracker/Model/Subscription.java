package org.example.smart_expense_tracker.Model;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;
@Entity
@Table(name = "subscriptions")
@Data


public class Subscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;
    private String name;
    private String category;
    private Double amount;
    private String billingCycle; // Monthly / Yearly
    private LocalDate startDate;
    private LocalDate nextPaymentDate;
    private String status; // Active / Cancelled
}
