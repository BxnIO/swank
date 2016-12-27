(function(angular) {
  'use strict';

  function SwankDefnitionsFactory() {
    function SwankDefinitions() {
      
    }
    return SwankDefinitions;
  }
  SwankDefnitionsFactory.$inject = [];

  angular.module('swank').factory('SwankDefinitions', SwankDefnitionsFactory);
})(angular);