export default function ExpenseStats({
                                         totalCount,
                                         totalAmount,
                                         categoriesCount,
                                         thisMonthAmount,
                                     }) {
    return (
        <div className="db-kpi-grid">
            <div className="kpi-card">
                <div className="kpi-top">
                    <span className="kpi-icon">📌</span>
                    <span className="kpi-badge pos">↑</span>
                </div>
                <p className="kpi-label">TOTAL EXPENSES</p>
                <h2 className="kpi-value">{totalCount}</h2>
                <p className="kpi-change pos">records</p>
            </div>

            <div className="kpi-card">
                <div className="kpi-top">
                    <span className="kpi-icon">💰</span>
                    <span className="kpi-badge pos">↑</span>
                </div>
                <p className="kpi-label">TOTAL AMOUNT</p>
                <h2 className="kpi-value">Rs.{Number(totalAmount).toLocaleString()}</h2>
                <p className="kpi-change pos">selected view</p>
            </div>

            <div className="kpi-card">
                <div className="kpi-top">
                    <span className="kpi-icon">🗂️</span>
                    <span className="kpi-badge pos">↑</span>
                </div>
                <p className="kpi-label">CATEGORIES</p>
                <h2 className="kpi-value">{categoriesCount}</h2>
                <p className="kpi-change pos">unique</p>
            </div>

            <div className="kpi-card">
                <div className="kpi-top">
                    <span className="kpi-icon">📅</span>
                    <span className="kpi-badge pos">↑</span>
                </div>
                <p className="kpi-label">THIS MONTH</p>
                <h2 className="kpi-value">Rs.{Number(thisMonthAmount).toLocaleString()}</h2>
                <p className="kpi-change pos">current month</p>
            </div>
        </div>
    );
}