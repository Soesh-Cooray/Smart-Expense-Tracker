import React, { useState, useEffect } from "react";
import axios from "axios";
import "./SubscriptionManager.css";

const API_BASE = "http://localhost:8080/api/subscriptions";
const SubscriptionManager = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [form, setForm] = useState({
    name: "",
    category: "",
    amount: "",
    billingCycle: "Monthly",
    startDate: "",
    nextPaymentDate: "",
    status: "Active",
  });
  const [editingId, setEditingId] = useState(null);
  const [total, setTotal] = useState(0);
  const [userId, setUserId] = useState(null);

  // Get userId from localStorage on mount
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      setUserId(parseInt(storedUserId));
    }
  }, []);

  // Fetch subscriptions
  const fetchSubscriptions = async () => {
    if (!userId) return;
    try {
      const res = await axios.get(`${API_BASE}/user/${userId}`);
      setSubscriptions(res.data);
    } catch (err) {
      console.error("Error fetching subscriptions:", err);
    }
  };

  // Fetch total active amount
  const fetchTotal = async () => {
    if (!userId) return;
    try {
      const res = await axios.get(`${API_BASE}/user/${userId}/total`);
      setTotal(res.data);
    } catch (err) {
      console.error("Error fetching total:", err);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchSubscriptions();
      fetchTotal();
    }
  }, [userId]);

  // Handle form input change
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Submit form (Add or Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`${API_BASE}/${editingId}`, {
          ...form,
          userId: USER_ID,
        });
        setEditingId(null);
      } else {
        await axios.post(API_BASE, {
          ...form,
          userId: USER_ID,
        });
      }
      if (editingId) {
        await axios.put(`${API_BASE}/${editingId}`, {
          ...form,
          userId: userId,
        });
        setEditingId(null);
      } else {
        await axios.post(API_BASE, {
          ...form,
          userId: userId,
        });
      }
      // Reset form
      setForm({
        name: "",
        category: "",
        amount: "",
        billingCycle: "Monthly",
        startDate: "",
        nextPaymentDate: "",
        status: "Active",
      });

      fetchSubscriptions();
      fetchTotal();
    } catch (err) {
      console.error("Error saving subscription:", err);
    }
  };

  // Edit subscription
  const handleEdit = (sub) => {
    setForm({
      name: sub.name,
      category: sub.category,
      amount: sub.amount,
      billingCycle: sub.billingCycle,
      startDate: sub.startDate,
      nextPaymentDate: sub.nextPaymentDate,
      status: sub.status,
    });
    setEditingId(sub.id);
  };

  // Delete subscription
  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE}/${id}`);
      fetchSubscriptions();
      fetchTotal();
    } catch (err) {
      console.error("Error deleting subscription:", err);
    }
  };

  return (
    <div className="subscription-container">
      <h2>Subscription Management</h2>

      <form onSubmit={handleSubmit} className="subscription-form">
        <input
          name="name"
          placeholder="Name"
          value={form.name}
          onChange={handleChange}
          required
        />
        <input
          name="category"
          placeholder="Category"
          value={form.category}
          onChange={handleChange}
        />
        <input
          name="amount"
          type="number"
          placeholder="Amount"
          value={form.amount}
          onChange={handleChange}
          required
        />
        <input
          name="billingCycle"
          placeholder="Billing Cycle"
          value={form.billingCycle}
          onChange={handleChange}
        />
        <input
          name="startDate"
          type="date"
          value={form.startDate}
          onChange={handleChange}
        />
        <input
          name="nextPaymentDate"
          type="date"
          value={form.nextPaymentDate}
          onChange={handleChange}
        />
        <select
          name="status"
          value={form.status}
          onChange={handleChange}
        >
          <option value="Active">Active</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <button type="submit">
          {editingId ? "Update Subscription" : "Add Subscription"}
        </button>
      </form>

      <div className="total-display">
        Total Active Amount: ${total}
      </div>

      <table className="subscription-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Amount</th>
            <th>Billing Cycle</th>
            <th>Start Date</th>
            <th>Next Payment</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {subscriptions.length > 0 ? (
            subscriptions.map((sub) => (
              <tr key={sub.id}>
                <td>{sub.name}</td>
                <td>{sub.category}</td>
                <td>${sub.amount}</td>
                <td>{sub.billingCycle}</td>
                <td>{sub.startDate}</td>
                <td>{sub.nextPaymentDate}</td>
                <td>{sub.status}</td>
                <td>
                  <button
                    className="edit-btn"
                    onClick={() => handleEdit(sub)}
                  >
                    Edit
                  </button>
                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(sub.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="8">No subscriptions found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default SubscriptionManager;