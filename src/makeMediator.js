/**
 * makeMediator
 *
 * Minimal implementation of a mediator pattern, used for communication
 * between checkers and checkHandlers (checkers fires events which
 * handlers can subscribe to). Unique ID's are used to tell events apart.
 *
 * Subscribing to 'all' will give you all results from all checks.
 */
module.exports = function makeMediator () {
    var subscribers = [],
        all = [];

    return {
        subscribe: function subscribe (id, fn) {
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

        fire: function fire (options) {
            var subscribedFunctions = subscribers[options.id].concat(all);

            subscribedFunctions.forEach(function (subscribedFunction) {
                subscribedFunction(options);
            });
        }
    };
};

