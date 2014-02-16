/**
 * @fileoverview Unit testing of the ShaderLoader.
 */

goog.require('vis.ShaderLoader');

goog.require('goog.testing.jsunit');


var URLS_ = ['test1.url', 'test2.url'];
var URL_DATA_ = '// Shader source.';
var jQuery = {};


/**
 * Test adding a new url to the shader loader.
 */
var testAddShaderUrl = function() {
  var loader = vis.ShaderLoader.getInstance();

  assertEquals(0, loader.shaderUrls_.length);
  loader.addShaderUrl(URLS_[0]);
  assertEquals(1, loader.shaderUrls_.length);

  assertEquals(URLS_[0], loader.shaderUrls_[0]);

  loader.addShaderUrl(URLS_[1]);
  assertEquals(2, loader.shaderUrls_.length);
  assertEquals(URLS_[1], loader.shaderUrls_[1]);
};


/**
 * Test the shader loader when shaders can be successfully loaded.
 */
var testLoadShadersOnSuccess = function() {
  var loader = new vis.ShaderLoader();

  assertEquals(0, loader.shaderUrls_.length);
  loader.addShaderUrl(URLS_[0]);

  jQuery.get = function(url, unknown, successCallback) {
    successCallback(URL_DATA_);
    return {'error': function() {}};
  };

  var called = 0;
  loader.loadShaders(function(numLoaded, numErrors) {
    assertEquals(1, numLoaded);
    assertEquals(0, numErrors);
    assertEquals(URL_DATA_, loader.getShader(URLS_[0]));
    called++;
  });
  assertEquals(1, called);
};


/**
 * Test the shader loader when one of the loaded shaders gives an error.
 */
var testLoadShadersOnError = function() {
  var loader = new vis.ShaderLoader();
  assertEquals(0, loader.shaderUrls_.length);
  loader.addShaderUrl(URLS_[0]);

  jQuery.get = function(url, unknown, successCallback) {
    return {'error': function(errorCallback) {
      errorCallback();
    }};
  };

  var called = 0;
  loader.loadShaders(function(numLoaded, numErrors) {
    assertEquals(1, numLoaded);
    assertEquals(1, numErrors);
    called++;
  });
  assertEquals(1, called);
};
