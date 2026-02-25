package org.example.smart_expense_tracker.Service;

import lombok.RequiredArgsConstructor;
import org.example.smart_expense_tracker.Controller.LoginRequest;
import org.example.smart_expense_tracker.Controller.RegisterRequest;
import org.example.smart_expense_tracker.Model.Users;
import org.example.smart_expense_tracker.Repository.Auth;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final Auth authRepository;
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

    public String loginUser(LoginRequest request) {
        Users user = authRepository.findByUsername(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid email or password."));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid email or password.");
        }

        if (!user.isVerified()) {
            throw new RuntimeException("Please verify your email before logging in.");
        }

        return "Login successful";
    }
}
