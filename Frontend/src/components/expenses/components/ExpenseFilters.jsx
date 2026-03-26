export default function ExpenseFilters({
                                           categories,
                                           category,
                                           setCategory,
                                           search,
                                           setSearch,
                                       }) {
    return (
        <div className="ex-filters">
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {categories.map((c) => (
                    <option key={c} value={c}>
                        {c}
                    </option>
                ))}
            </select>

            <input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
        </div>
    );
}