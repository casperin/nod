const checkFunctions = require('./checkFunctions');

module.exports = metric => {
    if (typeof metric.validate === 'function') {
        return metric.validate;
    }

    if (metric.validate instanceof RegExp) {
        return checkFunctions.regexp(metric.validate);
    }

    let args   = metric.validate.split(':'),
        fnName = args.shift();

    if (fnName === 'one-of' || fnName === 'only-one-of' ||
        fnName === 'same-as' || fnName === 'some-radio') {

        args.push(metric.selector);
    }

    if (typeof checkFunctions[fnName] === 'function') {
        return checkFunctions[fnName].apply(null, args);
    } else {
        throw 'Couldn\'t find your validator function "' + fnName + '" for "' + metric.selector + '"';
    }
};

