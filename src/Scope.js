import isEqual from 'lodash.isequal';
import cloneDeep from 'lodash.clonedeep';

export default class Scope {

    constructor() {
        this.$$watchers = [];
        this.$$asyncQueue = [];
        this.$$postDigestQueue = [];
        this.$$phase = null;
    }

    $watch(watchFunction, listenFunction, valueEquation) {
        const watcher = {
            watchFunction: watchFunction,
            listenFunction: listenFunction || function () {},
            valueEquation: !!valueEquation
        };
        this.$$watchers.push(watcher);
        return () => {
            const index = this.$$watchers.indexOf(watcher);
            if (index >= 0) {
                this.$$watchers.splice(index, 1);
            }
        }
    }

    $$areEqual(newValue, oldValue, valueEquation) {
        if (valueEquation) {
            return isEqual(newValue, oldValue);
        } else {
            return newValue === oldValue ||
                (typeof newValue === 'number' && typeof oldValue === 'number' &&
                    isNaN(newValue) && isNaN(oldValue));
        }
    }

    $$digestOnce() {
        let dirty = false;
        this.$$watchers.forEach(watcher => {
            try {
                const newValue = watcher.watchFunction(this);
                const oldValue = watcher.lastValue;
                if (!this.$$areEqual(newValue, oldValue, watcher.valueEquation)) {
                    watcher.listenFunction(newValue, oldValue, this);
                    dirty = true;
                }
                watcher.lastValue = (watcher.valueEquation ? cloneDeep(newValue) : newValue);
            } catch(error) {
                (console.error || console.log)(error);
            }
        });
        return dirty;
    }

    $digest() {
        let ttl = 10;
        let dirty;
        this.$beginPhase('$digest');
        do {
            while (this.$$asyncQueue.length) {
                try {
                    const asyncTask = this.$$asyncQueue.shift();
                    this.$eval(asyncTask);
                } catch(error) {
                    (console.error || console.log)(error);
                }
            }
            // if (dirty && ttl--) {
            //     console.log('10 digest iterations reached.');
            // }
            dirty = this.$$digestOnce();
        } while (dirty);
        while (this.$$postDigestQueue.length) {
            try {
                this.$$postDigestQueue.shift()();
            } catch(error) {
                (console.error || console.log)(error);
            }
        }
        this.$clearPhase();
    }

    $eval(expression, locals) {
        return expression(this, locals);
    }

    $apply(expression) {
        this.$beginPhase('$apply');
        try {
            this.$eval(expression);
        } finally {
            this.$clearPhase();
            this.$digest();
        }
    }

    $evalAsync(expression) {
        if (!this.$$phase && !this.$$asyncQueue.length) {
            setTimeout(() => {
                if (this.$$asyncQueue.length) {
                    this.$digest();
                }
            }, 0);
        }
        this.$$asyncQueue.push({scope: this, expression: expression});
    }

    $beginPhase(phase) {
        if (this.$$phase) {
            throw this.$$phase + ' already in progress.';
        }
        this.$$phase = phase;
    }

    $clearPhase() {
        this.$$phase = null;
    }

    $$postDigest(func) {
        this.$$postDigestQueue.push(func);
    }
}