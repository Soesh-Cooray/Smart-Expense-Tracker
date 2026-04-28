package org.example.smart_expense_tracker.Repository;


import org.example.smart_expense_tracker.Model.Users;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

import java.util.Optional;

import org.example.smart_expense_tracker.Model.Users;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;


public interface Auth extends JpaRepository<Users, Integer> {
    Optional<Users> findByUsername(String username);
    boolean existsByUsername(String username);
    Optional<Users> findByUsernameAndVerificationCode(String username, int verificationCode);

    @Modifying
    @Query(value = "DELETE FROM incomes WHERE user_id = :userId", nativeQuery = true)
    void deleteIncomeByUserId(@Param("userId") Long userId);

}
