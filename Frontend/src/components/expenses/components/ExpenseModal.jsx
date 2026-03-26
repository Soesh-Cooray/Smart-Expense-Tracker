import "../styles/expenseForm.css";

export default function ExpenseModal({ open, title, onClose, children, footer }) {
    if (!open) return null;

    return (
        <div className="ex-modal-overlay" onClick={onClose}>
            <div className="ex-modal" onClick={(e) => e.stopPropagation()}>
                <div className="ex-modal-header">
                    <h2 className="ex-modal-title">{title}</h2>
                    <button className="ex-modal-close" type="button" onClick={onClose}>
                        ✕
                    </button>
                </div>

                {/* ✅ IMPORTANT: body must have min-height + scroll */}
                <div className="ex-modal-body">
                    {children}
                </div>

                {footer ? <div className="ex-modal-footer">{footer}</div> : null}
            </div>
        </div>
    );
}