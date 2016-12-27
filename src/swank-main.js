/* globals _, ZSchema, YAML, showdown*/
/**
 * An Angular 1.5+ OpenAPI (Swagger) parser, validator and object factory.
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
   * Assembles a schema URL from the supplied version
   * @param  {String} version Version of the Swagger / OpenAPI Spec to use
   * @return {String}         An assembled URL
   */
  function buildSchemaUrl(version) {
    version = version || '2.0';
    var v = 'v' + String(version).match(/(\d{1,}(\.\d{1,})?)/)[1];
    v += (v.split('.').length === 1) ? '.0' : '';
    return OPENAPISPEC + v + '/schema.json';
  }

  /**
   * Tests to ensure that Lodash available.
   */
  function LoDashFactory($window, $log) {
    try {
      if (!$window._) {
        throw new Error('LoDash library not found');
      }
      return $window._;
    } catch (err) {
      $log.error(err);
    }
  }
  LoDashFactory.$inject = ['$window', '$log'];

  /**
   * Tests to ensure that YAMLJS available.
   */
  function YamlJSFactory($window, $log) {
    try {
      if (!$window.YAML) {
        throw new Error('YAMLJS library not found');
      }
      return $window.YAML;
    } catch (err) {
      $log.error(err);
    }
  }
  YamlJSFactory.$inject = ['$window', '$log'];

  /**
   * Tests to ensure that Showdown available.
   */
  function ShowdownFactory($window, $log) {
    try {
      if (!$window.showdown) {
        throw new Error('Showdown library not found');
      }
      return $window.showdown;
    } catch (err) {
      $log.error(err);
    }
  }
  ShowdownFactory.$inject = ['$window', '$log'];

  /**
   * Markdown content filter / parser
   */
  function SwankParseMDFilter($log) {
    return function(content) {
      if (typeof content === 'string') {
        try {
          if (!_.isObject(showdown)) {
            throw new Error('Showdown library not found.');
          }
          var converter = new showdown.Converter({
            ghCodeBlocks: true,
            tasklists: true,
            tables: true,
            omitExtraWLInCodeBlocks: true
          });
          return converter.makeHtml(content);
        } catch (err) {
          $log.error(err);
          return;
        }
      }
    };
  }
  SwankParseMDFilter.$inject = ['$log'];

  function SwankFactory($log, $http, $q, $rootScope, Helpers) {
    /**
     * Default Swank model
     * @type {Object}
     */
    var swankModel = {
      errors: [],
      doc: {},
      objects: {
        tagnames: []
      },
      options: {
        orderPaths: 'tag'
      }
    };

    /**
     * Default Swagger document model
     * @type {Object}
     */
    var swaggerModel = {
      swagger: '2.0',
      info: {
        title: 'New API',
        version: '1.0'
      },
      paths: {
        '/': {
          get: {
            description: 'Returns 200.',
            responses: {
              200: {
                description: 'API is functional.'
              }
            }
          }
        }
      }
    };

    /**
     * Swank Constructor
     * @param {Mixed}  toLoad  URL or Swagger Object
     * @param {Object} options Custom parameters for setting up Swank
     */
    function Swank(toLoad, options) {
      $rootScope.$broadcast('swankloading');
      var _self = angular.extend(this, swankModel);
      angular.merge(_self.options, options || {});
      try {
        if (!toLoad || toLoad === null) {
          throw new Error('No document supplied.');
        }
      } catch(err) {
        $rootScope.$broadcast('swankloaded');
        $log.error(err);
        return;
      }
      var tasks = [
        // Load the document to validate and parse
        _self.load(_self, toLoad),
        // Fetch the schema
        _self.fetchSchema,
        // Validate the document
        _self.validateDocument,
        // Load tags
        _self.loadTags
      ];
      $q.series(tasks).then(function(results) {
        $rootScope.$broadcast('swankloaded');
        $log.info(results);
        _self.logErrors();
      });
      return _self;
    }
    /**
     * Loads the API JSON from url, string, or object
     * @param  {Mixed}   request URL, string or object form of the JSON to load
     * @return {Promise}         Deferred promise for the JSON load
     */
    Swank.prototype.load = function($self, request) {
      var deferred = $q.defer();
      if (_.isString(request) && request.match(/^http/)) {
        $http.get(request)
          .then(function(result) {
            deferred.resolve({ref: $self, doc: result.data});
          }, function(msg, code) {
            $log.error(msg, code);
            deferred.reject(msg);
          });
      } else if (_.isObject(request)) {
        deferred.resolve({ref: $self, doc: request});
      } else {
        try {
          var json = JSON.parse(request);
          deferred.resolve({ref: $self, doc: json});
        } catch (e) {
          $log.error('Invalid JSON: ' + e.message.split('in JSON')[0].trim());
          deferred.reject(e);
        }
      }
      return deferred.promise;
    };
    /**
     * Fetches the Swagger JSON schema
     * @return {Object} The JSON Schema to use during validation
     */
    Swank.prototype.fetchSchema = function($resolved) {
      var deferred = $q.defer();
      var $self = $resolved.ref;
      var doc = $resolved.doc;
      $self.options.schemaUrl = buildSchemaUrl(doc.version || null);
      $http.get($self.options.schemaUrl).then(
        function(result) {
          deferred.resolve({ref: $self, schema:result.data, doc: doc});
        },
        function(msg, code) {
          deferred.reject(msg);
          $log.error(msg, code);
        });
      return deferred.promise;
    };

    Swank.prototype.validateDocument = function($resolved) {
      var validator, deferred = $q.defer();
      var $self = $resolved.ref;
      var schema = $resolved.schema;
      var document = $resolved.doc;
      try {
        validator = new ZSchema({breakOnFirstError: false});
        if (!_.isObject(validator)) {
          throw new Error('ZSchema library not found.');
        } else {
          validator.setRemoteReference($self.options.schemaUrl, schema);
          var result = validator.validate(document, {'$ref': $self.options.schemaUrl});
          $self.errors = (!result) ? validator.getLastErrors() : [];
          $self.doc = document;
          deferred.resolve({ref: $self});
        }
      } catch (e) {
        $log.error(e);
        deferred.reject(e);
      }
      return deferred.promise;
    };

    Swank.prototype.loadTags = function($resolved) {
      var $self = $resolved.ref, deferred = $q.defer();
      if ($self.errors.length === 0) {
        $self.doc.tags = $self.doc.tags || [];
        if (_.isEmpty($self.doc.tags)) {
          console.log($self.doc);
          var tags = _.uniq(Helpers.valuesByKey($self.doc.paths, 'tags'));
          $self.doc.tags = _.map(tags, function(tag) {
            return {name:tag};
          });
        }
        deferred.resolve({ref: $self});
      }
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
    /**
     * Parses the validated document into a collection functional objects and 
     * functional object collections. These objects will expose properties and 
     * methods useful at the template / component level.
     */
    /*Swank.prototype.parse = function() {
      console.log(this);
      var _self = this;

      // Parse paths collection into funtional objects
      var parsePaths = function() {
        var deferred = $q.defer();
        if (_self.doc.paths.length > 0) {
          var pathobjects = new SwankPaths(_self.doc.paths, _self.options);
          angular.extend(_self.objects, pathobjects);
          deferred.resolve();
        }
        return deferred.promise;
      };

      // Parse the object definitions into quickly accessible data
      var parseModels = function() {
        var deferred = $q.defer();
        if (_self.doc.definitions.length > 0) {
          var definitions = new SwankDefinitions(_self.doc.definitions, _self.options);
          angular.extend(_self.objects, definitions);
          deferred.resolve();
        }
        return deferred.promise;
      };
    };*/
    /**
     * Sets the default ordering / grouping of paths. Currently, the options for
     * ordering include by 'tag', 'route' or 'method'.
     *
     * Grouping by 'tag' will group all paths and path items by tags associated
     * with each. If a path has multiple tags associated, it will be present in 
     * each collection. If a path has no tag associated, it will be grouped in 
     * an 'untagged' collection.
     *
     * Grouping by 'route' will group all paths and path items in the standard 
     * order.
     *
     * Grouping by 'method' will group all paths and path items in collections 
     * by the HTTP Method or Operation. All grouped paths and path items will 
     * have their route as the default key under the method collections.
     * 
     * @param  {String} by Grouping method. 'route', 'method', 'tag'. Default
     *                     is 'tag'.
     */
    Swank.prototype.groupPaths = function(by) {
      var _self = this;
      $rootScope.$broadcast('swankloading');
      var validOrders = ['route', 'method', 'tag'];
      if (by && validOrders.indexOf(by) !== -1) {
        _self.options.orderPaths = by;
        _self.parse().then(function() {
          $rootScope.$broadcast('swankloaded');
        });
        //angular.extend(_self.objects, new SwankPaths(_self.doc.paths, _self.options));
      } else {
        $rootScope.$broadcast('swankloaded');
        $log.warn('Invalid group-by option for Swank.');
      }
    };

    return Swank;
  }
  SwankFactory.$inject = ['$log', '$http', '$q', '$rootScope', 'Helpers', 'SwankPaths', 'SwankDefinitions'];

  /**
   * Decorates $q to add a serial promise execution chain.
   *
   * Borrowed / adapted from http://www.codeducky.org/q-serial/
   * 
   * @param  {Object} $delegate Angular's $delegate provider
   * @return {Object}           Decorated $delegate
   */
  function qSeriesDecorator($delegate) {
    $delegate.series = function series($tasks) {
      var chain = $delegate.when();
      var results = angular.isArray($tasks) ? [] : {};
      var error = new Error();
      var checkPromise = function(obj, key) {
        if (!(obj && angular.isFunction(obj.then))) {
          error.message = 'Task ' + key + ' did not return a promise.';
          throw error;
        }
      };
      var previous;
      angular.forEach($tasks, function(task, label) {
        var success = task.success || task;
        var reject = task.fail;
        var notify = task.notify;
        var next;
        if (!previous) {
          var t = (typeof success === 'function') ? success() : task;
          next = t.then(
            function(data) { results[label] = data; return data; },
            function(reason) { return $delegate.reject(reason); }
          );
          checkPromise(next, label);
        } else {
          next = previous.then(
            function (data) {
              if (!success) { return data; }
              results[label] = data;
              var ret = success(data);
              checkPromise(ret, label);
              return ret;
            },
            function (reason) {
              if (!reject) { return $delegate.reject(reason); }
              var ret = reject(reason);
              checkPromise(ret, label);
              return ret;
            },
            notify);
        }
        previous = next;
        chain = chain.then(previous);
      });
      return chain.then(
        function(){
          var oath = $delegate.defer();
          oath.resolve(results);
          return oath.promise;
        });
    };
    return $delegate; 
  }
  qSeriesDecorator.$inject = ['$delegate'];

  /**
   * Define our module
   */
  angular.module('swank', [])
    .config(['$provide', function ($provide) {
      $provide.decorator('$q', qSeriesDecorator);
    }])
    .factory('_', LoDashFactory)
    .factory('YAML', YamlJSFactory)
    .factory('Showdown', ShowdownFactory)
    .filter('parseMD', SwankParseMDFilter)
    .factory('Swank', SwankFactory);
})(angular);
