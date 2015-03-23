const util = require('./util'),
      constants = require('./constants');

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
    var parent              = util.getParent(element, configuration),
        _status             = constants.UNCHECKED,
        pendingUpdate       = null,
        span                = document.createElement('span'),
        customSpan          = false;

    span.style.display = 'none';

    if (!configuration.noDom) {
        parent.appendChild(span);
    }

    // Updates the class of the parent to match the status of the element.
    function updateParent (status) {
        var successClass    = configuration.successClass || constants.classes.successClass,
            errorClass      = configuration.errorClass || constants.classes.errorClass;

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
    function updateSpan (status, errorMessage) {
        var successMessageClass = configuration.successMessageClass || constants.classes.successMessageClass,
            errorMessageClass   = configuration.errorMessageClass || constants.classes.errorMessageClass;

        span.style.display = 'none';

        switch (status) {
        case constants.VALID:
            util.removeClass(errorMessageClass, span);
            util.addClass(successMessageClass, span);
            if (configuration.successMessage) {
                span.textContent = configuration.successMessage;
                span.style.display = '';
            }
            break;
        case constants.INVALID:
            util.removeClass(successMessageClass, span);
            util.addClass(errorMessageClass, span);
            span.textContent = errorMessage;
            span.style.display = '';
            break;
        }
    }

    function set (options) {
        var status              = options.result,
            errorMessage        = options.errorMessage;

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

    function subscribeTo (id) {
        mediator.subscribe(id, set);
    }


    function setMessageOptions (parentContainer, message) {
        if (parentContainer) {
            parent = util.getElement(parentContainer);
        }

        if (message) {
            span.parentNode.removeChild(span);      // Remove old span.
            span = util.getElement(message);         // Set the new one.
            customSpan = true;                      // So we won't delete it.
        }
    }


    function dispose () {
        // First remove any classes
        util.removeClass(configuration.errorClass || constants.classes.errorClass, parent);
        util.removeClass(configuration.successClass || constants.classes.successClass, parent);

        // Then we remove the span if it wasn't one that was set by the user.
        if (!customSpan) {
            span.parentNode.removeChild(span);
        }
    }

    return {
        subscribeTo:        subscribeTo,
        element:            element,
        setMessageOptions:  setMessageOptions,
        dispose:            dispose
    };
};

