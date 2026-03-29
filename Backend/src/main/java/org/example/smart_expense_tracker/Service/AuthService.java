package org.example.smart_expense_tracker.Service;

import java.security.SecureRandom;

import org.example.smart_expense_tracker.Controller.LoginRequest;
import org.example.smart_expense_tracker.Controller.RegisterRequest;
import org.example.smart_expense_tracker.Model.Users;
import org.example.smart_expense_tracker.Repository.Auth;
import org.example.smart_expense_tracker.Repository.ExpenseRepository;
import org.example.smart_expense_tracker.Repository.SavingsGoalRepository;
import org.example.smart_expense_tracker.Repository.SubscriptionRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final Auth authRepository;
    private final ExpenseRepository expenseRepository;
    private final SavingsGoalRepository savingsGoalRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final EmailService emailService;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public String registerUser(RegisterRequest request) {
        if (authRepository.existsByUsername(request.getEmail())) {
            throw new RuntimeException("An account with this email already exists.");
        }

        int verificationCode = 100000 + new SecureRandom().nextInt(900000);

        Users user = new Users();
        user.setName(request.getFullName());
        user.setUsername(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setVerified(false);
        user.setVerificationCode(verificationCode);

        authRepository.save(user);
        emailService.sendVerificationEmail(request.getEmail(), verificationCode);

        return "Registration successful. Please verify your email.";
    }

    public String verifyUser(String email, int code) {
        Users user = authRepository.findByUsernameAndVerificationCode(email, code)
                .orElseThrow(() -> new RuntimeException("Invalid verification code."));

        user.setVerified(true);
        user.setVerificationCode(0);
        authRepository.save(user);

        return "Account verified successfully.";
    }

    public Users loginUser(LoginRequest request) {
        Users user = authRepository.findByUsername(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid email or password."));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid email or password.");
        }

        if (!user.isVerified()) {
            throw new RuntimeException("Please verify your email before logging in.");
        }

        return user;
    }

    public Users updateProfile(Integer userId, String newName) {
        if (userId == null) {
            throw new RuntimeException("User ID is required.");
        }
        if (newName == null || newName.trim().isEmpty()) {
            throw new RuntimeException("Name cannot be empty.");
        }

        Users user = authRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found."));

        user.setName(newName.trim());
        return authRepository.save(user);
    }

    public void changePassword(Integer userId, String currentPassword, String newPassword) {
        if (userId == null) {
            throw new RuntimeException("User ID is required.");
        }
        if (currentPassword == null || currentPassword.isBlank()) {
            throw new RuntimeException("Current password is required.");
        }
        if (newPassword == null || newPassword.length() < 6) {
            throw new RuntimeException("New password must be at least 6 characters.");
        }

        Users user = authRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found."));

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new RuntimeException("Current password is incorrect.");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        authRepository.save(user);
    }

    @Transactional
    public void deleteAccount(Integer userId, String currentPassword) {
        if (userId == null) {
            throw new RuntimeException("User ID is required.");
        }
        if (currentPassword == null || currentPassword.isBlank()) {
            throw new RuntimeException("Current password is required.");
        }

        Users user = authRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found."));

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new RuntimeException("Current password is incorrect.");
        }

        Long id = Long.valueOf(userId);
        expenseRepository.deleteByUserId(id);
        savingsGoalRepository.deleteByUserId(id);
        subscriptionRepository.deleteByUserId(id);
        authRepository.deleteById(userId);
    }
}
