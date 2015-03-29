const findCollectionIndex = (collection, element) => {
    for (let i in collection) {
        if (collection[i].element === element) {
            return i;
        }
    }

    return -1;
};


/**
 * collectionFactory
 *
 * A minimal implementation of a "collection", inspired by collections from
 * BackboneJS. Used by listeners, checkers, and checkHandlers.
 */
module.exports = maker => {
    const collection = [];

    collection.findOrMake = (...args) => {
        const element = args[0],
            index = findCollectionIndex(collection, element);

        // Found
        if (index !== -1) {
            return collection[index];
        }

        // None found, let's make one then.
        const item = maker.apply(null, args);
        collection.push(item);
        return item;
    };

    collection.removeItem = (element) => {
        const index = findCollectionIndex(collection, element),
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

