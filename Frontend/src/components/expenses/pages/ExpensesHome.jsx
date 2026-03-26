import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../Sidebar";
import "../../../Dashboard.css";
import "../styles/expensesHome.css";

import ExpenseStats from "../components/ExpenseStats";
import ExpenseFilters from "../components/ExpenseFilters";
import ExpenseTable from "../components/ExpenseTable";
import AddExpensePage from "./AddExpensePage";
import EditExpensePage from "./EditExpensePage";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import ViewExpensePage from "./ViewExpensePage";

const API_BASE_URL = "http://localhost:8080";

export default function ExpensesHome() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const [addOpen, setAddOpen] = useState(false);

    const [editOpen, setEditOpen] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState(null);

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteId, setDeleteId] = useState(null);

    const [viewOpen, setViewOpen] = useState(false);
    const [viewExpense, setViewExpense] = useState(null);

    const [expenses, setExpenses] = useState([]);
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("ALL");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const today = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    useEffect(() => {
        fetchExpenses();
    }, []);

    async function fetchExpenses() {
        try {
            setLoading(true);
            setError("");

            const response = await fetch(`${API_BASE_URL}/expenses`);

            if (!response.ok) {
                throw new Error(`Failed to fetch expenses: ${response.status}`);
            }

            const data = await response.json();
            setExpenses(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to fetch expenses:", err);
            setError("Could not connect to the server. Make sure the backend is running.");
        } finally {
            setLoading(false);
        }
    }

    const categories = useMemo(() => {
        const set = new Set(expenses.map((e) => e.category));
        return ["ALL", ...Array.from(set)];
    }, [expenses]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();

        return expenses.filter((e) => {
            const description = e.description || "";
            const expenseCategory = e.category || "";
            const paymentMethod = e.paymentMethod || "";

            const matchCat = category === "ALL" || expenseCategory === category;
            const matchSearch =
                !q ||
                description.toLowerCase().includes(q) ||
                expenseCategory.toLowerCase().includes(q) ||
                paymentMethod.toLowerCase().includes(q);

            return matchCat && matchSearch;
        });
    }, [expenses, category, search]);

    const totalAmount = useMemo(() => {
        return filtered.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    }, [filtered]);

    const thisMonthAmount = useMemo(() => {
        const now = new Date();
        const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

        return expenses
            .filter((e) => String(e.date || "").startsWith(ym))
            .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    }, [expenses]);

    function handleAskDelete(id) {
        setDeleteId(id);
        setDeleteOpen(true);
    }

    async function handleConfirmDelete() {
        try {
            const response = await fetch(`${API_BASE_URL}/expenses/${deleteId}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error("Failed to delete expense");
            }

            setExpenses((prev) => prev.filter((e) => e.id !== deleteId));
            setDeleteOpen(false);
            setDeleteId(null);
        } catch (err) {
            console.error("Failed to delete expense:", err);
            alert("Failed to delete expense");
        }
    }

    function handleCancelDelete() {
        setDeleteOpen(false);
        setDeleteId(null);
    }

    function handleAskEdit(id) {
        const found = expenses.find((item) => item.id === id);
        setSelectedExpense(found || null);
        setEditOpen(true);
    }

    async function handleUpdateExpense(updatedExpense) {
        try {
            const response = await fetch(`${API_BASE_URL}/expenses/${updatedExpense.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(updatedExpense),
            });

            if (!response.ok) {
                throw new Error("Failed to update expense");
            }

            const savedExpense = await response.json();

            setExpenses((prev) =>
                prev.map((item) => (item.id === savedExpense.id ? savedExpense : item))
            );

            setEditOpen(false);
            setSelectedExpense(null);
        } catch (err) {
            console.error("Failed to update expense:", err);
            alert("Failed to update expense");
        }
    }

    function handleAskView(id) {
        const found = expenses.find((item) => item.id === id);
        setViewExpense(found || null);
        setViewOpen(true);
    }

    async function handleAddExpense(newExpense) {
        try {
            const response = await fetch(`${API_BASE_URL}/expenses`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(newExpense),
            });

            if (!response.ok) {
                throw new Error("Failed to add expense");
            }

            const savedExpense = await response.json();
            setExpenses((prev) => [savedExpense, ...prev]);
            setAddOpen(false);
        } catch (err) {
            console.error("Failed to add expense:", err);
            alert("Failed to add expense");
        }
    }

    return (
        <div className="db-root">
            <Sidebar
                activeNav="expenses"
                onNavChange={() => {}}
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            <main className="db-main">
                <div className="db-header">
                    <div className="db-header-left">
                        <button
                            className="db-hamburger"
                            type="button"
                            onClick={() => setSidebarOpen(true)}
                            aria-label="Open menu"
                        >
                            ☰
                        </button>

                        <div>
                            <h1 className="db-title">Expenses</h1>
                            <p className="db-subtitle">{today}</p>
                        </div>
                    </div>

                    <div className="db-header-right">
                        <button className="db-icon-btn" type="button" title="Notifications">
                            🔔
                        </button>

                        <button
                            className="db-add-btn"
                            type="button"
                            onClick={() => setAddOpen(true)}
                        >
                            + Add Expense
                        </button>
                    </div>
                </div>

                {error && (
                    <div
                        style={{
                            marginBottom: "16px",
                            padding: "12px 16px",
                            borderRadius: "12px",
                            background: "#fef2f2",
                            color: "#dc2626",
                            border: "1px solid #fecaca",
                            fontWeight: 500,
                        }}
                    >
                        {error}
                    </div>
                )}

                <ExpenseStats
                    totalCount={filtered.length}
                    totalAmount={totalAmount}
                    categoriesCount={categories.length - 1}
                    thisMonthAmount={thisMonthAmount}
                />

                <div className="db-card">
                    <div className="ex-card-top">
                        <h3 className="ex-section-title">Your Expenses</h3>

                        <ExpenseFilters
                            categories={categories}
                            category={category}
                            setCategory={setCategory}
                            search={search}
                            setSearch={setSearch}
                        />
                    </div>

                    {loading ? (
                        <p style={{ padding: "20px 0", color: "#64748b" }}>
                            Loading expenses...
                        </p>
                    ) : (
                        <ExpenseTable
                            rows={filtered}
                            onView={handleAskView}
                            onEdit={handleAskEdit}
                            onDelete={handleAskDelete}
                        />
                    )}
                </div>

                <AddExpensePage
                    open={addOpen}
                    onClose={() => setAddOpen(false)}
                    onAdd={handleAddExpense}
                />

                <EditExpensePage
                    open={editOpen}
                    onClose={() => {
                        setEditOpen(false);
                        setSelectedExpense(null);
                    }}
                    expense={selectedExpense}
                    onUpdate={handleUpdateExpense}
                />

                <ViewExpensePage
                    open={viewOpen}
                    onClose={() => {
                        setViewOpen(false);
                        setViewExpense(null);
                    }}
                    expense={viewExpense}
                />

                <ConfirmDeleteModal
                    open={deleteOpen}
                    message="Do you confirm you want to delete this expense?"
                    onCancel={handleCancelDelete}
                    onConfirm={handleConfirmDelete}
                />
            </main>
        </div>
    );
}