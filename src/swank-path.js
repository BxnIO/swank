(function(angular) {
  'use strict';

  function SwankPathFactory(SwankOperation) {
    function SwankPath(pathObject) {
      var _self = angular.extend(this, pathObject || {});
      return _self;
    }

    SwankPath.prototype.parse = function() {
      var _self = this;
      
    };

    return SwankPath;
  }
  SwankPathFactory.$inject = ['SwankOperation'];

  angular.module('swank').factory('SwankPath', SwankPathFactory);
})(angular);