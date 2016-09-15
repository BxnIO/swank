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
