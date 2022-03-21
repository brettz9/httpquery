// ObserverBuilder.js - HTTPQuery's module
// author: brettz9

'use strict';

// eslint-disable-next-line no-shadow -- Available as global now?
const chrome = require('chrome');

const {Cc} = chrome, {Ci} = chrome;
// Cu = chrome.Cu,

/**
* Must override observed() method, and optionally the subjectCheck() method;
*   must call the register() method.
* @abstract
* @param {string | Array} topic The topic or topics to listen for
* @param {Object|Function} [config] An optional object with "observed" method or a function
*/
function ObserverBuilder (topic, config) {
  this.topic = topic;
  if (config) {
    this.observed = config.observed || config;
  }
}
ObserverBuilder.prototype = {
  // Factory method
  constructor: ObserverBuilder,

  // Overridable methods
  observed: function observed () {
    throw new Error('ObserverBuilder.observed is an abstract method for topic ' + this.topic);
  },
  /**
   * Override to only accept specific subjects.
   */
  subjectCheck: function subjectCheck () {
    return true;
  },

  // Conventional nsiObserver setup methods (not part of an interface)
  unregister: function unregister () {
    if (this.observerService) { // In case called before register()
      this.observerService.removeObserver(this, this.topic);
    }
    this.added = false;
  },
  register: function register () {
    if (!this.added) {
      this.observerService = Cc['@mozilla.org/observer-service;1'].getService(Ci.nsIObserverService);
      this.observerService.addObserver(this, this.topic, false);
      this.added = true;
    }
  },

  // IMPORTS
  // Cu['import']('resource://gre/modules/XPCOMUtils.jsm');
  // QueryInterface : XPCOMUtils.generateQI([Ci.nsIObserver, Ci.nsISupportsWeakReference]); // not needed?

  // nsIObserver method
  observe: function observe (subject, topic, data) {
    if (topic === this.topic && this.subjectCheck(subject)) {
      this.observed(subject, topic, data);
    }
  }
};

/**
 * @param {string|Array} topic The topic or topics to listen for
 * @param {Object|Function} [config] An optional object with "observed" method or a function
 */
function observerBuilder (topic, config) {
  return new ObserverBuilder(topic, config);
}

exports.observerBuilder = observerBuilder;
exports.ObserverBuilder = ObserverBuilder;
