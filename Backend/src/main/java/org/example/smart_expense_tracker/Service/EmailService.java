package org.example.smart_expense_tracker.Service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    public void sendVerificationEmail(String to, int code) {
        if (mailSender == null) {
            log.warn("Mail sender not configured. Verification code for {}: {}", to, code);
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject("SmartExpense - Verify your account");
        message.setText("Your verification code is: " + code
                + "\n\nEnter this code in the app to verify your account.");

        try {
            mailSender.send(message);
            log.info("Verification email sent to {}", to);
        } catch (Exception e) {
            log.error("Failed to send verification email to {}: {}", to, e.getMessage());
        }
    }

    public void sendPasswordResetEmail(String to, int code) {
        if (mailSender == null) {
            log.warn("Mail sender not configured. Password reset code for {}: {}", to, code);
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject("SmartExpense - Reset your password");
        message.setText("Your password reset code is: " + code
                + "\n\nThis code expires in 10 minutes.");

        try {
            mailSender.send(message);
            log.info("Password reset email sent to {}", to);
        } catch (Exception e) {
            log.error("Failed to send password reset email to {}: {}", to, e.getMessage());
        }
    }

    public void sendSavingsGoalReminder(String to, String goalName, double targetAmount, double savedAmount) {
        if (mailSender == null) {
            log.warn("Mail sender not configured. Reminder for {}: {}", to, goalName);
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject("SmartExpense - Reminder: " + goalName + " deadline in 7 days");
        message.setText("Hi,\n\n" +
                "This is a reminder that your savings goal '" + goalName + "' is due in 7 days!\n\n" +
                "Progress: $" + String.format("%.2f", savedAmount) + " / $" + String.format("%.2f", targetAmount) + "\n\n" +
                "Log in to the app to continue saving.\n\nBest regards,\nSmartExpense Team");

        try {
            mailSender.send(message);
            log.info("Savings goal reminder email sent to {}", to);
        } catch (Exception e) {
            log.error("Failed to send savings goal reminder to {}: {}", to, e.getMessage());
        }
    }
}
