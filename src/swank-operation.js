(function(angular) {
  'use strict';

  function SwankOperationFactory() {
    function SwankOperation(op, opObject) {
      var _self = angular.extend(this, {});
    }

    return SwankOperation;
  }

  angular.module('swank').factory('SwankOperation', SwankOperationFactory);
})(angular);