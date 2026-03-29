package org.example.smart_expense_tracker.Service;
import org.example.smart_expense_tracker.Model.Subscription;
import org.example.smart_expense_tracker.Repository.SubscriptionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class SubscriptionService {
    


    @Autowired
    private SubscriptionRepository repository;

    // Create / Update
    public Subscription saveOrUpdate(Subscription subscription) {
        return repository.save(subscription);
    }

    // Get all subscriptions for a user
    public List<Subscription> getUserSubscriptions(Long userId) {
        return repository.findByUserId(userId);
    }

    // Get subscription by ID
    public Optional<Subscription> getById(Long id) {
        return repository.findById(id);
    }

    // Delete subscription
    public void delete(Long id) {
        repository.deleteById(id);
    }

    // Analytics: total active subscriptions amount
    public Double totalActiveSubscriptions(Long userId) {
        Double total = repository.totalActiveSubscriptions(userId);
        return total != null ? total : 0.0;
    }
}
