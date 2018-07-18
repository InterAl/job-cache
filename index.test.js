const createCache = require('./index.js');
const waitForCond = require('wait-for-cond');
const {assert} = require('chai');

const waitForAssert = (fn) => waitForCond.assert(fn, 1500);

describe('test', () => {
    let cache;

    beforeEach(() => cache = createCache());

    it('start with empty cache', () => {
        assert.deepEqual(cache.getAll(), {});
    });

    it('add a job', () => {
        cache.add({
            key: 'foo',
            action: () => delayResolve('fooResult', 20)
        });

        return waitForAssert(() => {
            assert.deepEqual(cache.get('foo'), 'fooResult');
        });
    });

    it('add a job - unpromised result', () => {
        cache.add({
            key: 'foo',
            action: () => 'fooResult'
        });

        return waitForAssert(() => {
            assert.deepEqual(cache.get('foo'), 'fooResult');
        });
    });

    it('should not reschedule an already-queued job-key', () => {
        let fn2Called = false;

        cache.add({
            key: 'foo',
            action: () => {
                return 'r1';
            }
        });

        cache.add({
            key: 'foo',
            action: () =>{
                fn2Called = true;
                return 'r2';
            }
        });

        return waitForAssert(() => {
            assert.equal(cache.get('foo'), 'r1');
            assert.isFalse(fn2Called);
        });
    });

    it('should not evaluate the 2nd job, given the cooldown was not elapsed', async () => {
        cache.add({
            key: 'foo',
            action: () => 'r1',
            cooldown: 500
        });

        await waitForAssert(() => {
            assert.equal(cache.get('foo'), 'r1');
        });

        waitForCond.assertHold(() => {
            assert.equal(cache.get('foo'), 'r1');
        }, 400);

        cache.add({
            key: 'foo',
            action: () => 'r2'
        });

        await waitForCond.assertHold(() => {
            assert.equal(cache.get('foo'), 'r1');
        }, 500);
    });

    it('should evaluate the 2nd job, given the cooldown was elapsed', async () => {
        cache.add({
            key: 'foo',
            action: () => 'r1',
            cooldown: 500
        });

        await waitForAssert(() => {
            assert.equal(cache.get('foo'), 'r1');
        });

        await waitForCond.assertHold(() => {
            assert.equal(cache.get('foo'), 'r1');
        }, 500);

        cache.add({
            key: 'foo',
            action: () => 'r2'
        });

        await waitForAssert(() => {
            assert.equal(cache.get('foo'), 'r2');
        });
    });

    function delayResolve(data, delay) {
        return new Promise(resolve => setTimeout(() => resolve(data), delay));
    }
});
