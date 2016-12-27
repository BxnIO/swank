/* globals _ */
(function(angular) {
  'use strict';

  function Helpers() {
    return {
      /**
       * Returns a list of values by key.
       * @param  {Object} tree    Object to search
       * @param  {String} key     Key to search for
       * @param  {Array}  results Collector
       * @return {Array}          Collection of values matched by key
       */
      valuesByKey: function(tree, key, results) {
        var _self = this;
        results = results || [];
        return _.flatten(_.map(tree, function(child) {
          if (child[key]) {
            _.forEach(child[key], function(c) { results.push(c); });
          }
          return (_.isObject(child) && !_.isArray(child)) ?
            _self.valuesByKey(child, key, results) :
            results;
        }));
      }
    };
  }
  angular.module('swank').factory('Helpers', Helpers);
})(angular);