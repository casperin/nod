(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var util = require("./util"),
    constants = require("./constants");

// Collection of built-in check functions
module.exports = {
    presence: function () {
        return function (callback, value) {
            return callback(value.length > 0);
        };
    },

    exact: function (exactValue) {
        return function (callback, value) {
            return callback(value === exactValue);
        };
    },

    contains: function (containsValue) {
        return function (callback, value) {
            return callback(value.indexOf(containsValue) > -1);
        };
    },

    not: function (exactValue) {
        return function (callback, value) {
            return callback(value !== exactValue);
        };
    },

    "min-length": function (minimumLength) {
        return function (callback, value) {
            return callback(value.length >= minimumLength);
        };
    },

    "max-length": function (maximumLength) {
        return function (callback, value) {
            return callback(value.length <= maximumLength);
        };
    },

    "exact-length": function (exactLen) {
        return function (callback, value) {
            return callback(value.length === +exactLen);
        };
    },

    "between-length": function (minimumLength, maximumLength) {
        return function (callback, value) {
            return callback(value.length >= minimumLength && value.length <= maximumLength);
        };
    },

    "max-number": function (maximumNumber) {
        return function (callback, value) {
            return callback(+value <= maximumNumber);
        };
    },

    "min-number": function (minimumNumber) {
        return function (callback, value) {
            return callback(+value <= minimumNumber);
        };
    },

    "between-number": function (minimumNumber, maximumNumber) {
        return function (callback, value) {
            return callback(+value >= minimumNumber && +value <= maximumNumber);
        };
    },

    integer: function () {
        return function (callback, value) {
            return callback(constants.Regex.INTEGER.test(value));
        };
    },

    float: function () {
        return function (callback, value) {
            return callback(constants.Regex.FLOAT.test(value));
        };
    },

    "same-as": function (selector) {
        var sameAsElement = util.getElement(selector);

        return function (callback, value, options) {
            // 'same-as' is special, in that if it is triggered by another
            // field (the one it should be similar to), and the field itself is
            // empty, then it bails out without a check. This is to avoid
            // showing an error message before the user has even reached the
            // element.
            if (options && options.event && options.event.target && options.event.target !== options.element && value.length === 0) {
                return;
            }

            callback(value === sameAsElement.value);
        };
    },

    "one-of": function (selector) {
        var elements = util.getElements(selector);

        return function (callback) {
            return elements.filter(function (el) {
                return el.value;
            }).length;
        };
    },

    "only-one-of": function (selector) {
        var elements = util.getElements(selector);

        return function (callback, value) {
            return callback(elements.filter(function (el) {
                return el.value;
            }).length === 1);
        };
    },

    checked: function () {
        return function (callback, value, options) {
            return callback(options.element.checked);
        };
    },

    "some-radio": function (selector) {
        var radioElements = util.getElements(selector);

        return function (callback, value, options) {
            return callback(radioElements.map(function (el) {
                return el.checked;
            }).reduce(util.or));
        };
    },

    regexp: function (reg) {
        return function (callback, value) {
            return callback(reg.test(value));
        };
    },

    email: function () {
        return function (callback, value) {
            return callback(constants.Regex.EMAIL.test(value));
        };
    }
};

},{"./constants":5,"./util":12}],2:[function(require,module,exports){
"use strict";

var util = require("./util"),
    constants = require("./constants");

/**
 * checkHandlerFactory
 *
 * Handles checks coming in from the mediator and takes care of calculating
 * the state and error messages.
 *
 * The checkHandlers lives in one to one with the element parsed in,
 * and listens for (usually) multiple error checks.
 */
module.exports = function (element, mediator, configuration) {
    var results = {},
        id = util.unique();

    function subscribeTo(id, errorMessage, defaultStatus) {
        // Create a representation of the type of error in the results
        // object.
        if (!results[id]) {
            results[id] = {
                status: defaultStatus || constants.UNCHECKED,
                errorMessage: errorMessage
            };
        }

        // Subscribe to error id.
        mediator.subscribe(id, checkHandler);
    }

    function checkHandler(result) {
        results[result.id].status = result.result ? constants.VALID : constants.INVALID;

        notifyMediator();
    }

    // Runs through all results to see what kind of feedback to show the
    // user.
    function notifyMediator() {
        var status = getStatus();

        // Event if might be valid we pass along an undefined errorMessage.
        mediator.fire({
            id: id,
            type: "result",
            result: status.status,
            element: element,
            errorMessage: status.errorMessage
        });
    }

    function getStatus() {
        var status, errorMessage;

        for (var id in results) {
            status = results[id].status;

            if (results[id].status === constants.INVALID) {
                errorMessage = results[id].errorMessage;
                break;
            }
        }

        return {
            status: status,
            errorMessage: errorMessage
        };
    }

    return {
        id: id,
        subscribeTo: subscribeTo,
        checkHandler: checkHandler,
        getStatus: getStatus,
        element: element
    };
};

},{"./constants":5,"./util":12}],3:[function(require,module,exports){
/**
 * checkerFactory
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
"use strict";

module.exports = function (element, mediator) {
    var checks = [],

    // Run every check function against the value of the element.
    performCheck = function (options) {
        return checks.forEach(function (check) {
            return check(options || {});
        });
    },
        subscribeTo = function (id) {
        return mediator.subscribe(id, performCheck);
    },

    // Add a check function to the element. The result will be handed off
    // to the mediator (for checkHandlers to evaluate).
    addCheck = function (checkFunction, id) {
        var callback = function (result) {
            return mediator.fire({
                id: id,
                type: "check",
                result: result,
                element: element,
                validate: checkFunction.validate
            });
        };

        checks.push(function (options) {
            // If element.value is undefined, then we might be dealing with
            // another type of element; like <div contenteditable='true'>
            var value = element.value !== undefined ? element.value : element.innerHTML;

            options.element = element;

            checkFunction(callback, value, options);
        });
    };

    return {
        subscribeTo: subscribeTo,
        addCheck: addCheck,
        performCheck: performCheck,
        element: element
    };
};

},{}],4:[function(require,module,exports){
"use strict";

var findCollectionIndex = function (collection, element) {
    for (var i in collection) {
        if (collection[i].element === element) {
            return i;
        }
    }

    return -1;
};

/**
 * collectionFactory
 *
 * A minimal implementation of a "collection", inspired by collections from
 * BackboneJS. Used by listeners, checkers, and checkHandlers.
 */
module.exports = function (maker) {
    var collection = [];

    collection.findOrMake = function () {
        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
        }

        var element = args[0],
            index = findCollectionIndex(collection, element);

        // Found
        if (index !== -1) {
            return collection[index];
        }

        // None found, let's make one then.
        var item = maker.apply(null, args);
        collection.push(item);
        return item;
    };

    collection.removeItem = function (element) {
        var index = findCollectionIndex(collection, element),
            item = collection[index];

        if (!item) {
            return;
        }

        // Call .dispose() if it exists
        if (typeof item.dispose === "function") {
            item.dispose();
        }

        // Remove item
        collection.splice(index, 1);
    };

    return collection;
};

},{}],5:[function(require,module,exports){
"use strict";

module.exports = {
    VALID: "valid",
    INVALID: "invalid",
    UNCHECKED: "unchecked",

    classes: {
        successClass: "nod-success",
        successMessageClass: "nod-success-message",
        errorClass: "nod-error",
        errorMessageClass: "nod-error-message"
    },

    Regex: {
        INTEGER: /^\s*\d+\s*$/,
        FLOAT: /^[-+]?[0-9]+(\.[0-9]+)?$/,
        // RFC822
        EMAIL: /^([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22))*\x40([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d))*$/
    }
};

},{}],6:[function(require,module,exports){
"use strict";

var util = require("./util"),
    constants = require("./constants");

/**
 * domNodeFactory
 *
 * This creates the error/success message behind the input element, as well
 * as takes care of updating classes and taking care of its own state.
 *
 * The dom node is owned by checkHandler, and has a one to one
 * relationship with both the checkHandler and the input element
 * being checked.
 *
 */
module.exports = function (element, mediator, configuration) {
    // A 'domNode' consists of two elements: a 'parent', and a 'span'. The
    // parent is given as a paremeter, while the span is created and added
    // as a child to the parent.
    var parent = util.getParent(element, configuration),
        _status = constants.UNCHECKED,
        pendingUpdate = null,
        span = document.createElement("span"),
        customSpan = false;

    span.style.display = "none";

    if (!configuration.noDom) {
        parent.appendChild(span);
    }

    // Updates the class of the parent to match the status of the element.
    var updateParent = function (status) {
        var successClass = configuration.successClass || constants.classes.successClass,
            errorClass = configuration.errorClass || constants.classes.errorClass;

        switch (status) {
            case constants.VALID:
                util.removeClass(errorClass, parent);
                util.addClass(successClass, parent);
                break;
            case constants.INVALID:
                util.removeClass(successClass, parent);
                util.addClass(errorClass, parent);
                break;
        }
    };

    // Updates the text and class according to the status.
    var updateSpan = function (status, errorMessage) {
        var successMessageClass = configuration.successMessageClass || constants.classes.successMessageClass,
            errorMessageClass = configuration.errorMessageClass || constants.classes.errorMessageClass;

        span.style.display = "none";

        switch (status) {
            case constants.VALID:
                util.removeClass(errorMessageClass, span);
                util.addClass(successMessageClass, span);
                if (configuration.successMessage) {
                    span.textContent = configuration.successMessage;
                    span.style.display = "";
                }
                break;
            case constants.INVALID:
                util.removeClass(successMessageClass, span);
                util.addClass(errorMessageClass, span);
                span.textContent = errorMessage;
                span.style.display = "";
                break;
        }
    };

    var set = function (options) {
        var status = options.result,
            errorMessage = options.errorMessage;

        // If the dom is showing an invalid message, we want to update the
        // dom right away.
        if (_status === constants.INVALID || configuration.delay === 0) {

            _status = status;
            updateParent(status);
            updateSpan(status, errorMessage);
        } else {

            // If the dom shows either an unchecked or a valid state
            // we won't rush to tell them they are wrong. Instead
            // we use a method similar to "debouncing" the update
            clearTimeout(pendingUpdate);

            pendingUpdate = setTimeout(function () {

                _status = status;
                updateParent(status);
                updateSpan(status, errorMessage);

                pendingUpdate = null;
            }, configuration.delay || 700);
        }
    };

    var subscribeTo = function (id) {
        return mediator.subscribe(id, set);
    };

    var setMessageOptions = function (parentContainer, message) {
        if (parentContainer) {
            parent = util.getElement(parentContainer);
        }

        if (message) {
            span.parentNode.removeChild(span); // Remove old span.
            span = util.getElement(message); // Set the new one.
            customSpan = true; // So we won't delete it.
        }
    };

    var dispose = function () {
        // First remove any classes
        util.removeClass(configuration.errorClass || constants.classes.errorClass, parent);
        util.removeClass(configuration.successClass || constants.classes.successClass, parent);

        // Then we remove the span if it wasn't one that was set by the user.
        if (!customSpan) {
            span.parentNode.removeChild(span);
        }
    };

    return { subscribeTo: subscribeTo, element: element, setMessageOptions: setMessageOptions, dispose: dispose };
};

},{"./constants":5,"./util":12}],7:[function(require,module,exports){
"use strict";

var emit = function (options) {
    return options.element.dispatchEvent(new CustomEvent("nod.validation", { detail: options }));
};

module.exports = function (mediator) {

    return {
        subscribe: function (id) {
            return mediator.subscribe(id, emit);
        }
    };
};

},{}],8:[function(require,module,exports){
"use strict";

var checkFunctions = require("./checkFunctions");

module.exports = function (metric) {
    if (typeof metric.validate === "function") {
        return metric.validate;
    }

    if (metric.validate instanceof RegExp) {
        return checkFunctions.regexp(metric.validate);
    }

    var args = metric.validate.split(":"),
        fnName = args.shift();

    if (fnName === "one-of" || fnName === "only-one-of" || fnName === "same-as" || fnName === "some-radio") {

        args.push(metric.selector);
    }

    if (typeof checkFunctions[fnName] === "function") {
        return checkFunctions[fnName].apply(null, args);
    } else {
        throw "Couldn't find your validator function \"" + fnName + "\" for \"" + metric.selector + "\"";
    }
};

},{"./checkFunctions":1}],9:[function(require,module,exports){
/**
 *
 *
 * nod v.2.0.5
 * Gorm Casper
 *
 *
 *
 * This is a short breakdown of the code to help you find your way around.
 *
 *
 * An `element` always refer to some input element defined by the user via the
 * `selector` key.
 *
 * A `metric` is the user created objects that is used to add checks to
 * nod.
 *
 * Each `element` will have at most one of a `listener`, a `checker`, a
 * `checkHandler`, and a `domNode` "attached" to it. The `listener` listens
 * for inputs or changes to the `element` and passes the new value on to to the
 * `checker` which performs its checks and passes the the results on to the
 * `checkHandler` which calculates the new state of the `element` which it
 * passes on to the `domNode` which will update the dom.
 *
 * The four main parts, the listener, the checker, the checkHandler, and the
 * domNode all communicate through the `mediator` by firing events identified
 * by a unique id. They do not know of each other's existance, and so no
 * communication flows directly between them.
 *
 * All listeners, checkers, handlers, and domNodes are grouped together in
 * `collections`, which are basically a glorified array that makes it easy
 * not to get duplicate items for each element (for instance two listeners
 * listening to the same element).
 *
 * The communication flow looks like this:
 * listener -> checker -> checkHandler -> domNode
 *
 * Between each part, you have the mediator.
 *
 *
 * `Metrics` are added by the user, which sets up the system above. Notice
 * that a metric can target multiple elements at once, and that there can
 * be overlaps. One metric definitely does not equal one element or one
 * check.
 *
 */

"use strict";

var util = require("./util"),
    constants = require("./constants"),
    mediatorFactory = require("./mediatorFactory"),
    emitterFactory = require("./emitterFactory"),
    collectionFactory = require("./collectionFactory"),
    listenerFactory = require("./listenerFactory"),
    checkerFactory = require("./checkerFactory"),
    checkHandlerFactory = require("./checkHandlerFactory"),
    domNodeFactory = require("./domNodeFactory"),
    checkFunctions = require("./checkFunctions"),
    getCheckFunction = require("./getCheckFunction");

function nod(config) {
    var form,
        configuration = {},
        mediator = mediatorFactory(),
        emitter = emitterFactory(mediator),

    // Creating (empty) collections
    listeners = collectionFactory(listenerFactory),
        checkers = collectionFactory(checkerFactory),
        checkHandlers = collectionFactory(checkHandlerFactory),
        domNodes = collectionFactory(domNodeFactory);

    /**
     * Entry point for the user. The user passes in an array of metrics (an
     * object containing a selector, a validate string/function, etc.) and it
     * gets processed from here.
     *
     * This function, is mostly about cleaning up what the user passed us.
     */
    function addMetrics(metrics) {
        // Make sure we are dealing with an array of metrics.
        var arrayMetrics = Array.isArray(metrics) ? metrics : [metrics];

        arrayMetrics.forEach(function (metric) {
            var validateArray, errorMessageArray;

            // If the 'validate' is not an array, then we're good to go.
            if (!Array.isArray(metric.validate)) {
                addMetric(metric);

                // If it is an array (e.g., validate: ['email', 'max-length:10']),
                // then we need to split them up into multiple metrics, and add
                // them individually.
            } else {
                if (!Array.isArray(metric.errorMessage)) {
                    throw "If you pass in `validate:...` as an array, then `errorMessage:...` also needs to be an array. \"" + metric.validate + "\", and \"" + metric.errorMessage + "\"";
                }

                // We store each as arrays, and then run through them,
                // overwriting each of the keys accordingly.
                validateArray = metric.validate;
                errorMessageArray = metric.errorMessage;

                validateArray.forEach(function (validate, i) {
                    // Overwrite the array with the individual 'validate' and
                    // 'errorMessage'.
                    metric.validate = validate;
                    metric.errorMessage = errorMessageArray[i];

                    addMetric(metric);
                });
            }
        });
    }

    function addMetric(metric) {
        var specialTriggers = [],

        // The function that will check the value of the element.
        checkFunction = getCheckFunction(metric),

        // A list of elements that this metric will target.
        elements = util.getElements(metric.selector),

        // A "set" here, refers to an obj with one listener, one checker,
        // and one checkHandler. Only every one for each element in the
        // dom.
        metricSets = elements.map(function (element) {
            return {
                listener: listeners.findOrMake(element, mediator, metric.triggerEvents, configuration),
                checker: checkers.findOrMake(element, mediator),
                checkHandler: checkHandlers.findOrMake(element, mediator, configuration),
                domNode: domNodes.findOrMake(element, mediator, configuration)
            };
        });

        // Saved for later reference in case the user has a `tap` function
        // defined.
        checkFunction.validate = typeof metric.validate === "function" ? metric.validate.toString() : metric.validate;

        // Special cases. These `validates` affect each other, and their state
        // needs to update each time either of the elements' values change.
        if (metric.validate === "one-of" || metric.validate === "only-one-of" || metric.validate === "some-radio") {
            specialTriggers.push(metric.selector);
        }

        if (typeof metric.validate === "string" && metric.validate.indexOf("same-as") > -1) {
            specialTriggers.push(metric.validate.split(":")[1]);
        }

        // Helper function, used in the loop below.
        function subscribeToTriggers(checker, selector) {
            var triggerElements = util.getElements(selector);

            triggerElements.forEach(function (element) {
                var listener = listeners.findOrMake(element, mediator, null, configuration);

                checker.subscribeTo(listener.id);
            });
        }

        // Here we set up the "connections" between each of our main parts.
        // They communicate only through the mediator.
        metricSets.forEach(function (metricSet) {

            // :: Listener -> Checker

            // We want our checker to listen to the listener. A listener has an
            // id, which it uses when it fires events to the mediator (which
            // was set up when the listener was created).
            metricSet.checker.subscribeTo(metricSet.listener.id);

            // If the user set a `triggeredBy`, the checker need to listen to
            // changes on this element as well.
            // Same goes for special triggers that we set.
            subscribeToTriggers(metricSet.checker, metric.triggeredBy);
            subscribeToTriggers(metricSet.checker, specialTriggers);

            // :: Checker -> checkHandler

            var checkId = util.unique();

            // We add the check function as one to be checked when the user
            // inputs something. (There might be more than this one).
            metricSet.checker.addCheck(checkFunction, checkId);

            // We want the check handler to listen for results from the checker
            metricSet.checkHandler.subscribeTo(checkId, metric.errorMessage, metric.defaultStatus);

            if (configuration.noDom) {
                emitter.subscribe(metricSet.checkHandler.id);
            } else {
                // :: checkHandler -> domNode

                // The checkHandler has its own id (and only ever needs one), so we
                // just ask the domNode to listen for that.
                metricSet.domNode.subscribeTo(metricSet.checkHandler.id);
            }
        });

        // After all is done, we may have to enable/disable a submit button.
        toggleSubmit();
    }

    /**
     * If a form is added, we listen for submits, and if the has also set
     * `preventSubmit` in the configuration, then we stop the commit from
     * happening unless all the elements are valid.
     */
    function addForm(selector) {
        var form = util.getElement(selector);

        form.addEventListener("submit", possiblePreventSubmit, false);
    }

    // Prevent function, used above
    function possiblePreventSubmit(event) {
        if (configuration.preventSubmit && !areAll(constants.VALID)) {
            event.preventDefault();

            // Show errors to the user
            checkers.forEach(function (checker) {
                checker.performCheck({
                    event: event
                });
            });

            // Focus on the first invalid element
            for (var i = 0, len = checkHandlers.length; i < len; i++) {
                var checkHandler = checkHandlers[i];

                if (checkHandler.getStatus().status === constants.INVALID) {
                    checkHandler.element.focus();
                    break;
                }
            }
        }
    }

    /**
     * Removes elements completely.
     */
    function removeElement(selector) {
        var elements = util.getElements(selector);

        elements.forEach(function (element) {
            listeners.removeItem(element);
            checkers.removeItem(element);
            checkHandlers.removeItem(element);
            domNodes.removeItem(element);
        });
    }

    /**
     * configure
     *
     * Changes the configuration object used throughout the code for classes,
     * delays, messages, etc.
     *
     * It can either be called with a key/value pair (two arguments), or with
     * an object with key/value pairs.
     */
    function configure(attributes, value) {
        if (arguments.length > 1) {
            var k = attributes;
            attributes = {};

            attributes[k] = value;
        }

        for (var key in attributes) {
            configuration[key] = attributes[key];
        }

        if (attributes.submit || attributes.disableSubmit) {
            toggleSubmit();
        }

        if (attributes.form) {
            addForm(attributes.form);
        }
    }

    /**
     * toggleSubmit
     *
     * Toggles the submit button (enabled if every element is valid, otherwise
     * disabled).
     */
    function toggleSubmit() {
        if (configuration.submit && configuration.disableSubmit) {
            util.getElement(configuration.submit).disabled = !areAll(constants.VALID);
        }
    }

    /*
     * Listen to all checks, and if the user has set in the configuration to
     * enable/disabled the submit button, we do that.
     */
    mediator.subscribe("all", toggleSubmit);

    function areAll(status) {
        for (var i = 0, len = checkHandlers.length; i < len; i++) {
            if (checkHandlers[i].getStatus().status !== status) {
                return false;
            }
        }

        return true;
    }

    function setMessageOptions(options) {
        var elements = util.getElements(options.selector);

        elements.forEach(function (element) {
            var domNode = domNodes.findOrMake(element);

            domNode.setMessageOptions(options.parent, options.errorSpan);
        });
    }

    /**
     * Listen to all checks and allow the user to listen in, if he set a `tap`
     * function in the configuration.
     */
    mediator.subscribe("all", function (options) {
        if (typeof configuration.tap === "function" && options.type === "check") {
            configuration.tap(options);
        }
    });

    function getStatus(selector, showErrorMessage) {
        var element = util.getElement(selector),
            status = checkHandlers.findOrMake(element).getStatus();

        return showErrorMessage ? status : status.status;
    }

    function performCheck(selector) {
        var cs = selector ? util.getElements(selector).map(checkers.findOrMake) : checkers;

        cs.forEach(function (checker) {
            checker.performCheck();
        });
    }

    /**
     * Internal functions that are exposed to the public.
     */
    var nodInstace = {
        add: addMetrics,
        remove: removeElement,
        areAll: areAll,
        getStatus: getStatus,
        configure: configure,
        setMessageOptions: setMessageOptions,
        performCheck: performCheck
    };

    if (config) {
        nodInstace.configure(config);
    }

    return nodInstace;
}

// Backwards compatibility
nod.constants = constants;
nod.classes = constants.classes;
nod.checkFunctions = checkFunctions;

module.exports = nod;

window.nod = nod;

},{"./checkFunctions":1,"./checkHandlerFactory":2,"./checkerFactory":3,"./collectionFactory":4,"./constants":5,"./domNodeFactory":6,"./emitterFactory":7,"./getCheckFunction":8,"./listenerFactory":10,"./mediatorFactory":11,"./util":12}],10:[function(require,module,exports){
"use strict";

var util = require("./util");

/**
 * makeListener
 *
 * Takes care of listening to changes to its element and fire them off as
 * events on the mediator for checkers to listen to.
 */
module.exports = function (element, mediator, triggerEvents, configuration) {
    var id = util.unique(),
        changed = function (event) {
        return mediator.fire({ id: id, event: event, type: "change" });
    };

    var $element = undefined;

    element.addEventListener("input", changed, false);
    element.addEventListener("change", changed, false);
    element.addEventListener("blur", changed, false);

    if (configuration.jQuery) {
        $element = configuration.jQuery(element);

        $element.on("propertychange change click keyup input paste", changed);
    }

    if (triggerEvents) {
        triggerEvents = Array.isArray(triggerEvents) ? triggerEvents : [triggerEvents];

        triggerEvents.forEach(function (eventName) {
            return element.addEventListener(eventName, changed, false);
        });
    }

    var dispose = function () {
        element.removeEventListener("input", changed, false);
        element.removeEventListener("change", changed, false);
        element.removeEventListener("blur", changed, false);

        if ($element) {
            $element.off();
        }

        if (triggerEvents) {
            triggerEvents.forEach(function (eventName) {
                return element.removeEventListener(eventName, changed, false);
            });
        }
    };

    return { element: element, dispose: dispose, id: id };
};

},{"./util":12}],11:[function(require,module,exports){
/**
 * mediatorFactory
 *
 * Minimal implementation of a mediator pattern, used for communication
 * between checkers and checkHandlers (checkers fires events which
 * handlers can subscribe to). Unique ID's are used to tell events apart.
 *
 * Subscribing to 'all' will give you all results from all checks.
 */
"use strict";

module.exports = function () {
    var subscribers = [],
        all = [];

    return {
        subscribe: function (id, fn) {
            if (id === "all") {
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

        fire: function (options) {
            return subscribers[options.id].concat(all).forEach(function (fn) {
                return fn(options);
            });
        }
    };
};

},{}],12:[function(require,module,exports){
"use strict";

var identity = function (x) {
    return x;
};

/**
 * getElements
 *
 * Takes some sort of selector, and returns an array of element(s). The applied
 * selector can be one of:
 *
 * - Css type selector (e.g., ".foo")
 * - A jQuery element (e.g., $('.foo))
 * - A single raw dom element (e.g., document.getElementById('foo'))
 * - A list of raw dom element (e.g., $('.foo').get())
 */
var getElements = function (selector) {
    if (!selector) {
        return [];
    }

    // Normal css type selector is assumed
    if (typeof selector === "string") {
        // If we have jQuery, then we use that to create a dom list for us.
        if (window.jQuery) {
            return window.jQuery(selector).get();
        }

        // If not, then we do it the manual way.
        var nodeList = document.querySelectorAll(selector);

        return [].map.call(nodeList, identity);
    }

    // if user gave us jQuery elements
    if (selector.jquery) {
        return selector.get();
    }

    // Raw DOM element
    if (selector.nodeType === 1) {
        return [selector];
    }

    if (Array.isArray(selector)) {
        var result = [];

        selector.forEach(function (sel) {
            return result = result.concat(getElements(sel));
        });

        return result;
    }

    throw "Unknown type of elements in your `selector`: " + selector;
};

/**
 * getElement
 *
 * Returns the first element targeted by the selector. (see `getElements`)
 */
var getElement = function (selector) {
    return getElements(selector)[0];
};

// Helper functions for `makeDomNode`.
var hasClass = function (className, el) {
    if (el.classList) {
        return el.classList.contains(className);
    } else {
        return !!el.className.match(new RegExp("(\\s|^)" + className + "(\\s|$)"));
    }
};

var removeClass = function (className, el) {
    if (el.classList) {
        el.classList.remove(className);
    } else if (hasClass(className, el)) {
        el.className = el.className.replace(new RegExp("(?:^|\\s)" + className + "(?!\\S)"), "");
    }
};

var addClass = function (className, el) {
    if (el.classList) {
        el.classList.add(className);
    } else if (!hasClass(className, el)) {
        el.className += " " + className;
    }
};

var findParentWithClass = function (parent, klass) {
    // Guard (only the `window` does not have a parent).
    if (!parent.parentNode) {
        return parent;
    }

    // Found it
    if (hasClass(klass, parent)) {
        return parent;
    }

    // Try next parent (recursion)
    return findParentWithClass(parent.parentNode, klass);
};

var getParent = function (element, configuration) {
    var klass = configuration.parentClass;

    if (!klass) {
        return element.parentNode;
    } else {
        klass = klass.charAt(0) === "." ? klass.slice(1) : klass;

        return findParentWithClass(element.parentNode, klass);
    }
};

// Helper function to create unique id's
var unique = (function () {
    var uniqueCounter = 0;

    return function () {
        return uniqueCounter++;
    };
})();

var or = function (x, y) {
    return x || y;
};

module.exports = {
    getElements: getElements,
    getElement: getElement,
    getParent: getParent,
    hasClass: hasClass,
    addClass: addClass,
    removeClass: removeClass,
    unique: unique,
    or: or
};

},{}]},{},[9])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvZy9jb2RlL25vZF9wcm9qZWN0L25vZC9zcmMvY2hlY2tGdW5jdGlvbnMuanMiLCIvVXNlcnMvZy9jb2RlL25vZF9wcm9qZWN0L25vZC9zcmMvY2hlY2tIYW5kbGVyRmFjdG9yeS5qcyIsIi9Vc2Vycy9nL2NvZGUvbm9kX3Byb2plY3Qvbm9kL3NyYy9jaGVja2VyRmFjdG9yeS5qcyIsIi9Vc2Vycy9nL2NvZGUvbm9kX3Byb2plY3Qvbm9kL3NyYy9jb2xsZWN0aW9uRmFjdG9yeS5qcyIsIi9Vc2Vycy9nL2NvZGUvbm9kX3Byb2plY3Qvbm9kL3NyYy9jb25zdGFudHMuanMiLCIvVXNlcnMvZy9jb2RlL25vZF9wcm9qZWN0L25vZC9zcmMvZG9tTm9kZUZhY3RvcnkuanMiLCIvVXNlcnMvZy9jb2RlL25vZF9wcm9qZWN0L25vZC9zcmMvZW1pdHRlckZhY3RvcnkuanMiLCIvVXNlcnMvZy9jb2RlL25vZF9wcm9qZWN0L25vZC9zcmMvZ2V0Q2hlY2tGdW5jdGlvbi5qcyIsIi9Vc2Vycy9nL2NvZGUvbm9kX3Byb2plY3Qvbm9kL3NyYy9pbmRleC5qcyIsIi9Vc2Vycy9nL2NvZGUvbm9kX3Byb2plY3Qvbm9kL3NyYy9saXN0ZW5lckZhY3RvcnkuanMiLCIvVXNlcnMvZy9jb2RlL25vZF9wcm9qZWN0L25vZC9zcmMvbWVkaWF0b3JGYWN0b3J5LmpzIiwiL1VzZXJzL2cvY29kZS9ub2RfcHJvamVjdC9ub2Qvc3JjL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztBQ0FBLElBQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUM7SUFDeEIsU0FBUyxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQzs7O0FBR3pDLE1BQU0sQ0FBQyxPQUFPLEdBQUc7QUFDYixjQUFZO2VBQ1IsVUFBQyxRQUFRLEVBQUUsS0FBSztt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QztLQUNqQjs7O0FBR0QsV0FBTyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDO0NBQ3hELENBQUM7O0FBRUYsSUFBTSxTQUFTLEdBQUcsVUFBQyxPQUFPLEVBQUUsYUFBYSxFQUFLO0FBQzFDLFFBQUksS0FBSyxHQUFHLGFBQWEsQ0FBQyxXQUFXLENBQUM7O0FBRXRDLFFBQUksQ0FBQyxLQUFLLEVBQUU7QUFDUixlQUFPLE9BQU8sQ0FBQyxVQUFVLENBQUM7S0FDN0IsTUFBTTtBQUNILGFBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQzs7QUFFekQsZUFBTyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDO0tBQ3pEO0NBQ0osQ0FBQzs7O0FBSUYsSUFBTSxNQUFNLEdBQUcsQ0FBQyxZQUFZO0FBQ3hCLFFBQUksYUFBYSxHQUFHLENBQUMsQ0FBQzs7QUFFdEIsV0FBTyxZQUFZO0FBQ2YsZUFBTyxhQUFhLEVBQUUsQ0FBQztLQUMxQixDQUFDO0NBQ0wsQ0FBQSxFQUFHLENBQUM7O0FBR0wsSUFBTSxFQUFFLEdBQUcsVUFBQyxDQUFDLEVBQUUsQ0FBQztXQUFLLENBQUMsSUFBSSxDQUFDO0NBQUEsQ0FBQzs7QUFJNUIsTUFBTSxDQUFDLE9BQU8sR0FBRztBQUNiLGVBQVcsRUFBWCxXQUFXO0FBQ1gsY0FBVSxFQUFWLFVBQVU7QUFDVixhQUFTLEVBQVQsU0FBUztBQUNULFlBQVEsRUFBUixRQUFRO0FBQ1IsWUFBUSxFQUFSLFFBQVE7QUFDUixlQUFXLEVBQVgsV0FBVztBQUNYLFVBQU0sRUFBTixNQUFNO0FBQ04sTUFBRSxFQUFGLEVBQUU7Q0FDTCxDQUFDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImNvbnN0IHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKSxcbiAgICAgIGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5cbi8vIENvbGxlY3Rpb24gb2YgYnVpbHQtaW4gY2hlY2sgZnVuY3Rpb25zXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICAncHJlc2VuY2UnOiAoKSA9PlxuICAgICAgICAoY2FsbGJhY2ssIHZhbHVlKSA9PlxuICAgICAgICAgICAgY2FsbGJhY2sodmFsdWUubGVuZ3RoID4gMCksXG5cbiAgICAnZXhhY3QnOiBleGFjdFZhbHVlID0+XG4gICAgICAgIChjYWxsYmFjaywgdmFsdWUpID0+XG4gICAgICAgICAgICBjYWxsYmFjayh2YWx1ZSA9PT0gZXhhY3RWYWx1ZSksXG5cbiAgICAnY29udGFpbnMnOiBjb250YWluc1ZhbHVlID0+XG4gICAgICAgIChjYWxsYmFjaywgdmFsdWUpID0+XG4gICAgICAgICAgICBjYWxsYmFjayh2YWx1ZS5pbmRleE9mKGNvbnRhaW5zVmFsdWUpID4gLTEpLFxuXG4gICAgJ25vdCc6IGV4YWN0VmFsdWUgPT5cbiAgICAgICAgKGNhbGxiYWNrLCB2YWx1ZSkgPT5cbiAgICAgICAgICAgIGNhbGxiYWNrKHZhbHVlICE9PSBleGFjdFZhbHVlKSxcblxuICAgICdtaW4tbGVuZ3RoJzogbWluaW11bUxlbmd0aCA9PlxuICAgICAgICAoY2FsbGJhY2ssIHZhbHVlKSA9PlxuICAgICAgICAgICAgY2FsbGJhY2sodmFsdWUubGVuZ3RoID49IG1pbmltdW1MZW5ndGgpLFxuXG4gICAgJ21heC1sZW5ndGgnOiBtYXhpbXVtTGVuZ3RoID0+XG4gICAgICAgIChjYWxsYmFjaywgdmFsdWUpID0+XG4gICAgICAgICAgICBjYWxsYmFjayh2YWx1ZS5sZW5ndGggPD0gbWF4aW11bUxlbmd0aCksXG5cbiAgICAnZXhhY3QtbGVuZ3RoJzogZXhhY3RMZW4gPT5cbiAgICAgICAgKGNhbGxiYWNrLCB2YWx1ZSkgPT5cbiAgICAgICAgICAgIGNhbGxiYWNrKHZhbHVlLmxlbmd0aCA9PT0gK2V4YWN0TGVuKSxcblxuICAgICdiZXR3ZWVuLWxlbmd0aCc6IChtaW5pbXVtTGVuZ3RoLCBtYXhpbXVtTGVuZ3RoKSA9PlxuICAgICAgICAoY2FsbGJhY2ssIHZhbHVlKSA9PlxuICAgICAgICAgICAgY2FsbGJhY2sodmFsdWUubGVuZ3RoID49IG1pbmltdW1MZW5ndGggJiYgdmFsdWUubGVuZ3RoIDw9IG1heGltdW1MZW5ndGgpLFxuXG4gICAgJ21heC1udW1iZXInOiBtYXhpbXVtTnVtYmVyID0+XG4gICAgICAgIChjYWxsYmFjaywgdmFsdWUpID0+XG4gICAgICAgICAgICBjYWxsYmFjaygrdmFsdWUgPD0gbWF4aW11bU51bWJlciksXG5cbiAgICAnbWluLW51bWJlcic6IG1pbmltdW1OdW1iZXIgPT5cbiAgICAgICAgKGNhbGxiYWNrLCB2YWx1ZSkgPT5cbiAgICAgICAgICAgIGNhbGxiYWNrKCt2YWx1ZSA8PSBtaW5pbXVtTnVtYmVyKSxcblxuICAgICdiZXR3ZWVuLW51bWJlcic6IChtaW5pbXVtTnVtYmVyLCBtYXhpbXVtTnVtYmVyKSA9PlxuICAgICAgICAoY2FsbGJhY2ssIHZhbHVlKSA9PlxuICAgICAgICAgICAgY2FsbGJhY2soK3ZhbHVlID49IG1pbmltdW1OdW1iZXIgJiYgK3ZhbHVlIDw9IG1heGltdW1OdW1iZXIpLFxuXG4gICAgJ2ludGVnZXInOiAoKSA9PlxuICAgICAgICAoY2FsbGJhY2ssIHZhbHVlKSA9PlxuICAgICAgICAgICAgY2FsbGJhY2soY29uc3RhbnRzLlJlZ2V4LklOVEVHRVIudGVzdCh2YWx1ZSkpLFxuXG4gICAgJ2Zsb2F0JzogKCkgPT5cbiAgICAgICAgKGNhbGxiYWNrLCB2YWx1ZSkgPT5cbiAgICAgICAgICAgIGNhbGxiYWNrKGNvbnN0YW50cy5SZWdleC5GTE9BVC50ZXN0KHZhbHVlKSksXG5cbiAgICAnc2FtZS1hcyc6IHNlbGVjdG9yID0+IHtcbiAgICAgICAgY29uc3Qgc2FtZUFzRWxlbWVudCA9IHV0aWwuZ2V0RWxlbWVudChzZWxlY3Rvcik7XG5cbiAgICAgICAgcmV0dXJuIChjYWxsYmFjaywgdmFsdWUsIG9wdGlvbnMpID0+IHtcbiAgICAgICAgICAgIC8vICdzYW1lLWFzJyBpcyBzcGVjaWFsLCBpbiB0aGF0IGlmIGl0IGlzIHRyaWdnZXJlZCBieSBhbm90aGVyXG4gICAgICAgICAgICAvLyBmaWVsZCAodGhlIG9uZSBpdCBzaG91bGQgYmUgc2ltaWxhciB0byksIGFuZCB0aGUgZmllbGQgaXRzZWxmIGlzXG4gICAgICAgICAgICAvLyBlbXB0eSwgdGhlbiBpdCBiYWlscyBvdXQgd2l0aG91dCBhIGNoZWNrLiBUaGlzIGlzIHRvIGF2b2lkXG4gICAgICAgICAgICAvLyBzaG93aW5nIGFuIGVycm9yIG1lc3NhZ2UgYmVmb3JlIHRoZSB1c2VyIGhhcyBldmVuIHJlYWNoZWQgdGhlXG4gICAgICAgICAgICAvLyBlbGVtZW50LlxuICAgICAgICAgICAgaWYgKCAgICBvcHRpb25zICYmXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMuZXZlbnQgJiZcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5ldmVudC50YXJnZXQgJiZcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5ldmVudC50YXJnZXQgIT09IG9wdGlvbnMuZWxlbWVudCAmJlxuICAgICAgICAgICAgICAgICAgICB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNhbGxiYWNrKHZhbHVlID09PSBzYW1lQXNFbGVtZW50LnZhbHVlKTtcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgJ29uZS1vZic6IHNlbGVjdG9yID0+IHtcbiAgICAgICAgY29uc3QgZWxlbWVudHMgPSB1dGlsLmdldEVsZW1lbnRzKHNlbGVjdG9yKTtcblxuICAgICAgICByZXR1cm4gY2FsbGJhY2sgPT5cbiAgICAgICAgICAgIGVsZW1lbnRzLmZpbHRlcihlbCA9PiBlbC52YWx1ZSkubGVuZ3RoO1xuICAgIH0sXG5cbiAgICAnb25seS1vbmUtb2YnOiBzZWxlY3RvciA9PiB7XG4gICAgICAgIGNvbnN0IGVsZW1lbnRzID0gdXRpbC5nZXRFbGVtZW50cyhzZWxlY3Rvcik7XG5cbiAgICAgICAgcmV0dXJuIChjYWxsYmFjaywgdmFsdWUpID0+XG4gICAgICAgICAgICBjYWxsYmFjayhlbGVtZW50cy5maWx0ZXIoZWwgPT4gZWwudmFsdWUpLmxlbmd0aCA9PT0gMSk7XG4gICAgfSxcblxuICAgICdjaGVja2VkJzogKCkgPT5cbiAgICAgICAgKGNhbGxiYWNrLCB2YWx1ZSwgb3B0aW9ucykgPT5cbiAgICAgICAgICAgIGNhbGxiYWNrKG9wdGlvbnMuZWxlbWVudC5jaGVja2VkKSxcblxuICAgICdzb21lLXJhZGlvJzogc2VsZWN0b3IgPT4ge1xuICAgICAgICBjb25zdCByYWRpb0VsZW1lbnRzID0gdXRpbC5nZXRFbGVtZW50cyhzZWxlY3Rvcik7XG5cbiAgICAgICAgcmV0dXJuIChjYWxsYmFjaywgdmFsdWUsIG9wdGlvbnMpID0+XG4gICAgICAgICAgICBjYWxsYmFjayhyYWRpb0VsZW1lbnRzLm1hcChlbCA9PiBlbC5jaGVja2VkKS5yZWR1Y2UodXRpbC5vcikpO1xuICAgIH0sXG5cbiAgICAncmVnZXhwJzogcmVnID0+XG4gICAgICAgIChjYWxsYmFjaywgdmFsdWUpID0+XG4gICAgICAgICAgICBjYWxsYmFjayhyZWcudGVzdCh2YWx1ZSkpLFxuXG4gICAgJ2VtYWlsJzogKCkgPT5cbiAgICAgICAgKGNhbGxiYWNrLCB2YWx1ZSkgPT5cbiAgICAgICAgICAgIGNhbGxiYWNrKGNvbnN0YW50cy5SZWdleC5FTUFJTC50ZXN0KHZhbHVlKSlcbn07XG4iLCJjb25zdCB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyksXG4gICAgICBjb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpO1xuXG5cbi8qKlxuICogY2hlY2tIYW5kbGVyRmFjdG9yeVxuICpcbiAqIEhhbmRsZXMgY2hlY2tzIGNvbWluZyBpbiBmcm9tIHRoZSBtZWRpYXRvciBhbmQgdGFrZXMgY2FyZSBvZiBjYWxjdWxhdGluZ1xuICogdGhlIHN0YXRlIGFuZCBlcnJvciBtZXNzYWdlcy5cbiAqXG4gKiBUaGUgY2hlY2tIYW5kbGVycyBsaXZlcyBpbiBvbmUgdG8gb25lIHdpdGggdGhlIGVsZW1lbnQgcGFyc2VkIGluLFxuICogYW5kIGxpc3RlbnMgZm9yICh1c3VhbGx5KSBtdWx0aXBsZSBlcnJvciBjaGVja3MuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGVsZW1lbnQsIG1lZGlhdG9yLCBjb25maWd1cmF0aW9uKSB7XG4gICAgdmFyIHJlc3VsdHMgICAgID0ge30sXG4gICAgICAgIGlkICAgICAgICAgID0gdXRpbC51bmlxdWUoKTtcblxuICAgIGZ1bmN0aW9uIHN1YnNjcmliZVRvIChpZCwgZXJyb3JNZXNzYWdlLCBkZWZhdWx0U3RhdHVzKSB7XG4gICAgICAgIC8vIENyZWF0ZSBhIHJlcHJlc2VudGF0aW9uIG9mIHRoZSB0eXBlIG9mIGVycm9yIGluIHRoZSByZXN1bHRzXG4gICAgICAgIC8vIG9iamVjdC5cbiAgICAgICAgaWYgKCFyZXN1bHRzW2lkXSkge1xuICAgICAgICAgICAgcmVzdWx0c1tpZF0gPSB7XG4gICAgICAgICAgICAgICAgc3RhdHVzOiBkZWZhdWx0U3RhdHVzIHx8IGNvbnN0YW50cy5VTkNIRUNLRUQsXG4gICAgICAgICAgICAgICAgZXJyb3JNZXNzYWdlOiBlcnJvck1lc3NhZ2VcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTdWJzY3JpYmUgdG8gZXJyb3IgaWQuXG4gICAgICAgIG1lZGlhdG9yLnN1YnNjcmliZShpZCwgY2hlY2tIYW5kbGVyKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjaGVja0hhbmRsZXIgKHJlc3VsdCkge1xuICAgICAgICByZXN1bHRzW3Jlc3VsdC5pZF0uc3RhdHVzID0gcmVzdWx0LnJlc3VsdCA/IGNvbnN0YW50cy5WQUxJRCA6IGNvbnN0YW50cy5JTlZBTElEO1xuXG4gICAgICAgIG5vdGlmeU1lZGlhdG9yKCk7XG4gICAgfVxuXG4gICAgLy8gUnVucyB0aHJvdWdoIGFsbCByZXN1bHRzIHRvIHNlZSB3aGF0IGtpbmQgb2YgZmVlZGJhY2sgdG8gc2hvdyB0aGVcbiAgICAvLyB1c2VyLlxuICAgIGZ1bmN0aW9uIG5vdGlmeU1lZGlhdG9yICgpIHtcbiAgICAgICAgdmFyIHN0YXR1cyA9IGdldFN0YXR1cygpO1xuXG4gICAgICAgIC8vIEV2ZW50IGlmIG1pZ2h0IGJlIHZhbGlkIHdlIHBhc3MgYWxvbmcgYW4gdW5kZWZpbmVkIGVycm9yTWVzc2FnZS5cbiAgICAgICAgbWVkaWF0b3IuZmlyZSh7XG4gICAgICAgICAgICBpZDogICAgICAgICAgICAgaWQsXG4gICAgICAgICAgICB0eXBlOiAgICAgICAgICAgJ3Jlc3VsdCcsXG4gICAgICAgICAgICByZXN1bHQ6ICAgICAgICAgc3RhdHVzLnN0YXR1cyxcbiAgICAgICAgICAgIGVsZW1lbnQ6ICAgICAgICBlbGVtZW50LFxuICAgICAgICAgICAgZXJyb3JNZXNzYWdlOiAgIHN0YXR1cy5lcnJvck1lc3NhZ2VcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0U3RhdHVzICgpIHtcbiAgICAgICAgdmFyIHN0YXR1cywgZXJyb3JNZXNzYWdlO1xuXG4gICAgICAgIGZvciAodmFyIGlkIGluIHJlc3VsdHMpIHtcbiAgICAgICAgICAgIHN0YXR1cyA9IHJlc3VsdHNbaWRdLnN0YXR1cztcblxuICAgICAgICAgICAgaWYgKHJlc3VsdHNbaWRdLnN0YXR1cyA9PT0gY29uc3RhbnRzLklOVkFMSUQpIHtcbiAgICAgICAgICAgICAgICBlcnJvck1lc3NhZ2UgPSByZXN1bHRzW2lkXS5lcnJvck1lc3NhZ2U7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3RhdHVzOiAgICAgICAgc3RhdHVzLFxuICAgICAgICAgICAgZXJyb3JNZXNzYWdlOiAgZXJyb3JNZXNzYWdlXG4gICAgICAgIH07XG4gICAgfVxuXG5cbiAgICByZXR1cm4ge1xuICAgICAgICBpZDogICAgICAgICAgICAgaWQsXG4gICAgICAgIHN1YnNjcmliZVRvOiAgICBzdWJzY3JpYmVUbyxcbiAgICAgICAgY2hlY2tIYW5kbGVyOiAgIGNoZWNrSGFuZGxlcixcbiAgICAgICAgZ2V0U3RhdHVzOiAgICAgIGdldFN0YXR1cyxcbiAgICAgICAgZWxlbWVudDogICAgICAgIGVsZW1lbnRcbiAgICB9O1xufTtcblxuIiwiLyoqXG4gKiBjaGVja2VyRmFjdG9yeVxuICpcbiAqIEFuIFwiY2hlY2tlclwiIGNvbW11bmljYXRlcyBwcmltYXJpbHkgd2l0aCB0aGUgbWVkaWF0b3IuIEl0IGxpc3RlbnNcbiAqIGZvciBpbnB1dCBjaGFuZ2VzIChjb21pbmcgZnJvbSBsaXN0ZW5lcnMpLCBwZXJmb3JtcyBpdHMgY2hlY2tzXG4gKiBhbmQgZmlyZXMgb2ZmIHJlc3VsdHMgYmFjayB0byB0aGUgbWVkaWF0b3IgZm9yIGNoZWNrSGFuZGxlcnMgdG9cbiAqIGhhbmRsZS5cbiAqXG4gKiBUaGUgY2hlY2tlciBoYXMgYSAxIHRvIDEgcmVsYXRpb25zaGlwIHdpdGggYW4gZWxlbWVudCwgYW5cbiAqIGxpc3RlbmVycywgYW5kIGFuIGNoZWNrSGFuZGxlcjsgYWx0aG91Z2ggdGhleSBtYXlcbiAqIGNvbW11bmljYXRlIHdpdGggb3RoZXIgXCJzZXRzXCIgb2YgbGlzdGVuZXJzLCBjaGVja2VycyBhbmQgaGFuZGxlcnMuXG4gKlxuICogQ2hlY2tzIGFyZSBhZGRlZCwgZnJvbSB0aGUgb3V0c2lkZSwgYW5kIGNvbnNpc3RzIG9mIGEgY2hlY2tGdW5jdGlvbiAoc2VlXG4gKiBub2QuY2hlY2tGdW5jdGlvbnMpIGFuZCBhIHVuaXF1ZSBpZC5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSAoZWxlbWVudCwgbWVkaWF0b3IpID0+IHtcbiAgICBjb25zdCBjaGVja3MgPSBbXSxcblxuICAgICAgICAvLyBSdW4gZXZlcnkgY2hlY2sgZnVuY3Rpb24gYWdhaW5zdCB0aGUgdmFsdWUgb2YgdGhlIGVsZW1lbnQuXG4gICAgICAgIHBlcmZvcm1DaGVjayA9IG9wdGlvbnMgPT5cbiAgICAgICAgICAgIGNoZWNrcy5mb3JFYWNoKGNoZWNrID0+IGNoZWNrKG9wdGlvbnMgfHwge30pKSxcblxuICAgICAgICBzdWJzY3JpYmVUbyA9IGlkID0+XG4gICAgICAgICAgICBtZWRpYXRvci5zdWJzY3JpYmUoaWQsIHBlcmZvcm1DaGVjayksXG5cbiAgICAgICAgLy8gQWRkIGEgY2hlY2sgZnVuY3Rpb24gdG8gdGhlIGVsZW1lbnQuIFRoZSByZXN1bHQgd2lsbCBiZSBoYW5kZWQgb2ZmXG4gICAgICAgIC8vIHRvIHRoZSBtZWRpYXRvciAoZm9yIGNoZWNrSGFuZGxlcnMgdG8gZXZhbHVhdGUpLlxuICAgICAgICBhZGRDaGVjayA9IChjaGVja0Z1bmN0aW9uLCBpZCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY2FsbGJhY2sgPSByZXN1bHQgPT5cbiAgICAgICAgICAgICAgICBtZWRpYXRvci5maXJlKHtcbiAgICAgICAgICAgICAgICAgICAgaWQ6IGlkLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY2hlY2snLFxuICAgICAgICAgICAgICAgICAgICByZXN1bHQ6IHJlc3VsdCxcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudDogZWxlbWVudCxcbiAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGU6IGNoZWNrRnVuY3Rpb24udmFsaWRhdGVcbiAgICAgICAgICAgICAgICB9KTtcblxuXG4gICAgICAgICAgICBjaGVja3MucHVzaChvcHRpb25zID0+IHtcbiAgICAgICAgICAgICAgICAvLyBJZiBlbGVtZW50LnZhbHVlIGlzIHVuZGVmaW5lZCwgdGhlbiB3ZSBtaWdodCBiZSBkZWFsaW5nIHdpdGhcbiAgICAgICAgICAgICAgICAvLyBhbm90aGVyIHR5cGUgb2YgZWxlbWVudDsgbGlrZSA8ZGl2IGNvbnRlbnRlZGl0YWJsZT0ndHJ1ZSc+XG4gICAgICAgICAgICAgICAgdmFyIHZhbHVlID0gZWxlbWVudC52YWx1ZSAhPT0gdW5kZWZpbmVkID8gZWxlbWVudC52YWx1ZSA6IGVsZW1lbnQuaW5uZXJIVE1MO1xuXG4gICAgICAgICAgICAgICAgb3B0aW9ucy5lbGVtZW50ID0gZWxlbWVudDtcblxuICAgICAgICAgICAgICAgIGNoZWNrRnVuY3Rpb24oY2FsbGJhY2ssIHZhbHVlLCBvcHRpb25zKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG5cbiAgICByZXR1cm4ge1xuICAgICAgICBzdWJzY3JpYmVUbyxcbiAgICAgICAgYWRkQ2hlY2ssXG4gICAgICAgIHBlcmZvcm1DaGVjayxcbiAgICAgICAgZWxlbWVudFxuICAgIH07XG59O1xuXG4iLCJjb25zdCBmaW5kQ29sbGVjdGlvbkluZGV4ID0gKGNvbGxlY3Rpb24sIGVsZW1lbnQpID0+IHtcbiAgICBmb3IgKGxldCBpIGluIGNvbGxlY3Rpb24pIHtcbiAgICAgICAgaWYgKGNvbGxlY3Rpb25baV0uZWxlbWVudCA9PT0gZWxlbWVudCkge1xuICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gLTE7XG59O1xuXG5cbi8qKlxuICogY29sbGVjdGlvbkZhY3RvcnlcbiAqXG4gKiBBIG1pbmltYWwgaW1wbGVtZW50YXRpb24gb2YgYSBcImNvbGxlY3Rpb25cIiwgaW5zcGlyZWQgYnkgY29sbGVjdGlvbnMgZnJvbVxuICogQmFja2JvbmVKUy4gVXNlZCBieSBsaXN0ZW5lcnMsIGNoZWNrZXJzLCBhbmQgY2hlY2tIYW5kbGVycy5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBtYWtlciA9PiB7XG4gICAgY29uc3QgY29sbGVjdGlvbiA9IFtdO1xuXG4gICAgY29sbGVjdGlvbi5maW5kT3JNYWtlID0gKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgY29uc3QgZWxlbWVudCA9IGFyZ3NbMF0sXG4gICAgICAgICAgICBpbmRleCA9IGZpbmRDb2xsZWN0aW9uSW5kZXgoY29sbGVjdGlvbiwgZWxlbWVudCk7XG5cbiAgICAgICAgLy8gRm91bmRcbiAgICAgICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgICAgICAgcmV0dXJuIGNvbGxlY3Rpb25baW5kZXhdO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTm9uZSBmb3VuZCwgbGV0J3MgbWFrZSBvbmUgdGhlbi5cbiAgICAgICAgY29uc3QgaXRlbSA9IG1ha2VyLmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgICAgICBjb2xsZWN0aW9uLnB1c2goaXRlbSk7XG4gICAgICAgIHJldHVybiBpdGVtO1xuICAgIH07XG5cbiAgICBjb2xsZWN0aW9uLnJlbW92ZUl0ZW0gPSAoZWxlbWVudCkgPT4ge1xuICAgICAgICBjb25zdCBpbmRleCA9IGZpbmRDb2xsZWN0aW9uSW5kZXgoY29sbGVjdGlvbiwgZWxlbWVudCksXG4gICAgICAgICAgICBpdGVtID0gY29sbGVjdGlvbltpbmRleF07XG5cbiAgICAgICAgaWYgKCFpdGVtKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDYWxsIC5kaXNwb3NlKCkgaWYgaXQgZXhpc3RzXG4gICAgICAgIGlmICh0eXBlb2YgaXRlbS5kaXNwb3NlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBpdGVtLmRpc3Bvc2UoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlbW92ZSBpdGVtXG4gICAgICAgIGNvbGxlY3Rpb24uc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGNvbGxlY3Rpb247XG59O1xuXG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBWQUxJRDogICAgICAgICAgJ3ZhbGlkJyxcbiAgICBJTlZBTElEOiAgICAgICAgJ2ludmFsaWQnLFxuICAgIFVOQ0hFQ0tFRDogICAgICAndW5jaGVja2VkJyxcblxuICAgIGNsYXNzZXM6IHtcbiAgICAgICAgc3VjY2Vzc0NsYXNzOiAgICAgICAgICdub2Qtc3VjY2VzcycsXG4gICAgICAgIHN1Y2Nlc3NNZXNzYWdlQ2xhc3M6ICAnbm9kLXN1Y2Nlc3MtbWVzc2FnZScsXG4gICAgICAgIGVycm9yQ2xhc3M6ICAgICAgICAgICAnbm9kLWVycm9yJyxcbiAgICAgICAgZXJyb3JNZXNzYWdlQ2xhc3M6ICAgICdub2QtZXJyb3ItbWVzc2FnZSdcbiAgICB9LFxuXG4gICAgUmVnZXg6IHtcbiAgICAgICAgSU5URUdFUjogL15cXHMqXFxkK1xccyokLyxcbiAgICAgICAgRkxPQVQ6IC9eWy0rXT9bMC05XSsoXFwuWzAtOV0rKT8kLyxcbiAgICAgICAgLy8gUkZDODIyXG4gICAgICAgIEVNQUlMOiAvXihbXlxceDAwLVxceDIwXFx4MjJcXHgyOFxceDI5XFx4MmNcXHgyZVxceDNhLVxceDNjXFx4M2VcXHg0MFxceDViLVxceDVkXFx4N2YtXFx4ZmZdK3xcXHgyMihbXlxceDBkXFx4MjJcXHg1Y1xceDgwLVxceGZmXXxcXHg1Y1tcXHgwMC1cXHg3Zl0pKlxceDIyKShcXHgyZShbXlxceDAwLVxceDIwXFx4MjJcXHgyOFxceDI5XFx4MmNcXHgyZVxceDNhLVxceDNjXFx4M2VcXHg0MFxceDViLVxceDVkXFx4N2YtXFx4ZmZdK3xcXHgyMihbXlxceDBkXFx4MjJcXHg1Y1xceDgwLVxceGZmXXxcXHg1Y1tcXHgwMC1cXHg3Zl0pKlxceDIyKSkqXFx4NDAoW15cXHgwMC1cXHgyMFxceDIyXFx4MjhcXHgyOVxceDJjXFx4MmVcXHgzYS1cXHgzY1xceDNlXFx4NDBcXHg1Yi1cXHg1ZFxceDdmLVxceGZmXSt8XFx4NWIoW15cXHgwZFxceDViLVxceDVkXFx4ODAtXFx4ZmZdfFxceDVjW1xceDAwLVxceDdmXSkqXFx4NWQpKFxceDJlKFteXFx4MDAtXFx4MjBcXHgyMlxceDI4XFx4MjlcXHgyY1xceDJlXFx4M2EtXFx4M2NcXHgzZVxceDQwXFx4NWItXFx4NWRcXHg3Zi1cXHhmZl0rfFxceDViKFteXFx4MGRcXHg1Yi1cXHg1ZFxceDgwLVxceGZmXXxcXHg1Y1tcXHgwMC1cXHg3Zl0pKlxceDVkKSkqJC9cbiAgICB9XG59O1xuXG4iLCJjb25zdCB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyksXG4gICAgICBjb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpO1xuXG4vKipcbiAqIGRvbU5vZGVGYWN0b3J5XG4gKlxuICogVGhpcyBjcmVhdGVzIHRoZSBlcnJvci9zdWNjZXNzIG1lc3NhZ2UgYmVoaW5kIHRoZSBpbnB1dCBlbGVtZW50LCBhcyB3ZWxsXG4gKiBhcyB0YWtlcyBjYXJlIG9mIHVwZGF0aW5nIGNsYXNzZXMgYW5kIHRha2luZyBjYXJlIG9mIGl0cyBvd24gc3RhdGUuXG4gKlxuICogVGhlIGRvbSBub2RlIGlzIG93bmVkIGJ5IGNoZWNrSGFuZGxlciwgYW5kIGhhcyBhIG9uZSB0byBvbmVcbiAqIHJlbGF0aW9uc2hpcCB3aXRoIGJvdGggdGhlIGNoZWNrSGFuZGxlciBhbmQgdGhlIGlucHV0IGVsZW1lbnRcbiAqIGJlaW5nIGNoZWNrZWQuXG4gKlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IChlbGVtZW50LCBtZWRpYXRvciwgY29uZmlndXJhdGlvbikgPT4ge1xuICAgIC8vIEEgJ2RvbU5vZGUnIGNvbnNpc3RzIG9mIHR3byBlbGVtZW50czogYSAncGFyZW50JywgYW5kIGEgJ3NwYW4nLiBUaGVcbiAgICAvLyBwYXJlbnQgaXMgZ2l2ZW4gYXMgYSBwYXJlbWV0ZXIsIHdoaWxlIHRoZSBzcGFuIGlzIGNyZWF0ZWQgYW5kIGFkZGVkXG4gICAgLy8gYXMgYSBjaGlsZCB0byB0aGUgcGFyZW50LlxuICAgIGxldCBwYXJlbnQgICAgICAgICAgICAgID0gdXRpbC5nZXRQYXJlbnQoZWxlbWVudCwgY29uZmlndXJhdGlvbiksXG4gICAgICAgIF9zdGF0dXMgICAgICAgICAgICAgPSBjb25zdGFudHMuVU5DSEVDS0VELFxuICAgICAgICBwZW5kaW5nVXBkYXRlICAgICAgID0gbnVsbCxcbiAgICAgICAgc3BhbiAgICAgICAgICAgICAgICA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKSxcbiAgICAgICAgY3VzdG9tU3BhbiAgICAgICAgICA9IGZhbHNlO1xuXG4gICAgc3Bhbi5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuXG4gICAgaWYgKCFjb25maWd1cmF0aW9uLm5vRG9tKSB7XG4gICAgICAgIHBhcmVudC5hcHBlbmRDaGlsZChzcGFuKTtcbiAgICB9XG5cbiAgICAvLyBVcGRhdGVzIHRoZSBjbGFzcyBvZiB0aGUgcGFyZW50IHRvIG1hdGNoIHRoZSBzdGF0dXMgb2YgdGhlIGVsZW1lbnQuXG4gICAgY29uc3QgdXBkYXRlUGFyZW50ID0gc3RhdHVzID0+IHtcbiAgICAgICAgY29uc3Qgc3VjY2Vzc0NsYXNzICAgID0gY29uZmlndXJhdGlvbi5zdWNjZXNzQ2xhc3MgfHwgY29uc3RhbnRzLmNsYXNzZXMuc3VjY2Vzc0NsYXNzLFxuICAgICAgICAgICAgICBlcnJvckNsYXNzICAgICAgPSBjb25maWd1cmF0aW9uLmVycm9yQ2xhc3MgfHwgY29uc3RhbnRzLmNsYXNzZXMuZXJyb3JDbGFzcztcblxuICAgICAgICBzd2l0Y2ggKHN0YXR1cykge1xuICAgICAgICBjYXNlIGNvbnN0YW50cy5WQUxJRDpcbiAgICAgICAgICAgIHV0aWwucmVtb3ZlQ2xhc3MoZXJyb3JDbGFzcywgcGFyZW50KTtcbiAgICAgICAgICAgIHV0aWwuYWRkQ2xhc3Moc3VjY2Vzc0NsYXNzLCBwYXJlbnQpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgY29uc3RhbnRzLklOVkFMSUQ6XG4gICAgICAgICAgICB1dGlsLnJlbW92ZUNsYXNzKHN1Y2Nlc3NDbGFzcywgcGFyZW50KTtcbiAgICAgICAgICAgIHV0aWwuYWRkQ2xhc3MoZXJyb3JDbGFzcywgcGFyZW50KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8vIFVwZGF0ZXMgdGhlIHRleHQgYW5kIGNsYXNzIGFjY29yZGluZyB0byB0aGUgc3RhdHVzLlxuICAgIGNvbnN0IHVwZGF0ZVNwYW4gPSAoc3RhdHVzLCBlcnJvck1lc3NhZ2UpID0+IHtcbiAgICAgICAgY29uc3Qgc3VjY2Vzc01lc3NhZ2VDbGFzcyA9IGNvbmZpZ3VyYXRpb24uc3VjY2Vzc01lc3NhZ2VDbGFzcyB8fCBjb25zdGFudHMuY2xhc3Nlcy5zdWNjZXNzTWVzc2FnZUNsYXNzLFxuICAgICAgICAgICAgICBlcnJvck1lc3NhZ2VDbGFzcyAgID0gY29uZmlndXJhdGlvbi5lcnJvck1lc3NhZ2VDbGFzcyB8fCBjb25zdGFudHMuY2xhc3Nlcy5lcnJvck1lc3NhZ2VDbGFzcztcblxuICAgICAgICBzcGFuLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG5cbiAgICAgICAgc3dpdGNoIChzdGF0dXMpIHtcbiAgICAgICAgY2FzZSBjb25zdGFudHMuVkFMSUQ6XG4gICAgICAgICAgICB1dGlsLnJlbW92ZUNsYXNzKGVycm9yTWVzc2FnZUNsYXNzLCBzcGFuKTtcbiAgICAgICAgICAgIHV0aWwuYWRkQ2xhc3Moc3VjY2Vzc01lc3NhZ2VDbGFzcywgc3Bhbik7XG4gICAgICAgICAgICBpZiAoY29uZmlndXJhdGlvbi5zdWNjZXNzTWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIHNwYW4udGV4dENvbnRlbnQgPSBjb25maWd1cmF0aW9uLnN1Y2Nlc3NNZXNzYWdlO1xuICAgICAgICAgICAgICAgIHNwYW4uc3R5bGUuZGlzcGxheSA9ICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgY29uc3RhbnRzLklOVkFMSUQ6XG4gICAgICAgICAgICB1dGlsLnJlbW92ZUNsYXNzKHN1Y2Nlc3NNZXNzYWdlQ2xhc3MsIHNwYW4pO1xuICAgICAgICAgICAgdXRpbC5hZGRDbGFzcyhlcnJvck1lc3NhZ2VDbGFzcywgc3Bhbik7XG4gICAgICAgICAgICBzcGFuLnRleHRDb250ZW50ID0gZXJyb3JNZXNzYWdlO1xuICAgICAgICAgICAgc3Bhbi5zdHlsZS5kaXNwbGF5ID0gJyc7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBzZXQgPSBvcHRpb25zID0+IHtcbiAgICAgICAgY29uc3Qgc3RhdHVzICAgICAgICAgICAgICA9IG9wdGlvbnMucmVzdWx0LFxuICAgICAgICAgICAgICBlcnJvck1lc3NhZ2UgICAgICAgID0gb3B0aW9ucy5lcnJvck1lc3NhZ2U7XG5cbiAgICAgICAgLy8gSWYgdGhlIGRvbSBpcyBzaG93aW5nIGFuIGludmFsaWQgbWVzc2FnZSwgd2Ugd2FudCB0byB1cGRhdGUgdGhlXG4gICAgICAgIC8vIGRvbSByaWdodCBhd2F5LlxuICAgICAgICBpZiAoX3N0YXR1cyA9PT0gY29uc3RhbnRzLklOVkFMSUQgfHwgY29uZmlndXJhdGlvbi5kZWxheSA9PT0gMCkge1xuXG4gICAgICAgICAgICBfc3RhdHVzID0gc3RhdHVzO1xuICAgICAgICAgICAgdXBkYXRlUGFyZW50KHN0YXR1cyk7XG4gICAgICAgICAgICB1cGRhdGVTcGFuKHN0YXR1cywgZXJyb3JNZXNzYWdlKTtcblxuICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICAvLyBJZiB0aGUgZG9tIHNob3dzIGVpdGhlciBhbiB1bmNoZWNrZWQgb3IgYSB2YWxpZCBzdGF0ZVxuICAgICAgICAgICAgLy8gd2Ugd29uJ3QgcnVzaCB0byB0ZWxsIHRoZW0gdGhleSBhcmUgd3JvbmcuIEluc3RlYWRcbiAgICAgICAgICAgIC8vIHdlIHVzZSBhIG1ldGhvZCBzaW1pbGFyIHRvIFwiZGVib3VuY2luZ1wiIHRoZSB1cGRhdGVcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChwZW5kaW5nVXBkYXRlKTtcblxuICAgICAgICAgICAgcGVuZGluZ1VwZGF0ZSA9IHNldFRpbWVvdXQoKCkgPT4ge1xuXG4gICAgICAgICAgICAgICAgX3N0YXR1cyA9IHN0YXR1cztcbiAgICAgICAgICAgICAgICB1cGRhdGVQYXJlbnQoc3RhdHVzKTtcbiAgICAgICAgICAgICAgICB1cGRhdGVTcGFuKHN0YXR1cywgZXJyb3JNZXNzYWdlKTtcblxuICAgICAgICAgICAgICAgIHBlbmRpbmdVcGRhdGUgPSBudWxsO1xuXG4gICAgICAgICAgICB9LCBjb25maWd1cmF0aW9uLmRlbGF5IHx8IDcwMCk7XG5cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBzdWJzY3JpYmVUbyA9IGlkID0+XG4gICAgICAgIG1lZGlhdG9yLnN1YnNjcmliZShpZCwgc2V0KTtcblxuXG4gICAgY29uc3Qgc2V0TWVzc2FnZU9wdGlvbnMgPSAocGFyZW50Q29udGFpbmVyLCBtZXNzYWdlKSA9PiB7XG4gICAgICAgIGlmIChwYXJlbnRDb250YWluZXIpIHtcbiAgICAgICAgICAgIHBhcmVudCA9IHV0aWwuZ2V0RWxlbWVudChwYXJlbnRDb250YWluZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1lc3NhZ2UpIHtcbiAgICAgICAgICAgIHNwYW4ucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChzcGFuKTsgICAgICAvLyBSZW1vdmUgb2xkIHNwYW4uXG4gICAgICAgICAgICBzcGFuID0gdXRpbC5nZXRFbGVtZW50KG1lc3NhZ2UpOyAgICAgICAgIC8vIFNldCB0aGUgbmV3IG9uZS5cbiAgICAgICAgICAgIGN1c3RvbVNwYW4gPSB0cnVlOyAgICAgICAgICAgICAgICAgICAgICAvLyBTbyB3ZSB3b24ndCBkZWxldGUgaXQuXG4gICAgICAgIH1cbiAgICB9O1xuXG5cbiAgICBjb25zdCBkaXNwb3NlID0gKCkgPT4ge1xuICAgICAgICAvLyBGaXJzdCByZW1vdmUgYW55IGNsYXNzZXNcbiAgICAgICAgdXRpbC5yZW1vdmVDbGFzcyhjb25maWd1cmF0aW9uLmVycm9yQ2xhc3MgfHwgY29uc3RhbnRzLmNsYXNzZXMuZXJyb3JDbGFzcywgcGFyZW50KTtcbiAgICAgICAgdXRpbC5yZW1vdmVDbGFzcyhjb25maWd1cmF0aW9uLnN1Y2Nlc3NDbGFzcyB8fCBjb25zdGFudHMuY2xhc3Nlcy5zdWNjZXNzQ2xhc3MsIHBhcmVudCk7XG5cbiAgICAgICAgLy8gVGhlbiB3ZSByZW1vdmUgdGhlIHNwYW4gaWYgaXQgd2Fzbid0IG9uZSB0aGF0IHdhcyBzZXQgYnkgdGhlIHVzZXIuXG4gICAgICAgIGlmICghY3VzdG9tU3Bhbikge1xuICAgICAgICAgICAgc3Bhbi5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHNwYW4pO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiB7c3Vic2NyaWJlVG8sIGVsZW1lbnQsIHNldE1lc3NhZ2VPcHRpb25zLCBkaXNwb3NlfTtcbn07XG5cbiIsImNvbnN0IGVtaXQgPSBvcHRpb25zID0+XG4gICAgb3B0aW9ucy5lbGVtZW50LmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdub2QudmFsaWRhdGlvbicsIHtkZXRhaWw6IG9wdGlvbnN9KSk7XG5cbm1vZHVsZS5leHBvcnRzID0gKG1lZGlhdG9yKSA9PiB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBzdWJzY3JpYmU6IGlkID0+IG1lZGlhdG9yLnN1YnNjcmliZShpZCwgZW1pdClcbiAgICB9O1xufTtcblxuIiwiY29uc3QgY2hlY2tGdW5jdGlvbnMgPSByZXF1aXJlKCcuL2NoZWNrRnVuY3Rpb25zJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gbWV0cmljID0+IHtcbiAgICBpZiAodHlwZW9mIG1ldHJpYy52YWxpZGF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICByZXR1cm4gbWV0cmljLnZhbGlkYXRlO1xuICAgIH1cblxuICAgIGlmIChtZXRyaWMudmFsaWRhdGUgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgICAgcmV0dXJuIGNoZWNrRnVuY3Rpb25zLnJlZ2V4cChtZXRyaWMudmFsaWRhdGUpO1xuICAgIH1cblxuICAgIGxldCBhcmdzICAgPSBtZXRyaWMudmFsaWRhdGUuc3BsaXQoJzonKSxcbiAgICAgICAgZm5OYW1lID0gYXJncy5zaGlmdCgpO1xuXG4gICAgaWYgKGZuTmFtZSA9PT0gJ29uZS1vZicgfHwgZm5OYW1lID09PSAnb25seS1vbmUtb2YnIHx8XG4gICAgICAgIGZuTmFtZSA9PT0gJ3NhbWUtYXMnIHx8IGZuTmFtZSA9PT0gJ3NvbWUtcmFkaW8nKSB7XG5cbiAgICAgICAgYXJncy5wdXNoKG1ldHJpYy5zZWxlY3Rvcik7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBjaGVja0Z1bmN0aW9uc1tmbk5hbWVdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHJldHVybiBjaGVja0Z1bmN0aW9uc1tmbk5hbWVdLmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93ICdDb3VsZG5cXCd0IGZpbmQgeW91ciB2YWxpZGF0b3IgZnVuY3Rpb24gXCInICsgZm5OYW1lICsgJ1wiIGZvciBcIicgKyBtZXRyaWMuc2VsZWN0b3IgKyAnXCInO1xuICAgIH1cbn07XG5cbiIsIi8qKlxuICpcbiAqXG4gKiBub2Qgdi4yLjAuNVxuICogR29ybSBDYXNwZXJcbiAqXG4gKlxuICpcbiAqIFRoaXMgaXMgYSBzaG9ydCBicmVha2Rvd24gb2YgdGhlIGNvZGUgdG8gaGVscCB5b3UgZmluZCB5b3VyIHdheSBhcm91bmQuXG4gKlxuICpcbiAqIEFuIGBlbGVtZW50YCBhbHdheXMgcmVmZXIgdG8gc29tZSBpbnB1dCBlbGVtZW50IGRlZmluZWQgYnkgdGhlIHVzZXIgdmlhIHRoZVxuICogYHNlbGVjdG9yYCBrZXkuXG4gKlxuICogQSBgbWV0cmljYCBpcyB0aGUgdXNlciBjcmVhdGVkIG9iamVjdHMgdGhhdCBpcyB1c2VkIHRvIGFkZCBjaGVja3MgdG9cbiAqIG5vZC5cbiAqXG4gKiBFYWNoIGBlbGVtZW50YCB3aWxsIGhhdmUgYXQgbW9zdCBvbmUgb2YgYSBgbGlzdGVuZXJgLCBhIGBjaGVja2VyYCwgYVxuICogYGNoZWNrSGFuZGxlcmAsIGFuZCBhIGBkb21Ob2RlYCBcImF0dGFjaGVkXCIgdG8gaXQuIFRoZSBgbGlzdGVuZXJgIGxpc3RlbnNcbiAqIGZvciBpbnB1dHMgb3IgY2hhbmdlcyB0byB0aGUgYGVsZW1lbnRgIGFuZCBwYXNzZXMgdGhlIG5ldyB2YWx1ZSBvbiB0byB0byB0aGVcbiAqIGBjaGVja2VyYCB3aGljaCBwZXJmb3JtcyBpdHMgY2hlY2tzIGFuZCBwYXNzZXMgdGhlIHRoZSByZXN1bHRzIG9uIHRvIHRoZVxuICogYGNoZWNrSGFuZGxlcmAgd2hpY2ggY2FsY3VsYXRlcyB0aGUgbmV3IHN0YXRlIG9mIHRoZSBgZWxlbWVudGAgd2hpY2ggaXRcbiAqIHBhc3NlcyBvbiB0byB0aGUgYGRvbU5vZGVgIHdoaWNoIHdpbGwgdXBkYXRlIHRoZSBkb20uXG4gKlxuICogVGhlIGZvdXIgbWFpbiBwYXJ0cywgdGhlIGxpc3RlbmVyLCB0aGUgY2hlY2tlciwgdGhlIGNoZWNrSGFuZGxlciwgYW5kIHRoZVxuICogZG9tTm9kZSBhbGwgY29tbXVuaWNhdGUgdGhyb3VnaCB0aGUgYG1lZGlhdG9yYCBieSBmaXJpbmcgZXZlbnRzIGlkZW50aWZpZWRcbiAqIGJ5IGEgdW5pcXVlIGlkLiBUaGV5IGRvIG5vdCBrbm93IG9mIGVhY2ggb3RoZXIncyBleGlzdGFuY2UsIGFuZCBzbyBub1xuICogY29tbXVuaWNhdGlvbiBmbG93cyBkaXJlY3RseSBiZXR3ZWVuIHRoZW0uXG4gKlxuICogQWxsIGxpc3RlbmVycywgY2hlY2tlcnMsIGhhbmRsZXJzLCBhbmQgZG9tTm9kZXMgYXJlIGdyb3VwZWQgdG9nZXRoZXIgaW5cbiAqIGBjb2xsZWN0aW9uc2AsIHdoaWNoIGFyZSBiYXNpY2FsbHkgYSBnbG9yaWZpZWQgYXJyYXkgdGhhdCBtYWtlcyBpdCBlYXN5XG4gKiBub3QgdG8gZ2V0IGR1cGxpY2F0ZSBpdGVtcyBmb3IgZWFjaCBlbGVtZW50IChmb3IgaW5zdGFuY2UgdHdvIGxpc3RlbmVyc1xuICogbGlzdGVuaW5nIHRvIHRoZSBzYW1lIGVsZW1lbnQpLlxuICpcbiAqIFRoZSBjb21tdW5pY2F0aW9uIGZsb3cgbG9va3MgbGlrZSB0aGlzOlxuICogbGlzdGVuZXIgLT4gY2hlY2tlciAtPiBjaGVja0hhbmRsZXIgLT4gZG9tTm9kZVxuICpcbiAqIEJldHdlZW4gZWFjaCBwYXJ0LCB5b3UgaGF2ZSB0aGUgbWVkaWF0b3IuXG4gKlxuICpcbiAqIGBNZXRyaWNzYCBhcmUgYWRkZWQgYnkgdGhlIHVzZXIsIHdoaWNoIHNldHMgdXAgdGhlIHN5c3RlbSBhYm92ZS4gTm90aWNlXG4gKiB0aGF0IGEgbWV0cmljIGNhbiB0YXJnZXQgbXVsdGlwbGUgZWxlbWVudHMgYXQgb25jZSwgYW5kIHRoYXQgdGhlcmUgY2FuXG4gKiBiZSBvdmVybGFwcy4gT25lIG1ldHJpYyBkZWZpbml0ZWx5IGRvZXMgbm90IGVxdWFsIG9uZSBlbGVtZW50IG9yIG9uZVxuICogY2hlY2suXG4gKlxuICovXG5cblxuY29uc3QgdXRpbCAgICAgICAgICAgICAgICAgICAgICAgICAgPSByZXF1aXJlKCcuL3V0aWwnKSxcbiAgICAgIGNvbnN0YW50cyAgICAgICAgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKSxcbiAgICAgIG1lZGlhdG9yRmFjdG9yeSAgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi9tZWRpYXRvckZhY3RvcnknKSxcbiAgICAgIGVtaXR0ZXJGYWN0b3J5ICAgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi9lbWl0dGVyRmFjdG9yeScpLFxuICAgICAgY29sbGVjdGlvbkZhY3RvcnkgICAgICAgICAgICAgPSByZXF1aXJlKCcuL2NvbGxlY3Rpb25GYWN0b3J5JyksXG4gICAgICBsaXN0ZW5lckZhY3RvcnkgICAgICAgICAgICAgICA9IHJlcXVpcmUoJy4vbGlzdGVuZXJGYWN0b3J5JyksXG4gICAgICBjaGVja2VyRmFjdG9yeSAgICAgICAgICAgICAgICA9IHJlcXVpcmUoJy4vY2hlY2tlckZhY3RvcnknKSxcbiAgICAgIGNoZWNrSGFuZGxlckZhY3RvcnkgICAgICAgICAgID0gcmVxdWlyZSgnLi9jaGVja0hhbmRsZXJGYWN0b3J5JyksXG4gICAgICBkb21Ob2RlRmFjdG9yeSAgICAgICAgICAgICAgICA9IHJlcXVpcmUoJy4vZG9tTm9kZUZhY3RvcnknKSxcbiAgICAgIGNoZWNrRnVuY3Rpb25zICAgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi9jaGVja0Z1bmN0aW9ucycpLFxuICAgICAgZ2V0Q2hlY2tGdW5jdGlvbiAgICAgICAgICAgICAgPSByZXF1aXJlKCcuL2dldENoZWNrRnVuY3Rpb24nKTtcblxuXG5mdW5jdGlvbiBub2QgKGNvbmZpZykge1xuICAgIHZhciBmb3JtLFxuICAgICAgICBjb25maWd1cmF0aW9uICAgPSB7fSxcbiAgICAgICAgbWVkaWF0b3IgICAgICAgID0gbWVkaWF0b3JGYWN0b3J5KCksXG4gICAgICAgIGVtaXR0ZXIgICAgICAgICA9IGVtaXR0ZXJGYWN0b3J5KG1lZGlhdG9yKSxcblxuICAgICAgICAvLyBDcmVhdGluZyAoZW1wdHkpIGNvbGxlY3Rpb25zXG4gICAgICAgIGxpc3RlbmVycyAgICAgICA9IGNvbGxlY3Rpb25GYWN0b3J5KGxpc3RlbmVyRmFjdG9yeSksXG4gICAgICAgIGNoZWNrZXJzICAgICAgICA9IGNvbGxlY3Rpb25GYWN0b3J5KGNoZWNrZXJGYWN0b3J5KSxcbiAgICAgICAgY2hlY2tIYW5kbGVycyAgID0gY29sbGVjdGlvbkZhY3RvcnkoY2hlY2tIYW5kbGVyRmFjdG9yeSksXG4gICAgICAgIGRvbU5vZGVzICAgICAgICA9IGNvbGxlY3Rpb25GYWN0b3J5KGRvbU5vZGVGYWN0b3J5KTtcblxuXG5cbiAgICAvKipcbiAgICAgKiBFbnRyeSBwb2ludCBmb3IgdGhlIHVzZXIuIFRoZSB1c2VyIHBhc3NlcyBpbiBhbiBhcnJheSBvZiBtZXRyaWNzIChhblxuICAgICAqIG9iamVjdCBjb250YWluaW5nIGEgc2VsZWN0b3IsIGEgdmFsaWRhdGUgc3RyaW5nL2Z1bmN0aW9uLCBldGMuKSBhbmQgaXRcbiAgICAgKiBnZXRzIHByb2Nlc3NlZCBmcm9tIGhlcmUuXG4gICAgICpcbiAgICAgKiBUaGlzIGZ1bmN0aW9uLCBpcyBtb3N0bHkgYWJvdXQgY2xlYW5pbmcgdXAgd2hhdCB0aGUgdXNlciBwYXNzZWQgdXMuXG4gICAgICovXG4gICAgZnVuY3Rpb24gYWRkTWV0cmljcyAobWV0cmljcykge1xuICAgICAgICAvLyBNYWtlIHN1cmUgd2UgYXJlIGRlYWxpbmcgd2l0aCBhbiBhcnJheSBvZiBtZXRyaWNzLlxuICAgICAgICB2YXIgYXJyYXlNZXRyaWNzID0gQXJyYXkuaXNBcnJheShtZXRyaWNzKSA/IG1ldHJpY3MgOiBbbWV0cmljc107XG5cbiAgICAgICAgYXJyYXlNZXRyaWNzLmZvckVhY2goZnVuY3Rpb24gKG1ldHJpYykge1xuICAgICAgICAgICAgdmFyIHZhbGlkYXRlQXJyYXksIGVycm9yTWVzc2FnZUFycmF5O1xuXG4gICAgICAgICAgICAvLyBJZiB0aGUgJ3ZhbGlkYXRlJyBpcyBub3QgYW4gYXJyYXksIHRoZW4gd2UncmUgZ29vZCB0byBnby5cbiAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShtZXRyaWMudmFsaWRhdGUpKSB7XG4gICAgICAgICAgICAgICAgYWRkTWV0cmljKG1ldHJpYyk7XG5cbiAgICAgICAgICAgIC8vIElmIGl0IGlzIGFuIGFycmF5IChlLmcuLCB2YWxpZGF0ZTogWydlbWFpbCcsICdtYXgtbGVuZ3RoOjEwJ10pLFxuICAgICAgICAgICAgLy8gdGhlbiB3ZSBuZWVkIHRvIHNwbGl0IHRoZW0gdXAgaW50byBtdWx0aXBsZSBtZXRyaWNzLCBhbmQgYWRkXG4gICAgICAgICAgICAvLyB0aGVtIGluZGl2aWR1YWxseS5cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KG1ldHJpYy5lcnJvck1lc3NhZ2UpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93ICdJZiB5b3UgcGFzcyBpbiBgdmFsaWRhdGU6Li4uYCBhcyBhbiBhcnJheSwgdGhlbiBgZXJyb3JNZXNzYWdlOi4uLmAgYWxzbyBuZWVkcyB0byBiZSBhbiBhcnJheS4gXCInICsgbWV0cmljLnZhbGlkYXRlICsgJ1wiLCBhbmQgXCInICsgbWV0cmljLmVycm9yTWVzc2FnZSArICdcIic7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gV2Ugc3RvcmUgZWFjaCBhcyBhcnJheXMsIGFuZCB0aGVuIHJ1biB0aHJvdWdoIHRoZW0sXG4gICAgICAgICAgICAgICAgLy8gb3ZlcndyaXRpbmcgZWFjaCBvZiB0aGUga2V5cyBhY2NvcmRpbmdseS5cbiAgICAgICAgICAgICAgICB2YWxpZGF0ZUFycmF5ICAgICA9IG1ldHJpYy52YWxpZGF0ZTtcbiAgICAgICAgICAgICAgICBlcnJvck1lc3NhZ2VBcnJheSA9IG1ldHJpYy5lcnJvck1lc3NhZ2U7XG5cbiAgICAgICAgICAgICAgICB2YWxpZGF0ZUFycmF5LmZvckVhY2goZnVuY3Rpb24gKHZhbGlkYXRlLCBpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE92ZXJ3cml0ZSB0aGUgYXJyYXkgd2l0aCB0aGUgaW5kaXZpZHVhbCAndmFsaWRhdGUnIGFuZFxuICAgICAgICAgICAgICAgICAgICAvLyAnZXJyb3JNZXNzYWdlJy5cbiAgICAgICAgICAgICAgICAgICAgbWV0cmljLnZhbGlkYXRlICAgICA9IHZhbGlkYXRlO1xuICAgICAgICAgICAgICAgICAgICBtZXRyaWMuZXJyb3JNZXNzYWdlID0gZXJyb3JNZXNzYWdlQXJyYXlbaV07XG5cbiAgICAgICAgICAgICAgICAgICAgYWRkTWV0cmljKG1ldHJpYyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuXG4gICAgZnVuY3Rpb24gYWRkTWV0cmljIChtZXRyaWMpIHtcbiAgICAgICAgdmFyIHNwZWNpYWxUcmlnZ2VycyA9IFtdLFxuXG5cbiAgICAgICAgICAgIC8vIFRoZSBmdW5jdGlvbiB0aGF0IHdpbGwgY2hlY2sgdGhlIHZhbHVlIG9mIHRoZSBlbGVtZW50LlxuICAgICAgICAgICAgY2hlY2tGdW5jdGlvbiA9IGdldENoZWNrRnVuY3Rpb24obWV0cmljKSxcblxuXG4gICAgICAgICAgICAvLyBBIGxpc3Qgb2YgZWxlbWVudHMgdGhhdCB0aGlzIG1ldHJpYyB3aWxsIHRhcmdldC5cbiAgICAgICAgICAgIGVsZW1lbnRzID0gdXRpbC5nZXRFbGVtZW50cyhtZXRyaWMuc2VsZWN0b3IpLFxuXG5cbiAgICAgICAgICAgIC8vIEEgXCJzZXRcIiBoZXJlLCByZWZlcnMgdG8gYW4gb2JqIHdpdGggb25lIGxpc3RlbmVyLCBvbmUgY2hlY2tlcixcbiAgICAgICAgICAgIC8vIGFuZCBvbmUgY2hlY2tIYW5kbGVyLiBPbmx5IGV2ZXJ5IG9uZSBmb3IgZWFjaCBlbGVtZW50IGluIHRoZVxuICAgICAgICAgICAgLy8gZG9tLlxuICAgICAgICAgICAgbWV0cmljU2V0cyA9IGVsZW1lbnRzLm1hcChmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIGxpc3RlbmVyOiAgICAgICBsaXN0ZW5lcnMuZmluZE9yTWFrZShlbGVtZW50LCBtZWRpYXRvciwgbWV0cmljLnRyaWdnZXJFdmVudHMsIGNvbmZpZ3VyYXRpb24pLFxuICAgICAgICAgICAgICAgICAgICBjaGVja2VyOiAgICAgICAgY2hlY2tlcnMuZmluZE9yTWFrZShlbGVtZW50LCBtZWRpYXRvciksXG4gICAgICAgICAgICAgICAgICAgIGNoZWNrSGFuZGxlcjogICBjaGVja0hhbmRsZXJzLmZpbmRPck1ha2UoZWxlbWVudCwgbWVkaWF0b3IsIGNvbmZpZ3VyYXRpb24pLFxuICAgICAgICAgICAgICAgICAgICBkb21Ob2RlOiAgICAgICAgZG9tTm9kZXMuZmluZE9yTWFrZShlbGVtZW50LCBtZWRpYXRvciwgY29uZmlndXJhdGlvbilcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSk7XG5cblxuICAgICAgICAvLyBTYXZlZCBmb3IgbGF0ZXIgcmVmZXJlbmNlIGluIGNhc2UgdGhlIHVzZXIgaGFzIGEgYHRhcGAgZnVuY3Rpb25cbiAgICAgICAgLy8gZGVmaW5lZC5cbiAgICAgICAgY2hlY2tGdW5jdGlvbi52YWxpZGF0ZSA9ICh0eXBlb2YgbWV0cmljLnZhbGlkYXRlID09PSAnZnVuY3Rpb24nKSA/IG1ldHJpYy52YWxpZGF0ZS50b1N0cmluZygpIDogbWV0cmljLnZhbGlkYXRlO1xuXG5cblxuICAgICAgICAvLyBTcGVjaWFsIGNhc2VzLiBUaGVzZSBgdmFsaWRhdGVzYCBhZmZlY3QgZWFjaCBvdGhlciwgYW5kIHRoZWlyIHN0YXRlXG4gICAgICAgIC8vIG5lZWRzIHRvIHVwZGF0ZSBlYWNoIHRpbWUgZWl0aGVyIG9mIHRoZSBlbGVtZW50cycgdmFsdWVzIGNoYW5nZS5cbiAgICAgICAgaWYgKG1ldHJpYy52YWxpZGF0ZSA9PT0gJ29uZS1vZicgfHwgbWV0cmljLnZhbGlkYXRlID09PSAnb25seS1vbmUtb2YnIHx8IG1ldHJpYy52YWxpZGF0ZSA9PT0gJ3NvbWUtcmFkaW8nKSB7XG4gICAgICAgICAgICBzcGVjaWFsVHJpZ2dlcnMucHVzaChtZXRyaWMuc2VsZWN0b3IpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBtZXRyaWMudmFsaWRhdGUgPT09ICdzdHJpbmcnICYmIG1ldHJpYy52YWxpZGF0ZS5pbmRleE9mKCdzYW1lLWFzJykgPiAtMSkge1xuICAgICAgICAgICAgc3BlY2lhbFRyaWdnZXJzLnB1c2gobWV0cmljLnZhbGlkYXRlLnNwbGl0KCc6JylbMV0pO1xuICAgICAgICB9XG5cblxuXG4gICAgICAgIC8vIEhlbHBlciBmdW5jdGlvbiwgdXNlZCBpbiB0aGUgbG9vcCBiZWxvdy5cbiAgICAgICAgZnVuY3Rpb24gc3Vic2NyaWJlVG9UcmlnZ2VycyAoY2hlY2tlciwgc2VsZWN0b3IpIHtcbiAgICAgICAgICAgIHZhciB0cmlnZ2VyRWxlbWVudHMgPSB1dGlsLmdldEVsZW1lbnRzKHNlbGVjdG9yKTtcblxuICAgICAgICAgICAgdHJpZ2dlckVsZW1lbnRzLmZvckVhY2goZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICB2YXIgbGlzdGVuZXIgPSBsaXN0ZW5lcnMuZmluZE9yTWFrZShlbGVtZW50LCBtZWRpYXRvciwgbnVsbCwgY29uZmlndXJhdGlvbik7XG5cbiAgICAgICAgICAgICAgICBjaGVja2VyLnN1YnNjcmliZVRvKGxpc3RlbmVyLmlkKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cblxuXG4gICAgICAgIC8vIEhlcmUgd2Ugc2V0IHVwIHRoZSBcImNvbm5lY3Rpb25zXCIgYmV0d2VlbiBlYWNoIG9mIG91ciBtYWluIHBhcnRzLlxuICAgICAgICAvLyBUaGV5IGNvbW11bmljYXRlIG9ubHkgdGhyb3VnaCB0aGUgbWVkaWF0b3IuXG4gICAgICAgIG1ldHJpY1NldHMuZm9yRWFjaChmdW5jdGlvbiAobWV0cmljU2V0KSB7XG5cblxuICAgICAgICAgICAgLy8gOjogTGlzdGVuZXIgLT4gQ2hlY2tlclxuXG4gICAgICAgICAgICAvLyBXZSB3YW50IG91ciBjaGVja2VyIHRvIGxpc3RlbiB0byB0aGUgbGlzdGVuZXIuIEEgbGlzdGVuZXIgaGFzIGFuXG4gICAgICAgICAgICAvLyBpZCwgd2hpY2ggaXQgdXNlcyB3aGVuIGl0IGZpcmVzIGV2ZW50cyB0byB0aGUgbWVkaWF0b3IgKHdoaWNoXG4gICAgICAgICAgICAvLyB3YXMgc2V0IHVwIHdoZW4gdGhlIGxpc3RlbmVyIHdhcyBjcmVhdGVkKS5cbiAgICAgICAgICAgIG1ldHJpY1NldC5jaGVja2VyLnN1YnNjcmliZVRvKG1ldHJpY1NldC5saXN0ZW5lci5pZCk7XG5cbiAgICAgICAgICAgIC8vIElmIHRoZSB1c2VyIHNldCBhIGB0cmlnZ2VyZWRCeWAsIHRoZSBjaGVja2VyIG5lZWQgdG8gbGlzdGVuIHRvXG4gICAgICAgICAgICAvLyBjaGFuZ2VzIG9uIHRoaXMgZWxlbWVudCBhcyB3ZWxsLlxuICAgICAgICAgICAgLy8gU2FtZSBnb2VzIGZvciBzcGVjaWFsIHRyaWdnZXJzIHRoYXQgd2Ugc2V0LlxuICAgICAgICAgICAgc3Vic2NyaWJlVG9UcmlnZ2VycyhtZXRyaWNTZXQuY2hlY2tlciwgbWV0cmljLnRyaWdnZXJlZEJ5KTtcbiAgICAgICAgICAgIHN1YnNjcmliZVRvVHJpZ2dlcnMobWV0cmljU2V0LmNoZWNrZXIsIHNwZWNpYWxUcmlnZ2Vycyk7XG5cblxuICAgICAgICAgICAgLy8gOjogQ2hlY2tlciAtPiBjaGVja0hhbmRsZXJcblxuICAgICAgICAgICAgdmFyIGNoZWNrSWQgPSB1dGlsLnVuaXF1ZSgpO1xuXG4gICAgICAgICAgICAvLyBXZSBhZGQgdGhlIGNoZWNrIGZ1bmN0aW9uIGFzIG9uZSB0byBiZSBjaGVja2VkIHdoZW4gdGhlIHVzZXJcbiAgICAgICAgICAgIC8vIGlucHV0cyBzb21ldGhpbmcuIChUaGVyZSBtaWdodCBiZSBtb3JlIHRoYW4gdGhpcyBvbmUpLlxuICAgICAgICAgICAgbWV0cmljU2V0LmNoZWNrZXIuYWRkQ2hlY2soY2hlY2tGdW5jdGlvbiwgY2hlY2tJZCk7XG5cbiAgICAgICAgICAgIC8vIFdlIHdhbnQgdGhlIGNoZWNrIGhhbmRsZXIgdG8gbGlzdGVuIGZvciByZXN1bHRzIGZyb20gdGhlIGNoZWNrZXJcbiAgICAgICAgICAgIG1ldHJpY1NldC5jaGVja0hhbmRsZXIuc3Vic2NyaWJlVG8oY2hlY2tJZCwgbWV0cmljLmVycm9yTWVzc2FnZSwgbWV0cmljLmRlZmF1bHRTdGF0dXMpO1xuXG5cbiAgICAgICAgICAgIGlmIChjb25maWd1cmF0aW9uLm5vRG9tKSB7XG4gICAgICAgICAgICAgICAgZW1pdHRlci5zdWJzY3JpYmUobWV0cmljU2V0LmNoZWNrSGFuZGxlci5pZCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIDo6IGNoZWNrSGFuZGxlciAtPiBkb21Ob2RlXG5cbiAgICAgICAgICAgICAgICAvLyBUaGUgY2hlY2tIYW5kbGVyIGhhcyBpdHMgb3duIGlkIChhbmQgb25seSBldmVyIG5lZWRzIG9uZSksIHNvIHdlXG4gICAgICAgICAgICAgICAgLy8ganVzdCBhc2sgdGhlIGRvbU5vZGUgdG8gbGlzdGVuIGZvciB0aGF0LlxuICAgICAgICAgICAgICAgIG1ldHJpY1NldC5kb21Ob2RlLnN1YnNjcmliZVRvKG1ldHJpY1NldC5jaGVja0hhbmRsZXIuaWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuXG5cbiAgICAgICAgLy8gQWZ0ZXIgYWxsIGlzIGRvbmUsIHdlIG1heSBoYXZlIHRvIGVuYWJsZS9kaXNhYmxlIGEgc3VibWl0IGJ1dHRvbi5cbiAgICAgICAgdG9nZ2xlU3VibWl0KCk7XG4gICAgfVxuXG5cblxuICAgIC8qKlxuICAgICAqIElmIGEgZm9ybSBpcyBhZGRlZCwgd2UgbGlzdGVuIGZvciBzdWJtaXRzLCBhbmQgaWYgdGhlIGhhcyBhbHNvIHNldFxuICAgICAqIGBwcmV2ZW50U3VibWl0YCBpbiB0aGUgY29uZmlndXJhdGlvbiwgdGhlbiB3ZSBzdG9wIHRoZSBjb21taXQgZnJvbVxuICAgICAqIGhhcHBlbmluZyB1bmxlc3MgYWxsIHRoZSBlbGVtZW50cyBhcmUgdmFsaWQuXG4gICAgICovXG4gICAgZnVuY3Rpb24gYWRkRm9ybSAoc2VsZWN0b3IpIHtcbiAgICAgICAgdmFyIGZvcm0gPSB1dGlsLmdldEVsZW1lbnQoc2VsZWN0b3IpO1xuXG4gICAgICAgIGZvcm0uYWRkRXZlbnRMaXN0ZW5lcignc3VibWl0JywgcG9zc2libGVQcmV2ZW50U3VibWl0LCBmYWxzZSk7XG4gICAgfVxuXG4gICAgLy8gUHJldmVudCBmdW5jdGlvbiwgdXNlZCBhYm92ZVxuICAgIGZ1bmN0aW9uIHBvc3NpYmxlUHJldmVudFN1Ym1pdCAoZXZlbnQpIHtcbiAgICAgICAgaWYgKGNvbmZpZ3VyYXRpb24ucHJldmVudFN1Ym1pdCAmJiAhYXJlQWxsKGNvbnN0YW50cy5WQUxJRCkpIHtcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgIC8vIFNob3cgZXJyb3JzIHRvIHRoZSB1c2VyXG4gICAgICAgICAgICBjaGVja2Vycy5mb3JFYWNoKGZ1bmN0aW9uIChjaGVja2VyKSB7XG4gICAgICAgICAgICAgICAgY2hlY2tlci5wZXJmb3JtQ2hlY2soe1xuICAgICAgICAgICAgICAgICAgICBldmVudDogZXZlbnRcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBGb2N1cyBvbiB0aGUgZmlyc3QgaW52YWxpZCBlbGVtZW50XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gY2hlY2tIYW5kbGVycy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBjaGVja0hhbmRsZXIgPSBjaGVja0hhbmRsZXJzW2ldO1xuXG4gICAgICAgICAgICAgICAgaWYgKGNoZWNrSGFuZGxlci5nZXRTdGF0dXMoKS5zdGF0dXMgPT09IGNvbnN0YW50cy5JTlZBTElEKSB7XG4gICAgICAgICAgICAgICAgICAgIGNoZWNrSGFuZGxlci5lbGVtZW50LmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuXG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmVzIGVsZW1lbnRzIGNvbXBsZXRlbHkuXG4gICAgICovXG4gICAgZnVuY3Rpb24gcmVtb3ZlRWxlbWVudCAoc2VsZWN0b3IpIHtcbiAgICAgICAgdmFyIGVsZW1lbnRzID0gdXRpbC5nZXRFbGVtZW50cyhzZWxlY3Rvcik7XG5cbiAgICAgICAgZWxlbWVudHMuZm9yRWFjaChmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICAgICAgbGlzdGVuZXJzLnJlbW92ZUl0ZW0oZWxlbWVudCk7XG4gICAgICAgICAgICBjaGVja2Vycy5yZW1vdmVJdGVtKGVsZW1lbnQpO1xuICAgICAgICAgICAgY2hlY2tIYW5kbGVycy5yZW1vdmVJdGVtKGVsZW1lbnQpO1xuICAgICAgICAgICAgZG9tTm9kZXMucmVtb3ZlSXRlbShlbGVtZW50KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG5cblxuICAgIC8qKlxuICAgICAqIGNvbmZpZ3VyZVxuICAgICAqXG4gICAgICogQ2hhbmdlcyB0aGUgY29uZmlndXJhdGlvbiBvYmplY3QgdXNlZCB0aHJvdWdob3V0IHRoZSBjb2RlIGZvciBjbGFzc2VzLFxuICAgICAqIGRlbGF5cywgbWVzc2FnZXMsIGV0Yy5cbiAgICAgKlxuICAgICAqIEl0IGNhbiBlaXRoZXIgYmUgY2FsbGVkIHdpdGggYSBrZXkvdmFsdWUgcGFpciAodHdvIGFyZ3VtZW50cyksIG9yIHdpdGhcbiAgICAgKiBhbiBvYmplY3Qgd2l0aCBrZXkvdmFsdWUgcGFpcnMuXG4gICAgICovXG4gICAgZnVuY3Rpb24gY29uZmlndXJlIChhdHRyaWJ1dGVzLCB2YWx1ZSkge1xuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIHZhciBrID0gYXR0cmlidXRlcztcbiAgICAgICAgICAgIGF0dHJpYnV0ZXMgPSB7fTtcblxuICAgICAgICAgICAgYXR0cmlidXRlc1trXSA9IHZhbHVlO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yICh2YXIga2V5IGluIGF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICAgIGNvbmZpZ3VyYXRpb25ba2V5XSA9IGF0dHJpYnV0ZXNba2V5XTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChhdHRyaWJ1dGVzLnN1Ym1pdCB8fCBhdHRyaWJ1dGVzLmRpc2FibGVTdWJtaXQpIHtcbiAgICAgICAgICAgIHRvZ2dsZVN1Ym1pdCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGF0dHJpYnV0ZXMuZm9ybSkge1xuICAgICAgICAgICAgYWRkRm9ybShhdHRyaWJ1dGVzLmZvcm0pO1xuICAgICAgICB9XG4gICAgfVxuXG5cblxuICAgIC8qKlxuICAgICAqIHRvZ2dsZVN1Ym1pdFxuICAgICAqXG4gICAgICogVG9nZ2xlcyB0aGUgc3VibWl0IGJ1dHRvbiAoZW5hYmxlZCBpZiBldmVyeSBlbGVtZW50IGlzIHZhbGlkLCBvdGhlcndpc2VcbiAgICAgKiBkaXNhYmxlZCkuXG4gICAgICovXG4gICAgZnVuY3Rpb24gdG9nZ2xlU3VibWl0ICgpIHtcbiAgICAgICAgaWYgKGNvbmZpZ3VyYXRpb24uc3VibWl0ICYmIGNvbmZpZ3VyYXRpb24uZGlzYWJsZVN1Ym1pdCkge1xuICAgICAgICAgICAgdXRpbC5nZXRFbGVtZW50KGNvbmZpZ3VyYXRpb24uc3VibWl0KS5kaXNhYmxlZCA9ICFhcmVBbGwoY29uc3RhbnRzLlZBTElEKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG4gICAgLypcbiAgICAgKiBMaXN0ZW4gdG8gYWxsIGNoZWNrcywgYW5kIGlmIHRoZSB1c2VyIGhhcyBzZXQgaW4gdGhlIGNvbmZpZ3VyYXRpb24gdG9cbiAgICAgKiBlbmFibGUvZGlzYWJsZWQgdGhlIHN1Ym1pdCBidXR0b24sIHdlIGRvIHRoYXQuXG4gICAgICovXG4gICAgbWVkaWF0b3Iuc3Vic2NyaWJlKCdhbGwnLCB0b2dnbGVTdWJtaXQpO1xuXG5cbiAgICBmdW5jdGlvbiBhcmVBbGwgKHN0YXR1cykge1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gY2hlY2tIYW5kbGVycy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgaWYgKGNoZWNrSGFuZGxlcnNbaV0uZ2V0U3RhdHVzKCkuc3RhdHVzICE9PSBzdGF0dXMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cblxuICAgIGZ1bmN0aW9uIHNldE1lc3NhZ2VPcHRpb25zIChvcHRpb25zKSB7XG4gICAgICAgIHZhciBlbGVtZW50cyA9IHV0aWwuZ2V0RWxlbWVudHMob3B0aW9ucy5zZWxlY3Rvcik7XG5cbiAgICAgICAgZWxlbWVudHMuZm9yRWFjaChmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICAgICAgdmFyIGRvbU5vZGUgPSBkb21Ob2Rlcy5maW5kT3JNYWtlKGVsZW1lbnQpO1xuXG4gICAgICAgICAgICBkb21Ob2RlLnNldE1lc3NhZ2VPcHRpb25zKG9wdGlvbnMucGFyZW50LCBvcHRpb25zLmVycm9yU3Bhbik7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIExpc3RlbiB0byBhbGwgY2hlY2tzIGFuZCBhbGxvdyB0aGUgdXNlciB0byBsaXN0ZW4gaW4sIGlmIGhlIHNldCBhIGB0YXBgXG4gICAgICogZnVuY3Rpb24gaW4gdGhlIGNvbmZpZ3VyYXRpb24uXG4gICAgICovXG4gICAgbWVkaWF0b3Iuc3Vic2NyaWJlKCdhbGwnLCBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZ3VyYXRpb24udGFwID09PSAnZnVuY3Rpb24nICYmIG9wdGlvbnMudHlwZSA9PT0gJ2NoZWNrJykge1xuICAgICAgICAgICAgY29uZmlndXJhdGlvbi50YXAob3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuXG5cbiAgICBmdW5jdGlvbiBnZXRTdGF0dXMgKHNlbGVjdG9yLCBzaG93RXJyb3JNZXNzYWdlKSB7XG4gICAgICAgIHZhciBlbGVtZW50ID0gdXRpbC5nZXRFbGVtZW50KHNlbGVjdG9yKSxcbiAgICAgICAgICAgIHN0YXR1cyAgPSBjaGVja0hhbmRsZXJzLmZpbmRPck1ha2UoZWxlbWVudCkuZ2V0U3RhdHVzKCk7XG5cbiAgICAgICAgcmV0dXJuIHNob3dFcnJvck1lc3NhZ2UgPyBzdGF0dXMgOiBzdGF0dXMuc3RhdHVzO1xuICAgIH1cblxuXG5cbiAgICBmdW5jdGlvbiBwZXJmb3JtQ2hlY2sgKHNlbGVjdG9yKSB7XG4gICAgICAgIHZhciBjcyA9IHNlbGVjdG9yID8gdXRpbC5nZXRFbGVtZW50cyhzZWxlY3RvcikubWFwKGNoZWNrZXJzLmZpbmRPck1ha2UpIDogY2hlY2tlcnM7XG5cbiAgICAgICAgY3MuZm9yRWFjaChmdW5jdGlvbihjaGVja2VyKSB7XG4gICAgICAgICAgICBjaGVja2VyLnBlcmZvcm1DaGVjaygpO1xuICAgICAgICB9KTtcbiAgICB9XG5cblxuXG4gICAgLyoqXG4gICAgICogSW50ZXJuYWwgZnVuY3Rpb25zIHRoYXQgYXJlIGV4cG9zZWQgdG8gdGhlIHB1YmxpYy5cbiAgICAgKi9cbiAgICB2YXIgbm9kSW5zdGFjZSA9IHtcbiAgICAgICAgYWRkOiAgICAgICAgICAgICAgICAgICAgYWRkTWV0cmljcyxcbiAgICAgICAgcmVtb3ZlOiAgICAgICAgICAgICAgICAgcmVtb3ZlRWxlbWVudCxcbiAgICAgICAgYXJlQWxsOiAgICAgICAgICAgICAgICAgYXJlQWxsLFxuICAgICAgICBnZXRTdGF0dXM6ICAgICAgICAgICAgICBnZXRTdGF0dXMsXG4gICAgICAgIGNvbmZpZ3VyZTogICAgICAgICAgICAgIGNvbmZpZ3VyZSxcbiAgICAgICAgc2V0TWVzc2FnZU9wdGlvbnM6ICAgICAgc2V0TWVzc2FnZU9wdGlvbnMsXG4gICAgICAgIHBlcmZvcm1DaGVjazogICAgICAgICAgIHBlcmZvcm1DaGVja1xuICAgIH07XG5cbiAgICBpZiAoY29uZmlnKSB7XG4gICAgICAgIG5vZEluc3RhY2UuY29uZmlndXJlKGNvbmZpZyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5vZEluc3RhY2U7XG59XG5cbi8vIEJhY2t3YXJkcyBjb21wYXRpYmlsaXR5XG5ub2QuY29uc3RhbnRzID0gY29uc3RhbnRzO1xubm9kLmNsYXNzZXMgPSBjb25zdGFudHMuY2xhc3Nlcztcbm5vZC5jaGVja0Z1bmN0aW9ucyA9IGNoZWNrRnVuY3Rpb25zO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5vZDtcblxud2luZG93Lm5vZCA9IG5vZDtcbiIsImNvbnN0IHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxuXG4vKipcbiAqIG1ha2VMaXN0ZW5lclxuICpcbiAqIFRha2VzIGNhcmUgb2YgbGlzdGVuaW5nIHRvIGNoYW5nZXMgdG8gaXRzIGVsZW1lbnQgYW5kIGZpcmUgdGhlbSBvZmYgYXNcbiAqIGV2ZW50cyBvbiB0aGUgbWVkaWF0b3IgZm9yIGNoZWNrZXJzIHRvIGxpc3RlbiB0by5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSAoZWxlbWVudCwgbWVkaWF0b3IsIHRyaWdnZXJFdmVudHMsIGNvbmZpZ3VyYXRpb24pID0+IHtcbiAgICBjb25zdCBpZCA9IHV0aWwudW5pcXVlKCksXG4gICAgICAgICBjaGFuZ2VkID0gZXZlbnQgPT5cbiAgICAgICAgICAgIG1lZGlhdG9yLmZpcmUoe2lkLCBldmVudCwgdHlwZTogJ2NoYW5nZSd9KTtcblxuICAgIGxldCAkZWxlbWVudDtcblxuICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCBjaGFuZ2VkLCBmYWxzZSk7XG4gICAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBjaGFuZ2VkLCBmYWxzZSk7XG4gICAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdibHVyJywgY2hhbmdlZCwgZmFsc2UpO1xuXG4gICAgaWYgKGNvbmZpZ3VyYXRpb24ualF1ZXJ5KSB7XG4gICAgICAgICRlbGVtZW50ID0gY29uZmlndXJhdGlvbi5qUXVlcnkoZWxlbWVudCk7XG5cbiAgICAgICAgJGVsZW1lbnQub24oJ3Byb3BlcnR5Y2hhbmdlIGNoYW5nZSBjbGljayBrZXl1cCBpbnB1dCBwYXN0ZScsIGNoYW5nZWQpO1xuICAgIH1cblxuICAgIGlmICh0cmlnZ2VyRXZlbnRzKSB7XG4gICAgICAgIHRyaWdnZXJFdmVudHMgPSBBcnJheS5pc0FycmF5KHRyaWdnZXJFdmVudHMpID8gdHJpZ2dlckV2ZW50cyA6IFt0cmlnZ2VyRXZlbnRzXTtcblxuICAgICAgICB0cmlnZ2VyRXZlbnRzLmZvckVhY2goZXZlbnROYW1lID0+XG4gICAgICAgICAgICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBjaGFuZ2VkLCBmYWxzZSkpO1xuICAgIH1cblxuICAgIGNvbnN0IGRpc3Bvc2UgPSAoKSA9PiB7XG4gICAgICAgIGVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignaW5wdXQnLCBjaGFuZ2VkLCBmYWxzZSk7XG4gICAgICAgIGVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgY2hhbmdlZCwgZmFsc2UpO1xuICAgICAgICBlbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2JsdXInLCBjaGFuZ2VkLCBmYWxzZSk7XG5cbiAgICAgICAgaWYgKCRlbGVtZW50KSB7XG4gICAgICAgICAgICAkZWxlbWVudC5vZmYoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0cmlnZ2VyRXZlbnRzKSB7XG4gICAgICAgICAgICB0cmlnZ2VyRXZlbnRzLmZvckVhY2goZXZlbnROYW1lID0+XG4gICAgICAgICAgICAgICAgZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgY2hhbmdlZCwgZmFsc2UpKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4ge2VsZW1lbnQsIGRpc3Bvc2UsIGlkfTtcbn07XG5cbiIsIi8qKlxuICogbWVkaWF0b3JGYWN0b3J5XG4gKlxuICogTWluaW1hbCBpbXBsZW1lbnRhdGlvbiBvZiBhIG1lZGlhdG9yIHBhdHRlcm4sIHVzZWQgZm9yIGNvbW11bmljYXRpb25cbiAqIGJldHdlZW4gY2hlY2tlcnMgYW5kIGNoZWNrSGFuZGxlcnMgKGNoZWNrZXJzIGZpcmVzIGV2ZW50cyB3aGljaFxuICogaGFuZGxlcnMgY2FuIHN1YnNjcmliZSB0bykuIFVuaXF1ZSBJRCdzIGFyZSB1c2VkIHRvIHRlbGwgZXZlbnRzIGFwYXJ0LlxuICpcbiAqIFN1YnNjcmliaW5nIHRvICdhbGwnIHdpbGwgZ2l2ZSB5b3UgYWxsIHJlc3VsdHMgZnJvbSBhbGwgY2hlY2tzLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9ICgpID0+IHtcbiAgICB2YXIgc3Vic2NyaWJlcnMgPSBbXSxcbiAgICAgICAgYWxsID0gW107XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBzdWJzY3JpYmU6IChpZCwgZm4pID0+IHtcbiAgICAgICAgICAgIGlmIChpZCA9PT0gJ2FsbCcpIHtcbiAgICAgICAgICAgICAgICBhbGwucHVzaChmbik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICghc3Vic2NyaWJlcnNbaWRdKSB7XG4gICAgICAgICAgICAgICAgICAgIHN1YnNjcmliZXJzW2lkXSA9IFtdO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChzdWJzY3JpYmVyc1tpZF0uaW5kZXhPZihmbikgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIHN1YnNjcmliZXJzW2lkXS5wdXNoKGZuKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgZmlyZTogb3B0aW9ucyA9PlxuICAgICAgICAgICAgc3Vic2NyaWJlcnNbb3B0aW9ucy5pZF0uY29uY2F0KGFsbCkuZm9yRWFjaChmbiA9PiBmbihvcHRpb25zKSlcbiAgICB9O1xufTtcblxuIiwiY29uc3QgaWRlbnRpdHkgPSB4ID0+IHg7XG5cblxuLyoqXG4gKiBnZXRFbGVtZW50c1xuICpcbiAqIFRha2VzIHNvbWUgc29ydCBvZiBzZWxlY3RvciwgYW5kIHJldHVybnMgYW4gYXJyYXkgb2YgZWxlbWVudChzKS4gVGhlIGFwcGxpZWRcbiAqIHNlbGVjdG9yIGNhbiBiZSBvbmUgb2Y6XG4gKlxuICogLSBDc3MgdHlwZSBzZWxlY3RvciAoZS5nLiwgXCIuZm9vXCIpXG4gKiAtIEEgalF1ZXJ5IGVsZW1lbnQgKGUuZy4sICQoJy5mb28pKVxuICogLSBBIHNpbmdsZSByYXcgZG9tIGVsZW1lbnQgKGUuZy4sIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmb28nKSlcbiAqIC0gQSBsaXN0IG9mIHJhdyBkb20gZWxlbWVudCAoZS5nLiwgJCgnLmZvbycpLmdldCgpKVxuICovXG5jb25zdCBnZXRFbGVtZW50cyA9IHNlbGVjdG9yID0+IHtcbiAgICBpZiAoIXNlbGVjdG9yKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICAvLyBOb3JtYWwgY3NzIHR5cGUgc2VsZWN0b3IgaXMgYXNzdW1lZFxuICAgIGlmICh0eXBlb2Ygc2VsZWN0b3IgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIC8vIElmIHdlIGhhdmUgalF1ZXJ5LCB0aGVuIHdlIHVzZSB0aGF0IHRvIGNyZWF0ZSBhIGRvbSBsaXN0IGZvciB1cy5cbiAgICAgICAgaWYgKHdpbmRvdy5qUXVlcnkpIHtcbiAgICAgICAgICAgIHJldHVybiB3aW5kb3cualF1ZXJ5KHNlbGVjdG9yKS5nZXQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIG5vdCwgdGhlbiB3ZSBkbyBpdCB0aGUgbWFudWFsIHdheS5cbiAgICAgICAgdmFyIG5vZGVMaXN0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG5cbiAgICAgICAgcmV0dXJuIFtdLm1hcC5jYWxsKG5vZGVMaXN0LCBpZGVudGl0eSk7XG4gICAgfVxuXG4gICAgLy8gaWYgdXNlciBnYXZlIHVzIGpRdWVyeSBlbGVtZW50c1xuICAgIGlmIChzZWxlY3Rvci5qcXVlcnkpIHtcbiAgICAgICAgcmV0dXJuIHNlbGVjdG9yLmdldCgpO1xuICAgIH1cblxuICAgIC8vIFJhdyBET00gZWxlbWVudFxuICAgIGlmIChzZWxlY3Rvci5ub2RlVHlwZSA9PT0gMSkge1xuICAgICAgICByZXR1cm4gW3NlbGVjdG9yXTtcbiAgICB9XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShzZWxlY3RvcikpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuXG4gICAgICAgIHNlbGVjdG9yLmZvckVhY2goc2VsID0+IHJlc3VsdCA9IHJlc3VsdC5jb25jYXQoZ2V0RWxlbWVudHMoc2VsKSkpO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgdGhyb3cgJ1Vua25vd24gdHlwZSBvZiBlbGVtZW50cyBpbiB5b3VyIGBzZWxlY3RvcmA6ICcgKyBzZWxlY3Rvcjtcbn07XG5cbi8qKlxuICogZ2V0RWxlbWVudFxuICpcbiAqIFJldHVybnMgdGhlIGZpcnN0IGVsZW1lbnQgdGFyZ2V0ZWQgYnkgdGhlIHNlbGVjdG9yLiAoc2VlIGBnZXRFbGVtZW50c2ApXG4gKi9cbmNvbnN0IGdldEVsZW1lbnQgPSBzZWxlY3RvciA9PiBnZXRFbGVtZW50cyhzZWxlY3RvcilbMF07XG5cbi8vIEhlbHBlciBmdW5jdGlvbnMgZm9yIGBtYWtlRG9tTm9kZWAuXG5jb25zdCBoYXNDbGFzcyA9IChjbGFzc05hbWUsIGVsKSA9PiB7XG4gICAgaWYgKGVsLmNsYXNzTGlzdCkge1xuICAgICAgICByZXR1cm4gZWwuY2xhc3NMaXN0LmNvbnRhaW5zKGNsYXNzTmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuICEhZWwuY2xhc3NOYW1lLm1hdGNoKG5ldyBSZWdFeHAoJyhcXFxcc3xeKScrY2xhc3NOYW1lKycoXFxcXHN8JCknKSk7XG4gICAgfVxufTtcblxuY29uc3QgcmVtb3ZlQ2xhc3MgPSAoY2xhc3NOYW1lLCBlbCkgPT4ge1xuICAgIGlmIChlbC5jbGFzc0xpc3QpIHtcbiAgICAgICAgZWwuY2xhc3NMaXN0LnJlbW92ZShjbGFzc05hbWUpO1xuICAgIH0gZWxzZSBpZiAoaGFzQ2xhc3MoY2xhc3NOYW1lLCBlbCkpIHtcbiAgICAgICAgICAgIGVsLmNsYXNzTmFtZSA9IGVsLmNsYXNzTmFtZS5yZXBsYWNlKG5ldyBSZWdFeHAoJyg/Ol58XFxcXHMpJytjbGFzc05hbWUrJyg/IVxcXFxTKScpLCAnJyk7XG4gICAgfVxufTtcblxuY29uc3QgYWRkQ2xhc3MgPSAoY2xhc3NOYW1lLCBlbCkgPT4ge1xuICAgIGlmIChlbC5jbGFzc0xpc3QpIHtcbiAgICAgICAgZWwuY2xhc3NMaXN0LmFkZChjbGFzc05hbWUpO1xuICAgIH0gZWxzZSBpZiAoIWhhc0NsYXNzKGNsYXNzTmFtZSwgZWwpKSB7XG4gICAgICAgIGVsLmNsYXNzTmFtZSArPSAnICcgKyBjbGFzc05hbWU7XG4gICAgfVxufTtcblxuXG5jb25zdCBmaW5kUGFyZW50V2l0aENsYXNzID0gKHBhcmVudCwga2xhc3MpID0+IHtcbiAgICAvLyBHdWFyZCAob25seSB0aGUgYHdpbmRvd2AgZG9lcyBub3QgaGF2ZSBhIHBhcmVudCkuXG4gICAgaWYgKCFwYXJlbnQucGFyZW50Tm9kZSkge1xuICAgICAgICByZXR1cm4gcGFyZW50O1xuICAgIH1cblxuICAgIC8vIEZvdW5kIGl0XG4gICAgaWYgKGhhc0NsYXNzKGtsYXNzLCBwYXJlbnQpKSB7XG4gICAgICAgIHJldHVybiBwYXJlbnQ7XG4gICAgfVxuXG4gICAgLy8gVHJ5IG5leHQgcGFyZW50IChyZWN1cnNpb24pXG4gICAgcmV0dXJuIGZpbmRQYXJlbnRXaXRoQ2xhc3MocGFyZW50LnBhcmVudE5vZGUsIGtsYXNzKTtcbn07XG5cbmNvbnN0IGdldFBhcmVudCA9IChlbGVtZW50LCBjb25maWd1cmF0aW9uKSA9PiB7XG4gICAgbGV0IGtsYXNzID0gY29uZmlndXJhdGlvbi5wYXJlbnRDbGFzcztcblxuICAgIGlmICgha2xhc3MpIHtcbiAgICAgICAgcmV0dXJuIGVsZW1lbnQucGFyZW50Tm9kZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBrbGFzcyA9IGtsYXNzLmNoYXJBdCgwKSA9PT0gJy4nID8ga2xhc3Muc2xpY2UoMSkgOiBrbGFzcztcblxuICAgICAgICByZXR1cm4gZmluZFBhcmVudFdpdGhDbGFzcyhlbGVtZW50LnBhcmVudE5vZGUsIGtsYXNzKTtcbiAgICB9XG59O1xuXG5cbi8vIEhlbHBlciBmdW5jdGlvbiB0byBjcmVhdGUgdW5pcXVlIGlkJ3NcbmNvbnN0IHVuaXF1ZSA9IChmdW5jdGlvbiAoKSB7XG4gICAgbGV0IHVuaXF1ZUNvdW50ZXIgPSAwO1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHVuaXF1ZUNvdW50ZXIrKztcbiAgICB9O1xufSkoKTtcblxuXG5jb25zdCBvciA9ICh4LCB5KSA9PiB4IHx8IHk7XG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBnZXRFbGVtZW50cyxcbiAgICBnZXRFbGVtZW50LFxuICAgIGdldFBhcmVudCxcbiAgICBoYXNDbGFzcyxcbiAgICBhZGRDbGFzcyxcbiAgICByZW1vdmVDbGFzcyxcbiAgICB1bmlxdWUsXG4gICAgb3Jcbn07XG4iXX0=
