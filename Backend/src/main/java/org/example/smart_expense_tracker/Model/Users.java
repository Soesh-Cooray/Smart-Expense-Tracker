package org.example.smart_expense_tracker.Model;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "users")
@Getter
@Setter
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

    @Column(name = "password_reset_code")
    private Integer passwordResetCode;

    @Column(name = "password_reset_expiry")
    private LocalDateTime passwordResetExpiry;
}
