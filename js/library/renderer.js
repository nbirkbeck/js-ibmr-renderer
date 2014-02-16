goog.provide('vis.renderer');
goog.provide('vis.renderer.BaseRenderer');

goog.require('vis.ShaderLoader');
goog.require('vis.types');


goog.scope(function() {
var renderer = vis.renderer;


/**
 * Base class for renderers.
 *
 * @param {string} vertShaderUrl The vertex shader.
 * @param {string} fragShaderUrl The fragment shader.
 * @constructor
 */
renderer.BaseRenderer = function(vertShaderUrl, fragShaderUrl) {
  /** @type {!THREE.Material} */
  this.material = new THREE.Material();

  /** @protected {string} */
  this.vertexShader = '';

  /** @protected {string} */
  this.fragmentShader = '';

  /** @protected {!Array.<!Array<number>>} */
  this.coeff = [];

  this.loadShaders(vertShaderUrl, fragShaderUrl);
};


/**
 * Default conversion from YUV to RGB matrix.
 * @const {!THREE.Matrix4}
 */
renderer.yuvToRgb = new THREE.Matrix4(1 , 0 , 1 , 0,
                                      1, 0 , 0 , 0,
                                      1 , 1 , 0 , 0,
                                      0 , 0 , 0 , 1);

/**
 * Load the shader programs.
 * TODO(birkbeck): Fix what happens on the error.
 *
 * @param {string} vertShaderUrl
 * @param {string} fragShaderUrl
 * @protected
 */
renderer.BaseRenderer.prototype.loadShaders = function(vertShaderUrl, 
    fragShaderUrl) {
  this.vertexShader = vis.ShaderLoader.getInstance().getShader(vertShaderUrl);
  this.fragmentShader = vis.ShaderLoader.getInstance().getShader(fragShaderUrl);
};


/**
 * @param {!vis.types.BasisDesc} basisDesc The basis description.
 * @param {!Array.<!Array.<Image>>} basisImages Basis images for each channel.
 */
renderer.BaseRenderer.prototype.initFromTextures = goog.abstractFunction;


/**
 * Set the array of coefficients used to render the basis.
 *
 * @param {!vis.types.LutCoefficients} coeff
 */
renderer.BaseRenderer.prototype.setCoeff = function(coeff) {
  this.coeff = coeff;
};


/**
 * Notification that the shaders have changed.
 *
 * @param {!vistypes.LutCoefficients} coeffs
 * @protected
 */
renderer.BaseRenderer.prototype.initMaterial = goog.abstractFunction;
});  // goog.scope)
