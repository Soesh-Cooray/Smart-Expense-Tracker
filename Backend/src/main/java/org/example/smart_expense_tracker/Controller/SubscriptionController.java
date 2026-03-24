package org.example.smart_expense_tracker.Controller;

import java.util.List;
import java.util.Optional;

import org.example.smart_expense_tracker.Model.Subscription;
import org.example.smart_expense_tracker.Service.SubscriptionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/subscriptions")
@CrossOrigin
public class SubscriptionController {

    @Autowired
    private SubscriptionService service;

    // Create subscription
    @PostMapping
    public Subscription create(@RequestBody Subscription subscription) {
        return service.saveOrUpdate(subscription);
    }

    // Get all subscriptions for a user
    @GetMapping("/user/{userId}")
    public List<Subscription> getUserSubscriptions(@PathVariable Long userId) {
        return service.getUserSubscriptions(userId);
    }

    // Get subscription by ID hfbgfh
    @GetMapping("/{id}")
    public Optional<Subscription> getById(@PathVariable Long id) {
        return service.getById(id);
    }

    // Update subscription
    @PutMapping("/{id}")
    public Subscription update(@PathVariable Long id, @RequestBody Subscription subscription) {
        subscription.setId(id);
        return service.saveOrUpdate(subscription);
    }

    // Delete subscription
    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }

    // Analytics: total active subscriptions amount
    
    // Get total active subscriptions amount for a user
    @GetMapping("/user/{userId}/total")
    public Double totalActive(@PathVariable Long userId) {
        return service.totalActiveSubscriptions(userId);
    }
}