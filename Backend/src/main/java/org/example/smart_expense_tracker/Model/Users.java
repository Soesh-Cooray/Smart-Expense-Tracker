package org.example.smart_expense_tracker.Model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "users")
@Data
public class Users {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;
    private String name;
    private String username; // stores email address
    private String password;
    @Column(name = "is_verified")
    private boolean verified;

    @Column(name = "verification_code")
    private int verificationCode;
}
