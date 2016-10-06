(function(angular) {
  'use strict';

  function SwankPathsFactory(SwankPath) {
    function SwankPaths(paths, options) {
      var _self = angular.extend(this, {
        paths: {}
      });
      if (options.orderPaths === 'route') {
        _self.byRoute(paths);
      }
      if (options.orderPaths === 'method') {
        _self.byMethod(paths);
      }
      if (options.orderPaths === 'tag') {
        _self.byTag(paths, options.tags);
      }
      return _self;
    }

    SwankPaths.prototype.byRoute = function(paths) {
      var _self = this;
      _.forEach(paths, function(path, route) {
        _self.paths[route] = new SwankPath(path);
      });
    };

    SwankPaths.prototype.byMethod = function(paths) {
      var _self = this;
      _self.paths = {
        get:{}, put:{}, post:{}, delete:{}, options:{}, head:{}, patch:{}
      };
      _.forEach(paths, function(path, route) {
        _.forEach(path, function(details, method) {
          _self.paths[method][route] = details;
        });
      });
    };

    SwankPaths.prototype.byTag = function(paths, tags) {
      var _self = this;
      if (tags) {
        _.forEach(tags, function(tag) { _self.paths[tag] = {}; });
      }
      _self.paths.untagged = {};
      _.forEach(paths, function(path, route) {
        _.forEach(path, function(details, method) {
          var t = (details.tags) ? details.tags : 'untagged';
          _.forEach(t, function(tag) {
            _self.paths[tag] = _self.paths[tag] || {};
            _self.paths[tag][route] = details;
          });
        });
      });
    };

    return SwankPaths;
  }
  SwankPathsFactory.$inject = ['SwankPath'];

  angular.module('swank').factory('SwankPaths', SwankPathsFactory);
})(angular);