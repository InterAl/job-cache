const minBy = require('./minBy.js');

function createCache({requestsPerSecond, maxCacheSize = Infinity} = {}) {
    const cache = {};
    const runningJobs = {};
    const queue = {};
    let isConsuming = false;

    const consumptionRate = 1000 / requestsPerSecond;

    function consumeQueue() {
        if (isConsuming)
            return;

        isConsuming = true;

        (function iter() {
            const hasMore = Object.keys(queue).length > 0;

            if (hasMore) {
                const {key, job} = dequeue();

                processJob(key, job);

                if (requestsPerSecond > 0) {
                    setTimeout(iter, consumptionRate);
                } else {
                    iter();
                }
            } else {
                isConsuming = false;
            }
        })();
    }

    function enqueue(key, job) {
        queue[key] = job;
        consumeQueue();
    }

    function dequeue() {
        const keys = Object.keys(queue);
        const lastKey = keys[keys.length - 1];
        const job = queue[lastKey];

        delete queue[lastKey];

        return {key: lastKey, job};
    }

    function clearJob(key) {
        delete runningJobs[key];
    }

    function removeLowestMru() {
        const lowestMruKey = minBy(Object.keys(cache), key => cache[key].mruScore);
        delete cache[lowestMruKey];
    }

    function addToCache(key, data) {
        const cacheSizeExceeded = Object.keys(cache).length > maxCacheSize - 1;

        if (cacheSizeExceeded) {
            removeLowestMru();
        }

        cache[key] = data;
        cache[key].mruScore = +new Date();
    }

    function processJob(key, job) {
        try {
            const promisedJob = Promise.resolve(job.action());

            runningJobs[key] = promisedJob;

            promisedJob.then(result => {
                addToCache(key, {
                    result,
                    cooldown: job.cooldown,
                    lastRun: new Date()
                });

                clearJob(key);
            }).catch(err => {
                console.error('[job-cache] ' + key, err);
                clearJob(key);
            })
        } catch (err) {
            console.error('[job-cache] ' + key, err);
            clearJob(key);
        }
    }

    function hasElapsed(cachedEntry) {
        return cachedEntry && cachedEntry.cooldown && new Date() - cachedEntry.lastRun > cachedEntry.cooldown;
    }

    const api = {
        getAll() {
            return Object.keys(cache).reduce((acc, key) => {
                acc[key] = cache[key].result
                return acc;
            }, {});
        },
        get(key) {
            const cachedEntry = cache[key];

            if (hasElapsed(cachedEntry)) {
                return null;
            }

            if (cachedEntry) {
                cachedEntry.mruScore = +new Date();
                return cachedEntry.result;
            }

            return null;
        },
        getWait(key) {
            return this.get(key) || runningJobs[key];
        },
        add({key, action, cooldown}) {
            const cachedResult = cache[key];
            const jobExists = Boolean(runningJobs[key]);

            if (!jobExists) {
                enqueue(key, {
                    action,
                    cooldown
                });
            }
        }
    };

    return api;
}

module.exports = createCache;
