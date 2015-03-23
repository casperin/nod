const util = require('./util');


/**
 * makeListener
 *
 * Takes care of listening to changes to its element and fire them off as
 * events on the mediator for checkers to listen to.
 */
module.exports = function makeListener (element, mediator, triggerEvents, configuration) {
    var id = util.unique(),
        $element;

    function changed (event) {
        mediator.fire({
            id:     id,
            event:  event,
            type:   'change'
        });
    }

    element.addEventListener('input', changed, false);
    element.addEventListener('change', changed, false);
    element.addEventListener('blur', changed, false);

    if (configuration.jQuery) {
        $element = configuration.jQuery(element);

        $element.on('propertychange change click keyup input paste', changed);
    }

    if (triggerEvents) {
        triggerEvents = Array.isArray(triggerEvents) ? triggerEvents : [triggerEvents];

        triggerEvents.forEach(function (eventName) {
            element.addEventListener(eventName, changed, false);
        });
    }

    function dispose () {
        element.removeEventListener('input', changed, false);
        element.removeEventListener('change', changed, false);
        element.removeEventListener('blur', changed, false);

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
        element:    element,
        dispose:    dispose,
        id:         id
    };
};

