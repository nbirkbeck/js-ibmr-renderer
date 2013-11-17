goog.provide('MultipleTexturesRenderer');


MultipleTexturesRenderer = function() { 
    this.textures_ = [];
};


MultipleTexturesRenderer.prototype.setShaders = function(vertShader, fragShader, coeff) {
    // The colorspace matrix.
    var yuvToRgb = new THREE.Matrix4(1 , 0 , 1 , 0,
				     1,  0 , 0 , 0,
				     1 , 1 , 0 , 0,
				     0 , 0 , 0 , 1);

    this.uniforms = {
        'textureY0': {type: 't', value: this.textures_[0][0]},
	'textureY1': {type: 't', value: this.textures_[0][1]},
	'textureY2': {type: 't', value: this.textures_[0][2]},
	'textureY3': {type: 't', value: this.textures_[0][3]},
        'textureU0': {type: 't', value: this.textures_[1][0]},
	'textureU1': {type: 't', value: this.textures_[1][1]},
        'textureU2': {type: 't', value: this.textures_[1][2]},
	'textureU3': {type: 't', value: this.textures_[1][3]},
        'textureV0': {type: 't', value: this.textures_[2][0]},
	'textureV1': {type: 't', value: this.textures_[2][1]},
        'textureV2': {type: 't', value: this.textures_[2][2]},
	'textureV3': {type: 't', value: this.textures_[2][3]},
	'coeffY': {type: 'fv1', value: coeff[0]},
	'coeffU': {type: 'fv1', value: coeff[1]},
	'coeffV': {type: 'fv1', value: coeff[2]},
	'colorMatrix': {type: 'm4', value: yuvToRgb}
    };

    this.material = new THREE.ShaderMaterial({
	fragmentShader: fragShader,
	vertexShader: vertShader,
	uniforms: this.uniforms,
	color: 0xffffff
    });
};


MultipleTexturesRenderer.prototype.setCoeff = function(coeff) {
    if (this.uniforms) {
	this.uniforms['coeffY'].value = coeff[0];
	this.uniforms['coeffU'].value = coeff[1];
	this.uniforms['coeffV'].value = coeff[2];
    };
};


/**
 * Pack all the basis images into textures.
 *
 * @return {!Array.<string>}
 */
MultipleTexturesRenderer.prototype.initFromTextures = function(basisDesc, basisImages) {
    var canvas = document.createElement('canvas');
    canvas.width = basisDesc[0][0]
    canvas.height = basisDesc[0][1];

    var sepCanvas = document.createElement('canvas');
    sepCanvas.width = basisDesc[0][0]
    sepCanvas.height = basisDesc[0][1];

    var ctx = canvas.getContext('2d');
    var sepCtx = sepCanvas.getContext('2d');

    //document.body.appendChild(canvas);
    //document.body.appendChild(sepCanvas);

    var urls = [];
    this.textures_ = [];
    for (var i = 0; i < basisDesc.length; ++i) {
	this.textures_[i] = [];
	for (var j = 0; j < basisImages[i].length; j += 4) {
	    ctx.clearRect(0, 0, basisDesc[i][0], basisDesc[i][1]);

	    var mergedData = ctx.getImageData(0, 0, basisDesc[i][0], basisDesc[i][1]);
	    
	    for (var k = 0; k < 4; ++k) {
		sepCtx.clearRect(0, 0, basisDesc[i][0], basisDesc[i][1]);
		sepCtx.drawImage(basisImages[i][j + k], 0, 0, 
		    basisDesc[i][0], basisDesc[i][1]);

		var imageData = sepCtx.getImageData(0, 0, 
                    basisDesc[i][0], basisDesc[i][1]);
		var sepPixels = imageData.data;
		var mergedPixels = mergedData.data;
		var length = sepPixels.length;

		for (var z = 0; z < length; z += 4) {
		    mergedPixels[z + k] = sepPixels[z];
		}
	    }
	    ctx.putImageData(mergedData, 0, 0);
	    var url = canvas.toDataURL();

	    var texture = new THREE.DataTexture(new Uint8Array(mergedData.data), 
                basisDesc[i][0], basisDesc[i][1], THREE.RGBAFormat);
	    texture.needsUpdate = true;

	    this.textures_[i][j/4] = texture; 
	    urls.push(url);
	}
    }
    return urls;
};

