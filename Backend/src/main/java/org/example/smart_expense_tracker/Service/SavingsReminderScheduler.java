package org.example.smart_expense_tracker.Service;

import java.util.List;
import org.example.smart_expense_tracker.Model.SavingsGoal;
import org.example.smart_expense_tracker.Model.Users;
import org.example.smart_expense_tracker.Repository.SavingsGoalRepository;
import org.example.smart_expense_tracker.Repository.Auth;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
@RequiredArgsConstructor
public class SavingsReminderScheduler {

    private static final Logger log = LoggerFactory.getLogger(SavingsReminderScheduler.class);
    
    private final SavingsGoalRepository savingsGoalRepository;
    private final Auth userRepository;
    private final EmailService emailService;

    @Scheduled(cron = "0 0 9 * * *", zone = "Asia/Colombo")  // Runs daily at 9 AM Colombo time
    public void sendRemindersForGoalsDueIn7Days() {
        log.info("Starting savings goal reminder check at 9 AM Colombo time...");
        
        try {
            List<SavingsGoal> goalsDueIn7Days = savingsGoalRepository.findGoalsDueIn7Days();
            
            if (goalsDueIn7Days.isEmpty()) {
                log.info("No savings goals due in 7 days");
                return;
            }
            
            for (SavingsGoal goal : goalsDueIn7Days) {
                try {
                    Users user = userRepository.findById(goal.getUserId())
                        .orElseThrow(() -> new RuntimeException("User not found with ID: " + goal.getUserId()));
                    
                    // username field stores the email address
                    emailService.sendSavingsGoalReminder(
                        user.getUsername(),
                        goal.getName(),
                        goal.getTargetAmount(),
                        goal.getSavedAmount()
                    );
                    
                    log.info("Reminder sent for goal: {} (ID: {}) to user: {}", 
                        goal.getName(), goal.getId(), user.getUsername());
                } catch (Exception e) {
                    log.error("Failed to send reminder for goal ID {}: {}", goal.getId(), e.getMessage(), e);
                }
            }
            
            log.info("Savings goal reminder check completed. Total reminders sent: {}", goalsDueIn7Days.size());
        } catch (Exception e) {
            log.error("Error during savings goal reminder scheduler execution: {}", e.getMessage(), e);
        }
    }
}
