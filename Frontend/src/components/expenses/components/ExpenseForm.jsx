import { useEffect, useMemo, useState } from "react";
import "../styles/expenseForm.css";

const categoryOptions = [
    "Food",
    "Transport",
    "Bills",
    "Shopping",
    "Health",
    "Education",
    "Entertainment",
    "Other",
];

const paymentOptions = ["Cash", "Debit Card", "Credit Card", "Bank Transfer"];

const iconOptions = ["🍔", "🚕", "💡", "🛒", "🏥", "📚", "🎮", "🎁", "🧾", "☕"];
const colorOptions = ["#2563eb", "#16a34a", "#f97316", "#ef4444", "#a855f7", "#0ea5e9"];

export default function ExpenseForm({ initialValues, onSubmit, submitRef }) {
    const init = useMemo(
        () => ({
            title: initialValues?.title || "",
            amount: initialValues?.amount || "",
            date: initialValues?.date || new Date().toISOString().slice(0, 10),
            category: initialValues?.category || "Food",
            paymentMethod: initialValues?.paymentMethod || "Cash",
            notes: initialValues?.notes || "",
            icon: initialValues?.icon || "🧾",
            color: initialValues?.color || "#2563eb",
        }),
        [initialValues]
    );

    const [form, setForm] = useState(init);

    useEffect(() => {
        setForm(init);
    }, [init]);

    const previewAmount = form.amount ? Number(form.amount).toLocaleString() : "0";

    function setField(name, value) {
        setForm((prev) => ({ ...prev, [name]: value }));
    }

    function handleSubmit(e) {
        e.preventDefault();

        if (!form.title.trim()) {
            alert("Please enter expense name");
            return;
        }

        if (!form.amount || Number(form.amount) <= 0) {
            alert("Please enter valid amount");
            return;
        }

        onSubmit?.({
            date: form.date,
            category: form.category,
            description: form.title,
            amount: Number(form.amount),
            paymentMethod: form.paymentMethod,
            notes: form.notes,
            icon: form.icon,
            color: form.color,
        });
    }

    return (
        <form className="ex-form" onSubmit={handleSubmit}>
            <div className="ex-preview" style={{ borderColor: form.color }}>
                <div className="ex-preview-left">
                    <div
                        className="ex-preview-icon"
                        style={{ background: `${form.color}1A`, color: form.color }}
                    >
                        {form.icon}
                    </div>
                    <div>
                        <div className="ex-preview-title">{form.title || "Expense name"}</div>
                        <div className="ex-preview-sub">
                            Rs.{previewAmount} • {form.category}
                        </div>
                    </div>
                </div>
            </div>

            <div className="ex-section">
                <div className="ex-section-label">EXPENSE NAME</div>
                <input
                    className="ex-input"
                    placeholder="e.g. Dinner at restaurant"
                    value={form.title}
                    onChange={(e) => setField("title", e.target.value)}
                />
            </div>

            <div className="ex-grid-2">
                <div className="ex-section">
                    <div className="ex-section-label">AMOUNT (RS.)</div>
                    <input
                        className="ex-input"
                        type="number"
                        placeholder="0"
                        value={form.amount}
                        onChange={(e) => setField("amount", e.target.value)}
                    />
                </div>

                <div className="ex-section">
                    <div className="ex-section-label">DATE</div>
                    <input
                        className="ex-input"
                        type="date"
                        value={form.date}
                        onChange={(e) => setField("date", e.target.value)}
                    />
                </div>
            </div>

            <div className="ex-grid-2">
                <div className="ex-section">
                    <div className="ex-section-label">CATEGORY</div>
                    <select
                        className="ex-input"
                        value={form.category}
                        onChange={(e) => setField("category", e.target.value)}
                    >
                        {categoryOptions.map((c) => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="ex-section">
                    <div className="ex-section-label">PAYMENT METHOD</div>
                    <select
                        className="ex-input"
                        value={form.paymentMethod}
                        onChange={(e) => setField("paymentMethod", e.target.value)}
                    >
                        {paymentOptions.map((p) => (
                            <option key={p} value={p}>
                                {p}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="ex-section">
                <div className="ex-section-label">ICON</div>
                <div className="ex-icon-grid">
                    {iconOptions.map((ic) => (
                        <button
                            key={ic}
                            type="button"
                            className={`ex-chip ${form.icon === ic ? "active" : ""}`}
                            onClick={() => setField("icon", ic)}
                            style={form.icon === ic ? { outlineColor: form.color } : undefined}
                        >
                            {ic}
                        </button>
                    ))}
                </div>
            </div>

            <div className="ex-section">
                <div className="ex-section-label">COLOR</div>
                <div className="ex-color-row">
                    {colorOptions.map((c) => (
                        <button
                            key={c}
                            type="button"
                            className={`ex-color ${form.color === c ? "active" : ""}`}
                            style={{ background: c }}
                            onClick={() => setField("color", c)}
                            aria-label={`Pick ${c}`}
                        />
                    ))}
                </div>
            </div>

            <div className="ex-section">
                <div className="ex-section-label">NOTES</div>
                <textarea
                    className="ex-textarea"
                    rows={3}
                    placeholder="Optional notes..."
                    value={form.notes}
                    onChange={(e) => setField("notes", e.target.value)}
                />
            </div>

            <button ref={submitRef} className="ex-hidden-submit" type="submit">
                Submit
            </button>
        </form>
    );
}