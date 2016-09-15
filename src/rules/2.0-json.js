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
