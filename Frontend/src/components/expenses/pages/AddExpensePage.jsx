import { useRef } from "react";
import ExpenseModal from "../components/ExpenseModal";
import ExpenseForm from "../components/ExpenseForm";

export default function AddExpensePage({ open, onClose, onAdd }) {
    const submitRef = useRef(null);

    return (
        <ExpenseModal
            open={open}
            title="New Expense"
            onClose={onClose}
            footer={
                <>
                    <button className="ex-btn ex-btn-ghost" type="button" onClick={onClose}>
                        Cancel
                    </button>

                    <button
                        className="ex-btn ex-btn-primary"
                        type="button"
                        onClick={() => submitRef.current?.click()}
                    >
                        Add expense
                    </button>
                </>
            }
        >
            <ExpenseForm
                submitRef={submitRef}
                onSubmit={(data) => {
                    onAdd?.(data);
                    onClose?.();
                }}
            />
        </ExpenseModal>
    );
}