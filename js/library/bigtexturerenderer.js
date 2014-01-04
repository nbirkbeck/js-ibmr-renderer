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
    };
};


/** @override */
renderer.BigTextureRenderer.prototype.initFromTextures = function(basisDesc, basisImages, progress) {
    var sepCanvas = document.createElement('canvas');
    sepCanvas.width = basisDesc[0][0]
    sepCanvas.height = basisDesc[0][1];
    var sepCtx = sepCanvas.getContext('2d');

    var urls = [];
    this.textures_ = [];
    for (var i = 0; i < basisDesc.length; ++i) {
	var maxNumBasis = basisDesc[i][2];
	var mergedData = new Uint8Array(basisDesc[i][0] * basisDesc[i][1] * 
					maxNumBasis);

	for (var j = 0; j < maxNumBasis; j += 4) {
	    for (var k = 0; k < 4; ++k) {
		sepCtx.clearRect(0, 0, basisDesc[i][0], basisDesc[i][1]);
		sepCtx.drawImage(basisImages[i][j + k], 0, 0, 
		    basisDesc[i][0], basisDesc[i][1]);

		var imageData = sepCtx.getImageData(0, 0, 
                    basisDesc[i][0], basisDesc[i][1]);
		var sepPixels = imageData.data;
		var length = sepPixels.length;

		var base = (maxNumBasis - j - 4) * basisDesc[i][0] * 
		    basisDesc[i][1];

		for (var z = 0; z < length; z += 4) {
		    mergedData[base + z + k] = sepPixels[z];
		}
	    }
	    var value = i / basisDesc.length + 
		(1 / basisDesc.length) * (j / maxNumBasis);

	    if (console && console.log) {
		console.log('Texture progress:' + value);
	    }
	    progress(value, 'Loaded texture channel:' + i + ' basis:' + j);
	}

	var texture = new THREE.DataTexture(mergedData,
	    basisDesc[i][0], basisDesc[i][1] * maxNumBasis / 4, 
	    THREE.RGBAFormat);
	texture.needsUpdate = true;
	this.textures_[i] = texture;
	this.offs_[i] = 1.0 / (maxNumBasis / 4);  
    }
    return urls;
};
});   // goog.scope)