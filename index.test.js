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

    it('getAll', () => {
        cache.add({
            key: 'foo',
            action: () => 'fooResult'
        });

        cache.add({
            key: 'bar',
            action: () => 'barResult'
        });

        return waitForAssert(() => {
            assert.deepEqual(cache.getAll('foo'), {
                foo: 'fooResult',
                bar: 'barResult'
            });
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

    it('should update an entity value', async () => {
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
        }, 300);

        cache.add({
            key: 'foo',
            action: () => 'r2'
        });

        await waitForAssert(() => {
            assert.equal(cache.get('foo'), 'r2');
        });
    });

    it('should evaluate the 2nd job, given 1st job throwed an error', async () => {
        cache.add({
            key: 'foo',
            action: () => {throw Error('Error');}
        });

        cache.add({
            key: 'foo',
            action: () => 42
        });

        await waitForAssert(() => {
            assert.equal(cache.get('foo'), 42);
        });
    });

    it('should evaluate the 2nd job, given 1st job promise rejected', async () => {
        cache.add({
            key: 'foo',
            action: () => Promise.reject('Error')
        });

        setTimeout(() => {
            cache.add({
                key: 'foo',
                action: () => 42
            });
        }, 50);

        await waitForAssert(() => {
            assert.equal(cache.get('foo'), 42);
        });
    });

    it('should return null, given a cached entity has expired', async () => {
        cache.add({
            key: 'foo',
            action: () => 'r1',
            cooldown: 50
        });

        await waitForAssert(() => {
            assert.equal(cache.get('foo'), 'r1');
        });

        await (new Promise(resolve => setTimeout(resolve, 50)));

        await waitForAssert(() => {
            assert.equal(cache.get('foo'), null);
        });
    });

    it('getWait - a promised entity', async () => {
        cache.add({
            key: 'foo',
            action: () => new Promise(resolve => setTimeout(() => resolve(42), 500))
        });

        const result = await cache.getWait('foo');

        assert.equal(result, 42);
    });

    function delayResolve(data, delay) {
        return new Promise(resolve => setTimeout(() => resolve(data), delay));
    }
});
