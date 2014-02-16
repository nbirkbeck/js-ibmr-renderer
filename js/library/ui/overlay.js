/**
 * @fileoverview Overlay for the UI.
 */

goog.provide('vis.ui.Overlay');

goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('vis.ui.events.EventType');


goog.scope(function() {
var events = vis.ui.events;


/**
 * An overlay to display status messages and to block control of the 3d window.
 *
 * @param {!goog.pubsub.PubSub} pubSub The pubsub object that sends events.
 * @param {!Element} container The containing object.
 * @constructor
 */
vis.ui.Overlay = function(pubSub, container) {
  /** @private {!Element} */
  this.rootEl_ = goog.dom.getElementByClass(
      vis.ui.Overlay.CssClasses_.OVERLAY, container);

  /** @private {!Element} */
  this.progress_ = goog.dom.getElementByClass(
      vis.ui.Overlay.CssClasses_.PROGRESS, this.rootEl_);

  /** @private {!Element} */
  this.message_ = goog.dom.getElementByClass(
      vis.ui.Overlay.CssClasses_.MESSAGE, this.rootEl_);

  $(this.rootEl_).show(100);

  // Attach to the pubsub.
  pubSub.subscribe(events.EventType.DOWNLOAD_PROGRESS,
      this.onDownloadProgress_, this);
  pubSub.subscribe(events.EventType.DOWNLOAD_STARTED,
      this.onDownloadStarted_, this);
  pubSub.subscribe(events.EventType.DOWNLOAD_COMPLETED,
      this.onDownloadCompleted_, this);
  pubSub.subscribe(events.EventType.TEXTURE_PROGRESS,
      this.onTextureProgress_, this);
  pubSub.subscribe(events.EventType.OBJECT_READY,
      this.onObjectReady_, this);
  pubSub.subscribe(events.EventType.FATAL_ERROR,
      this.onFatalError_, this);
};


/**
 * Css classes used by the overlay.
 *
 * @enum {string}
 * @private
 */
vis.ui.Overlay.CssClasses_ = {
  OVERLAY: 'window-overlay',
  PROGRESS: 'overlay-progress',
  MESSAGE: 'overlay-message'
};


/**
 * Callback handler for when the download has started.
 * @private
 */
vis.ui.Overlay.prototype.onDownloadStarted_ = function() {
  this.message_.innerHTML = 'Download started.';
  $(this.rootEl_).fadeIn(100);
};


/**
 * Callback handler for when the download made progress.
 *
 * @param {number} numBytes The number of bytes loaded.
 * @param {number} totalBytes The total number of bytes loaded.
 * @private
 */
vis.ui.Overlay.prototype.onDownloadProgress_ = function(numBytes, totalBytes) {
  this.message_.innerHTML = 'Downloading:' +
      (numBytes / totalBytes * 100).toFixed(1) + '%';
};


/**
 * Callback handler for when the download has completed.
 *
 * @private
 */
vis.ui.Overlay.prototype.onDownloadCompleted_ = function() {
  this.message_.innerHTML = 'Download complete.';
};


/**
 * Callback for when texture loading made progress.
 *
 * @param {number} progress Progress amount between 0 and 1.
 * @param {string} message The message to display.
 * @private
 */
vis.ui.Overlay.prototype.onTextureProgress_ = function(progress, message) {
  this.message_.innerHTML = 'Uploading textures ' +
      (progress * 100).toFixed(1) + '% complete.' + message;
};


/**
 * Callback when the object is ready.
 *
 * @private
 */
vis.ui.Overlay.prototype.onObjectReady_ = function() {
  $(this.rootEl_).fadeOut(1000);
};


/**
 * Callback when the object is ready.
 *
 * @private
 */
vis.ui.Overlay.prototype.onFatalError_ = function(error) {
  this.message_.innerHTML = error;
  goog.dom.classes.add(document.body, 'error');
};
});  // goog.scope)
