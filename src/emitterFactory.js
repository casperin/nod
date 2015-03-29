const emit = options =>
    options.element.dispatchEvent(new CustomEvent('nod.validation', {detail: options}));

module.exports = (mediator) => {

    return {
        subscribe: id => mediator.subscribe(id, emit)
    };
};

