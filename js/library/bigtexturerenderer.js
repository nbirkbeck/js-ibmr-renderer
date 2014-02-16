/**
 * @fileoverview The default renderer.
 */

goog.provide('vis.renderer.BigTextureRenderer');

goog.require('vis.ShaderLoader');
goog.require('vis.renderer.BaseRenderer');


goog.scope(function() {
var renderer = vis.renderer;
var ShaderLoader = vis.ShaderLoader;


/**
 * A renderer that packs all basis images into a single texture for each
 * channel.
 *
 * @extends {renderer.BigTextureRenderer}
 * @constructor
 */
renderer.BigTextureRenderer = function() {
  goog.base(this, renderer.BigTextureRenderer.VERT_SHADER_URL_,
      renderer.BigTextureRenderer.FRAG_SHADER_URL_);

  /** @private {!Array<!THREE.Texture>} */
  this.textures_ = [];

  this.offs_ = [1, 1, 1];
};
goog.inherits(renderer.BigTextureRenderer, renderer.BaseRenderer);


/** @const {number} */
renderer.BigTextureRenderer.MAX_TEXTURE_SIZE = 8192;


/**
 * The relative url to the vertex shader.
 * @private
 * @const
 */
renderer.BigTextureRenderer.VERT_SHADER_URL_ = 'shaders/multiple_textures.vsh';


/**
 * The relative url to the fragment shader.
 * @private
 * @const
 */
renderer.BigTextureRenderer.FRAG_SHADER_URL_ = 'shaders/packed_texture.fsh';


// Register the shaders that need to be laoded.
ShaderLoader.getInstance().addShaderUrl(
    renderer.BigTextureRenderer.VERT_SHADER_URL_);
ShaderLoader.getInstance().addShaderUrl(
    renderer.BigTextureRenderer.FRAG_SHADER_URL_);


/** @override */
renderer.BigTextureRenderer.prototype.initMaterial = function(coeff) {
  this.uniforms = {
    'textureY': {type: 't', value: this.textures_[0]},
    'textureU': {type: 't', value: this.textures_[1]},
    'textureV': {type: 't', value: this.textures_[2]},
    'coeffY': {type: 'fv1', value: coeff[0]},
    'coeffU': {type: 'fv1', value: coeff[1]},
    'coeffV': {type: 'fv1', value: coeff[2]},
    'offsY': {type: 'f', value: this.offs_[0]},
    'offsU': {type: 'f', value: this.offs_[1]},
    'offsV': {type: 'f', value: this.offs_[2]},
    'colorMatrix': {type: 'm4', value: renderer.yuvToRgb},
    'numBasisY': {type: 'i', value: coeff[0].length},
    'numBasisU': {type: 'i', value: coeff[1].length},
    'numBasisV': {type: 'i', value: coeff[2].length}
  };
  this.material = new THREE.ShaderMaterial({
    fragmentShader: this.fragmentShader,
    vertexShader: this.vertexShader,
    uniforms: this.uniforms,
    color: 0xffffff
  });
};


/** @override */
renderer.BigTextureRenderer.prototype.setCoeff = function(coeff) {
  if (this.uniforms) {
    this.uniforms['coeffY'].value = coeff[0];
    this.uniforms['coeffU'].value = coeff[1];
    this.uniforms['coeffV'].value = coeff[2];

    this.uniforms['numBasisY'].value = coeff[0].length;
    this.uniforms['numBasisU'].value = coeff[1].length;
    this.uniforms['numBasisV'].value = coeff[2].length;
  }
};


/** @override */
renderer.BigTextureRenderer.prototype.clampNumBasis = function(basisDesc) {
  if (basisDesc[1] * basisDesc[2] / 4 >
      renderer.BigTextureRenderer.MAX_TEXTURE_SIZE) {
    basisDesc[2] = Math.floor(renderer.BigTextureRenderer.MAX_TEXTURE_SIZE /
        basisDesc[1] / 4) * 4;
  }
};


/** @override */
renderer.BigTextureRenderer.prototype.initFromTextures = function(basisDesc, 
    fullBasisDesc, basisImages, progress, callback) {
  var sepCanvas = document.createElement('canvas');
  sepCanvas.width = basisDesc[0][0];
  sepCanvas.height = basisDesc[0][1];
  var sepCtx = sepCanvas.getContext('2d');

  var urls = [];
  // make sure that we don't recieve more basis elements than we can handle.
  for (var i = 0; i < basisDesc.length; ++i) {
    this.clampNumBasis(basisDesc[i]);
    this.clampNumBasis(fullBasisDesc[i]);
  }

  if (!this.packedData) {
    this.textures_ = [];
    this.packedData = [];
    this.loadedAlready = [];

    for (var i = 0; i < basisDesc.length; ++i) {
      this.packedData[i] = new Uint8Array(basisDesc[i][0] * basisDesc[i][1] *
        fullBasisDesc[i][2]);
      this.loadedAlready[i] = 0;

      this.textures_[i] = new THREE.DataTexture(this.packedData[i],
          basisDesc[i][0], basisDesc[i][1] * fullBasisDesc[i][2] / 4,
          THREE.RGBAFormat);
      this.offs_[i] = 1.0 / (fullBasisDesc[i][2] / 4);
    }
  }

  var numChannelsLoaded = 0;
  var numRequired = 0;

  var packFunction = function(sepCtx, i, j, maxNumBasis, mergedData) {
    for (var k = 0; k < 4; ++k) {
      sepCtx.clearRect(0, 0, basisDesc[i][0], basisDesc[i][1]);
      sepCtx.drawImage(basisImages[i][j + k], 0, 0,
          basisDesc[i][0], basisDesc[i][1]);

      var imageData = sepCtx.getImageData(0, 0,
          basisDesc[i][0], basisDesc[i][1]);
      var sepPixels = imageData.data;
      var length = sepPixels.length;

      var base = (fullBasisDesc[i][2] - j - 4) * basisDesc[i][0] *
          basisDesc[i][1];

      for (var z = 0; z < length; z += 4) {
        mergedData[base + z + k] = sepPixels[z];
      }
    }
    var value = i / basisDesc.length +
        (1 / basisDesc.length) * (j / maxNumBasis);

    progress(value, 'Loaded texture channel:' + i + ' basis:' + j);
    if (j + 4 < maxNumBasis) {
      setTimeout(goog.bind(packFunction, this, sepCtx, i, j + 4, maxNumBasis,
          mergedData), 0);
    } else {
      this.textures_[i].needsUpdate = true;

      numChannelsLoaded++;
      if (numChannelsLoaded == numRequired) {
        callback(urls);
      }
    }
  };


  for (var i = 0; i < basisDesc.length; ++i) {
    var maxNumBasis = basisDesc[i][2];
    var mergedData = this.packedData[i];
    if (this.loadedAlready[i] < maxNumBasis) {
      numRequired++;
      setTimeout(goog.bind(packFunction, this, sepCtx, i, this.loadedAlready[i],
          maxNumBasis, mergedData), 0);
    }
    this.loadedAlready[i] = maxNumBasis;
  }
};
});   // goog.scope)
