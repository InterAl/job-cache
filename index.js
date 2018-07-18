function createCache() {
    const cache = {};
    const runningJobs = {};

    function processJob(key, job) {
        Promise.resolve(job.action()).then(result => {
            cache[key] = {
                result,
                cooldown: job.cooldown,
                lastRun: new Date()
            };

            delete runningJobs[key];
        });
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
