package org.example.smart_expense_tracker.Repository;
import java.util.List;

import org.example.smart_expense_tracker.Model.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {

    List<Subscription> findByUserId(Long userId);
    void deleteByUserId(Long userId);

    @Query("SELECT SUM(s.amount) FROM Subscription s WHERE s.userId = :userId AND s.status = 'Active'")
    Double totalActiveSubscriptions(Long userId);
}
