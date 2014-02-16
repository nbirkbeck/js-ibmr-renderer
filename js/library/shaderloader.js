/**
 * @fileoverview Shader loading utility.
 */

goog.provide('vis.ShaderLoader');

goog.require('goog.structs.Map');


goog.scope(function() {


/**
 * Helper class to load all shaders in advance.
 *
 * @constructor
 */
vis.ShaderLoader = function() {
  /**
   * The list of shaders to load.
   * @private {Array.<string>}
   */
  this.shaderUrls_ = [];

  /** @private {goog.structs.Map} */
  this.shaderMap_ = new goog.structs.Map();
};
var ShaderLoader = vis.ShaderLoader;
goog.addSingletonGetter(ShaderLoader);


/**
 * Add a shader url to be loaded.
 * @param {string} url
 */
ShaderLoader.prototype.addShaderUrl = function(url) {
  this.shaderUrls_.push(url);
};


/**
 * Get the shader corresponding to the given url.
 *
 * @param {string} url
 * @return {string}
 */
ShaderLoader.prototype.getShader = function(url) {
  return this.shaderMap_.get(url);
};


/**
 * Load the shaders.
 *
 * @param {function(number, number)} complete Callback to notify on completion.
 */
ShaderLoader.prototype.loadShaders = function(complete) {
  var numLoaded = 0;
  var numErrors = 0;

  var shaderLoader = this;
  goog.array.forEach(this.shaderUrls_, function(url, i) {
    jQuery.get(url, undefined, goog.bind(function(data) {
      this.shaderMap_.set(url, data);
      numLoaded++;
      if (numLoaded == this.shaderUrls_.length) {
        complete(numLoaded, numErrors);
      }
    }, shaderLoader)).error(goog.bind(function() {
      this.shaderMap_.set(url, null);
      numLoaded++;
      numErrors++;
      if (numLoaded == this.shaderUrls_.length) {
        complete(numLoaded, numErrors);
      }
    }, shaderLoader));
  });
};
});  // goog.scope)
