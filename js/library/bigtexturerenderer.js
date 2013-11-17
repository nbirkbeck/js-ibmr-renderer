goog.require('renderer.BaseRenderer');

goog.provide('renderer.BigTextureRenderer');


/**
 * A renderer that packs all basis images into a single texture for each 
 * channel.
 *
 * @param {string} vertShaderUrl
 * @param {string} fragShaderUrl
 * @extends {renderer.BigTextureRenderer}
 */
renderer.BigTextureRenderer = function(vertShaderUrl, fragShaderUrl) { 
    goog.base(this, vertShaderUrl, fragShaderUrl);

    /** @private {!Array<!THREE.Texture>} */
    this.textures_ = [];

    this.offs_ = [1, 1, 1];
};
goog.inherits(renderer.BigTextureRenderer, renderer.BaseRenderer);


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
    };
};


/** @override */
renderer.BigTextureRenderer.prototype.initFromTextures = function(basisDesc, basisImages) {
    var sepCanvas = document.createElement('canvas');
    sepCanvas.width = basisDesc[0][0]
    sepCanvas.height = basisDesc[0][1];
    var sepCtx = sepCanvas.getContext('2d');

    //    document.body.appendChild(sepCanvas);

    var urls = [];
    this.textures_ = [];
    for (var i = 0; i < basisDesc.length; ++i) {
	var maxNumBasis = basisDesc[i][2];
	var mergedData = new Uint8Array(basisDesc[i][0] * basisDesc[i][1] * maxNumBasis);

	for (var j = 0; j < maxNumBasis; j += 4) {
	    for (var k = 0; k < 4; ++k) {
		sepCtx.clearRect(0, 0, basisDesc[i][0], basisDesc[i][1]);
		sepCtx.drawImage(basisImages[i][j + k], 0, 0, 
		    basisDesc[i][0], basisDesc[i][1]);

		var imageData = sepCtx.getImageData(0, 0, 
                    basisDesc[i][0], basisDesc[i][1]);
		var sepPixels = imageData.data;
		var length = sepPixels.length;

		var base = (maxNumBasis - j - 4)  * basisDesc[i][0] * basisDesc[i][1];

		for (var z = 0; z < length; z += 4) {
		    mergedData[base + z + k] = sepPixels[z];
		}
	    }
	}
	var texture = new THREE.DataTexture(mergedData,
					    basisDesc[i][0], basisDesc[i][1] * maxNumBasis / 4, THREE.RGBAFormat);
	texture.needsUpdate = true;
	this.textures_[i] = texture;
	this.offs_[i] = 1.0 / (maxNumBasis / 4);  
    }
    return urls;
};