module.exports = function minBy(arr, fn) {
    let min = isnull(fn(arr[0]), Infinity);
    let minIdx = 0;

    for (var i = 1; i < arr.length; i++) {
        let curr = isnull(fn(arr[i]), Infinity);
        if (curr < min) {
            min = curr;
            minIdx = i;
        }
    }

    return arr[minIdx];
};

function isnull(val, fallback) {
    if (val === null || val === undefined)
        return fallback;

    return val;
}
