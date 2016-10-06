/* globals _ */
'use strict';
/**
 * Returns a list of values by key.
 * @param  {Object} tree    Object to search
 * @param  {String} key     Key to search for
 * @param  {Array}  results Collector
 * @return {Array}          Collection of values matched by key
 */
function valuesByKey(tree, key, results) {
  results = results || [];
  return _.uniq(_.flatten(_.map(tree, function(child) {
    if (child[key]) {
      _.forEach(child[key], function(c) { results.push(c); });
    }
    return (_.isObject(child) && !_.isArray(child)) ?
      valuesByKey(child, key, results) :
      results;
  })));
}