export function nextSortState(current, nextKey) {
    if (current.key === nextKey) {
        return {
            key: current.key,
            direction: current.direction === 'asc' ? 'desc' : 'asc',
        };
    }
    return {
        key: nextKey,
        direction: 'asc',
    };
}
function comparePrimitive(left, right) {
    if (left instanceof Date || right instanceof Date) {
        const leftTime = left instanceof Date ? left.getTime() : new Date(left).getTime();
        const rightTime = right instanceof Date ? right.getTime() : new Date(right).getTime();
        return leftTime - rightTime;
    }
    if (typeof left === 'number' && typeof right === 'number') {
        return left - right;
    }
    return String(left).localeCompare(String(right), undefined, {
        numeric: true,
        sensitivity: 'base',
    });
}
export function createStringSorter(getter) {
    return getter;
}
export function createSortComparator(sort, sorters, fallbacks = []) {
    const primarySorter = sorters[sort.key];
    return (left, right) => {
        const base = comparePrimitive(primarySorter(left), primarySorter(right));
        if (base !== 0) {
            return sort.direction === 'asc' ? base : -base;
        }
        for (const fallback of fallbacks) {
            const result = comparePrimitive(fallback.getter(left), fallback.getter(right));
            if (result !== 0) {
                return fallback.direction === 'asc' ? result : -result;
            }
        }
        return 0;
    };
}
//# sourceMappingURL=sort.js.map