import { useRef } from "react";
import ExpenseModal from "../components/ExpenseModal";
import ExpenseForm from "../components/ExpenseForm";

export default function EditExpensePage({
                                            open,
                                            onClose,
                                            expense,
                                            onUpdate,
                                        }) {
    const submitRef = useRef(null);

    return (
        <ExpenseModal
            open={open}
            title="Edit Expense"
            onClose={onClose}
            footer={
                <>
                    <button
                        className="ex-btn ex-btn-ghost"
                        type="button"
                        onClick={onClose}
                    >
                        Cancel
                    </button>

                    <button
                        className="ex-btn ex-btn-primary"
                        type="button"
                        onClick={() => submitRef.current?.click()}
                    >
                        Update expense
                    </button>
                </>
            }
        >
            <ExpenseForm
                initialValues={{
                    title: expense?.description || "",
                    amount: expense?.amount || "",
                    date: expense?.date || "",
                    category: expense?.category || "Food",
                    paymentMethod: expense?.paymentMethod || "Cash",
                    notes: expense?.notes || "",
                    icon: expense?.icon || "🧾",
                    color: expense?.color || "#2563eb",
                }}
                submitRef={submitRef}
                onSubmit={(data) => {
                    onUpdate?.({
                        ...expense,
                        ...data,
                    });
                    onClose?.();
                }}
            />
        </ExpenseModal>
    );
}