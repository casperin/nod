/**
 * mediatorFactory
 *
 * Minimal implementation of a mediator pattern, used for communication
 * between checkers and checkHandlers (checkers fires events which
 * handlers can subscribe to). Unique ID's are used to tell events apart.
 *
 * Subscribing to 'all' will give you all results from all checks.
 */
module.exports = () => {
    var subscribers = [],
        all = [];

    return {
        subscribe: (id, fn) => {
            if (id === 'all') {
                all.push(fn);
            } else {
                if (!subscribers[id]) {
                    subscribers[id] = [];
                }

                if (subscribers[id].indexOf(fn) === -1) {
                    subscribers[id].push(fn);
                }
            }
        },

        fire: options =>
            subscribers[options.id].concat(all).forEach(fn => fn(options))
    };
};

