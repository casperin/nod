const util = require('./util'),
      constants = require('./constants');

// Collection of built-in check functions
module.exports = {
    'presence': () =>
        (callback, value) =>
            callback(value.length > 0),

    'exact': exactValue =>
        (callback, value) =>
            callback(value === exactValue),

    'contains': containsValue =>
        (callback, value) =>
            callback(value.indexOf(containsValue) > -1),

    'not': exactValue =>
        (callback, value) =>
            callback(value !== exactValue),

    'min-length': minimumLength =>
        (callback, value) =>
            callback(value.length >= minimumLength),

    'max-length': maximumLength =>
        (callback, value) =>
            callback(value.length <= maximumLength),

    'exact-length': exactLen =>
        (callback, value) =>
            callback(value.length === +exactLen),

    'between-length': (minimumLength, maximumLength) =>
        (callback, value) =>
            callback(value.length >= minimumLength && value.length <= maximumLength),

    'max-number': maximumNumber =>
        (callback, value) =>
            callback(+value <= maximumNumber),

    'min-number': minimumNumber =>
        (callback, value) =>
            callback(+value <= minimumNumber),

    'between-number': (minimumNumber, maximumNumber) =>
        (callback, value) =>
            callback(+value >= minimumNumber && +value <= maximumNumber),

    'integer': () =>
        (callback, value) =>
            callback(constants.Regex.INTEGER.test(value)),

    'float': () =>
        (callback, value) =>
            callback(constants.Regex.FLOAT.test(value)),

    'same-as': selector => {
        const sameAsElement = util.getElement(selector);

        return (callback, value, options) => {
            // 'same-as' is special, in that if it is triggered by another
            // field (the one it should be similar to), and the field itself is
            // empty, then it bails out without a check. This is to avoid
            // showing an error message before the user has even reached the
            // element.
            if (    options &&
                    options.event &&
                    options.event.target &&
                    options.event.target !== options.element &&
                    value.length === 0) {
                return;
            }

            callback(value === sameAsElement.value);
        };
    },

    'one-of': selector => {
        const elements = util.getElements(selector);

        return callback =>
            elements.filter(el => el.value).length;
    },

    'only-one-of': selector => {
        const elements = util.getElements(selector);

        return (callback, value) =>
            callback(elements.filter(el => el.value).length === 1);
    },

    'checked': () =>
        (callback, value, options) =>
            callback(options.element.checked),

    'some-radio': selector => {
        const radioElements = util.getElements(selector);

        return (callback, value, options) =>
            callback(radioElements.map(el => el.checked).reduce(util.or));
    },

    'regexp': reg =>
        (callback, value) =>
            callback(reg.test(value)),

    'email': () =>
        (callback, value) =>
            callback(constants.Regex.EMAIL.test(value))
};
