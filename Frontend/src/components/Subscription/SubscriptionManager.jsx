import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Doughnut, Bar, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
} from 'chart.js'
import "./SubscriptionManager.css";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler
)

const CHART_COLORS = ['#1d4ed8', '#16a34a', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444', '#0ea5e9']

const chartOptions = {
  plugins: {
    legend: { display: true, position: 'bottom' },
    tooltip: {
      callbacks: {
        label: (ctx) => ` Rs.${ctx.parsed.y || ctx.parsed.toLocaleString()}`,
      },
    },
  },
  maintainAspectRatio: false,
}

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
  const [dateError, setDateError] = useState('');

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

  // Analytics computations
  const analytics = useMemo(() => {
    const activeCount = subscriptions.filter(s => (s.status || '').toLowerCase() === 'active').length;
    const cancelledCount = subscriptions.filter(s => (s.status || '').toLowerCase() === 'cancelled').length;
    const pausedCount = subscriptions.filter(s => (s.status || '').toLowerCase() === 'paused').length;
    
    const monthlyCount = subscriptions.filter(s => s.billingCycle === 'Monthly').length;
    const yearlyCount = subscriptions.filter(s => s.billingCycle === 'Yearly').length;
    const weeklyCount = subscriptions.filter(s => s.billingCycle === 'Weekly').length;

    const categoryTotals = {};
    const monthlyAmount = subscriptions
      .filter(s => (s.status || '').toLowerCase() === 'active')
      .reduce((sum, sub) => {
        const key = sub.category || 'Other';
        categoryTotals[key] = (categoryTotals[key] || 0) + Number(sub.amount || 0);
        
        if (sub.billingCycle === 'Monthly') {
          return sum + Number(sub.amount || 0);
        } else if (sub.billingCycle === 'Yearly') {
          return sum + (Number(sub.amount || 0) / 12);
        } else if (sub.billingCycle === 'Weekly') {
          return sum + (Number(sub.amount || 0) * 4.33);
        }
        return sum;
      }, 0);

    return {
      activeCount,
      cancelledCount,
      pausedCount,
      monthlyCount,
      yearlyCount,
      weeklyCount,
      categoryTotals,
      monthlyAmount,
      totalCount: subscriptions.length,
    };
  }, [subscriptions]);

  // Chart data - Subscription by Status
  const statusChartData = useMemo(() => {
    return {
      labels: ['Active', 'Cancelled', 'Paused'],
      datasets: [
        {
          data: [analytics.activeCount, analytics.cancelledCount, analytics.pausedCount],
          backgroundColor: ['#dcfce7', '#fee2e2', '#fef08a'],
          borderColor: ['#16a34a', '#ef4444', '#ca8a04'],
          borderWidth: 2,
          hoverOffset: 8,
        },
      ],
    };
  }, [analytics]);

  // Chart data - Billing Cycle Distribution
  const billingCycleData = useMemo(() => {
    return {
      labels: ['Monthly', 'Yearly', 'Weekly'],
      datasets: [
        {
          data: [analytics.monthlyCount, analytics.yearlyCount, analytics.weeklyCount],
          backgroundColor: ['#1d4ed8', '#8b5cf6', '#ec4899'],
          borderColor: '#fff',
          borderWidth: 2,
          hoverOffset: 8,
        },
      ],
    };
  }, [analytics]);

  // Chart data - Cost by Category
  const categoryChartData = useMemo(() => {
    const labels = Object.keys(analytics.categoryTotals);
    const data = Object.values(analytics.categoryTotals);
    
    return {
      labels,
      datasets: [
        {
          label: 'Monthly Cost (Rs.)',
          data,
          backgroundColor: labels.map((_, idx) => CHART_COLORS[idx % CHART_COLORS.length]),
          borderColor: '#fff',
          borderWidth: 2,
        },
      ],
    };
  }, [analytics]);

  // Chart data - Next 12 Months Payment Schedule
  const paymentScheduleData = useMemo(() => {
    const months = [];
    const paymentCounts = new Array(12).fill(0);
    
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const month = new Date(today.getFullYear(), today.getMonth() + i, 1);
      months.push(month.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
    }

    subscriptions.forEach(sub => {
      if (!sub.nextPaymentDate) return;
      const paymentDate = new Date(sub.nextPaymentDate);
      
      for (let i = 0; i < 12; i++) {
        const checkDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
        if (paymentDate.getMonth() === checkDate.getMonth() && paymentDate.getFullYear() === checkDate.getFullYear()) {
          paymentCounts[i]++;
        }
      }
    });

    return {
      labels: months,
      datasets: [
        {
          label: 'Payments Due',
          data: paymentCounts,
          borderColor: '#1d4ed8',
          backgroundColor: 'rgba(29, 78, 216, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#1d4ed8',
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };
  }, [subscriptions]);

  // Handle form input change
  const handleChange = (e) => {
    if (dateError) {
      setDateError('');
    }
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Submit form (Add or Update)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.startDate && form.nextPaymentDate && form.nextPaymentDate < form.startDate) {
      setDateError('Next payment date cannot be earlier than the start date.');
      return;
    }

    try {
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
      setForm({
        name: "",
        category: "",
        amount: "",
        billingCycle: "Monthly",
        startDate: "",
        nextPaymentDate: "",
        status: "Active",
      });
      setDateError('');
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
    if (window.confirm('Are you sure you want to delete this subscription?')) {
      try {
        await axios.delete(`${API_BASE}/${id}`);
        fetchSubscriptions();
        fetchTotal();
      } catch (err) {
        console.error("Error deleting subscription:", err);
      }
    }
  };

  const handleCancel = () => {
    setForm({
      name: "",
      category: "",
      amount: "",
      billingCycle: "Monthly",
      startDate: "",
      nextPaymentDate: "",
      status: "Active",
    });
    setEditingId(null);
    setDateError('');
  };

  return (
    <div className="subscription-container">
      <h2>📱 Subscription Management</h2>

      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-icon">📊</div>
          <div className="summary-content">
            <p className="summary-label">Total Subscriptions</p>
            <h3 className="summary-value">{analytics.totalCount}</h3>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">✅</div>
          <div className="summary-content">
            <p className="summary-label">Active</p>
            <h3 className="summary-value">{analytics.activeCount}</h3>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">💰</div>
          <div className="summary-content">
            <p className="summary-label">Monthly Recurring</p>
            <h3 className="summary-value">Rs. {analytics.monthlyAmount.toFixed(2)}</h3>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">⏸️</div>
          <div className="summary-content">
            <p className="summary-label">Paused/Cancelled</p>
            <h3 className="summary-value">{analytics.pausedCount + analytics.cancelledCount}</h3>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="form-section">
        <div className="form-header">
          <h3>{editingId ? '✏️ Edit Subscription' : '➕ Add New Subscription'}</h3>
          {editingId && (
            <button className="cancel-btn" onClick={handleCancel}>✕ Cancel</button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="subscription-form">
          <input
            name="name"
            placeholder="Subscription Name"
            value={form.name}
            onChange={handleChange}
            required
          />
          <input
            name="category"
            placeholder="Category (e.g., Streaming, Software)"
            value={form.category}
            onChange={handleChange}
          />
          <input
            name="amount"
            type="number"
            step="0.01"
            placeholder="Amount"
            value={form.amount}
            onChange={handleChange}
            required
          />
          <select
            name="billingCycle"
            value={form.billingCycle}
            onChange={handleChange}
          >
            <option value="Monthly">Monthly</option>
            <option value="Yearly">Yearly</option>
            <option value="Weekly">Weekly</option>
          </select>
          <input
            name="startDate"
            type="date"
            value={form.startDate}
            onChange={handleChange}
          />
          <input
            name="nextPaymentDate"
            type="date"
            placeholder="Next Payment Date"
            value={form.nextPaymentDate}
            min={form.startDate || undefined}
            onChange={handleChange}
          />
          <select
            name="status"
            value={form.status}
            onChange={handleChange}
          >
            <option value="Active">Active</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Paused">Paused</option>
          </select>

          <button type="submit" className="submit-btn">
            {editingId ? "✏️ Update Subscription" : "➕ Add Subscription"}
          </button>

          {dateError && <p className="form-error">{dateError}</p>}
        </form>
      </div>

      {/* Analytics Section */}
      {subscriptions.length > 0 && (
        <div className="analytics-section">
          <h3>📈 Analytics Overview</h3>
          <div className="charts-grid">
            <div className="chart-card">
              <h4>Subscription Status</h4>
              <div className="chart-container" style={{ height: '250px' }}>
                <Doughnut data={statusChartData} options={chartOptions} />
              </div>
            </div>

            <div className="chart-card">
              <h4>Billing Cycle Distribution</h4>
              <div className="chart-container" style={{ height: '250px' }}>
                <Doughnut data={billingCycleData} options={chartOptions} />
              </div>
            </div>

            <div className="chart-card full-width">
              <h4>Cost by Category</h4>
              <div className="chart-container" style={{ height: '300px' }}>
                <Bar 
                  data={categoryChartData} 
                  options={{
                    indexAxis: 'y',
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (ctx) => ` Rs.${ctx.parsed.x.toFixed(2)}`,
                        },
                      },
                    },
                    scales: {
                      x: {
                        ticks: { callback: (v) => `Rs.${v.toLocaleString()}` },
                      },
                    },
                    maintainAspectRatio: false,
                  }} 
                />
              </div>
            </div>

            <div className="chart-card full-width">
              <h4>12-Month Payment Schedule</h4>
              <div className="chart-container" style={{ height: '250px' }}>
                <Line 
                  data={paymentScheduleData} 
                  options={{
                    plugins: {
                      legend: { display: false },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 },
                      },
                    },
                    maintainAspectRatio: false,
                  }} 
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Total Display */}
      <div className="total-display">
        <span>Total Monthly Recurring Amount</span>
        <strong>Rs. {total.toFixed(2)}</strong>
      </div>

      {/* Subscriptions Table */}
      {subscriptions.length > 0 ? (
        <div className="subscription-table-wrapper">
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
              {subscriptions.map((sub) => (
                <tr key={sub.id}>
                  <td>{sub.name}</td>
                  <td>{sub.category}</td>
                  <td>Rs. {Number(sub.amount || 0).toFixed(2)}</td>
                  <td>{sub.billingCycle}</td>
                  <td>{sub.startDate}</td>
                  <td>{sub.nextPaymentDate}</td>
                  <td>
                    <span className={`status-badge status-${sub.status.toLowerCase()}`}>
                      ● {sub.status}
                    </span>
                  </td>
                  <td>
                    <div className="subscription-actions">
                      <button
                        className="edit-btn"
                        onClick={() => handleEdit(sub)}
                        title="Edit"
                      >
                        Edit
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(sub.id)}
                        title="Delete"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <p><strong>No subscriptions yet</strong></p>
          <p>Add your first subscription to get started tracking recurring expenses</p>
        </div>
      )}
    </div>
  );
};

export default SubscriptionManager;
