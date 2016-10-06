/* globals _, ZSchema, valuesByKey */
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
  function SwankFactory($log, $http, $q, $rootScope, SwankPaths) {
    /**
     * Default Swank model
     * @type {Object}
     */
    var swankModel = {
      errors: [], // Collection of validation errors
      doc: {},
      objects: {
        tagnames: []
      },
      options: {
        orderPaths: 'tag'
      }
    };
    /**
     * Swank Constructor method
     *
     * @param {Object} swagger Swagger JSON to parse and validate
     */
    function Swank(swagger) {
      var _self = angular.extend(this, swankModel);
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
              _self.parse();
              $rootScope.$broadcast('swankloaded');
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
    /**
     * Parses the validated document into a collection functional objects and 
     * functional object collections. These objects will expose properties and 
     * methods useful at the template / component level.
     */
    Swank.prototype.parse = function() {
      var _self = this;

      // Get tag names
      _self.objects.tags = _self.doc.tags || {};
      if (_.isObject(_self.doc.tags)) {
        _self.objects.tagnames = _.uniq(_.map(_self.doc.tags, function(tag) {
          return tag.name;
        }));
      } else {
        _self.objects.tagnames = valuesByKey(_self.doc.paths, 'tags') || [];
      }

      // Parse paths collection into funtional objects
      angular.extend(_self.objects, new SwankPaths(_self.doc.paths, _self.options));
    };
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
      var validOrders = ['route', 'method', 'tag'];
      if (by && validOrders.indexOf(by) !== -1) {
        _self.options.orderPaths = by;
        angular.extend(_self.objects, new SwankPaths(_self.doc.paths, _self.options));
      } else {
        $log.warn('Invalid group-by option for Swank.');
      }
    };

    return Swank;
  }
  SwankFactory.$inject = ['$log', '$http', '$q', '$rootScope', 'SwankPaths'];

  /**
   * Define our module
   */
  angular.module('swank', []).factory('Swank', SwankFactory);
})(angular);

/* globals _ */
'use strict';
/**
 * Returns a list of values by key.
 * @param  {Object} tree    Object to search
 * @param  {String} key     Key to search for
 * @param  {Array}  results Collector
 * @return {Array}          Collection of values matched by key
 */
function valuesByKey(tree, key, results) {
  results = results || [];
  return _.uniq(_.flatten(_.map(tree, function(child) {
    if (child[key]) {
      _.forEach(child[key], function(c) { results.push(c); });
    }
    return (_.isObject(child) && !_.isArray(child)) ?
      valuesByKey(child, key, results) :
      results;
  })));
}
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