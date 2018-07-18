function createCache() {
    const cache = {};
    const runningJobs = {};

    function clearJob(key) {
        delete runningJobs[key];
    }

    function processJob(key, job) {
        try {
            Promise.resolve(job.action()).then(result => {
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

    const api = {
        getAll() {
            return Object.keys(cache).reduce((acc, key) => {
                acc[key] = cache[key].result
                return acc;
            }, {});
        },
        get(key) {
            return cache[key] ? cache[key].result : null;
        },
        add({key, action, cooldown}) {
            const cachedResult = cache[key];
            const jobExists = Boolean(runningJobs[key]);

            if (!jobExists) {
                let cooldownElapsed = true;

                if (cachedResult && cachedResult.cooldown) {
                    cooldownElapsed = new Date() - cachedResult.lastRun > cachedResult.cooldown;
                }

                if (cooldownElapsed) {
                    runningJobs[key] = true;
                    processJob(key, {
                        action,
                        cooldown
                    });
                }
            }
        }
    };

    return api;
}

module.exports = createCache;
