# job-cache
A job queue that caches the job's result

# Installation
```shell
$ npm i -S job-cache
```

# Usage
The promise resolves if the condition is met at least once in the specified duration, and rejects otherwise.

```javascript
const createCache = require('job-cache');
const cache = createCache();

// Adding a job with a cooldown (won't reschedule additional jobs with the same
// key if the cooldown is still in effect - counted from the job's finish time)
cache.add({
    key: 'foo',
    action: Promise.resolve('result'),
    cooldown: 1500
});

// Returns the last-run job's result.
cache.get('foo');

// Returns the entire cache ({key: result})
cache.getAll();
```
