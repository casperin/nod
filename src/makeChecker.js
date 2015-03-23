/**
 * makeChecker
 *
 * An "checker" communicates primarily with the mediator. It listens
 * for input changes (coming from listeners), performs its checks
 * and fires off results back to the mediator for checkHandlers to
 * handle.
 *
 * The checker has a 1 to 1 relationship with an element, an
 * listeners, and an checkHandler; although they may
 * communicate with other "sets" of listeners, checkers and handlers.
 *
 * Checks are added, from the outside, and consists of a checkFunction (see
 * nod.checkFunctions) and a unique id.
 */
module.exports = function makeChecker (element, mediator) {
    var checks = [];

    function subscribeTo (id) {
        mediator.subscribe(id, performCheck);
    }

    // Run every check function against the value of the element.
    function performCheck (options) {
        checks.forEach(function (check) {
            check(options || {});
        });
    }

    // Add a check function to the element. The result will be handed off
    // to the mediator (for checkHandlers to evaluate).
    function addCheck (checkFunction, id) {
        function callback (result) {
            mediator.fire({
                id: id,
                type: 'check',
                result: result,
                element: element,
                validate: checkFunction.validate
            });
        }

        checks.push(function (options) {
            // If element.value is undefined, then we might be dealing with
            // another type of element; like <div contenteditable='true'>
            var value = element.value !== undefined ? element.value : element.innerHTML;

            options.element = element;

            checkFunction(callback, value, options);
        });
    }


    return {
        subscribeTo:    subscribeTo,
        addCheck:       addCheck,
        performCheck:   performCheck,
        element:        element
    };
};

