/* globals _, ZSchema */
/**
 * Swank - An Angular 1.5+ OpenAPI (Swagger) parser, validator and object
 *         factory.
 *
 * @author    Mark Litchfield
 * @copyright 2016
 * @version   0.0.2
 * @package   Swank
 */
(function(angular) {
  'use strict';
  var OPENAPISPEC = 'https://raw.githubusercontent.com/OAI/OpenAPI-Specification/master/schemas/';

  /**
   * Swank Factory Object
   *
   * This function creates a new Swank object from the data supplied to the
   * constructor method. The factory parses and validates the swagger JSON for
   * required data and values. The current incarnation of Swank only supports
   * version 2 swagger JSON.
   *
   * @param   {Object} $log     Angular Logging service
   * @param   {Object} $http    Angular HTTP service
   * @param   {Object} $q       Angular Promise service
   * @returns {Object}          A parsed and validated Swank object
   */
  function SwankFactory($log, $http, $q) {
    /**
     * Default Swank model
     * @type {Object}
     */
    var swankModel = {
      errors: [], // Collection of validation errors
      doc: {}
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
            var schemaUrl = _self.schemaUrl(data.version || null);
            var schema = _self.fetchSchema(schemaUrl);
            schema.then(function(schemaDoc) {
              var validator;
              try {
                validator = new ZSchema({breakOnFirstError: false});
                if (!_.isObject(validator)) {
                  throw new Error('ZSchema library not found.');
                }
              } catch (e) {
                $log.error(e);
                return;
              }
              validator.setRemoteReference(schemaUrl, schemaDoc);
              var result = validator.validate(data, {'$ref': schemaUrl});
              _self.errors = (!result) ? validator.getLastErrors() : [];
              _self.doc = data;
              _self.logErrors();
            });
          });
        } else {
          throw new Error('Required parameter missing instantiating Swank.');
        }
      } catch (err) {
        $log.error(err);
      }
      return _self;
    }
    /**
     * Loads the API JSON from url, string, or object
     * @param  {Mixed}   request URL, string or object form of the JSON to load
     * @return {Promise}         Deferred promise for the JSON load
     */
    Swank.prototype.load = function(request) {
      var deferred = $q.defer();
      if (_.isString(request) && request.match(/^http/)) {
        $http.get(request).then(function(result) {
          deferred.resolve(result.data);
        }, function(msg, code) {
          deferred.reject(msg);
          $log.error(msg, code);
        });
      } else if (_.isObject(request)) {
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
    /**
     * Assembles a schema URL from the supplied version
     * @param  {String} version Version of the Swagger / OpenAPI Spec to use
     * @return {String}         An assembled URL
     */
    Swank.prototype.schemaUrl = function(version) {
      version = version || '2.0';
      var v = 'v' + String(version).match(/(\d{1,}(\.\d{1,})?)/)[1];
      v += (v.split('.').length === 1) ? '.0' : '';
      return OPENAPISPEC + v + '/schema.json';
    };
    /**
     * Fetches the Swagger JSON schema
     * @return {Object} The JSON Schema to use during validation
     */
    Swank.prototype.fetchSchema = function(url) {
      var deferred = $q.defer();
      $http.get(url).then(
      function(result) {
        deferred.resolve(result.data);
      },
      function(msg, code) {
        deferred.reject(msg);
        $log.error(msg, code);
      });
      return deferred.promise;
    };
    /**
     * Logs any validation errors to the console
     */
    Swank.prototype.logErrors = function() {
      var _self = this;
      _.forEach(_self.errors, function(err) {
        $log.error(
          err.code + ': ' + err.message +
          '. Under ' + err.path.replace('#/', '{ROOT}/') + '.'
        );
      });
    };

    return Swank;
  }
  SwankFactory.$inject = ['$log', '$http', '$q'];

  /**
   * Define our module
   */
  angular.module('swank', []).factory('Swank', SwankFactory);
})(angular);

(function(angular) {
  'use strict';

  function SwankPathFactory() {
    function SwankPath(route, pathObject) {
      return angular.merge(this, pathObject || {});
    }

    return SwankPath;
  }
  SwankPathFactory.$inject = [];

  angular.module('swank').factory('SwankPath', SwankPathFactory);
})(angular);
