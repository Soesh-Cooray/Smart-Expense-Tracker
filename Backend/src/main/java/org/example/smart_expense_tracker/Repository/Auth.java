package org.example.smart_expense_tracker.Repository;

import org.example.smart_expense_tracker.Model.Users;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface Auth extends JpaRepository<Users, Integer> {
    Optional<Users> findByUsername(String username);
    boolean existsByUsername(String username);
    Optional<Users> findByUsernameAndVerificationCode(String username, int verificationCode);
}
