import "../styles/expenseForm.css";

export default function ConfirmDeleteModal({ open, title="Delete Expense", message, onCancel, onConfirm }) {
    if (!open) return null;

    return (
        <div className="ex-modal-overlay" onClick={onCancel}>
            <div className="ex-confirm" onClick={(e) => e.stopPropagation()}>
                <div className="ex-confirm-header">
                    <h3>{title}</h3>
                    <button className="ex-modal-close" type="button" onClick={onCancel}>✕</button>
                </div>

                <p className="ex-confirm-msg">{message}</p>

                <div className="ex-confirm-footer">
                    <button className="ex-btn ex-btn-ghost" type="button" onClick={onCancel}>
                        Cancel
                    </button>
                    <button className="ex-btn ex-btn-danger" type="button" onClick={onConfirm}>
                        Yes, Delete
                    </button>
                </div>
            </div>
        </div>
    );
}