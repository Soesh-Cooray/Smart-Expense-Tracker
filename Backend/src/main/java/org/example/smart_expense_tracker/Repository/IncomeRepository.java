package org.example.smart_expense_tracker.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.example.smart_expense_tracker.Model.Income;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface IncomeRepository extends JpaRepository<Income, Long> {
    List<Income> findByUserId(Long userId);
    List<Income> findByUserIdAndDateGreaterThanEqual(Long userId, LocalDate startDate);
    Optional<Income> findByIdAndUserId(Long id, Long userId);
}