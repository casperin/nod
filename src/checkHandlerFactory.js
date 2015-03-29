const util = require('./util'),
      constants = require('./constants');


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
    var results     = {},
        id          = util.unique();

    function subscribeTo (id, errorMessage, defaultStatus) {
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

    function checkHandler (result) {
        results[result.id].status = result.result ? constants.VALID : constants.INVALID;

        notifyMediator();
    }

    // Runs through all results to see what kind of feedback to show the
    // user.
    function notifyMediator () {
        var status = getStatus();

        // Event if might be valid we pass along an undefined errorMessage.
        mediator.fire({
            id:             id,
            type:           'result',
            result:         status.status,
            element:        element,
            errorMessage:   status.errorMessage
        });
    }

    function getStatus () {
        var status, errorMessage;

        for (var id in results) {
            status = results[id].status;

            if (results[id].status === constants.INVALID) {
                errorMessage = results[id].errorMessage;
                break;
            }
        }

        return {
            status:        status,
            errorMessage:  errorMessage
        };
    }


    return {
        id:             id,
        subscribeTo:    subscribeTo,
        checkHandler:   checkHandler,
        getStatus:      getStatus,
        element:        element
    };
};

