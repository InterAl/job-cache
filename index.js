function createCache() {
    const cache = {};
    const queue = {};

    function startConsumingQueue(interval) {
        const keys = Object.keys(queue);
        for (const key of keys) {
            const job = queue[key];
            if (job && job.action) {
                Promise.resolve(job.action()).then(result => {
                    cache[key] = {
                        result,
                        cooldown: job.cooldown,
                        lastRun: new Date()
                    };

                    delete queue[key];
                });
            }
        }

        setTimeout(startConsumingQueue, 50);
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
            const jobExists = Boolean(queue[key]);

            if (!jobExists) {
                let cooldownElapsed = true;

                if (cachedResult && cachedResult.cooldown) {
                    cooldownElapsed = new Date() - cachedResult.lastRun > cachedResult.cooldown;
                }

                if (cooldownElapsed) {
                    queue[key] = {
                        action,
                        cooldown
                    };
                }
            }
        }
    };

    startConsumingQueue();

    return api;
}

module.exports = createCache;
