/* globals _ */
/**
 * Swank - An Angular 1.5+ OpenAPI (Swagger) parser, validator and object
 *         factory.
 *
 * @author    Mark Litchfield
 * @copyright 2016
 * @version   0.0.1
 * @package   Swank
 */
(function(angular) {
  'use strict';
  /**
   * Swank Factory Object
   *
   * This function creates a new Swank object from the data supplied to the
   * constructor method. The factory parses and validates the swagger JSON for
   * required data and values. The current incarnation of Swank only supports
   * version 2 swagger JSON.
   *
   * @param   {Object} $log            Angular Logging
   * @param   {Object} SwankValidator  Swank Validation Service
   * @returns {Object}                 A parsed and validated Swank object
   */
  function SwankFactory($log, $http, $q, SwankValidator) {
    /**
     * Default Swank model
     * @type {Object}
     */
    var swankModel = {
      errors: [],
      swagger: {}
    };
    /**
     * Swank Constructor method
     *
     * @param {Object} swagger Swagger JSON to parse and validate
     */
    function Swank(swagger) {
      var _self = angular.merge(this, swankModel);
      try {
        if (swagger) {
          var doc = _self.load(swagger);
          doc.then(function(data) {
            var validator = new SwankValidator(data).validate();
            _self.errors = validator.errors;
            _self.swagger = validator.swagger;
          });
        } else {
          throw new Error('Required parameter missing when instantiating Swank.');
        }
      } catch (err) {
        $log.error(err);
      }
      return _self;
    }

    Swank.prototype.load = function(request) {
      var deferred = $q.defer();
      if (_.isString(request) && request.match(/^http/)) {
        $http.get(request).then(function(result) {
          deferred.resolve(result.data);
        }, function(msg, code) {
          deferred.reject(msg);
          $log.error(msg, code);
        });
      }
      if (_.isObject(request)) {
        deferred.resolve(request);
      } else {
        try {
          var json = JSON.parse(request);
          deferred.resolve(json);
        } catch (e) {
          $log.error('Invalid JSON: ' + e.message.split('in JSON')[0].trim());
        }
      }
      return deferred.promise;
    };

    return Swank;
  }
  SwankFactory.$inject = ['$log', '$http', '$q', 'SwankValidator'];

  /**
   * Define our module
   */
  angular.module('swank', [])
    .factory('Swank', SwankFactory);
})(angular);
