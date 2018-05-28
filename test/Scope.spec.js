import Scope from '../src/Scope';

describe('Scope', function () {

    it("can be constructed and used as an object", () => {
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

    });
});
