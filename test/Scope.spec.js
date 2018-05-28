import Scope from '../src/Scope';

describe('Scope', function () {

    it('can be constructed and used as an object', () => {
        const scope = new Scope();
        scope.property = 1;
        expect(scope.property).toBe(1);
    });

    describe('$digest', () => {

        let scope;

        beforeEach(() => {
            scope = new Scope();
        });

        it('calls listener function of a watcher on first $digest', () => {
            const watchFunction = function () {
                return 'value';
            };
            const listenerFunction = jasmine.createSpy('listenerFunction');
            scope.$watch(watchFunction, listenerFunction);
            scope.$digest();
            expect(listenerFunction).toHaveBeenCalled();
        });

        it('calls the watch function with the scope as the argument.', () => {
            const watchFunction = jasmine.createSpy();
            const listenerFunction = () => {};
            scope.$watch(watchFunction, listenerFunction);
            scope.$digest();
            expect(watchFunction).toHaveBeenCalledWith(scope);
        });

        it('calls the listener function when the watched value changes.', () => {
            scope.property = 'kek';
            scope.counter = 0;
            const watchFunction = scope => scope.property;
            const listenerFunction = (newValue, oldValue, scope) => scope.counter++;
            scope.$watch(watchFunction, listenerFunction);
            expect(scope.counter).toBe(0);
            scope.$digest();
            expect(scope.counter).toBe(1);
            scope.$digest();
            expect(scope.counter).toBe(1);
            scope.property = 'lol';
            scope.$digest();
            expect(scope.counter).toBe(2);
            scope.property = 'kek again';
            scope.$digest();
            expect(scope.counter).toBe(3);
        });

        it('may have watchers that omit the listener function', () => {
            const watchFunction = jasmine.createSpy().and.returnValue('something');
            scope.$watch(watchFunction);
            scope.$digest();
            expect(watchFunction).toHaveBeenCalled();
        });

        it('deletes watcher when there is a need', () => {
            scope.property = 'value 1';
            scope.counter = 0;
            const watchFunction = (scope) => scope.property;
            const listenerFunction = (newValue, oldValue, scope) => scope.counter++;
            const deleteWatcher = scope.$watch(watchFunction, listenerFunction);
            expect(scope.counter).toBe(0);
            scope.$digest();
            expect(scope.counter).toBe(1);
            scope.$digest();
            expect(scope.counter).toBe(1);
            scope.property = 'value 2';
            scope.$digest();
            expect(scope.counter).toBe(2);
            deleteWatcher();
            scope.property = 'value 3';
            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('triggers chained watchers in the same digest', () => {
            scope.name = 'Dzianis';
            scope.$watch(
                () => scope.nameUpper,
                (newValue, oldValue, scope) => {
                    if (newValue) {
                        scope.initial = newValue.substring(0, 1) + '.';
                    }
                }
            );
            scope.$watch(
                () => scope.name,
                (newValue, oldValue, scope) => {
                    if (newValue) {
                        scope.nameUpper = newValue.toUpperCase();
                    }
                }
            );
            scope.$digest();
            expect(scope.initial).toBe('D.');
            scope.name = 'Nikolay';
            scope.$digest();
            expect(scope.initial).toBe('N.');
        });

        it('gives up on the watches after 10 iterations', () => {
            scope.counterA = 0;
            scope.counterB = 0;
            scope.$watch(
                () => scope.counterA,
                (newValue, oldValue, scope) => {
                    scope.counterB++;
                }
            );
            scope.$watch(
                () => scope.counterB,
                (newValue, oldValue, scope) => {
                    scope.counterA++;
                }
            );
            expect(() => scope.$digest()).toThrow();
        });

        it('ends the $digest when the last watch is clean', () => {
            let watchExecutions = 0;
            scope.array = new Array(2);
            scope.array.fill(true);
            scope.array.forEach((item, index) => {
                scope.$watch(
                    (scope) => {
                        watchExecutions++;
                        return scope.array[index];
                    },
                    () => {}
                );
            });
            scope.$digest();
            expect(watchExecutions).toBe(4);
            scope.array[0] = false;
            scope.$digest();
            expect(watchExecutions).toBe(7);
        });

        it('gives up on the watches after 10 iterations', () => {
            scope.counterA = 0;
            scope.counterB = 0;
            scope.$watch(
                (scope) => scope.counterA,
                (newValue, oldValue, scope) => {
                    scope.counterB++;
                }
            );
            scope.$watch(
                (scope) => scope.counterB,
                (newValue, oldValue, scope) => {
                    scope.counterA++;
                }
            );
            expect(() => scope.$digest()).toThrow();
        });

        it('does not end digest so that new watches are not run', () => {
            scope.value = 'abc';
            scope.counter = 0;
            scope.$watch(
                scope => scope.value,
                (newValue, oldValue, scope) => {
                    scope.$watch(
                        scope => scope.value,
                        (newValue, oldValue, scope) => {
                            scope.counter++;
                        }
                    );
                }
            );
            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('compares based on value if enabled', () => {
            scope.value = [1, 2, 3];
            scope.counter = 0;
            scope.$watch(
                scope => scope.value,
                (newValue, oldValue, scope) => {
                    scope.counter++;
                },
                true
            );
            scope.$digest();
            expect(scope.counter).toBe(1);
            scope.value.push(4);
            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('correctly handles NaNs', () => {
            scope.number = 0 / 0;
            scope.counter = 0;
            scope.$watch(
                scope => scope.number,
                (newValue, oldValue, scope) => {
                    scope.counter++;
                }
            );
            scope.$digest();
            expect(scope.counter).toBe(1);
            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('executes $eval\'ed function and returns result', () => {
            scope.value = 1;
            scope.result = scope.$eval(scope => scope.value);
            expect(scope.result).toBe(1);
        });

        it('passes the second $eval argument straight through', () => {
            scope.value = 1;
            scope.result = scope.$eval((scope, argument) => scope.value + argument, 2);
            expect(scope.result).toBe(3);
        });

        it('executes $apply\'ed function and starts the digest', () => {
            scope.value = 1;
            scope.counter = 0;
            scope.$watch(
                scope => scope.value,
                (newValue, oldValue, scope) => {
                    scope.counter++;
                }
            );
            scope.$digest();
            expect(scope.counter).toBe(1);
            scope.$apply(scope => {
                scope.value = 2;
            });
            expect(scope.counter).toBe(2);
        });

        it('executes $evalAsync\'ed function later in the same cycle', () => {
            scope.value = [1, 2, 3];
            scope.asyncEvalueted = false;
            scope.asyncEvaluetedImmediately = false;
            scope.$watch(
                scope => scope.value,
                (newValue, oldValue, scope) => {
                    scope.$evalAsync(scope => {
                        scope.asyncEvalueted = true;
                    });
                    scope.asyncEvaluetedImmediately = scope.asyncEvalueted;
                }
            );
            scope.$digest();
            expect(scope.asyncEvalueted).toBe(true);
            expect(scope.asyncEvaluetedImmediately).toBe(false);
        });

        it('executes $evalAsync\'ed functions added by watch functions', () => {
            scope.value = [1, 2, 3];
            scope.asyncEvalueted = false;
            scope.$watch(
                scope => {
                    if (!scope.asyncEvalueted) {
                        scope.$evalAsync(scope => {
                            scope.asyncEvalueted = true;
                        });
                    }
                    return scope.value;
                },
                () => {}
            );
            scope.$digest();
            expect(scope.asyncEvalueted).toBe(true);
        });

        it('executes $evalAsync\'ed functions even when not dirty', () => {
            scope.value = [1, 2, 3];
            scope.asyncEvaluetedTimes = 0;
            scope.$watch(
                scope => {
                    if (scope.asyncEvaluetedTimes < 2) {
                        scope.$evalAsync(scope => {
                            scope.asyncEvaluetedTimes++;
                        });
                    }
                    return scope.value;
                },
                () => {}
            );
            scope.$digest();
            expect(scope.asyncEvaluetedTimes).toBe(2);
        });

        it('eventually halts $evalAsyncs added by watches', () => {
            scope.value = [1, 2, 3];
            scope.$watch(
                scope => {
                    scope.$evalAsync(scope => {
                        scope.$evalAsync(() => {});
                    });
                    return scope.value;
                },
                () => {}
            );
            expect(() => scope.$digest()).toThrow();
        });

        it('has a $$phase field whose value is the current digest phase', () => {
            scope.value = [1, 2, 3];
            scope.phaseInWatchFunction = undefined;
            scope.phaseInListenerFunction = undefined;
            scope.phaseInApplyFunction = undefined;
            scope.$watch(
                scope => {
                    scope.phaseInWatchFunction = scope.$$phase;
                    return scope.value;
                },
                (newValue, oldValue, scope) => {
                    scope.phaseInListenerFunction = scope.$$phase;
                }
            );
            scope.$apply(scope => {
                scope.phaseInApplyFunction = scope.$$phase;
            });
            expect(scope.phaseInWatchFunction).toBe('$digest');
            expect(scope.phaseInListenerFunction).toBe('$digest');
            expect(scope.phaseInApplyFunction).toBe('$apply');
            expect(scope.$$phase).toBe(null);
        });

        it('schedules a digest in $evalAsync', done => {
            scope.value = 'abc';
            scope.counter = 0;
            scope.$watch(
                scope => scope.value,
                (newValue, oldValue, scope) => {
                    scope.counter++;
                }
            );
            scope.$evalAsync(() => {});
            expect(scope.counter).toBe(0);
            setTimeout(() => {
                expect(scope.counter).toBe(1);
                done();
            }, 50);
        });

        it('allows async $apply with $applyAsync', done => {
            scope.counter = 0;
            scope.value = 'kek';
            scope.$watch(
                scope => scope.value,
                (newValue, oldValue, scope) => {
                    scope.counter++;
                }
            );
            scope.$digest();
            expect(scope.counter).toBe(1);
            scope.$applyAsync(scope => {
                scope.value = 'abc';
            });
            expect(scope.counter).toBe(1);
            setTimeout(() => {
                expect(scope.counter).toBe(2);
                done();
            }, 50);
        });

        it('never executes $applyAsync\'ed function in the same cycle', done => {
            scope.value = [1, 2, 3];
            scope.asyncApplied = false;

            scope.$watch(
                scope => scope.value,
                (newValue, oldValue, scope) => {
                    scope.$applyAsync(scope => {
                        scope.asyncApplied = true;
                    });
                }
            );
            scope.$digest();
            expect(scope.asyncApplied).toBe(false);
            setTimeout(() => {
                expect(scope.asyncApplied).toBe(true);
                done();
            }, 50);
        });

        it('coalesces many calls to $applyAsync', done => {
            scope.counter = 0;
            scope.$watch(
                scope => {
                    scope.counter++;
                    return scope.value;
                },
                () => {}
            );
            scope.$applyAsync(scope => {
                scope.value = 'abc';
            });
            scope.$applyAsync(scope => {
                scope.value = 'cba';
            });
            setTimeout(() => {
                expect(scope.counter).toBe(2);
                done();
            }, 50);
        });

        it('cancels and flushes $applyAsync if digested first', done => {
            scope.counter = 0;
            scope.$watch(
                scope => {
                    scope.counter++;
                    return scope.value;
                },
                () => {}
            );
            scope.$applyAsync(scope => {
                scope.value = 'abc';
            });
            scope.$applyAsync(scope => {
                scope.value = 'cba';
            });
            scope.$digest();
            expect(scope.counter).toBe(2);
            expect(scope.value).toBe('cba');
            setTimeout(() => {
                expect(scope.counter).toBe(2);
                done();
            }, 50);
        });

        it('runs a $$postDigest function after each digest', () => {
            scope.counter = 0;
            scope.$$postDigest(() => {
                scope.counter++;
            });
            expect(scope.counter).toBe(0);
            scope.$digest();
            expect(scope.counter).toBe(1);
            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('does not include $$postDigest in the digest', () => {
            scope.value = 'original';
            scope.$$postDigest(() => {
                scope.value = 'changed';
            });
            scope.$watch(
                scope => scope.value,
                (newValue, oldValue, scope) => {
                    scope.watchedValue = newValue;
                }
            );
            scope.$digest();
            expect(scope.watchedValue).toBe('original');
            scope.$digest();
            expect(scope.watchedValue).toBe('changed');
        });

        it('catches exceptions in watch functions and continues', () => {
            scope.value = 'abc';
            scope.counter = 0;
            scope.$watch(
                () => {
                    throw 'error';
                },
                (newValue, oldValue, scope) => {
                    scope.counter++;
                }
            );
            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('catches exceptions in listener functions and continues', () => {
            scope.value = 'abc';
            scope.counter = 0;
            scope.$watch(
                scope => scope.value,
                () => {
                    throw 'error';
                }
            );
            scope.$watch(
                scope => scope.value,
                (newValue, oldValue, scope) => {
                    scope.counter++;
                }
            );
            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('catches exceptions in $evalAsync', () => {

        });
    });
});
