import isEqual from 'lodash.isequal';
import cloneDeep from 'lodash.clonedeep';

export default class Scope {

    constructor() {
        this.$$watchers = [];
        this.$$asyncQueue = [];
        this.$$applyAsyncQueue = [];
        this.$$applyAsyncId = null;
        this.$$postDigestQueue = [];
        this.$$children = [];
        this.$$phase = null;
        this.$$lastDirtyWatch = null;
    }

    static $$areEqual(newValue, oldValue, valueEquation) {
        if (valueEquation) {
            return isEqual(newValue, oldValue);
        } else {
            return newValue === oldValue ||
                (typeof newValue === 'number' && typeof oldValue === 'number' &&
                    isNaN(newValue) && isNaN(oldValue));
        }
    }

    $watch(watchFunction, listenFunction, valueEquation) {
        const watcher = {
            watchFunction: watchFunction,
            listenFunction: listenFunction || function () {},
            valueEquation: !!valueEquation
        };
        this.$$watchers.push(watcher);
        this.$$lastDirtyWatch = null;
        return () => {
            const index = this.$$watchers.indexOf(watcher);
            if (index >= 0) {
                this.$$watchers.splice(index, 1);
            }
        };
    }

    $$digestOnce() {
        let dirty = false;
        const BreakExeption = {};
        try {
            this.$$watchers.forEach(watcher => {
                let newValue, oldValue;
                try {
                    try {
                        newValue = watcher.watchFunction(this);
                    } catch (error) {
                        console.error(error);
                        newValue = null;
                    }
                    oldValue = watcher.lastValue;
                    if (!Scope.$$areEqual(newValue, oldValue, watcher.valueEquation)) {
                        this.$$lastDirtyWatch = watcher;
                        dirty = true;
                        watcher.lastValue = (watcher.valueEquation ? cloneDeep(newValue) : newValue);
                        watcher.listenFunction(newValue, oldValue, this);
                    } else if (this.$$lastDirtyWatch === watcher) {
                        throw BreakExeption;
                    }
                } catch (error) {
                    if (error !== BreakExeption) {
                        console.error(error);
                    } else throw BreakExeption;
                }
            });
        } catch (error) {
            if (error !== BreakExeption) {
                console.error(error);
            }
        }
        return dirty;
    }

    $digest() {
        let ttl = 10;
        let dirty = false;
        this.$$lastDirtyWatch = null;
        this.$beginPhase('$digest');
        if (this.$$applyAsyncId) {
            clearTimeout(this.$$applyAsyncId);
            this.$$flushApplyAsync();
        }
        do {
            while (this.$$asyncQueue.length) {
                try {
                    const asyncTask = this.$$asyncQueue.shift();
                    asyncTask.scope.$eval(asyncTask.expression);
                } catch(error) {
                    console.error(error);
                }
            }
            dirty = this.$$digestOnce();
            if ((dirty || this.$$asyncQueue.length) && !(ttl--)) {
                throw '10 digest iterations reached.';
            }
        } while (dirty || this.$$asyncQueue.length);
        while (this.$$postDigestQueue.length) {
            try {
                this.$$postDigestQueue.shift()();
            } catch(error) {
                console.error(error);
            }
        }
        this.$clearPhase();
    }

    $eval(expression, locals) {
        return expression(this, locals);
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

    $apply(expression) {
        this.$beginPhase('$apply');
        try {
            this.$eval(expression);
        } finally {
            this.$clearPhase();
            this.$digest();
        }
    }

    $applyAsync(expression) {
        this.$$applyAsyncQueue.push(() => {
            this.$eval(expression);
        });
        if (this.$$applyAsyncId === null) {
            this.$$applyAsyncId = setTimeout(() => {
                this.$apply(() => {
                    this.$$flushApplyAsync();
                });
            }, 0);
        }
    }

    $$flushApplyAsync() {
        while (this.$$applyAsyncQueue.length) {
            this.$$applyAsyncQueue.shift()();
        }
        this.$$applyAsyncId = null;
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

    $new() {
        const ChildScope = () => {};
        ChildScope.prototype = this;
        const child = new ChildScope();
        this.$$children.push(child);
        child.$$watchers = [];
        child.$$children = [];
        return child;
    }
}