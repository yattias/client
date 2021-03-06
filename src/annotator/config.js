'use strict';

var annotationQuery = require('./util/extract-annotation-query');
var settings = require('../shared/settings');

var docs = 'https://h.readthedocs.io/en/latest/embedding.html';

/**
 * Reads the Hypothesis configuration from the environment.
 *
 * @param {Window} window_ - The Window object to read config from.
 */
function config(window_) {
  var options = {
    app: window_.
      document.querySelector('link[type="application/annotator+html"]').href,
  };

  // Parse config from `<script class="js-hypothesis-config">` tags
  try {
    Object.assign(options, settings(window_.document));
  } catch (err) {
    console.warn('Could not parse settings from js-hypothesis-config tags',
      err);
  }

  // Parse config from `window.hypothesisConfig` function
  if (window_.hasOwnProperty('hypothesisConfig')) {
    if (typeof window_.hypothesisConfig === 'function') {
      Object.assign(options, window_.hypothesisConfig());
    } else {
      throw new TypeError('hypothesisConfig must be a function, see: ' + docs);
    }
  }

  // Convert legacy keys/values in options to corresponding current
  // configuration.
  if (typeof options.showHighlights === 'boolean') {
    options.showHighlights = options.showHighlights ? 'always' : 'never';
  }

  // Extract the default query from the URL.
  //
  // The Chrome extension or proxy may already have provided this config
  // via a tag injected into the DOM, which avoids the problem where the page's
  // JS rewrites the URL before Hypothesis loads.
  //
  // In environments where the config has not been injected into the DOM,
  // we try to retrieve it from the URL here.
  var directLinkedID = annotationQuery.extractAnnotationQuery(window_.location.href);
  if (directLinkedID) {
    Object.assign(options, directLinkedID);
  }
  return options;
}

module.exports = config;
