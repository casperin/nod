function findCollectionIndex (collection, element) {
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
module.exports = function makeCollection (maker) {
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
        if (typeof item.dispose === 'function') {
            item.dispose();
        }

        // Remove item
        collection.splice(index, 1);
    };

    return collection;
};

