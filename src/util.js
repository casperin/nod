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
function getElements (selector) {
    if (!selector) {
        return [];
    }

    // Normal css type selector is assumed
    if (typeof selector === 'string') {
        // If we have jQuery, then we use that to create a dom list for us.
        if (window.jQuery) {
            return window.jQuery(selector).get();
        }

        // If not, then we do it the manual way.
        var nodeList = document.querySelectorAll(selector);

        return [].map.call(nodeList, function (el) { return el; });
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

    throw 'Unknown type of elements in your `selector`: ' + selector;
}

/**
 * getElement
 *
 * Returns the first element targeted by the selector. (see `getElements`)
 */
function getElement (selector) {
    return getElements(selector)[0];
}

// Helper functions for `makeDomNode`.
function hasClass (className, el) {
    if (el.classList) {
        return el.classList.contains(className);
    } else {
        return !!el.className.match(new RegExp('(\\s|^)'+className+'(\\s|$)'));
    }
}

function removeClass (className, el) {
    if (el.classList) {
        el.classList.remove(className);
    } else if (hasClass(className, el)) {
            el.className = el.className.replace(new RegExp('(?:^|\\s)'+className+'(?!\\S)'), '');
    }
}

function addClass (className, el) {
    if (el.classList) {
        el.classList.add(className);
    } else if (!hasClass(className, el)) {
        el.className += ' ' + className;
    }
}


function findParentWithClass (parent, klass) {
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
}

function getParent (element, configuration) {
    var klass = configuration.parentClass;

    if (!klass) {
        return element.parentNode;
    } else {
        klass = klass.charAt(0) === '.' ? klass.slice(1) : klass;

        return findParentWithClass(element.parentNode, klass);
    }
}


// Helper function to create unique id's
const unique = (function () {
    var uniqueCounter = 0;

    return function () {
        return uniqueCounter++;
    };
})();


module.exports = {
    getElements,
    getElement,
    getParent,
    hasClass,
    addClass,
    removeClass,
    unique
};
