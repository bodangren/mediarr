export function containsFilter(field, query) {
    const normalized = query.trim().toLowerCase();
    return (row) => String(row[field] ?? '').toLowerCase().includes(normalized);
}
export function equalsFilter(field, value) {
    return (row) => row[field] === value;
}
export function greaterThanFilter(field, value) {
    return (row) => {
        const candidate = Number(row[field]);
        return Number.isFinite(candidate) && candidate > value;
    };
}
export function applyFilterGroup(rows, group) {
    if (group.predicates.length === 0) {
        return rows;
    }
    if (group.operator === 'and') {
        return rows.filter(row => group.predicates.every(predicate => predicate(row)));
    }
    return rows.filter(row => group.predicates.some(predicate => predicate(row)));
}
//# sourceMappingURL=filter.js.map