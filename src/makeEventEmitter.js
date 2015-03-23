module.exports = function (mediator) {
    var customEvent;

    function emit (options) {
        if (CustomEvent) {
            customEvent = new CustomEvent('nod.validation', {detail: options});

            options.element.dispatchEvent(customEvent);
        } else {
            throw('nod.validate tried to fire a custom event, but the browser does not support CustomEvent\'s');
        }
    }

    function subscribe (id) {
        mediator.subscribe(id, emit);
    }

    return {
        subscribe: subscribe
    };
};

