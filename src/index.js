const util                          = require('./util'),
      constants                     = require('./constants'),
      makeMediator                  = require('./makeMediator'),
      makeEventEmitter              = require('./makeEventEmitter'),
      makeCollection                = require('./makeCollection'),
      makeListener                  = require('./makeListener'),
      makeChecker                   = require('./makeChecker'),
      makeCheckHandler              = require('./makeCheckHandler'),
      makeDomNode                   = require('./makeDomNode'),
      checkFunctions                = require('./checkFunctions');



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

module.exports = function nod (config) {
    var form,
        configuration   = {},
        mediator        = makeMediator(),
        eventEmitter    = makeEventEmitter(mediator),

        // Creating (empty) collections
        listeners       = makeCollection(makeListener),
        checkers        = makeCollection(makeChecker),
        checkHandlers   = makeCollection(makeCheckHandler),
        domNodes        = makeCollection(makeDomNode);



    /**
     * Entry point for the user. The user passes in an array of metrics (an
     * object containing a selector, a validate string/function, etc.) and it
     * gets processed from here.
     *
     * This function, is mostly about cleaning up what the user passed us.
     */
    function addMetrics (metrics) {
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
                    throw 'If you pass in `validate:...` as an array, then `errorMessage:...` also needs to be an array. "' + metric.validate + '", and "' + metric.errorMessage + '"';
                }

                // We store each as arrays, and then run through them,
                // overwriting each of the keys accordingly.
                validateArray     = metric.validate;
                errorMessageArray = metric.errorMessage;

                validateArray.forEach(function (validate, i) {
                    // Overwrite the array with the individual 'validate' and
                    // 'errorMessage'.
                    metric.validate     = validate;
                    metric.errorMessage = errorMessageArray[i];

                    addMetric(metric);
                });
            }
        });
    }


    function addMetric (metric) {
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
                    listener:       listeners.findOrMake(element, mediator, metric.triggerEvents, configuration),
                    checker:        checkers.findOrMake(element, mediator),
                    checkHandler:   checkHandlers.findOrMake(element, mediator, configuration),
                    domNode:        domNodes.findOrMake(element, mediator, configuration)
                };
            });


        // Saved for later reference in case the user has a `tap` function
        // defined.
        checkFunction.validate = (typeof metric.validate === 'function') ? metric.validate.toString() : metric.validate;



        // Special cases. These `validates` affect each other, and their state
        // needs to update each time either of the elements' values change.
        if (metric.validate === 'one-of' || metric.validate === 'only-one-of' || metric.validate === 'some-radio') {
            specialTriggers.push(metric.selector);
        }

        if (typeof metric.validate === 'string' && metric.validate.indexOf('same-as') > -1) {
            specialTriggers.push(metric.validate.split(':')[1]);
        }



        // Helper function, used in the loop below.
        function subscribeToTriggers (checker, selector) {
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
    function addForm (selector) {
        var form = util.getElement(selector);

        form.addEventListener('submit', possiblePreventSubmit, false);
    }

    // Prevent function, used above
    function possiblePreventSubmit (event) {
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
    function removeElement (selector) {
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
    function configure (attributes, value) {
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
    function toggleSubmit () {
        if (configuration.submit && configuration.disableSubmit) {
            util.getElement(configuration.submit).disabled = !areAll(constants.VALID);
        }
    }


    /*
     * Listen to all checks, and if the user has set in the configuration to
     * enable/disabled the submit button, we do that.
     */
    mediator.subscribe('all', toggleSubmit);


    function areAll (status) {
        for (var i = 0, len = checkHandlers.length; i < len; i++) {
            if (checkHandlers[i].getStatus().status !== status) {
                return false;
            }
        }

        return true;
    }


    function setMessageOptions (options) {
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
    mediator.subscribe('all', function (options) {
        if (typeof configuration.tap === 'function' && options.type === 'check') {
            configuration.tap(options);
        }
    });



    function getStatus (selector, showErrorMessage) {
        var element = util.getElement(selector),
            status  = checkHandlers.findOrMake(element).getStatus();

        return showErrorMessage ? status : status.status;
    }



    function performCheck (selector) {
        var cs = selector ? util.getElements(selector).map(checkers.findOrMake) : checkers;

        cs.forEach(function(checker) {
            checker.performCheck();
        });
    }



    /**
     * Internal functions that are exposed to the public.
     */
    var nodInstace = {
        add:                    addMetrics,
        remove:                 removeElement,
        areAll:                 areAll,
        getStatus:              getStatus,
        configure:              configure,
        setMessageOptions:      setMessageOptions,
        performCheck:           performCheck
    };

    if (config) {
        nodInstace.configure(config);
    }

    return nodInstace;
}
