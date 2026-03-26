export default function ExpenseTable({ rows, onView, onEdit, onDelete }) {
    return (
        <div className="ex-table-wrap">
            <table className="ex-table">
                <thead>
                <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Payment Method</th>
                    <th style={{ width: 180 }}>Actions</th>
                </tr>
                </thead>

                <tbody>
                {rows.length === 0 ? (
                    <tr>
                        <td colSpan={6} className="ex-empty">
                            No expenses found
                        </td>
                    </tr>
                ) : (
                    rows.map((e) => (
                        <tr key={e.id}>
                            <td>{e.date}</td>
                            <td>{e.category}</td>
                            <td>{e.description}</td>
                            <td className="ex-amount">Rs. {Number(e.amount).toLocaleString()}</td>
                            <td>{e.paymentMethod}</td>
                            <td className="ex-actions">
                                <button type="button" onClick={() => onView(e.id)}>
                                    View
                                </button>
                                <button type="button" onClick={() => onEdit(e.id)}>
                                    Edit
                                </button>
                                <button type="button" className="danger" onClick={() => onDelete(e.id)}>
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))
                )}
                </tbody>
            </table>
        </div>
    );
}