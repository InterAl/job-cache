function createCache() {
    const cache = {};
    const runningJobs = {};

    function clearJob(key) {
        delete runningJobs[key];
    }

    function processJob(key, job) {
        try {
            const promisedJob = Promise.resolve(job.action());

            runningJobs[key] = promisedJob;

            promisedJob.then(result => {
                cache[key] = {
                    result,
                    cooldown: job.cooldown,
                    lastRun: new Date()
                };

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

            return cachedEntry ? cachedEntry.result : null;
        },
        getWait(key) {
            return this.get(key) || runningJobs[key];
        },
        add({key, action, cooldown}) {
            const cachedResult = cache[key];
            const jobExists = Boolean(runningJobs[key]);

            if (!jobExists) {
                processJob(key, {
                    action,
                    cooldown
                });
            }
        }
    };

    return api;
}

module.exports = createCache;
