(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var util = require("./util");

// Collection of built-in check functions
var checkFunctions = {
    presence: function presence() {
        return function presence(callback, value) {
            callback(value.length > 0);
        };
    },

    exact: function exact(exactValue) {
        return function exact(callback, value) {
            callback(value === exactValue);
        };
    },

    contains: function contains(containsValue) {
        return function contains(callback, value) {
            callback(value.indexOf(containsValue) > -1);
        };
    },

    not: function not(exactValue) {
        return function not(callback, value) {
            callback(value !== exactValue);
        };
    },

    "min-length": function minLength(minimumLength) {
        return function minLength(callback, value) {
            callback(value.length >= minimumLength);
        };
    },

    "max-length": function maxLength(maximumLength) {
        return function maxLength(callback, value) {
            callback(value.length <= maximumLength);
        };
    },

    "exact-length": function exactLength(exactLen) {
        return function exactLength(callback, value) {
            callback(value.length === +exactLen);
        };
    },

    "between-length": function betweenLength(minimumLength, maximumLength) {
        return function betweenLength(callback, value) {
            callback(value.length >= minimumLength && value.length <= maximumLength);
        };
    },

    "max-number": function maxNumber(maximumNumber) {
        return function maxNumber(callback, value) {
            callback(+value <= maximumNumber);
        };
    },

    "min-number": function minNumber(minimumNumber) {
        return function minNumber(callback, value) {
            callback(+value <= minimumNumber);
        };
    },

    "between-number": function betweenNumber(minimumNumber, maximumNumber) {
        return function betweenNumber(callback, value) {
            callback(+value >= minimumNumber && +value <= maximumNumber);
        };
    },

    integer: function integer() {
        return function (callback, value) {
            callback(/^\s*\d+\s*$/.test(value));
        };
    },

    float: function float() {
        return function (callback, value) {
            callback(/^[-+]?[0-9]+(\.[0-9]+)?$/.test(value));
        };
    },

    "same-as": function sameAs(selector) {
        var sameAsElement = util.getElement(selector);

        return function sameAs(callback, value, options) {
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

    "one-of": function oneOf(selector) {
        var elements = util.getElements(selector);

        function getValues() {
            return elements.reduce(function (memo, element) {
                return memo + "" + (element.value || "");
            }, "");
        }

        return function oneOf(callback) {
            callback(getValues().trim().length > 0);
        };
    },

    "only-one-of": function onlyOneOf(selector) {
        var elements = util.getElements(selector);

        return function onlyOneOf(callback, value) {
            var numOfValues = 0;

            elements.forEach(function (element) {
                if (element.value) {
                    numOfValues++;
                }
            });

            callback(numOfValues === 1);
        };
    },

    checked: function checked() {
        return function checked(callback, value, options) {
            callback(options.element.checked);
        };
    },

    "some-radio": function someRadio(selector) {
        var radioElements = util.getElements(selector);

        return function someRadio(callback, value, options) {
            var result = radioElements.reduce(function (memo, element) {
                return memo || element.checked;
            }, false);

            callback(result);
        };
    },

    regexp: function regexp(reg) {
        return function regExp(callback, value) {
            callback(reg.test(value));
        };
    },

    email: function email() {
        var RFC822 = /^([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22))*\x40([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d))*$/;

        return function email(callback, value) {
            callback(RFC822.test(value));
        };
    } };

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

},{"./util":11}],2:[function(require,module,exports){
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
    }
};

},{}],3:[function(require,module,exports){
"use strict";

var util = require("./util"),
    constants = require("./constants"),
    makeMediator = require("./makeMediator"),
    makeEventEmitter = require("./makeEventEmitter"),
    makeCollection = require("./makeCollection"),
    makeListener = require("./makeListener"),
    makeChecker = require("./makeChecker"),
    makeCheckHandler = require("./makeCheckHandler"),
    makeDomNode = require("./makeDomNode"),
    checkFunctions = require("./checkFunctions");

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

module.exports = function nod(config) {
    var form,
        configuration = {},
        mediator = makeMediator(),
        eventEmitter = makeEventEmitter(mediator),

    // Creating (empty) collections
    listeners = makeCollection(makeListener),
        checkers = makeCollection(makeChecker),
        checkHandlers = makeCollection(makeCheckHandler),
        domNodes = makeCollection(makeDomNode);

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
        checkFunction = checkFunctions(metric),

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
                eventEmitter.subscribe(metricSet.checkHandler.id);
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
};

},{"./checkFunctions":1,"./constants":2,"./makeCheckHandler":4,"./makeChecker":5,"./makeCollection":6,"./makeDomNode":7,"./makeEventEmitter":8,"./makeListener":9,"./makeMediator":10,"./util":11}],4:[function(require,module,exports){
"use strict";

var util = require("./util"),
    constants = require("./constants");

/**
 * makeCheckHandler
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

},{"./constants":2,"./util":11}],5:[function(require,module,exports){
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
"use strict";

module.exports = function makeChecker(element, mediator) {
    var checks = [];

    function subscribeTo(id) {
        mediator.subscribe(id, performCheck);
    }

    // Run every check function against the value of the element.
    function performCheck(options) {
        checks.forEach(function (check) {
            check(options || {});
        });
    }

    // Add a check function to the element. The result will be handed off
    // to the mediator (for checkHandlers to evaluate).
    function addCheck(checkFunction, id) {
        function callback(result) {
            mediator.fire({
                id: id,
                type: "check",
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
        subscribeTo: subscribeTo,
        addCheck: addCheck,
        performCheck: performCheck,
        element: element
    };
};

},{}],6:[function(require,module,exports){
"use strict";

function findCollectionIndex(collection, element) {
    for (var i in collection) {
        if (collection[i].element === element) {
            return i;
        }
    }

    return -1;
}

/**
 * makeCollection
 *
 * A minimal implementation of a "collection", inspired by collections from
 * BackboneJS. Used by listeners, checkers, and checkHandlers.
 */
module.exports = function makeCollection(maker) {
    var collection = [];

    collection.findOrMake = function (element) {
        var index = findCollectionIndex(collection, element);

        // Found
        if (index !== -1) {
            return collection[index];
        }

        // None found, let's make one then.
        var item = maker.apply(null, arguments);
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

},{}],7:[function(require,module,exports){
"use strict";

var util = require("./util"),
    constants = require("./constants");

/**
 * makeDomNode
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
    function updateParent(status) {
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
    }

    // Updates the text and class according to the status.
    function updateSpan(status, errorMessage) {
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
    }

    function set(options) {
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
    }

    function subscribeTo(id) {
        mediator.subscribe(id, set);
    }

    function setMessageOptions(parentContainer, message) {
        if (parentContainer) {
            parent = util.getElement(parentContainer);
        }

        if (message) {
            span.parentNode.removeChild(span); // Remove old span.
            span = util.getElement(message); // Set the new one.
            customSpan = true; // So we won't delete it.
        }
    }

    function dispose() {
        // First remove any classes
        util.removeClass(configuration.errorClass || constants.classes.errorClass, parent);
        util.removeClass(configuration.successClass || constants.classes.successClass, parent);

        // Then we remove the span if it wasn't one that was set by the user.
        if (!customSpan) {
            span.parentNode.removeChild(span);
        }
    }

    return {
        subscribeTo: subscribeTo,
        element: element,
        setMessageOptions: setMessageOptions,
        dispose: dispose
    };
};

},{"./constants":2,"./util":11}],8:[function(require,module,exports){
"use strict";

module.exports = function (mediator) {
    var customEvent;

    function emit(options) {
        if (CustomEvent) {
            customEvent = new CustomEvent("nod.validation", { detail: options });

            options.element.dispatchEvent(customEvent);
        } else {
            throw "nod.validate tried to fire a custom event, but the browser does not support CustomEvent's";
        }
    }

    function subscribe(id) {
        mediator.subscribe(id, emit);
    }

    return {
        subscribe: subscribe
    };
};

},{}],9:[function(require,module,exports){
"use strict";

var util = require("./util");

/**
 * makeListener
 *
 * Takes care of listening to changes to its element and fire them off as
 * events on the mediator for checkers to listen to.
 */
module.exports = function makeListener(element, mediator, triggerEvents, configuration) {
    var id = util.unique(),
        $element;

    function changed(event) {
        mediator.fire({
            id: id,
            event: event,
            type: "change"
        });
    }

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
            element.addEventListener(eventName, changed, false);
        });
    }

    function dispose() {
        element.removeEventListener("input", changed, false);
        element.removeEventListener("change", changed, false);
        element.removeEventListener("blur", changed, false);

        if ($element) {
            $element.off();
        }

        if (triggerEvents) {
            triggerEvents.forEach(function (eventName) {
                element.removeEventListener(eventName, changed, false);
            });
        }
    }

    return {
        element: element,
        dispose: dispose,
        id: id
    };
};

},{"./util":11}],10:[function(require,module,exports){
/**
 * makeMediator
 *
 * Minimal implementation of a mediator pattern, used for communication
 * between checkers and checkHandlers (checkers fires events which
 * handlers can subscribe to). Unique ID's are used to tell events apart.
 *
 * Subscribing to 'all' will give you all results from all checks.
 */
"use strict";

module.exports = function makeMediator() {
    var subscribers = [],
        all = [];

    return {
        subscribe: function subscribe(id, fn) {
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

        fire: function fire(options) {
            var subscribedFunctions = subscribers[options.id].concat(all);

            subscribedFunctions.forEach(function (subscribedFunction) {
                subscribedFunction(options);
            });
        }
    };
};

},{}],11:[function(require,module,exports){
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
"use strict";

function getElements(selector) {
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

        return [].map.call(nodeList, function (el) {
            return el;
        });
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
            var elements = getElements(sel);

            result = result.concat(elements);
        });

        return result;
    }

    throw "Unknown type of elements in your `selector`: " + selector;
}

/**
 * getElement
 *
 * Returns the first element targeted by the selector. (see `getElements`)
 */
function getElement(selector) {
    return getElements(selector)[0];
}

// Helper functions for `makeDomNode`.
function hasClass(className, el) {
    if (el.classList) {
        return el.classList.contains(className);
    } else {
        return !!el.className.match(new RegExp("(\\s|^)" + className + "(\\s|$)"));
    }
}

function removeClass(className, el) {
    if (el.classList) {
        el.classList.remove(className);
    } else if (hasClass(className, el)) {
        el.className = el.className.replace(new RegExp("(?:^|\\s)" + className + "(?!\\S)"), "");
    }
}

function addClass(className, el) {
    if (el.classList) {
        el.classList.add(className);
    } else if (!hasClass(className, el)) {
        el.className += " " + className;
    }
}

function findParentWithClass(_x, _x2) {
    var _again = true;

    _function: while (_again) {
        _again = false;
        var parent = _x,
            klass = _x2;

        // Guard (only the `window` does not have a parent).
        if (!parent.parentNode) {
            return parent;
        }

        // Found it
        if (hasClass(klass, parent)) {
            return parent;
        }

        _x = parent.parentNode;
        _x2 = klass;
        _again = true;
        continue _function;
    }
}

function getParent(element, configuration) {
    var klass = configuration.parentClass;

    if (!klass) {
        return element.parentNode;
    } else {
        klass = klass.charAt(0) === "." ? klass.slice(1) : klass;

        return findParentWithClass(element.parentNode, klass);
    }
}

// Helper function to create unique id's
var unique = (function () {
    var uniqueCounter = 0;

    return function () {
        return uniqueCounter++;
    };
})();

module.exports = {
    getElements: getElements,
    getElement: getElement,
    getParent: getParent,
    hasClass: hasClass,
    addClass: addClass,
    removeClass: removeClass,
    unique: unique
};
// Try next parent (recursion)

},{}]},{},[3])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvZy9jb2RlL25vZF9wcm9qZWN0L25vZC9zcmMvY2hlY2tGdW5jdGlvbnMuanMiLCIvVXNlcnMvZy9jb2RlL25vZF9wcm9qZWN0L25vZC9zcmMvY29uc3RhbnRzLmpzIiwiL1VzZXJzL2cvY29kZS9ub2RfcHJvamVjdC9ub2Qvc3JjL2luZGV4LmpzIiwiL1VzZXJzL2cvY29kZS9ub2RfcHJvamVjdC9ub2Qvc3JjL21ha2VDaGVja0hhbmRsZXIuanMiLCIvVXNlcnMvZy9jb2RlL25vZF9wcm9qZWN0L25vZC9zcmMvbWFrZUNoZWNrZXIuanMiLCIvVXNlcnMvZy9jb2RlL25vZF9wcm9qZWN0L25vZC9zcmMvbWFrZUNvbGxlY3Rpb24uanMiLCIvVXNlcnMvZy9jb2RlL25vZF9wcm9qZWN0L25vZC9zcmMvbWFrZURvbU5vZGUuanMiLCIvVXNlcnMvZy9jb2RlL25vZF9wcm9qZWN0L25vZC9zcmMvbWFrZUV2ZW50RW1pdHRlci5qcyIsIi9Vc2Vycy9nL2NvZGUvbm9kX3Byb2plY3Qvbm9kL3NyYy9tYWtlTGlzdGVuZXIuanMiLCIvVXNlcnMvZy9jb2RlL25vZF9wcm9qZWN0L25vZC9zcmMvbWFrZU1lZGlhdG9yLmpzIiwiL1VzZXJzL2cvY29kZS9ub2RfcHJvamVjdC9ub2Qvc3JjL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztBQ0FBLElBQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQzs7O0FBRy9CLElBQUksY0FBYyxHQUFHO0FBQ2pCLGNBQVksb0JBQVk7QUFDcEIsZUFBTyxTQUFTLFFBQVEsQ0FBRSxRQUFRLEVBQUUsS0FBSyxFQUFFO0FBQ3ZDLG9CQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztTQUM5QixDQUFDO0tBQ0w7O0FBRUQsV0FBUyxlQUFVLFVB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QUFDLEtBQUssR0FBRyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDOztBQUV6RCxlQUFPLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUM7S0FDekQ7Q0FDSjs7O0FBSUQsSUFBTSxNQUFNLEdBQUcsQ0FBQyxZQUFZO0FBQ3hCLFFBQUksYUFBYSxHQUFHLENBQUMsQ0FBQzs7QUFFdEIsV0FBTyxZQUFZO0FBQ2YsZUFBTyxhQUFhLEVBQUUsQ0FBQztLQUMxQixDQUFDO0NBQ0wsQ0FBQSxFQUFHLENBQUM7O0FBR0wsTUFBTSxDQUFDLE9BQU8sR0FBRztBQUNiLGVBQVcsRUFBWCxXQUFXO0FBQ1gsY0FBVSxFQUFWLFVBQVU7QUFDVixhQUFTLEVBQVQsU0FBUztBQUNULFlBQVEsRUFBUixRQUFRO0FBQ1IsWUFBUSxFQUFSLFFBQVE7QUFDUixlQUFXLEVBQVgsV0FBVztBQUNYLFVBQU0sRUFBTixNQUFNO0NBQ1QsQ0FBQyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJjb25zdCB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cbi8vIENvbGxlY3Rpb24gb2YgYnVpbHQtaW4gY2hlY2sgZnVuY3Rpb25zXG52YXIgY2hlY2tGdW5jdGlvbnMgPSB7XG4gICAgJ3ByZXNlbmNlJzogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gcHJlc2VuY2UgKGNhbGxiYWNrLCB2YWx1ZSkge1xuICAgICAgICAgICAgY2FsbGJhY2sodmFsdWUubGVuZ3RoID4gMCk7XG4gICAgICAgIH07XG4gICAgfSxcblxuICAgICdleGFjdCc6IGZ1bmN0aW9uIChleGFjdFZhbHVlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBleGFjdCAoY2FsbGJhY2ssIHZhbHVlKSB7XG4gICAgICAgICAgICBjYWxsYmFjayh2YWx1ZSA9PT0gZXhhY3RWYWx1ZSk7XG4gICAgICAgIH07XG4gICAgfSxcblxuICAgICdjb250YWlucyc6IGZ1bmN0aW9uIChjb250YWluc1ZhbHVlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBjb250YWlucyAoY2FsbGJhY2ssIHZhbHVlKSB7XG4gICAgICAgICAgICBjYWxsYmFjayh2YWx1ZS5pbmRleE9mKGNvbnRhaW5zVmFsdWUpID4gLTEpO1xuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAnbm90JzogZnVuY3Rpb24gKGV4YWN0VmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5vdCAoY2FsbGJhY2ssIHZhbHVlKSB7XG4gICAgICAgICAgICBjYWxsYmFjayh2YWx1ZSAhPT0gZXhhY3RWYWx1ZSk7XG4gICAgICAgIH07XG4gICAgfSxcblxuICAgICdtaW4tbGVuZ3RoJzogZnVuY3Rpb24gKG1pbmltdW1MZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG1pbkxlbmd0aCAoY2FsbGJhY2ssIHZhbHVlKSB7XG4gICAgICAgICAgICBjYWxsYmFjayh2YWx1ZS5sZW5ndGggPj0gbWluaW11bUxlbmd0aCk7XG4gICAgICAgIH07XG4gICAgfSxcblxuICAgICdtYXgtbGVuZ3RoJzogZnVuY3Rpb24gKG1heGltdW1MZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG1heExlbmd0aCAoY2FsbGJhY2ssIHZhbHVlKSB7XG4gICAgICAgICAgICBjYWxsYmFjayh2YWx1ZS5sZW5ndGggPD0gbWF4aW11bUxlbmd0aCk7XG4gICAgICAgIH07XG4gICAgfSxcblxuICAgICdleGFjdC1sZW5ndGgnOiBmdW5jdGlvbiAoZXhhY3RMZW4pIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIGV4YWN0TGVuZ3RoIChjYWxsYmFjaywgdmFsdWUpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHZhbHVlLmxlbmd0aCA9PT0gK2V4YWN0TGVuKTtcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgJ2JldHdlZW4tbGVuZ3RoJzogZnVuY3Rpb24gKG1pbmltdW1MZW5ndGgsIG1heGltdW1MZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIGJldHdlZW5MZW5ndGggKGNhbGxiYWNrLCB2YWx1ZSkge1xuICAgICAgICAgICAgY2FsbGJhY2sodmFsdWUubGVuZ3RoID49IG1pbmltdW1MZW5ndGggJiYgdmFsdWUubGVuZ3RoIDw9IG1heGltdW1MZW5ndGgpO1xuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAnbWF4LW51bWJlcic6IGZ1bmN0aW9uIChtYXhpbXVtTnVtYmVyKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBtYXhOdW1iZXIgKGNhbGxiYWNrLCB2YWx1ZSkge1xuICAgICAgICAgICAgY2FsbGJhY2soK3ZhbHVlIDw9IG1heGltdW1OdW1iZXIpO1xuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAnbWluLW51bWJlcic6IGZ1bmN0aW9uIChtaW5pbXVtTnVtYmVyKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBtaW5OdW1iZXIgKGNhbGxiYWNrLCB2YWx1ZSkge1xuICAgICAgICAgICAgY2FsbGJhY2soK3ZhbHVlIDw9IG1pbmltdW1OdW1iZXIpO1xuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAnYmV0d2Vlbi1udW1iZXInOiBmdW5jdGlvbiAobWluaW11bU51bWJlciwgbWF4aW11bU51bWJlcikge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gYmV0d2Vlbk51bWJlciAoY2FsbGJhY2ssIHZhbHVlKSB7XG4gICAgICAgICAgICBjYWxsYmFjaygrdmFsdWUgPj0gbWluaW11bU51bWJlciAmJiArdmFsdWUgPD0gbWF4aW11bU51bWJlcik7XG4gICAgICAgIH07XG4gICAgfSxcblxuICAgICdpbnRlZ2VyJzogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGNhbGxiYWNrLCB2YWx1ZSkge1xuICAgICAgICAgICAgY2FsbGJhY2soL15cXHMqXFxkK1xccyokLy50ZXN0KHZhbHVlKSk7XG4gICAgICAgIH07XG4gICAgfSxcblxuICAgICdmbG9hdCc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChjYWxsYmFjaywgdmFsdWUpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKC9eWy0rXT9bMC05XSsoXFwuWzAtOV0rKT8kLy50ZXN0KHZhbHVlKSk7XG4gICAgICAgIH07XG4gICAgfSxcblxuICAgICdzYW1lLWFzJzogZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgICAgIHZhciBzYW1lQXNFbGVtZW50ID0gdXRpbC5nZXRFbGVtZW50KHNlbGVjdG9yKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gc2FtZUFzIChjYWxsYmFjaywgdmFsdWUsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIC8vICdzYW1lLWFzJyBpcyBzcGVjaWFsLCBpbiB0aGF0IGlmIGl0IGlzIHRyaWdnZXJlZCBieSBhbm90aGVyXG4gICAgICAgICAgICAvLyBmaWVsZCAodGhlIG9uZSBpdCBzaG91bGQgYmUgc2ltaWxhciB0byksIGFuZCB0aGUgZmllbGQgaXRzZWxmIGlzXG4gICAgICAgICAgICAvLyBlbXB0eSwgdGhlbiBpdCBiYWlscyBvdXQgd2l0aG91dCBhIGNoZWNrLiBUaGlzIGlzIHRvIGF2b2lkXG4gICAgICAgICAgICAvLyBzaG93aW5nIGFuIGVycm9yIG1lc3NhZ2UgYmVmb3JlIHRoZSB1c2VyIGhhcyBldmVuIHJlYWNoZWQgdGhlXG4gICAgICAgICAgICAvLyBlbGVtZW50LlxuICAgICAgICAgICAgaWYgKCAgICBvcHRpb25zICYmXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMuZXZlbnQgJiZcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5ldmVudC50YXJnZXQgJiZcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5ldmVudC50YXJnZXQgIT09IG9wdGlvbnMuZWxlbWVudCAmJlxuICAgICAgICAgICAgICAgICAgICB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNhbGxiYWNrKHZhbHVlID09PSBzYW1lQXNFbGVtZW50LnZhbHVlKTtcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgJ29uZS1vZic6IGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgICB2YXIgZWxlbWVudHMgPSB1dGlsLmdldEVsZW1lbnRzKHNlbGVjdG9yKTtcblxuICAgICAgICBmdW5jdGlvbiBnZXRWYWx1ZXMgKCkge1xuICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnRzLnJlZHVjZShmdW5jdGlvbiAobWVtbywgZWxlbWVudCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBtZW1vICsgXCJcIiArIChlbGVtZW50LnZhbHVlIHx8IFwiXCIpO1xuICAgICAgICAgICAgfSwgXCJcIik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gb25lT2YgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhnZXRWYWx1ZXMoKS50cmltKCkubGVuZ3RoID4gMCk7XG4gICAgICAgIH07XG4gICAgfSxcblxuICAgICdvbmx5LW9uZS1vZic6IGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgICB2YXIgZWxlbWVudHMgPSB1dGlsLmdldEVsZW1lbnRzKHNlbGVjdG9yKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gb25seU9uZU9mIChjYWxsYmFjaywgdmFsdWUpIHtcbiAgICAgICAgICAgIHZhciBudW1PZlZhbHVlcyA9IDA7XG5cbiAgICAgICAgICAgIGVsZW1lbnRzLmZvckVhY2goZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICBpZiAoZWxlbWVudC52YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBudW1PZlZhbHVlcysrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBjYWxsYmFjayhudW1PZlZhbHVlcyA9PT0gMSk7XG4gICAgICAgIH07XG4gICAgfSxcblxuICAgICdjaGVja2VkJzogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gY2hlY2tlZCAoY2FsbGJhY2ssIHZhbHVlLCBvcHRpb25zKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhvcHRpb25zLmVsZW1lbnQuY2hlY2tlZCk7XG4gICAgICAgIH07XG4gICAgfSxcblxuICAgICdzb21lLXJhZGlvJzogZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgICAgIHZhciByYWRpb0VsZW1lbnRzID0gdXRpbC5nZXRFbGVtZW50cyhzZWxlY3Rvcik7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIHNvbWVSYWRpbyAoY2FsbGJhY2ssIHZhbHVlLCBvcHRpb25zKSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gcmFkaW9FbGVtZW50cy5yZWR1Y2UoZnVuY3Rpb24gKG1lbW8sIGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbWVtbyB8fCBlbGVtZW50LmNoZWNrZWQ7XG4gICAgICAgICAgICB9LCBmYWxzZSk7XG5cbiAgICAgICAgICAgIGNhbGxiYWNrKHJlc3VsdCk7XG4gICAgICAgIH07XG4gICAgfSxcblxuICAgICdyZWdleHAnOiBmdW5jdGlvbiAocmVnKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiByZWdFeHAgKGNhbGxiYWNrLCB2YWx1ZSkge1xuICAgICAgICAgICAgY2FsbGJhY2socmVnLnRlc3QodmFsdWUpKTtcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgJ2VtYWlsJzogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgUkZDODIyID0gL14oW15cXHgwMC1cXHgyMFxceDIyXFx4MjhcXHgyOVxceDJjXFx4MmVcXHgzYS1cXHgzY1xceDNlXFx4NDBcXHg1Yi1cXHg1ZFxceDdmLVxceGZmXSt8XFx4MjIoW15cXHgwZFxceDIyXFx4NWNcXHg4MC1cXHhmZl18XFx4NWNbXFx4MDAtXFx4N2ZdKSpcXHgyMikoXFx4MmUoW15cXHgwMC1cXHgyMFxceDIyXFx4MjhcXHgyOVxceDJjXFx4MmVcXHgzYS1cXHgzY1xceDNlXFx4NDBcXHg1Yi1cXHg1ZFxceDdmLVxceGZmXSt8XFx4MjIoW15cXHgwZFxceDIyXFx4NWNcXHg4MC1cXHhmZl18XFx4NWNbXFx4MDAtXFx4N2ZdKSpcXHgyMikpKlxceDQwKFteXFx4MDAtXFx4MjBcXHgyMlxceDI4XFx4MjlcXHgyY1xceDJlXFx4M2EtXFx4M2NcXHgzZVxceDQwXFx4NWItXFx4NWRcXHg3Zi1cXHhmZl0rfFxceDViKFteXFx4MGRcXHg1Yi1cXHg1ZFxceDgwLVxceGZmXXxcXHg1Y1tcXHgwMC1cXHg3Zl0pKlxceDVkKShcXHgyZShbXlxceDAwLVxceDIwXFx4MjJcXHgyOFxceDI5XFx4MmNcXHgyZVxceDNhLVxceDNjXFx4M2VcXHg0MFxceDViLVxceDVkXFx4N2YtXFx4ZmZdK3xcXHg1YihbXlxceDBkXFx4NWItXFx4NWRcXHg4MC1cXHhmZl18XFx4NWNbXFx4MDAtXFx4N2ZdKSpcXHg1ZCkpKiQvO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBlbWFpbCAoY2FsbGJhY2ssIHZhbHVlKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhSRkM4MjIudGVzdCh2YWx1ZSkpO1xuICAgICAgICB9O1xuICAgIH0sXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChtZXRyaWMpIHtcbiAgICBpZiAodHlwZW9mIG1ldHJpYy52YWxpZGF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICByZXR1cm4gbWV0cmljLnZhbGlkYXRlO1xuICAgIH1cblxuICAgIGlmIChtZXRyaWMudmFsaWRhdGUgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgICAgcmV0dXJuIGNoZWNrRnVuY3Rpb25zLnJlZ2V4cChtZXRyaWMudmFsaWRhdGUpO1xuICAgIH1cblxuICAgIHZhciBhcmdzICAgPSBtZXRyaWMudmFsaWRhdGUuc3BsaXQoJzonKSxcbiAgICAgICAgZm5OYW1lID0gYXJncy5zaGlmdCgpO1xuXG4gICAgaWYgKGZuTmFtZSA9PT0gJ29uZS1vZicgfHwgZm5OYW1lID09PSAnb25seS1vbmUtb2YnIHx8XG4gICAgICAgIGZuTmFtZSA9PT0gJ3NhbWUtYXMnIHx8IGZuTmFtZSA9PT0gJ3NvbWUtcmFkaW8nKSB7XG5cbiAgICAgICAgYXJncy5wdXNoKG1ldHJpYy5zZWxlY3Rvcik7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBjaGVja0Z1bmN0aW9uc1tmbk5hbWVdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHJldHVybiBjaGVja0Z1bmN0aW9uc1tmbk5hbWVdLmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93ICdDb3VsZG5cXCd0IGZpbmQgeW91ciB2YWxpZGF0b3IgZnVuY3Rpb24gXCInICsgZm5OYW1lICsgJ1wiIGZvciBcIicgKyBtZXRyaWMuc2VsZWN0b3IgKyAnXCInO1xuICAgIH1cbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBWQUxJRDogICAgICAgICAgJ3ZhbGlkJyxcbiAgICBJTlZBTElEOiAgICAgICAgJ2ludmFsaWQnLFxuICAgIFVOQ0hFQ0tFRDogICAgICAndW5jaGVja2VkJyxcbiAgICBjbGFzc2VzOiB7XG4gICAgICAgIHN1Y2Nlc3NDbGFzczogICAgICAgICAnbm9kLXN1Y2Nlc3MnLFxuICAgICAgICBzdWNjZXNzTWVzc2FnZUNsYXNzOiAgJ25vZC1zdWNjZXNzLW1lc3NhZ2UnLFxuICAgICAgICBlcnJvckNsYXNzOiAgICAgICAgICAgJ25vZC1lcnJvcicsXG4gICAgICAgIGVycm9yTWVzc2FnZUNsYXNzOiAgICAnbm9kLWVycm9yLW1lc3NhZ2UnXG4gICAgfVxufTtcblxuIiwiY29uc3QgdXRpbCAgICAgICAgICAgICAgICAgICAgICAgICAgPSByZXF1aXJlKCcuL3V0aWwnKSxcbiAgICAgIGNvbnN0YW50cyAgICAgICAgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKSxcbiAgICAgIG1ha2VNZWRpYXRvciAgICAgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi9tYWtlTWVkaWF0b3InKSxcbiAgICAgIG1ha2VFdmVudEVtaXR0ZXIgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi9tYWtlRXZlbnRFbWl0dGVyJyksXG4gICAgICBtYWtlQ29sbGVjdGlvbiAgICAgICAgICAgICAgICA9IHJlcXVpcmUoJy4vbWFrZUNvbGxlY3Rpb24nKSxcbiAgICAgIG1ha2VMaXN0ZW5lciAgICAgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi9tYWtlTGlzdGVuZXInKSxcbiAgICAgIG1ha2VDaGVja2VyICAgICAgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi9tYWtlQ2hlY2tlcicpLFxuICAgICAgbWFrZUNoZWNrSGFuZGxlciAgICAgICAgICAgICAgPSByZXF1aXJlKCcuL21ha2VDaGVja0hhbmRsZXInKSxcbiAgICAgIG1ha2VEb21Ob2RlICAgICAgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi9tYWtlRG9tTm9kZScpLFxuICAgICAgY2hlY2tGdW5jdGlvbnMgICAgICAgICAgICAgICAgPSByZXF1aXJlKCcuL2NoZWNrRnVuY3Rpb25zJyk7XG5cblxuXG4vKipcbiAqXG4gKlxuICogbm9kIHYuMi4wLjVcbiAqIEdvcm0gQ2FzcGVyXG4gKlxuICpcbiAqXG4gKiBUaGlzIGlzIGEgc2hvcnQgYnJlYWtkb3duIG9mIHRoZSBjb2RlIHRvIGhlbHAgeW91IGZpbmQgeW91ciB3YXkgYXJvdW5kLlxuICpcbiAqXG4gKiBBbiBgZWxlbWVudGAgYWx3YXlzIHJlZmVyIHRvIHNvbWUgaW5wdXQgZWxlbWVudCBkZWZpbmVkIGJ5IHRoZSB1c2VyIHZpYSB0aGVcbiAqIGBzZWxlY3RvcmAga2V5LlxuICpcbiAqIEEgYG1ldHJpY2AgaXMgdGhlIHVzZXIgY3JlYXRlZCBvYmplY3RzIHRoYXQgaXMgdXNlZCB0byBhZGQgY2hlY2tzIHRvXG4gKiBub2QuXG4gKlxuICogRWFjaCBgZWxlbWVudGAgd2lsbCBoYXZlIGF0IG1vc3Qgb25lIG9mIGEgYGxpc3RlbmVyYCwgYSBgY2hlY2tlcmAsIGFcbiAqIGBjaGVja0hhbmRsZXJgLCBhbmQgYSBgZG9tTm9kZWAgXCJhdHRhY2hlZFwiIHRvIGl0LiBUaGUgYGxpc3RlbmVyYCBsaXN0ZW5zXG4gKiBmb3IgaW5wdXRzIG9yIGNoYW5nZXMgdG8gdGhlIGBlbGVtZW50YCBhbmQgcGFzc2VzIHRoZSBuZXcgdmFsdWUgb24gdG8gdG8gdGhlXG4gKiBgY2hlY2tlcmAgd2hpY2ggcGVyZm9ybXMgaXRzIGNoZWNrcyBhbmQgcGFzc2VzIHRoZSB0aGUgcmVzdWx0cyBvbiB0byB0aGVcbiAqIGBjaGVja0hhbmRsZXJgIHdoaWNoIGNhbGN1bGF0ZXMgdGhlIG5ldyBzdGF0ZSBvZiB0aGUgYGVsZW1lbnRgIHdoaWNoIGl0XG4gKiBwYXNzZXMgb24gdG8gdGhlIGBkb21Ob2RlYCB3aGljaCB3aWxsIHVwZGF0ZSB0aGUgZG9tLlxuICpcbiAqIFRoZSBmb3VyIG1haW4gcGFydHMsIHRoZSBsaXN0ZW5lciwgdGhlIGNoZWNrZXIsIHRoZSBjaGVja0hhbmRsZXIsIGFuZCB0aGVcbiAqIGRvbU5vZGUgYWxsIGNvbW11bmljYXRlIHRocm91Z2ggdGhlIGBtZWRpYXRvcmAgYnkgZmlyaW5nIGV2ZW50cyBpZGVudGlmaWVkXG4gKiBieSBhIHVuaXF1ZSBpZC4gVGhleSBkbyBub3Qga25vdyBvZiBlYWNoIG90aGVyJ3MgZXhpc3RhbmNlLCBhbmQgc28gbm9cbiAqIGNvbW11bmljYXRpb24gZmxvd3MgZGlyZWN0bHkgYmV0d2VlbiB0aGVtLlxuICpcbiAqIEFsbCBsaXN0ZW5lcnMsIGNoZWNrZXJzLCBoYW5kbGVycywgYW5kIGRvbU5vZGVzIGFyZSBncm91cGVkIHRvZ2V0aGVyIGluXG4gKiBgY29sbGVjdGlvbnNgLCB3aGljaCBhcmUgYmFzaWNhbGx5IGEgZ2xvcmlmaWVkIGFycmF5IHRoYXQgbWFrZXMgaXQgZWFzeVxuICogbm90IHRvIGdldCBkdXBsaWNhdGUgaXRlbXMgZm9yIGVhY2ggZWxlbWVudCAoZm9yIGluc3RhbmNlIHR3byBsaXN0ZW5lcnNcbiAqIGxpc3RlbmluZyB0byB0aGUgc2FtZSBlbGVtZW50KS5cbiAqXG4gKiBUaGUgY29tbXVuaWNhdGlvbiBmbG93IGxvb2tzIGxpa2UgdGhpczpcbiAqIGxpc3RlbmVyIC0+IGNoZWNrZXIgLT4gY2hlY2tIYW5kbGVyIC0+IGRvbU5vZGVcbiAqXG4gKiBCZXR3ZWVuIGVhY2ggcGFydCwgeW91IGhhdmUgdGhlIG1lZGlhdG9yLlxuICpcbiAqXG4gKiBgTWV0cmljc2AgYXJlIGFkZGVkIGJ5IHRoZSB1c2VyLCB3aGljaCBzZXRzIHVwIHRoZSBzeXN0ZW0gYWJvdmUuIE5vdGljZVxuICogdGhhdCBhIG1ldHJpYyBjYW4gdGFyZ2V0IG11bHRpcGxlIGVsZW1lbnRzIGF0IG9uY2UsIGFuZCB0aGF0IHRoZXJlIGNhblxuICogYmUgb3ZlcmxhcHMuIE9uZSBtZXRyaWMgZGVmaW5pdGVseSBkb2VzIG5vdCBlcXVhbCBvbmUgZWxlbWVudCBvciBvbmVcbiAqIGNoZWNrLlxuICpcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIG5vZCAoY29uZmlnKSB7XG4gICAgdmFyIGZvcm0sXG4gICAgICAgIGNvbmZpZ3VyYXRpb24gICA9IHt9LFxuICAgICAgICBtZWRpYXRvciAgICAgICAgPSBtYWtlTWVkaWF0b3IoKSxcbiAgICAgICAgZXZlbnRFbWl0dGVyICAgID0gbWFrZUV2ZW50RW1pdHRlcihtZWRpYXRvciksXG5cbiAgICAgICAgLy8gQ3JlYXRpbmcgKGVtcHR5KSBjb2xsZWN0aW9uc1xuICAgICAgICBsaXN0ZW5lcnMgICAgICAgPSBtYWtlQ29sbGVjdGlvbihtYWtlTGlzdGVuZXIpLFxuICAgICAgICBjaGVja2VycyAgICAgICAgPSBtYWtlQ29sbGVjdGlvbihtYWtlQ2hlY2tlciksXG4gICAgICAgIGNoZWNrSGFuZGxlcnMgICA9IG1ha2VDb2xsZWN0aW9uKG1ha2VDaGVja0hhbmRsZXIpLFxuICAgICAgICBkb21Ob2RlcyAgICAgICAgPSBtYWtlQ29sbGVjdGlvbihtYWtlRG9tTm9kZSk7XG5cblxuXG4gICAgLyoqXG4gICAgICogRW50cnkgcG9pbnQgZm9yIHRoZSB1c2VyLiBUaGUgdXNlciBwYXNzZXMgaW4gYW4gYXJyYXkgb2YgbWV0cmljcyAoYW5cbiAgICAgKiBvYmplY3QgY29udGFpbmluZyBhIHNlbGVjdG9yLCBhIHZhbGlkYXRlIHN0cmluZy9mdW5jdGlvbiwgZXRjLikgYW5kIGl0XG4gICAgICogZ2V0cyBwcm9jZXNzZWQgZnJvbSBoZXJlLlxuICAgICAqXG4gICAgICogVGhpcyBmdW5jdGlvbiwgaXMgbW9zdGx5IGFib3V0IGNsZWFuaW5nIHVwIHdoYXQgdGhlIHVzZXIgcGFzc2VkIHVzLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGFkZE1ldHJpY3MgKG1ldHJpY3MpIHtcbiAgICAgICAgLy8gTWFrZSBzdXJlIHdlIGFyZSBkZWFsaW5nIHdpdGggYW4gYXJyYXkgb2YgbWV0cmljcy5cbiAgICAgICAgdmFyIGFycmF5TWV0cmljcyA9IEFycmF5LmlzQXJyYXkobWV0cmljcykgPyBtZXRyaWNzIDogW21ldHJpY3NdO1xuXG4gICAgICAgIGFycmF5TWV0cmljcy5mb3JFYWNoKGZ1bmN0aW9uIChtZXRyaWMpIHtcbiAgICAgICAgICAgIHZhciB2YWxpZGF0ZUFycmF5LCBlcnJvck1lc3NhZ2VBcnJheTtcblxuICAgICAgICAgICAgLy8gSWYgdGhlICd2YWxpZGF0ZScgaXMgbm90IGFuIGFycmF5LCB0aGVuIHdlJ3JlIGdvb2QgdG8gZ28uXG4gICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkobWV0cmljLnZhbGlkYXRlKSkge1xuICAgICAgICAgICAgICAgIGFkZE1ldHJpYyhtZXRyaWMpO1xuXG4gICAgICAgICAgICAvLyBJZiBpdCBpcyBhbiBhcnJheSAoZS5nLiwgdmFsaWRhdGU6IFsnZW1haWwnLCAnbWF4LWxlbmd0aDoxMCddKSxcbiAgICAgICAgICAgIC8vIHRoZW4gd2UgbmVlZCB0byBzcGxpdCB0aGVtIHVwIGludG8gbXVsdGlwbGUgbWV0cmljcywgYW5kIGFkZFxuICAgICAgICAgICAgLy8gdGhlbSBpbmRpdmlkdWFsbHkuXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShtZXRyaWMuZXJyb3JNZXNzYWdlKSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyAnSWYgeW91IHBhc3MgaW4gYHZhbGlkYXRlOi4uLmAgYXMgYW4gYXJyYXksIHRoZW4gYGVycm9yTWVzc2FnZTouLi5gIGFsc28gbmVlZHMgdG8gYmUgYW4gYXJyYXkuIFwiJyArIG1ldHJpYy52YWxpZGF0ZSArICdcIiwgYW5kIFwiJyArIG1ldHJpYy5lcnJvck1lc3NhZ2UgKyAnXCInO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFdlIHN0b3JlIGVhY2ggYXMgYXJyYXlzLCBhbmQgdGhlbiBydW4gdGhyb3VnaCB0aGVtLFxuICAgICAgICAgICAgICAgIC8vIG92ZXJ3cml0aW5nIGVhY2ggb2YgdGhlIGtleXMgYWNjb3JkaW5nbHkuXG4gICAgICAgICAgICAgICAgdmFsaWRhdGVBcnJheSAgICAgPSBtZXRyaWMudmFsaWRhdGU7XG4gICAgICAgICAgICAgICAgZXJyb3JNZXNzYWdlQXJyYXkgPSBtZXRyaWMuZXJyb3JNZXNzYWdlO1xuXG4gICAgICAgICAgICAgICAgdmFsaWRhdGVBcnJheS5mb3JFYWNoKGZ1bmN0aW9uICh2YWxpZGF0ZSwgaSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBPdmVyd3JpdGUgdGhlIGFycmF5IHdpdGggdGhlIGluZGl2aWR1YWwgJ3ZhbGlkYXRlJyBhbmRcbiAgICAgICAgICAgICAgICAgICAgLy8gJ2Vycm9yTWVzc2FnZScuXG4gICAgICAgICAgICAgICAgICAgIG1ldHJpYy52YWxpZGF0ZSAgICAgPSB2YWxpZGF0ZTtcbiAgICAgICAgICAgICAgICAgICAgbWV0cmljLmVycm9yTWVzc2FnZSA9IGVycm9yTWVzc2FnZUFycmF5W2ldO1xuXG4gICAgICAgICAgICAgICAgICAgIGFkZE1ldHJpYyhtZXRyaWMpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cblxuICAgIGZ1bmN0aW9uIGFkZE1ldHJpYyAobWV0cmljKSB7XG4gICAgICAgIHZhciBzcGVjaWFsVHJpZ2dlcnMgPSBbXSxcblxuXG4gICAgICAgICAgICAvLyBUaGUgZnVuY3Rpb24gdGhhdCB3aWxsIGNoZWNrIHRoZSB2YWx1ZSBvZiB0aGUgZWxlbWVudC5cbiAgICAgICAgICAgIGNoZWNrRnVuY3Rpb24gPSBjaGVja0Z1bmN0aW9ucyhtZXRyaWMpLFxuXG5cbiAgICAgICAgICAgIC8vIEEgbGlzdCBvZiBlbGVtZW50cyB0aGF0IHRoaXMgbWV0cmljIHdpbGwgdGFyZ2V0LlxuICAgICAgICAgICAgZWxlbWVudHMgPSB1dGlsLmdldEVsZW1lbnRzKG1ldHJpYy5zZWxlY3RvciksXG5cblxuICAgICAgICAgICAgLy8gQSBcInNldFwiIGhlcmUsIHJlZmVycyB0byBhbiBvYmogd2l0aCBvbmUgbGlzdGVuZXIsIG9uZSBjaGVja2VyLFxuICAgICAgICAgICAgLy8gYW5kIG9uZSBjaGVja0hhbmRsZXIuIE9ubHkgZXZlcnkgb25lIGZvciBlYWNoIGVsZW1lbnQgaW4gdGhlXG4gICAgICAgICAgICAvLyBkb20uXG4gICAgICAgICAgICBtZXRyaWNTZXRzID0gZWxlbWVudHMubWFwKGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgbGlzdGVuZXI6ICAgICAgIGxpc3RlbmVycy5maW5kT3JNYWtlKGVsZW1lbnQsIG1lZGlhdG9yLCBtZXRyaWMudHJpZ2dlckV2ZW50cywgY29uZmlndXJhdGlvbiksXG4gICAgICAgICAgICAgICAgICAgIGNoZWNrZXI6ICAgICAgICBjaGVja2Vycy5maW5kT3JNYWtlKGVsZW1lbnQsIG1lZGlhdG9yKSxcbiAgICAgICAgICAgICAgICAgICAgY2hlY2tIYW5kbGVyOiAgIGNoZWNrSGFuZGxlcnMuZmluZE9yTWFrZShlbGVtZW50LCBtZWRpYXRvciwgY29uZmlndXJhdGlvbiksXG4gICAgICAgICAgICAgICAgICAgIGRvbU5vZGU6ICAgICAgICBkb21Ob2Rlcy5maW5kT3JNYWtlKGVsZW1lbnQsIG1lZGlhdG9yLCBjb25maWd1cmF0aW9uKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KTtcblxuXG4gICAgICAgIC8vIFNhdmVkIGZvciBsYXRlciByZWZlcmVuY2UgaW4gY2FzZSB0aGUgdXNlciBoYXMgYSBgdGFwYCBmdW5jdGlvblxuICAgICAgICAvLyBkZWZpbmVkLlxuICAgICAgICBjaGVja0Z1bmN0aW9uLnZhbGlkYXRlID0gKHR5cGVvZiBtZXRyaWMudmFsaWRhdGUgPT09ICdmdW5jdGlvbicpID8gbWV0cmljLnZhbGlkYXRlLnRvU3RyaW5nKCkgOiBtZXRyaWMudmFsaWRhdGU7XG5cblxuXG4gICAgICAgIC8vIFNwZWNpYWwgY2FzZXMuIFRoZXNlIGB2YWxpZGF0ZXNgIGFmZmVjdCBlYWNoIG90aGVyLCBhbmQgdGhlaXIgc3RhdGVcbiAgICAgICAgLy8gbmVlZHMgdG8gdXBkYXRlIGVhY2ggdGltZSBlaXRoZXIgb2YgdGhlIGVsZW1lbnRzJyB2YWx1ZXMgY2hhbmdlLlxuICAgICAgICBpZiAobWV0cmljLnZhbGlkYXRlID09PSAnb25lLW9mJyB8fCBtZXRyaWMudmFsaWRhdGUgPT09ICdvbmx5LW9uZS1vZicgfHwgbWV0cmljLnZhbGlkYXRlID09PSAnc29tZS1yYWRpbycpIHtcbiAgICAgICAgICAgIHNwZWNpYWxUcmlnZ2Vycy5wdXNoKG1ldHJpYy5zZWxlY3Rvcik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIG1ldHJpYy52YWxpZGF0ZSA9PT0gJ3N0cmluZycgJiYgbWV0cmljLnZhbGlkYXRlLmluZGV4T2YoJ3NhbWUtYXMnKSA+IC0xKSB7XG4gICAgICAgICAgICBzcGVjaWFsVHJpZ2dlcnMucHVzaChtZXRyaWMudmFsaWRhdGUuc3BsaXQoJzonKVsxXSk7XG4gICAgICAgIH1cblxuXG5cbiAgICAgICAgLy8gSGVscGVyIGZ1bmN0aW9uLCB1c2VkIGluIHRoZSBsb29wIGJlbG93LlxuICAgICAgICBmdW5jdGlvbiBzdWJzY3JpYmVUb1RyaWdnZXJzIChjaGVja2VyLCBzZWxlY3Rvcikge1xuICAgICAgICAgICAgdmFyIHRyaWdnZXJFbGVtZW50cyA9IHV0aWwuZ2V0RWxlbWVudHMoc2VsZWN0b3IpO1xuXG4gICAgICAgICAgICB0cmlnZ2VyRWxlbWVudHMuZm9yRWFjaChmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICAgICAgICAgIHZhciBsaXN0ZW5lciA9IGxpc3RlbmVycy5maW5kT3JNYWtlKGVsZW1lbnQsIG1lZGlhdG9yLCBudWxsLCBjb25maWd1cmF0aW9uKTtcblxuICAgICAgICAgICAgICAgIGNoZWNrZXIuc3Vic2NyaWJlVG8obGlzdGVuZXIuaWQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuXG5cbiAgICAgICAgLy8gSGVyZSB3ZSBzZXQgdXAgdGhlIFwiY29ubmVjdGlvbnNcIiBiZXR3ZWVuIGVhY2ggb2Ygb3VyIG1haW4gcGFydHMuXG4gICAgICAgIC8vIFRoZXkgY29tbXVuaWNhdGUgb25seSB0aHJvdWdoIHRoZSBtZWRpYXRvci5cbiAgICAgICAgbWV0cmljU2V0cy5mb3JFYWNoKGZ1bmN0aW9uIChtZXRyaWNTZXQpIHtcblxuXG4gICAgICAgICAgICAvLyA6OiBMaXN0ZW5lciAtPiBDaGVja2VyXG5cbiAgICAgICAgICAgIC8vIFdlIHdhbnQgb3VyIGNoZWNrZXIgdG8gbGlzdGVuIHRvIHRoZSBsaXN0ZW5lci4gQSBsaXN0ZW5lciBoYXMgYW5cbiAgICAgICAgICAgIC8vIGlkLCB3aGljaCBpdCB1c2VzIHdoZW4gaXQgZmlyZXMgZXZlbnRzIHRvIHRoZSBtZWRpYXRvciAod2hpY2hcbiAgICAgICAgICAgIC8vIHdhcyBzZXQgdXAgd2hlbiB0aGUgbGlzdGVuZXIgd2FzIGNyZWF0ZWQpLlxuICAgICAgICAgICAgbWV0cmljU2V0LmNoZWNrZXIuc3Vic2NyaWJlVG8obWV0cmljU2V0Lmxpc3RlbmVyLmlkKTtcblxuICAgICAgICAgICAgLy8gSWYgdGhlIHVzZXIgc2V0IGEgYHRyaWdnZXJlZEJ5YCwgdGhlIGNoZWNrZXIgbmVlZCB0byBsaXN0ZW4gdG9cbiAgICAgICAgICAgIC8vIGNoYW5nZXMgb24gdGhpcyBlbGVtZW50IGFzIHdlbGwuXG4gICAgICAgICAgICAvLyBTYW1lIGdvZXMgZm9yIHNwZWNpYWwgdHJpZ2dlcnMgdGhhdCB3ZSBzZXQuXG4gICAgICAgICAgICBzdWJzY3JpYmVUb1RyaWdnZXJzKG1ldHJpY1NldC5jaGVja2VyLCBtZXRyaWMudHJpZ2dlcmVkQnkpO1xuICAgICAgICAgICAgc3Vic2NyaWJlVG9UcmlnZ2VycyhtZXRyaWNTZXQuY2hlY2tlciwgc3BlY2lhbFRyaWdnZXJzKTtcblxuXG4gICAgICAgICAgICAvLyA6OiBDaGVja2VyIC0+IGNoZWNrSGFuZGxlclxuXG4gICAgICAgICAgICB2YXIgY2hlY2tJZCA9IHV0aWwudW5pcXVlKCk7XG5cbiAgICAgICAgICAgIC8vIFdlIGFkZCB0aGUgY2hlY2sgZnVuY3Rpb24gYXMgb25lIHRvIGJlIGNoZWNrZWQgd2hlbiB0aGUgdXNlclxuICAgICAgICAgICAgLy8gaW5wdXRzIHNvbWV0aGluZy4gKFRoZXJlIG1pZ2h0IGJlIG1vcmUgdGhhbiB0aGlzIG9uZSkuXG4gICAgICAgICAgICBtZXRyaWNTZXQuY2hlY2tlci5hZGRDaGVjayhjaGVja0Z1bmN0aW9uLCBjaGVja0lkKTtcblxuICAgICAgICAgICAgLy8gV2Ugd2FudCB0aGUgY2hlY2sgaGFuZGxlciB0byBsaXN0ZW4gZm9yIHJlc3VsdHMgZnJvbSB0aGUgY2hlY2tlclxuICAgICAgICAgICAgbWV0cmljU2V0LmNoZWNrSGFuZGxlci5zdWJzY3JpYmVUbyhjaGVja0lkLCBtZXRyaWMuZXJyb3JNZXNzYWdlLCBtZXRyaWMuZGVmYXVsdFN0YXR1cyk7XG5cblxuICAgICAgICAgICAgaWYgKGNvbmZpZ3VyYXRpb24ubm9Eb20pIHtcbiAgICAgICAgICAgICAgICBldmVudEVtaXR0ZXIuc3Vic2NyaWJlKG1ldHJpY1NldC5jaGVja0hhbmRsZXIuaWQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyA6OiBjaGVja0hhbmRsZXIgLT4gZG9tTm9kZVxuXG4gICAgICAgICAgICAgICAgLy8gVGhlIGNoZWNrSGFuZGxlciBoYXMgaXRzIG93biBpZCAoYW5kIG9ubHkgZXZlciBuZWVkcyBvbmUpLCBzbyB3ZVxuICAgICAgICAgICAgICAgIC8vIGp1c3QgYXNrIHRoZSBkb21Ob2RlIHRvIGxpc3RlbiBmb3IgdGhhdC5cbiAgICAgICAgICAgICAgICBtZXRyaWNTZXQuZG9tTm9kZS5zdWJzY3JpYmVUbyhtZXRyaWNTZXQuY2hlY2tIYW5kbGVyLmlkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cblxuXG4gICAgICAgIC8vIEFmdGVyIGFsbCBpcyBkb25lLCB3ZSBtYXkgaGF2ZSB0byBlbmFibGUvZGlzYWJsZSBhIHN1Ym1pdCBidXR0b24uXG4gICAgICAgIHRvZ2dsZVN1Ym1pdCgpO1xuICAgIH1cblxuXG5cbiAgICAvKipcbiAgICAgKiBJZiBhIGZvcm0gaXMgYWRkZWQsIHdlIGxpc3RlbiBmb3Igc3VibWl0cywgYW5kIGlmIHRoZSBoYXMgYWxzbyBzZXRcbiAgICAgKiBgcHJldmVudFN1Ym1pdGAgaW4gdGhlIGNvbmZpZ3VyYXRpb24sIHRoZW4gd2Ugc3RvcCB0aGUgY29tbWl0IGZyb21cbiAgICAgKiBoYXBwZW5pbmcgdW5sZXNzIGFsbCB0aGUgZWxlbWVudHMgYXJlIHZhbGlkLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGFkZEZvcm0gKHNlbGVjdG9yKSB7XG4gICAgICAgIHZhciBmb3JtID0gdXRpbC5nZXRFbGVtZW50KHNlbGVjdG9yKTtcblxuICAgICAgICBmb3JtLmFkZEV2ZW50TGlzdGVuZXIoJ3N1Ym1pdCcsIHBvc3NpYmxlUHJldmVudFN1Ym1pdCwgZmFsc2UpO1xuICAgIH1cblxuICAgIC8vIFByZXZlbnQgZnVuY3Rpb24sIHVzZWQgYWJvdmVcbiAgICBmdW5jdGlvbiBwb3NzaWJsZVByZXZlbnRTdWJtaXQgKGV2ZW50KSB7XG4gICAgICAgIGlmIChjb25maWd1cmF0aW9uLnByZXZlbnRTdWJtaXQgJiYgIWFyZUFsbChjb25zdGFudHMuVkFMSUQpKSB7XG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgICAvLyBTaG93IGVycm9ycyB0byB0aGUgdXNlclxuICAgICAgICAgICAgY2hlY2tlcnMuZm9yRWFjaChmdW5jdGlvbiAoY2hlY2tlcikge1xuICAgICAgICAgICAgICAgIGNoZWNrZXIucGVyZm9ybUNoZWNrKHtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQ6IGV2ZW50XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gRm9jdXMgb24gdGhlIGZpcnN0IGludmFsaWQgZWxlbWVudFxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGNoZWNrSGFuZGxlcnMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgY2hlY2tIYW5kbGVyID0gY2hlY2tIYW5kbGVyc1tpXTtcblxuICAgICAgICAgICAgICAgIGlmIChjaGVja0hhbmRsZXIuZ2V0U3RhdHVzKCkuc3RhdHVzID09PSBjb25zdGFudHMuSU5WQUxJRCkge1xuICAgICAgICAgICAgICAgICAgICBjaGVja0hhbmRsZXIuZWxlbWVudC5mb2N1cygpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cblxuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlcyBlbGVtZW50cyBjb21wbGV0ZWx5LlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHJlbW92ZUVsZW1lbnQgKHNlbGVjdG9yKSB7XG4gICAgICAgIHZhciBlbGVtZW50cyA9IHV0aWwuZ2V0RWxlbWVudHMoc2VsZWN0b3IpO1xuXG4gICAgICAgIGVsZW1lbnRzLmZvckVhY2goZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgICAgIGxpc3RlbmVycy5yZW1vdmVJdGVtKGVsZW1lbnQpO1xuICAgICAgICAgICAgY2hlY2tlcnMucmVtb3ZlSXRlbShlbGVtZW50KTtcbiAgICAgICAgICAgIGNoZWNrSGFuZGxlcnMucmVtb3ZlSXRlbShlbGVtZW50KTtcbiAgICAgICAgICAgIGRvbU5vZGVzLnJlbW92ZUl0ZW0oZWxlbWVudCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuXG5cbiAgICAvKipcbiAgICAgKiBjb25maWd1cmVcbiAgICAgKlxuICAgICAqIENoYW5nZXMgdGhlIGNvbmZpZ3VyYXRpb24gb2JqZWN0IHVzZWQgdGhyb3VnaG91dCB0aGUgY29kZSBmb3IgY2xhc3NlcyxcbiAgICAgKiBkZWxheXMsIG1lc3NhZ2VzLCBldGMuXG4gICAgICpcbiAgICAgKiBJdCBjYW4gZWl0aGVyIGJlIGNhbGxlZCB3aXRoIGEga2V5L3ZhbHVlIHBhaXIgKHR3byBhcmd1bWVudHMpLCBvciB3aXRoXG4gICAgICogYW4gb2JqZWN0IHdpdGgga2V5L3ZhbHVlIHBhaXJzLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNvbmZpZ3VyZSAoYXR0cmlidXRlcywgdmFsdWUpIHtcbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICB2YXIgayA9IGF0dHJpYnV0ZXM7XG4gICAgICAgICAgICBhdHRyaWJ1dGVzID0ge307XG5cbiAgICAgICAgICAgIGF0dHJpYnV0ZXNba10gPSB2YWx1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBhdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgICBjb25maWd1cmF0aW9uW2tleV0gPSBhdHRyaWJ1dGVzW2tleV07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYXR0cmlidXRlcy5zdWJtaXQgfHwgYXR0cmlidXRlcy5kaXNhYmxlU3VibWl0KSB7XG4gICAgICAgICAgICB0b2dnbGVTdWJtaXQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChhdHRyaWJ1dGVzLmZvcm0pIHtcbiAgICAgICAgICAgIGFkZEZvcm0oYXR0cmlidXRlcy5mb3JtKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbiAgICAvKipcbiAgICAgKiB0b2dnbGVTdWJtaXRcbiAgICAgKlxuICAgICAqIFRvZ2dsZXMgdGhlIHN1Ym1pdCBidXR0b24gKGVuYWJsZWQgaWYgZXZlcnkgZWxlbWVudCBpcyB2YWxpZCwgb3RoZXJ3aXNlXG4gICAgICogZGlzYWJsZWQpLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHRvZ2dsZVN1Ym1pdCAoKSB7XG4gICAgICAgIGlmIChjb25maWd1cmF0aW9uLnN1Ym1pdCAmJiBjb25maWd1cmF0aW9uLmRpc2FibGVTdWJtaXQpIHtcbiAgICAgICAgICAgIHV0aWwuZ2V0RWxlbWVudChjb25maWd1cmF0aW9uLnN1Ym1pdCkuZGlzYWJsZWQgPSAhYXJlQWxsKGNvbnN0YW50cy5WQUxJRCk7XG4gICAgICAgIH1cbiAgICB9XG5cblxuICAgIC8qXG4gICAgICogTGlzdGVuIHRvIGFsbCBjaGVja3MsIGFuZCBpZiB0aGUgdXNlciBoYXMgc2V0IGluIHRoZSBjb25maWd1cmF0aW9uIHRvXG4gICAgICogZW5hYmxlL2Rpc2FibGVkIHRoZSBzdWJtaXQgYnV0dG9uLCB3ZSBkbyB0aGF0LlxuICAgICAqL1xuICAgIG1lZGlhdG9yLnN1YnNjcmliZSgnYWxsJywgdG9nZ2xlU3VibWl0KTtcblxuXG4gICAgZnVuY3Rpb24gYXJlQWxsIChzdGF0dXMpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGNoZWNrSGFuZGxlcnMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChjaGVja0hhbmRsZXJzW2ldLmdldFN0YXR1cygpLnN0YXR1cyAhPT0gc3RhdHVzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG5cbiAgICBmdW5jdGlvbiBzZXRNZXNzYWdlT3B0aW9ucyAob3B0aW9ucykge1xuICAgICAgICB2YXIgZWxlbWVudHMgPSB1dGlsLmdldEVsZW1lbnRzKG9wdGlvbnMuc2VsZWN0b3IpO1xuXG4gICAgICAgIGVsZW1lbnRzLmZvckVhY2goZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgICAgIHZhciBkb21Ob2RlID0gZG9tTm9kZXMuZmluZE9yTWFrZShlbGVtZW50KTtcblxuICAgICAgICAgICAgZG9tTm9kZS5zZXRNZXNzYWdlT3B0aW9ucyhvcHRpb25zLnBhcmVudCwgb3B0aW9ucy5lcnJvclNwYW4pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBMaXN0ZW4gdG8gYWxsIGNoZWNrcyBhbmQgYWxsb3cgdGhlIHVzZXIgdG8gbGlzdGVuIGluLCBpZiBoZSBzZXQgYSBgdGFwYFxuICAgICAqIGZ1bmN0aW9uIGluIHRoZSBjb25maWd1cmF0aW9uLlxuICAgICAqL1xuICAgIG1lZGlhdG9yLnN1YnNjcmliZSgnYWxsJywgZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWd1cmF0aW9uLnRhcCA9PT0gJ2Z1bmN0aW9uJyAmJiBvcHRpb25zLnR5cGUgPT09ICdjaGVjaycpIHtcbiAgICAgICAgICAgIGNvbmZpZ3VyYXRpb24udGFwKG9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgfSk7XG5cblxuXG4gICAgZnVuY3Rpb24gZ2V0U3RhdHVzIChzZWxlY3Rvciwgc2hvd0Vycm9yTWVzc2FnZSkge1xuICAgICAgICB2YXIgZWxlbWVudCA9IHV0aWwuZ2V0RWxlbWVudChzZWxlY3RvciksXG4gICAgICAgICAgICBzdGF0dXMgID0gY2hlY2tIYW5kbGVycy5maW5kT3JNYWtlKGVsZW1lbnQpLmdldFN0YXR1cygpO1xuXG4gICAgICAgIHJldHVybiBzaG93RXJyb3JNZXNzYWdlID8gc3RhdHVzIDogc3RhdHVzLnN0YXR1cztcbiAgICB9XG5cblxuXG4gICAgZnVuY3Rpb24gcGVyZm9ybUNoZWNrIChzZWxlY3Rvcikge1xuICAgICAgICB2YXIgY3MgPSBzZWxlY3RvciA/IHV0aWwuZ2V0RWxlbWVudHMoc2VsZWN0b3IpLm1hcChjaGVja2Vycy5maW5kT3JNYWtlKSA6IGNoZWNrZXJzO1xuXG4gICAgICAgIGNzLmZvckVhY2goZnVuY3Rpb24oY2hlY2tlcikge1xuICAgICAgICAgICAgY2hlY2tlci5wZXJmb3JtQ2hlY2soKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG5cblxuICAgIC8qKlxuICAgICAqIEludGVybmFsIGZ1bmN0aW9ucyB0aGF0IGFyZSBleHBvc2VkIHRvIHRoZSBwdWJsaWMuXG4gICAgICovXG4gICAgdmFyIG5vZEluc3RhY2UgPSB7XG4gICAgICAgIGFkZDogICAgICAgICAgICAgICAgICAgIGFkZE1ldHJpY3MsXG4gICAgICAgIHJlbW92ZTogICAgICAgICAgICAgICAgIHJlbW92ZUVsZW1lbnQsXG4gICAgICAgIGFyZUFsbDogICAgICAgICAgICAgICAgIGFyZUFsbCxcbiAgICAgICAgZ2V0U3RhdHVzOiAgICAgICAgICAgICAgZ2V0U3RhdHVzLFxuICAgICAgICBjb25maWd1cmU6ICAgICAgICAgICAgICBjb25maWd1cmUsXG4gICAgICAgIHNldE1lc3NhZ2VPcHRpb25zOiAgICAgIHNldE1lc3NhZ2VPcHRpb25zLFxuICAgICAgICBwZXJmb3JtQ2hlY2s6ICAgICAgICAgICBwZXJmb3JtQ2hlY2tcbiAgICB9O1xuXG4gICAgaWYgKGNvbmZpZykge1xuICAgICAgICBub2RJbnN0YWNlLmNvbmZpZ3VyZShjb25maWcpO1xuICAgIH1cblxuICAgIHJldHVybiBub2RJbnN0YWNlO1xufVxuIiwiY29uc3QgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpLFxuICAgICAgY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKTtcblxuXG4vKipcbiAqIG1ha2VDaGVja0hhbmRsZXJcbiAqXG4gKiBIYW5kbGVzIGNoZWNrcyBjb21pbmcgaW4gZnJvbSB0aGUgbWVkaWF0b3IgYW5kIHRha2VzIGNhcmUgb2YgY2FsY3VsYXRpbmdcbiAqIHRoZSBzdGF0ZSBhbmQgZXJyb3IgbWVzc2FnZXMuXG4gKlxuICogVGhlIGNoZWNrSGFuZGxlcnMgbGl2ZXMgaW4gb25lIHRvIG9uZSB3aXRoIHRoZSBlbGVtZW50IHBhcnNlZCBpbixcbiAqIGFuZCBsaXN0ZW5zIGZvciAodXN1YWxseSkgbXVsdGlwbGUgZXJyb3IgY2hlY2tzLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChlbGVtZW50LCBtZWRpYXRvciwgY29uZmlndXJhdGlvbikge1xuICAgIHZhciByZXN1bHRzICAgICA9IHt9LFxuICAgICAgICBpZCAgICAgICAgICA9IHV0aWwudW5pcXVlKCk7XG5cbiAgICBmdW5jdGlvbiBzdWJzY3JpYmVUbyAoaWQsIGVycm9yTWVzc2FnZSwgZGVmYXVsdFN0YXR1cykge1xuICAgICAgICAvLyBDcmVhdGUgYSByZXByZXNlbnRhdGlvbiBvZiB0aGUgdHlwZSBvZiBlcnJvciBpbiB0aGUgcmVzdWx0c1xuICAgICAgICAvLyBvYmplY3QuXG4gICAgICAgIGlmICghcmVzdWx0c1tpZF0pIHtcbiAgICAgICAgICAgIHJlc3VsdHNbaWRdID0ge1xuICAgICAgICAgICAgICAgIHN0YXR1czogZGVmYXVsdFN0YXR1cyB8fCBjb25zdGFudHMuVU5DSEVDS0VELFxuICAgICAgICAgICAgICAgIGVycm9yTWVzc2FnZTogZXJyb3JNZXNzYWdlXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU3Vic2NyaWJlIHRvIGVycm9yIGlkLlxuICAgICAgICBtZWRpYXRvci5zdWJzY3JpYmUoaWQsIGNoZWNrSGFuZGxlcik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2hlY2tIYW5kbGVyIChyZXN1bHQpIHtcbiAgICAgICAgcmVzdWx0c1tyZXN1bHQuaWRdLnN0YXR1cyA9IHJlc3VsdC5yZXN1bHQgPyBjb25zdGFudHMuVkFMSUQgOiBjb25zdGFudHMuSU5WQUxJRDtcblxuICAgICAgICBub3RpZnlNZWRpYXRvcigpO1xuICAgIH1cblxuICAgIC8vIFJ1bnMgdGhyb3VnaCBhbGwgcmVzdWx0cyB0byBzZWUgd2hhdCBraW5kIG9mIGZlZWRiYWNrIHRvIHNob3cgdGhlXG4gICAgLy8gdXNlci5cbiAgICBmdW5jdGlvbiBub3RpZnlNZWRpYXRvciAoKSB7XG4gICAgICAgIHZhciBzdGF0dXMgPSBnZXRTdGF0dXMoKTtcblxuICAgICAgICAvLyBFdmVudCBpZiBtaWdodCBiZSB2YWxpZCB3ZSBwYXNzIGFsb25nIGFuIHVuZGVmaW5lZCBlcnJvck1lc3NhZ2UuXG4gICAgICAgIG1lZGlhdG9yLmZpcmUoe1xuICAgICAgICAgICAgaWQ6ICAgICAgICAgICAgIGlkLFxuICAgICAgICAgICAgdHlwZTogICAgICAgICAgICdyZXN1bHQnLFxuICAgICAgICAgICAgcmVzdWx0OiAgICAgICAgIHN0YXR1cy5zdGF0dXMsXG4gICAgICAgICAgICBlbGVtZW50OiAgICAgICAgZWxlbWVudCxcbiAgICAgICAgICAgIGVycm9yTWVzc2FnZTogICBzdGF0dXMuZXJyb3JNZXNzYWdlXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFN0YXR1cyAoKSB7XG4gICAgICAgIHZhciBzdGF0dXMsIGVycm9yTWVzc2FnZTtcblxuICAgICAgICBmb3IgKHZhciBpZCBpbiByZXN1bHRzKSB7XG4gICAgICAgICAgICBzdGF0dXMgPSByZXN1bHRzW2lkXS5zdGF0dXM7XG5cbiAgICAgICAgICAgIGlmIChyZXN1bHRzW2lkXS5zdGF0dXMgPT09IGNvbnN0YW50cy5JTlZBTElEKSB7XG4gICAgICAgICAgICAgICAgZXJyb3JNZXNzYWdlID0gcmVzdWx0c1tpZF0uZXJyb3JNZXNzYWdlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN0YXR1czogICAgICAgIHN0YXR1cyxcbiAgICAgICAgICAgIGVycm9yTWVzc2FnZTogIGVycm9yTWVzc2FnZVxuICAgICAgICB9O1xuICAgIH1cblxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgaWQ6ICAgICAgICAgICAgIGlkLFxuICAgICAgICBzdWJzY3JpYmVUbzogICAgc3Vic2NyaWJlVG8sXG4gICAgICAgIGNoZWNrSGFuZGxlcjogICBjaGVja0hhbmRsZXIsXG4gICAgICAgIGdldFN0YXR1czogICAgICBnZXRTdGF0dXMsXG4gICAgICAgIGVsZW1lbnQ6ICAgICAgICBlbGVtZW50XG4gICAgfTtcbn07XG5cbiIsIi8qKlxuICogbWFrZUNoZWNrZXJcbiAqXG4gKiBBbiBcImNoZWNrZXJcIiBjb21tdW5pY2F0ZXMgcHJpbWFyaWx5IHdpdGggdGhlIG1lZGlhdG9yLiBJdCBsaXN0ZW5zXG4gKiBmb3IgaW5wdXQgY2hhbmdlcyAoY29taW5nIGZyb20gbGlzdGVuZXJzKSwgcGVyZm9ybXMgaXRzIGNoZWNrc1xuICogYW5kIGZpcmVzIG9mZiByZXN1bHRzIGJhY2sgdG8gdGhlIG1lZGlhdG9yIGZvciBjaGVja0hhbmRsZXJzIHRvXG4gKiBoYW5kbGUuXG4gKlxuICogVGhlIGNoZWNrZXIgaGFzIGEgMSB0byAxIHJlbGF0aW9uc2hpcCB3aXRoIGFuIGVsZW1lbnQsIGFuXG4gKiBsaXN0ZW5lcnMsIGFuZCBhbiBjaGVja0hhbmRsZXI7IGFsdGhvdWdoIHRoZXkgbWF5XG4gKiBjb21tdW5pY2F0ZSB3aXRoIG90aGVyIFwic2V0c1wiIG9mIGxpc3RlbmVycywgY2hlY2tlcnMgYW5kIGhhbmRsZXJzLlxuICpcbiAqIENoZWNrcyBhcmUgYWRkZWQsIGZyb20gdGhlIG91dHNpZGUsIGFuZCBjb25zaXN0cyBvZiBhIGNoZWNrRnVuY3Rpb24gKHNlZVxuICogbm9kLmNoZWNrRnVuY3Rpb25zKSBhbmQgYSB1bmlxdWUgaWQuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gbWFrZUNoZWNrZXIgKGVsZW1lbnQsIG1lZGlhdG9yKSB7XG4gICAgdmFyIGNoZWNrcyA9IFtdO1xuXG4gICAgZnVuY3Rpb24gc3Vic2NyaWJlVG8gKGlkKSB7XG4gICAgICAgIG1lZGlhdG9yLnN1YnNjcmliZShpZCwgcGVyZm9ybUNoZWNrKTtcbiAgICB9XG5cbiAgICAvLyBSdW4gZXZlcnkgY2hlY2sgZnVuY3Rpb24gYWdhaW5zdCB0aGUgdmFsdWUgb2YgdGhlIGVsZW1lbnQuXG4gICAgZnVuY3Rpb24gcGVyZm9ybUNoZWNrIChvcHRpb25zKSB7XG4gICAgICAgIGNoZWNrcy5mb3JFYWNoKGZ1bmN0aW9uIChjaGVjaykge1xuICAgICAgICAgICAgY2hlY2sob3B0aW9ucyB8fCB7fSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEFkZCBhIGNoZWNrIGZ1bmN0aW9uIHRvIHRoZSBlbGVtZW50LiBUaGUgcmVzdWx0IHdpbGwgYmUgaGFuZGVkIG9mZlxuICAgIC8vIHRvIHRoZSBtZWRpYXRvciAoZm9yIGNoZWNrSGFuZGxlcnMgdG8gZXZhbHVhdGUpLlxuICAgIGZ1bmN0aW9uIGFkZENoZWNrIChjaGVja0Z1bmN0aW9uLCBpZCkge1xuICAgICAgICBmdW5jdGlvbiBjYWxsYmFjayAocmVzdWx0KSB7XG4gICAgICAgICAgICBtZWRpYXRvci5maXJlKHtcbiAgICAgICAgICAgICAgICBpZDogaWQsXG4gICAgICAgICAgICAgICAgdHlwZTogJ2NoZWNrJyxcbiAgICAgICAgICAgICAgICByZXN1bHQ6IHJlc3VsdCxcbiAgICAgICAgICAgICAgICBlbGVtZW50OiBlbGVtZW50LFxuICAgICAgICAgICAgICAgIHZhbGlkYXRlOiBjaGVja0Z1bmN0aW9uLnZhbGlkYXRlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNoZWNrcy5wdXNoKGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgICAgICAgICAvLyBJZiBlbGVtZW50LnZhbHVlIGlzIHVuZGVmaW5lZCwgdGhlbiB3ZSBtaWdodCBiZSBkZWFsaW5nIHdpdGhcbiAgICAgICAgICAgIC8vIGFub3RoZXIgdHlwZSBvZiBlbGVtZW50OyBsaWtlIDxkaXYgY29udGVudGVkaXRhYmxlPSd0cnVlJz5cbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IGVsZW1lbnQudmFsdWUgIT09IHVuZGVmaW5lZCA/IGVsZW1lbnQudmFsdWUgOiBlbGVtZW50LmlubmVySFRNTDtcblxuICAgICAgICAgICAgb3B0aW9ucy5lbGVtZW50ID0gZWxlbWVudDtcblxuICAgICAgICAgICAgY2hlY2tGdW5jdGlvbihjYWxsYmFjaywgdmFsdWUsIG9wdGlvbnMpO1xuICAgICAgICB9KTtcbiAgICB9XG5cblxuICAgIHJldHVybiB7XG4gICAgICAgIHN1YnNjcmliZVRvOiAgICBzdWJzY3JpYmVUbyxcbiAgICAgICAgYWRkQ2hlY2s6ICAgICAgIGFkZENoZWNrLFxuICAgICAgICBwZXJmb3JtQ2hlY2s6ICAgcGVyZm9ybUNoZWNrLFxuICAgICAgICBlbGVtZW50OiAgICAgICAgZWxlbWVudFxuICAgIH07XG59O1xuXG4iLCJmdW5jdGlvbiBmaW5kQ29sbGVjdGlvbkluZGV4IChjb2xsZWN0aW9uLCBlbGVtZW50KSB7XG4gICAgZm9yICh2YXIgaSBpbiBjb2xsZWN0aW9uKSB7XG4gICAgICAgIGlmIChjb2xsZWN0aW9uW2ldLmVsZW1lbnQgPT09IGVsZW1lbnQpIHtcbiAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIC0xO1xufVxuXG5cbi8qKlxuICogbWFrZUNvbGxlY3Rpb25cbiAqXG4gKiBBIG1pbmltYWwgaW1wbGVtZW50YXRpb24gb2YgYSBcImNvbGxlY3Rpb25cIiwgaW5zcGlyZWQgYnkgY29sbGVjdGlvbnMgZnJvbVxuICogQmFja2JvbmVKUy4gVXNlZCBieSBsaXN0ZW5lcnMsIGNoZWNrZXJzLCBhbmQgY2hlY2tIYW5kbGVycy5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBtYWtlQ29sbGVjdGlvbiAobWFrZXIpIHtcbiAgICB2YXIgY29sbGVjdGlvbiA9IFtdO1xuXG4gICAgY29sbGVjdGlvbi5maW5kT3JNYWtlID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgdmFyIGluZGV4ID0gZmluZENvbGxlY3Rpb25JbmRleChjb2xsZWN0aW9uLCBlbGVtZW50KTtcblxuICAgICAgICAvLyBGb3VuZFxuICAgICAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICAgICAgICByZXR1cm4gY29sbGVjdGlvbltpbmRleF07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBOb25lIGZvdW5kLCBsZXQncyBtYWtlIG9uZSB0aGVuLlxuICAgICAgICB2YXIgaXRlbSA9IG1ha2VyLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgIGNvbGxlY3Rpb24ucHVzaChpdGVtKTtcbiAgICAgICAgcmV0dXJuIGl0ZW07XG4gICAgfTtcblxuICAgIGNvbGxlY3Rpb24ucmVtb3ZlSXRlbSA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgIHZhciBpbmRleCA9IGZpbmRDb2xsZWN0aW9uSW5kZXgoY29sbGVjdGlvbiwgZWxlbWVudCksXG4gICAgICAgICAgICBpdGVtID0gY29sbGVjdGlvbltpbmRleF07XG5cbiAgICAgICAgaWYgKCFpdGVtKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDYWxsIC5kaXNwb3NlKCkgaWYgaXQgZXhpc3RzXG4gICAgICAgIGlmICh0eXBlb2YgaXRlbS5kaXNwb3NlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBpdGVtLmRpc3Bvc2UoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlbW92ZSBpdGVtXG4gICAgICAgIGNvbGxlY3Rpb24uc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGNvbGxlY3Rpb247XG59O1xuXG4iLCJjb25zdCB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyksXG4gICAgICBjb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpO1xuXG4vKipcbiAqIG1ha2VEb21Ob2RlXG4gKlxuICogVGhpcyBjcmVhdGVzIHRoZSBlcnJvci9zdWNjZXNzIG1lc3NhZ2UgYmVoaW5kIHRoZSBpbnB1dCBlbGVtZW50LCBhcyB3ZWxsXG4gKiBhcyB0YWtlcyBjYXJlIG9mIHVwZGF0aW5nIGNsYXNzZXMgYW5kIHRha2luZyBjYXJlIG9mIGl0cyBvd24gc3RhdGUuXG4gKlxuICogVGhlIGRvbSBub2RlIGlzIG93bmVkIGJ5IGNoZWNrSGFuZGxlciwgYW5kIGhhcyBhIG9uZSB0byBvbmVcbiAqIHJlbGF0aW9uc2hpcCB3aXRoIGJvdGggdGhlIGNoZWNrSGFuZGxlciBhbmQgdGhlIGlucHV0IGVsZW1lbnRcbiAqIGJlaW5nIGNoZWNrZWQuXG4gKlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChlbGVtZW50LCBtZWRpYXRvciwgY29uZmlndXJhdGlvbikge1xuICAgIC8vIEEgJ2RvbU5vZGUnIGNvbnNpc3RzIG9mIHR3byBlbGVtZW50czogYSAncGFyZW50JywgYW5kIGEgJ3NwYW4nLiBUaGVcbiAgICAvLyBwYXJlbnQgaXMgZ2l2ZW4gYXMgYSBwYXJlbWV0ZXIsIHdoaWxlIHRoZSBzcGFuIGlzIGNyZWF0ZWQgYW5kIGFkZGVkXG4gICAgLy8gYXMgYSBjaGlsZCB0byB0aGUgcGFyZW50LlxuICAgIHZhciBwYXJlbnQgICAgICAgICAgICAgID0gdXRpbC5nZXRQYXJlbnQoZWxlbWVudCwgY29uZmlndXJhdGlvbiksXG4gICAgICAgIF9zdGF0dXMgICAgICAgICAgICAgPSBjb25zdGFudHMuVU5DSEVDS0VELFxuICAgICAgICBwZW5kaW5nVXBkYXRlICAgICAgID0gbnVsbCxcbiAgICAgICAgc3BhbiAgICAgICAgICAgICAgICA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKSxcbiAgICAgICAgY3VzdG9tU3BhbiAgICAgICAgICA9IGZhbHNlO1xuXG4gICAgc3Bhbi5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuXG4gICAgaWYgKCFjb25maWd1cmF0aW9uLm5vRG9tKSB7XG4gICAgICAgIHBhcmVudC5hcHBlbmRDaGlsZChzcGFuKTtcbiAgICB9XG5cbiAgICAvLyBVcGRhdGVzIHRoZSBjbGFzcyBvZiB0aGUgcGFyZW50IHRvIG1hdGNoIHRoZSBzdGF0dXMgb2YgdGhlIGVsZW1lbnQuXG4gICAgZnVuY3Rpb24gdXBkYXRlUGFyZW50IChzdGF0dXMpIHtcbiAgICAgICAgdmFyIHN1Y2Nlc3NDbGFzcyAgICA9IGNvbmZpZ3VyYXRpb24uc3VjY2Vzc0NsYXNzIHx8IGNvbnN0YW50cy5jbGFzc2VzLnN1Y2Nlc3NDbGFzcyxcbiAgICAgICAgICAgIGVycm9yQ2xhc3MgICAgICA9IGNvbmZpZ3VyYXRpb24uZXJyb3JDbGFzcyB8fCBjb25zdGFudHMuY2xhc3Nlcy5lcnJvckNsYXNzO1xuXG4gICAgICAgIHN3aXRjaCAoc3RhdHVzKSB7XG4gICAgICAgIGNhc2UgY29uc3RhbnRzLlZBTElEOlxuICAgICAgICAgICAgdXRpbC5yZW1vdmVDbGFzcyhlcnJvckNsYXNzLCBwYXJlbnQpO1xuICAgICAgICAgICAgdXRpbC5hZGRDbGFzcyhzdWNjZXNzQ2xhc3MsIHBhcmVudCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBjb25zdGFudHMuSU5WQUxJRDpcbiAgICAgICAgICAgIHV0aWwucmVtb3ZlQ2xhc3Moc3VjY2Vzc0NsYXNzLCBwYXJlbnQpO1xuICAgICAgICAgICAgdXRpbC5hZGRDbGFzcyhlcnJvckNsYXNzLCBwYXJlbnQpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBVcGRhdGVzIHRoZSB0ZXh0IGFuZCBjbGFzcyBhY2NvcmRpbmcgdG8gdGhlIHN0YXR1cy5cbiAgICBmdW5jdGlvbiB1cGRhdGVTcGFuIChzdGF0dXMsIGVycm9yTWVzc2FnZSkge1xuICAgICAgICB2YXIgc3VjY2Vzc01lc3NhZ2VDbGFzcyA9IGNvbmZpZ3VyYXRpb24uc3VjY2Vzc01lc3NhZ2VDbGFzcyB8fCBjb25zdGFudHMuY2xhc3Nlcy5zdWNjZXNzTWVzc2FnZUNsYXNzLFxuICAgICAgICAgICAgZXJyb3JNZXNzYWdlQ2xhc3MgICA9IGNvbmZpZ3VyYXRpb24uZXJyb3JNZXNzYWdlQ2xhc3MgfHwgY29uc3RhbnRzLmNsYXNzZXMuZXJyb3JNZXNzYWdlQ2xhc3M7XG5cbiAgICAgICAgc3Bhbi5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuXG4gICAgICAgIHN3aXRjaCAoc3RhdHVzKSB7XG4gICAgICAgIGNhc2UgY29uc3RhbnRzLlZBTElEOlxuICAgICAgICAgICAgdXRpbC5yZW1vdmVDbGFzcyhlcnJvck1lc3NhZ2VDbGFzcywgc3Bhbik7XG4gICAgICAgICAgICB1dGlsLmFkZENsYXNzKHN1Y2Nlc3NNZXNzYWdlQ2xhc3MsIHNwYW4pO1xuICAgICAgICAgICAgaWYgKGNvbmZpZ3VyYXRpb24uc3VjY2Vzc01lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICBzcGFuLnRleHRDb250ZW50ID0gY29uZmlndXJhdGlvbi5zdWNjZXNzTWVzc2FnZTtcbiAgICAgICAgICAgICAgICBzcGFuLnN0eWxlLmRpc3BsYXkgPSAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIGNvbnN0YW50cy5JTlZBTElEOlxuICAgICAgICAgICAgdXRpbC5yZW1vdmVDbGFzcyhzdWNjZXNzTWVzc2FnZUNsYXNzLCBzcGFuKTtcbiAgICAgICAgICAgIHV0aWwuYWRkQ2xhc3MoZXJyb3JNZXNzYWdlQ2xhc3MsIHNwYW4pO1xuICAgICAgICAgICAgc3Bhbi50ZXh0Q29udGVudCA9IGVycm9yTWVzc2FnZTtcbiAgICAgICAgICAgIHNwYW4uc3R5bGUuZGlzcGxheSA9ICcnO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXQgKG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIHN0YXR1cyAgICAgICAgICAgICAgPSBvcHRpb25zLnJlc3VsdCxcbiAgICAgICAgICAgIGVycm9yTWVzc2FnZSAgICAgICAgPSBvcHRpb25zLmVycm9yTWVzc2FnZTtcblxuICAgICAgICAvLyBJZiB0aGUgZG9tIGlzIHNob3dpbmcgYW4gaW52YWxpZCBtZXNzYWdlLCB3ZSB3YW50IHRvIHVwZGF0ZSB0aGVcbiAgICAgICAgLy8gZG9tIHJpZ2h0IGF3YXkuXG4gICAgICAgIGlmIChfc3RhdHVzID09PSBjb25zdGFudHMuSU5WQUxJRCB8fCBjb25maWd1cmF0aW9uLmRlbGF5ID09PSAwKSB7XG5cbiAgICAgICAgICAgIF9zdGF0dXMgPSBzdGF0dXM7XG4gICAgICAgICAgICB1cGRhdGVQYXJlbnQoc3RhdHVzKTtcbiAgICAgICAgICAgIHVwZGF0ZVNwYW4oc3RhdHVzLCBlcnJvck1lc3NhZ2UpO1xuXG4gICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgIC8vIElmIHRoZSBkb20gc2hvd3MgZWl0aGVyIGFuIHVuY2hlY2tlZCBvciBhIHZhbGlkIHN0YXRlXG4gICAgICAgICAgICAvLyB3ZSB3b24ndCBydXNoIHRvIHRlbGwgdGhlbSB0aGV5IGFyZSB3cm9uZy4gSW5zdGVhZFxuICAgICAgICAgICAgLy8gd2UgdXNlIGEgbWV0aG9kIHNpbWlsYXIgdG8gXCJkZWJvdW5jaW5nXCIgdGhlIHVwZGF0ZVxuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHBlbmRpbmdVcGRhdGUpO1xuXG4gICAgICAgICAgICBwZW5kaW5nVXBkYXRlID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAgICAgICBfc3RhdHVzID0gc3RhdHVzO1xuICAgICAgICAgICAgICAgIHVwZGF0ZVBhcmVudChzdGF0dXMpO1xuICAgICAgICAgICAgICAgIHVwZGF0ZVNwYW4oc3RhdHVzLCBlcnJvck1lc3NhZ2UpO1xuXG4gICAgICAgICAgICAgICAgcGVuZGluZ1VwZGF0ZSA9IG51bGw7XG5cbiAgICAgICAgICAgIH0sIGNvbmZpZ3VyYXRpb24uZGVsYXkgfHwgNzAwKTtcblxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc3Vic2NyaWJlVG8gKGlkKSB7XG4gICAgICAgIG1lZGlhdG9yLnN1YnNjcmliZShpZCwgc2V0KTtcbiAgICB9XG5cblxuICAgIGZ1bmN0aW9uIHNldE1lc3NhZ2VPcHRpb25zIChwYXJlbnRDb250YWluZXIsIG1lc3NhZ2UpIHtcbiAgICAgICAgaWYgKHBhcmVudENvbnRhaW5lcikge1xuICAgICAgICAgICAgcGFyZW50ID0gdXRpbC5nZXRFbGVtZW50KHBhcmVudENvbnRhaW5lcik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobWVzc2FnZSkge1xuICAgICAgICAgICAgc3Bhbi5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHNwYW4pOyAgICAgIC8vIFJlbW92ZSBvbGQgc3Bhbi5cbiAgICAgICAgICAgIHNwYW4gPSB1dGlsLmdldEVsZW1lbnQobWVzc2FnZSk7ICAgICAgICAgLy8gU2V0IHRoZSBuZXcgb25lLlxuICAgICAgICAgICAgY3VzdG9tU3BhbiA9IHRydWU7ICAgICAgICAgICAgICAgICAgICAgIC8vIFNvIHdlIHdvbid0IGRlbGV0ZSBpdC5cbiAgICAgICAgfVxuICAgIH1cblxuXG4gICAgZnVuY3Rpb24gZGlzcG9zZSAoKSB7XG4gICAgICAgIC8vIEZpcnN0IHJlbW92ZSBhbnkgY2xhc3Nlc1xuICAgICAgICB1dGlsLnJlbW92ZUNsYXNzKGNvbmZpZ3VyYXRpb24uZXJyb3JDbGFzcyB8fCBjb25zdGFudHMuY2xhc3Nlcy5lcnJvckNsYXNzLCBwYXJlbnQpO1xuICAgICAgICB1dGlsLnJlbW92ZUNsYXNzKGNvbmZpZ3VyYXRpb24uc3VjY2Vzc0NsYXNzIHx8IGNvbnN0YW50cy5jbGFzc2VzLnN1Y2Nlc3NDbGFzcywgcGFyZW50KTtcblxuICAgICAgICAvLyBUaGVuIHdlIHJlbW92ZSB0aGUgc3BhbiBpZiBpdCB3YXNuJ3Qgb25lIHRoYXQgd2FzIHNldCBieSB0aGUgdXNlci5cbiAgICAgICAgaWYgKCFjdXN0b21TcGFuKSB7XG4gICAgICAgICAgICBzcGFuLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoc3Bhbik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBzdWJzY3JpYmVUbzogICAgICAgIHN1YnNjcmliZVRvLFxuICAgICAgICBlbGVtZW50OiAgICAgICAgICAgIGVsZW1lbnQsXG4gICAgICAgIHNldE1lc3NhZ2VPcHRpb25zOiAgc2V0TWVzc2FnZU9wdGlvbnMsXG4gICAgICAgIGRpc3Bvc2U6ICAgICAgICAgICAgZGlzcG9zZVxuICAgIH07XG59O1xuXG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChtZWRpYXRvcikge1xuICAgIHZhciBjdXN0b21FdmVudDtcblxuICAgIGZ1bmN0aW9uIGVtaXQgKG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKEN1c3RvbUV2ZW50KSB7XG4gICAgICAgICAgICBjdXN0b21FdmVudCA9IG5ldyBDdXN0b21FdmVudCgnbm9kLnZhbGlkYXRpb24nLCB7ZGV0YWlsOiBvcHRpb25zfSk7XG5cbiAgICAgICAgICAgIG9wdGlvbnMuZWxlbWVudC5kaXNwYXRjaEV2ZW50KGN1c3RvbUV2ZW50KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93KCdub2QudmFsaWRhdGUgdHJpZWQgdG8gZmlyZSBhIGN1c3RvbSBldmVudCwgYnV0IHRoZSBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgQ3VzdG9tRXZlbnRcXCdzJyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzdWJzY3JpYmUgKGlkKSB7XG4gICAgICAgIG1lZGlhdG9yLnN1YnNjcmliZShpZCwgZW1pdCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgc3Vic2NyaWJlOiBzdWJzY3JpYmVcbiAgICB9O1xufTtcblxuIiwiY29uc3QgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG5cbi8qKlxuICogbWFrZUxpc3RlbmVyXG4gKlxuICogVGFrZXMgY2FyZSBvZiBsaXN0ZW5pbmcgdG8gY2hhbmdlcyB0byBpdHMgZWxlbWVudCBhbmQgZmlyZSB0aGVtIG9mZiBhc1xuICogZXZlbnRzIG9uIHRoZSBtZWRpYXRvciBmb3IgY2hlY2tlcnMgdG8gbGlzdGVuIHRvLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIG1ha2VMaXN0ZW5lciAoZWxlbWVudCwgbWVkaWF0b3IsIHRyaWdnZXJFdmVudHMsIGNvbmZpZ3VyYXRpb24pIHtcbiAgICB2YXIgaWQgPSB1dGlsLnVuaXF1ZSgpLFxuICAgICAgICAkZWxlbWVudDtcblxuICAgIGZ1bmN0aW9uIGNoYW5nZWQgKGV2ZW50KSB7XG4gICAgICAgIG1lZGlhdG9yLmZpcmUoe1xuICAgICAgICAgICAgaWQ6ICAgICBpZCxcbiAgICAgICAgICAgIGV2ZW50OiAgZXZlbnQsXG4gICAgICAgICAgICB0eXBlOiAgICdjaGFuZ2UnXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCBjaGFuZ2VkLCBmYWxzZSk7XG4gICAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBjaGFuZ2VkLCBmYWxzZSk7XG4gICAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdibHVyJywgY2hhbmdlZCwgZmFsc2UpO1xuXG4gICAgaWYgKGNvbmZpZ3VyYXRpb24ualF1ZXJ5KSB7XG4gICAgICAgICRlbGVtZW50ID0gY29uZmlndXJhdGlvbi5qUXVlcnkoZWxlbWVudCk7XG5cbiAgICAgICAgJGVsZW1lbnQub24oJ3Byb3BlcnR5Y2hhbmdlIGNoYW5nZSBjbGljayBrZXl1cCBpbnB1dCBwYXN0ZScsIGNoYW5nZWQpO1xuICAgIH1cblxuICAgIGlmICh0cmlnZ2VyRXZlbnRzKSB7XG4gICAgICAgIHRyaWdnZXJFdmVudHMgPSBBcnJheS5pc0FycmF5KHRyaWdnZXJFdmVudHMpID8gdHJpZ2dlckV2ZW50cyA6IFt0cmlnZ2VyRXZlbnRzXTtcblxuICAgICAgICB0cmlnZ2VyRXZlbnRzLmZvckVhY2goZnVuY3Rpb24gKGV2ZW50TmFtZSkge1xuICAgICAgICAgICAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgY2hhbmdlZCwgZmFsc2UpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkaXNwb3NlICgpIHtcbiAgICAgICAgZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdpbnB1dCcsIGNoYW5nZWQsIGZhbHNlKTtcbiAgICAgICAgZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBjaGFuZ2VkLCBmYWxzZSk7XG4gICAgICAgIGVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignYmx1cicsIGNoYW5nZWQsIGZhbHNlKTtcblxuICAgICAgICBpZiAoJGVsZW1lbnQpIHtcbiAgICAgICAgICAgICRlbGVtZW50Lm9mZigpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRyaWdnZXJFdmVudHMpIHtcbiAgICAgICAgICAgIHRyaWdnZXJFdmVudHMuZm9yRWFjaChmdW5jdGlvbiAoZXZlbnROYW1lKSB7XG4gICAgICAgICAgICAgICAgZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgY2hhbmdlZCwgZmFsc2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBlbGVtZW50OiAgICBlbGVtZW50LFxuICAgICAgICBkaXNwb3NlOiAgICBkaXNwb3NlLFxuICAgICAgICBpZDogICAgICAgICBpZFxuICAgIH07XG59O1xuXG4iLCIvKipcbiAqIG1ha2VNZWRpYXRvclxuICpcbiAqIE1pbmltYWwgaW1wbGVtZW50YXRpb24gb2YgYSBtZWRpYXRvciBwYXR0ZXJuLCB1c2VkIGZvciBjb21tdW5pY2F0aW9uXG4gKiBiZXR3ZWVuIGNoZWNrZXJzIGFuZCBjaGVja0hhbmRsZXJzIChjaGVja2VycyBmaXJlcyBldmVudHMgd2hpY2hcbiAqIGhhbmRsZXJzIGNhbiBzdWJzY3JpYmUgdG8pLiBVbmlxdWUgSUQncyBhcmUgdXNlZCB0byB0ZWxsIGV2ZW50cyBhcGFydC5cbiAqXG4gKiBTdWJzY3JpYmluZyB0byAnYWxsJyB3aWxsIGdpdmUgeW91IGFsbCByZXN1bHRzIGZyb20gYWxsIGNoZWNrcy5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBtYWtlTWVkaWF0b3IgKCkge1xuICAgIHZhciBzdWJzY3JpYmVycyA9IFtdLFxuICAgICAgICBhbGwgPSBbXTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHN1YnNjcmliZTogZnVuY3Rpb24gc3Vic2NyaWJlIChpZCwgZm4pIHtcbiAgICAgICAgICAgIGlmIChpZCA9PT0gJ2FsbCcpIHtcbiAgICAgICAgICAgICAgICBhbGwucHVzaChmbik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICghc3Vic2NyaWJlcnNbaWRdKSB7XG4gICAgICAgICAgICAgICAgICAgIHN1YnNjcmliZXJzW2lkXSA9IFtdO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChzdWJzY3JpYmVyc1tpZF0uaW5kZXhPZihmbikgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIHN1YnNjcmliZXJzW2lkXS5wdXNoKGZuKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgZmlyZTogZnVuY3Rpb24gZmlyZSAob3B0aW9ucykge1xuICAgICAgICAgICAgdmFyIHN1YnNjcmliZWRGdW5jdGlvbnMgPSBzdWJzY3JpYmVyc1tvcHRpb25zLmlkXS5jb25jYXQoYWxsKTtcblxuICAgICAgICAgICAgc3Vic2NyaWJlZEZ1bmN0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uIChzdWJzY3JpYmVkRnVuY3Rpb24pIHtcbiAgICAgICAgICAgICAgICBzdWJzY3JpYmVkRnVuY3Rpb24ob3B0aW9ucyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG59O1xuXG4iLCIvKipcbiAqIGdldEVsZW1lbnRzXG4gKlxuICogVGFrZXMgc29tZSBzb3J0IG9mIHNlbGVjdG9yLCBhbmQgcmV0dXJucyBhbiBhcnJheSBvZiBlbGVtZW50KHMpLiBUaGUgYXBwbGllZFxuICogc2VsZWN0b3IgY2FuIGJlIG9uZSBvZjpcbiAqXG4gKiAtIENzcyB0eXBlIHNlbGVjdG9yIChlLmcuLCBcIi5mb29cIilcbiAqIC0gQSBqUXVlcnkgZWxlbWVudCAoZS5nLiwgJCgnLmZvbykpXG4gKiAtIEEgc2luZ2xlIHJhdyBkb20gZWxlbWVudCAoZS5nLiwgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ZvbycpKVxuICogLSBBIGxpc3Qgb2YgcmF3IGRvbSBlbGVtZW50IChlLmcuLCAkKCcuZm9vJykuZ2V0KCkpXG4gKi9cbmZ1bmN0aW9uIGdldEVsZW1lbnRzIChzZWxlY3Rvcikge1xuICAgIGlmICghc2VsZWN0b3IpIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIC8vIE5vcm1hbCBjc3MgdHlwZSBzZWxlY3RvciBpcyBhc3N1bWVkXG4gICAgaWYgKHR5cGVvZiBzZWxlY3RvciA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgLy8gSWYgd2UgaGF2ZSBqUXVlcnksIHRoZW4gd2UgdXNlIHRoYXQgdG8gY3JlYXRlIGEgZG9tIGxpc3QgZm9yIHVzLlxuICAgICAgICBpZiAod2luZG93LmpRdWVyeSkge1xuICAgICAgICAgICAgcmV0dXJuIHdpbmRvdy5qUXVlcnkoc2VsZWN0b3IpLmdldCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgbm90LCB0aGVuIHdlIGRvIGl0IHRoZSBtYW51YWwgd2F5LlxuICAgICAgICB2YXIgbm9kZUxpc3QgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcblxuICAgICAgICByZXR1cm4gW10ubWFwLmNhbGwobm9kZUxpc3QsIGZ1bmN0aW9uIChlbCkgeyByZXR1cm4gZWw7IH0pO1xuICAgIH1cblxuICAgIC8vIGlmIHVzZXIgZ2F2ZSB1cyBqUXVlcnkgZWxlbWVudHNcbiAgICBpZiAoc2VsZWN0b3IuanF1ZXJ5KSB7XG4gICAgICAgIHJldHVybiBzZWxlY3Rvci5nZXQoKTtcbiAgICB9XG5cbiAgICAvLyBSYXcgRE9NIGVsZW1lbnRcbiAgICBpZiAoc2VsZWN0b3Iubm9kZVR5cGUgPT09IDEpIHtcbiAgICAgICAgcmV0dXJuIFtzZWxlY3Rvcl07XG4gICAgfVxuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkoc2VsZWN0b3IpKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBbXTtcblxuICAgICAgICBzZWxlY3Rvci5mb3JFYWNoKGZ1bmN0aW9uIChzZWwpIHtcbiAgICAgICAgICAgIHZhciBlbGVtZW50cyA9IGdldEVsZW1lbnRzKHNlbCk7XG5cbiAgICAgICAgICAgIHJlc3VsdCA9IHJlc3VsdC5jb25jYXQoZWxlbWVudHMpO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIHRocm93ICdVbmtub3duIHR5cGUgb2YgZWxlbWVudHMgaW4geW91ciBgc2VsZWN0b3JgOiAnICsgc2VsZWN0b3I7XG59XG5cbi8qKlxuICogZ2V0RWxlbWVudFxuICpcbiAqIFJldHVybnMgdGhlIGZpcnN0IGVsZW1lbnQgdGFyZ2V0ZWQgYnkgdGhlIHNlbGVjdG9yLiAoc2VlIGBnZXRFbGVtZW50c2ApXG4gKi9cbmZ1bmN0aW9uIGdldEVsZW1lbnQgKHNlbGVjdG9yKSB7XG4gICAgcmV0dXJuIGdldEVsZW1lbnRzKHNlbGVjdG9yKVswXTtcbn1cblxuLy8gSGVscGVyIGZ1bmN0aW9ucyBmb3IgYG1ha2VEb21Ob2RlYC5cbmZ1bmN0aW9uIGhhc0NsYXNzIChjbGFzc05hbWUsIGVsKSB7XG4gICAgaWYgKGVsLmNsYXNzTGlzdCkge1xuICAgICAgICByZXR1cm4gZWwuY2xhc3NMaXN0LmNvbnRhaW5zKGNsYXNzTmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuICEhZWwuY2xhc3NOYW1lLm1hdGNoKG5ldyBSZWdFeHAoJyhcXFxcc3xeKScrY2xhc3NOYW1lKycoXFxcXHN8JCknKSk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiByZW1vdmVDbGFzcyAoY2xhc3NOYW1lLCBlbCkge1xuICAgIGlmIChlbC5jbGFzc0xpc3QpIHtcbiAgICAgICAgZWwuY2xhc3NMaXN0LnJlbW92ZShjbGFzc05hbWUpO1xuICAgIH0gZWxzZSBpZiAoaGFzQ2xhc3MoY2xhc3NOYW1lLCBlbCkpIHtcbiAgICAgICAgICAgIGVsLmNsYXNzTmFtZSA9IGVsLmNsYXNzTmFtZS5yZXBsYWNlKG5ldyBSZWdFeHAoJyg/Ol58XFxcXHMpJytjbGFzc05hbWUrJyg/IVxcXFxTKScpLCAnJyk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBhZGRDbGFzcyAoY2xhc3NOYW1lLCBlbCkge1xuICAgIGlmIChlbC5jbGFzc0xpc3QpIHtcbiAgICAgICAgZWwuY2xhc3NMaXN0LmFkZChjbGFzc05hbWUpO1xuICAgIH0gZWxzZSBpZiAoIWhhc0NsYXNzKGNsYXNzTmFtZSwgZWwpKSB7XG4gICAgICAgIGVsLmNsYXNzTmFtZSArPSAnICcgKyBjbGFzc05hbWU7XG4gICAgfVxufVxuXG5cbmZ1bmN0aW9uIGZpbmRQYXJlbnRXaXRoQ2xhc3MgKHBhcmVudCwga2xhc3MpIHtcbiAgICAvLyBHdWFyZCAob25seSB0aGUgYHdpbmRvd2AgZG9lcyBub3QgaGF2ZSBhIHBhcmVudCkuXG4gICAgaWYgKCFwYXJlbnQucGFyZW50Tm9kZSkge1xuICAgICAgICByZXR1cm4gcGFyZW50O1xuICAgIH1cblxuICAgIC8vIEZvdW5kIGl0XG4gICAgaWYgKGhhc0NsYXNzKGtsYXNzLCBwYXJlbnQpKSB7XG4gICAgICAgIHJldHVybiBwYXJlbnQ7XG4gICAgfVxuXG4gICAgLy8gVHJ5IG5leHQgcGFyZW50IChyZWN1cnNpb24pXG4gICAgcmV0dXJuIGZpbmRQYXJlbnRXaXRoQ2xhc3MocGFyZW50LnBhcmVudE5vZGUsIGtsYXNzKTtcbn1cblxuZnVuY3Rpb24gZ2V0UGFyZW50IChlbGVtZW50LCBjb25maWd1cmF0aW9uKSB7XG4gICAgdmFyIGtsYXNzID0gY29uZmlndXJhdGlvbi5wYXJlbnRDbGFzcztcblxuICAgIGlmICgha2xhc3MpIHtcbiAgICAgICAgcmV0dXJuIGVsZW1lbnQucGFyZW50Tm9kZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBrbGFzcyA9IGtsYXNzLmNoYXJBdCgwKSA9PT0gJy4nID8ga2xhc3Muc2xpY2UoMSkgOiBrbGFzcztcblxuICAgICAgICByZXR1cm4gZmluZFBhcmVudFdpdGhDbGFzcyhlbGVtZW50LnBhcmVudE5vZGUsIGtsYXNzKTtcbiAgICB9XG59XG5cblxuLy8gSGVscGVyIGZ1bmN0aW9uIHRvIGNyZWF0ZSB1bmlxdWUgaWQnc1xuY29uc3QgdW5pcXVlID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdW5pcXVlQ291bnRlciA9IDA7XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdW5pcXVlQ291bnRlcisrO1xuICAgIH07XG59KSgpO1xuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGdldEVsZW1lbnRzLFxuICAgIGdldEVsZW1lbnQsXG4gICAgZ2V0UGFyZW50LFxuICAgIGhhc0NsYXNzLFxuICAgIGFkZENsYXNzLFxuICAgIHJlbW92ZUNsYXNzLFxuICAgIHVuaXF1ZVxufTtcbiJdfQ==
