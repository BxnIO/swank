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

/* globals _ */
/**
 * Swank-Validator - Swagger JSON validation
 *
 * @author    Mark Litchfield
 * @copyright 2016
 * @version   0.0.1
 * @package   Swank
 */
(function(angular, window) {
  'use strict';
  /**
   * Swank Validation Factory
   *
   * Parses and validates the supplied swagger JSON. Poorly formed or JSON that
   * is unparseable is rejected. Errors are logged to the console using the
   * built-in Angular Logging service.
   *
   * @param {Object} $log Angular Logging Service
   */
  function SwankValidatorFactory($log) {
    /**
     * Constructor Method
     *
     * Constructs a new SwankValidator object and parses the supplied swagger
     * JSON data.
     *
     * @param  {Object} swagger Swagger JSON data
     * @return {Object} Reference to self
     */
    function Validator(swagger) {
      var _self = this;
      angular.extend(_self, {errors: [], swagger: {}, validations: {}});
      try {
        _self.swagger = (!_.isObject(swagger)) ? JSON.parse(swagger) : swagger;
      } catch (e) {
        _self.addError('Invalid JSON: ' + e.message.split('in JSON')[0].trim());
        _self.swagger = {};
      }
      return _self;
    }
    /**
     * Adds validation errors to the error collection for logging after all
     * validation rules have processed.
     *
     * @param {String} error Error message
     */
    Validator.prototype.addError = function(error) {
      var _self = this;
      _self.errors.push(error);
    };
    /**
     * Performs the actual validation by iterating over validation rules for
     * specific versions of swagger and testing those against the supplied data.
     *
     * @return {Object} Reference to self
     */
    Validator.prototype.validate = function() {
      var _self = this;
      var version = _self.swagger.swagger || '2.0';
      var rules = window.SwankRuleSets[version];
      if (_.isArray(rules)) {
        _.forEach(rules, function(rule) {
          _self.test(rule);
        });
        _.forEach(_self.errors, function(error) { $log.error(error); });
      } else {
        $log.error('Failed to load validation rules for version ' + version);
      }
      return _self;
    };
    /**
     * Tests a supplied validation rule against the stored swagger.
     *
     * @param  {Object} rule Validation rule object
     */
    Validator.prototype.test = function(rule) {
      var _self = this,
          // Split our path. Necessary for certain lodash functions.
          Query = rule.path.split('.'),
          // Pull the value if one exists or set as undefined.
          Value = _.result(_self.swagger, Query, (function() {})()),
          // Define an error message or use a default.
          Ooops = rule.error || 'The path \'' + rule.path + '\' is invalid.',
          // Create / get a validations object for storing test results
          Tests = _self.validations[rule.path] = _self.validations[rule.path] || {},
          // Set some initial values
          hasData = (!_.isUndefined(Value)),
          valid = true;
      Tests.exists = hasData;

      // If data is required, do we have data?
      if (_.has(rule, 'required')) {
        valid &= (rule.required && hasData);
      }

      // If a different key is must be present, does it exist?
      if (_.has(rule, 'requiredIf')) {
        if (!_.isArray(rule.requiredIf)) {
          $log.error('Bad validation rule. \'requiredIf\' must be an array.');
        } else {
          var key = rule.requiredIf[0],
              condition = rule.requiredIf[1] || 'exists',
              test = rule.requiredIf[2] || null,
              parent = _self.validations[key];
          // Are we testing for something other than presence?
          switch (condition.toLowerCase()) {
            case 'exists':
              if (hasData) {
                valid &= Tests.conditional = (parent.exists && parent.isValid && hasData);
              }
              break;
            case 'matches':
              var goodParent = (parent.exists && parent.isValid);
              var parentVal = _.result(
                _self.swagger, key.split('.'), (function() {})()
              );
              valid &= Tests.conditional = (goodParent && parentVal === test);
              break;
          }
        }
      }

      // Finished checking for requirement. If we have data, we need to test
      // other conditions.
      if (hasData) {
        if (_.has(rule, 'matches')) {
          valid &= Boolean(!_.isUndefined(rule.matches) && rule.matches === Value);
        }
        if (_.has(rule, 'isType')) {
          switch (rule.isType.toLowerCase()) {
            case 'string':
              valid &= Boolean(hasData && _.isString(Value));
              break;
            case 'number':
              valid &= Boolean(hasData && _.isNumber(Value));
              break;
            case 'object':
              valid &= Boolean(hasData && _.isPlainObject(Value));
              break;
            case 'array':
              valid &= Boolean(hasData && _.isArray(Value));
              break;
          }
        }
      }
      Tests.isValid = valid;
      // Add the error if the path is invalid
      if (!valid) { _self.addError(Ooops); }
    };

    return Validator;
  }
  SwankValidatorFactory.$inject = ['$log'];

  angular.module('swank')
    .factory('SwankValidator', SwankValidatorFactory);
})(angular, window);

(function(window) {
  'use strict';
  window.SwankRuleSets = window.SwankRuleSets || {};
  window.SwankRuleSets['2.0'] = [
    {
      path: 'swagger', required: true, matches: '2.0',
      error: 'The \'swagger\' key must exist at the root of the JSON and only version 2.0 is accepted.'
    },
    {
      path: 'info', required: true, isType: 'object',
      error: 'The \'info\' key must exist at the root of the JSON and be an object.'
    },
    {
      path: 'info.title', isType: 'string', required: true,
      error: 'The \'info.title\' is missing or is invalid.'
    },
    {
      path: 'info.version', isType: 'string', required: true,
      error: 'The \'info.version\' is missing or is invalid.'
    },
    {
      path: 'info.description', isType: 'string',
      error: 'The \'info.description\' is invalid. It must be a string.'
    },
    {
      path: 'info.termsOfService', isType: 'string',
      error: 'The \'info.termsOfService\' is invalid. It must be a string.'
    },
    {
      path: 'info.contact', type: 'object',
      error: 'The \'info.contact\' object is invalid.',
    },
    {
      path: 'info.contact.name', isType: 'string', requiredIf: ['info.contact'],
      error: 'The \'info.contact.name\' value is invalid. It must be a string.'
    },
    {
      path: 'info.contact.url', isType: 'url',
      error: 'The \'info.contact.url\' value is invalid. It must be a complete URL.'
    },
    {
      path: 'info.contact.email', type: 'email',
      error: 'The \'info.contact.email\' value is invalid. It must be a valid email.'
    },
    {
      path: 'info.license', isType: 'object',
      error: 'The \'info.license\' object is invalid.'
    },
    {
      path: 'info.license.name', isType: 'string', requiredIf: ['info.license'],
      error: 'The \'info.license.name\' value is invalid. It must be a string.'
    },
    {
      path: 'info.license.url', isType: 'url',
      error: 'The \'info.license.url\' value is invalid. It must be a complete URL.'
    },
    {
      path: 'paths', required: true, isType: 'object',
      error: 'The \'paths\' key must exist at the root of the JSON and be an object.'
    }
  ];
})(window);
