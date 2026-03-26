import ExpenseModal from "../components/ExpenseModal";
import "../styles/expenseForm.css";

export default function ViewExpensePage({ open, onClose, expense }) {
    if (!expense) return null;

    return (
        <ExpenseModal
            open={open}
            title="Expense Details"
            onClose={onClose}
            footer={
                <button className="ex-btn ex-btn-primary ex-btn-full" type="button" onClick={onClose}>
                    Close
                </button>
            }
        >
            <div className="ex-view-wrap">
                <div className="ex-preview" style={{ borderColor: expense.color || "#2563eb" }}>
                    <div className="ex-preview-left">
                        <div
                            className="ex-preview-icon"
                            style={{
                                background: `${expense.color || "#2563eb"}1A`,
                                color: expense.color || "#2563eb",
                            }}
                        >
                            {expense.icon || "🧾"}
                        </div>
                        <div>
                            <div className="ex-preview-title">{expense.description || "Expense name"}</div>
                            <div className="ex-preview-sub">
                                Rs.{Number(expense.amount || 0).toLocaleString()} • {expense.category}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="ex-view-grid">
                    <div className="ex-view-card">
                        <span className="ex-view-label">Expense Name</span>
                        <p>{expense.description || "-"}</p>
                    </div>

                    <div className="ex-view-card">
                        <span className="ex-view-label">Amount</span>
                        <p>Rs. {Number(expense.amount || 0).toLocaleString()}</p>
                    </div>

                    <div className="ex-view-card">
                        <span className="ex-view-label">Date</span>
                        <p>{expense.date || "-"}</p>
                    </div>

                    <div className="ex-view-card">
                        <span className="ex-view-label">Category</span>
                        <p>{expense.category || "-"}</p>
                    </div>

                    <div className="ex-view-card">
                        <span className="ex-view-label">Payment Method</span>
                        <p>{expense.paymentMethod || "-"}</p>
                    </div>

                    <div className="ex-view-card">
                        <span className="ex-view-label">Notes</span>
                        <p>{expense.notes || "No notes added"}</p>
                    </div>
                </div>
            </div>
        </ExpenseModal>
    );
}