//goog.provide('ibmr.PcaMesh');


/** 
 * Size and num basis elements for each channel.
 *
 * @typedef {!Array.<Array.<number>>}
 */
var LutDesc;


/** 
 * Size and num basis elements for each channel.
 *
 * @typedef {!Array.<Array.<number>>}
 */
var BasisDesc;



/**
 * A mesh with a set of basis textures.
 *
 * @param {number} id Integer identifier.
 * @param {!BasisDesc} basisDesc Information about the basis (size, numChannels)
 * @param {!LutDesc} lutDesc Information about the look-up table.
 */
PcaMesh = function(id, basisDesc, lutDesc) {
    /** 
     * Integer identifier for this object.
     * @type {number}
     */
    this.id = id;

    /** 
     * The mesh.
     * @type {!THREE.Mesh}
     */
    this.mesh = new THREE.Mesh();

    /** 
     * @private {!BasisDesc}
     */
    this.basisDesc_ = basisDesc;

    /** 
     * @private {!LutDesc}
     */
    this.lutDesc_ = lutDesc;

    /** @private {!THREE.Vector3} */
    this.eulerAngles_ = new THREE.Vector3(0, 0, 0);

    /** @private {!Array.<number>} */
    this.eulerMatrix_ = [];

    /** @private {!Array.<number>} */
    this.lutRangeMin_ = [];

    /** @private {!Array.<number>} */
    this.lutRangeMean_ = [];

    /** @private {!Array.<number>} */
    this.lutRangeMax_ = [];

    /**
     * An array of basis textures (one for each texture channel).
     * @private {!Array.<!Array.<Blob>>}
     */
    this.basis_ = [];
    for (var i = 0; i < basisDesc.length; ++i) {
	this.basis_[i] = [];
    }

    /**
     * An array of look-up tables (one for each texture channel).
     * @private {!Array.<!Array.<!Array.<number>>}
     */
    this.lut_ = [];
    for (var i = 0; i < basisDesc.length; ++i) {
	this.lut_[i] = [];
	this.lut_[i].length = basisDesc[i][2] + 1;
	for (var j = 0; j <= basisDesc[i][2]; ++j) {
	    this.lut_[i][j] = [];
	}
    }

    // Setup the default material.
    this.mesh.material = new THREE.MeshLambertMaterial({color: 0xffffff});
};


/**
 * Set the geometry used by the mesh. 
 *
 * @param {!THREE.Geometry} geometry
 */
PcaMesh.prototype.setGeometry = function(geometry) {
    this.mesh.geometry = geometry;
};


/**
 * Set the scale of the mesh. 
 *
 * @param {number} scale
 */
PcaMesh.prototype.setScale = function(scale) {
    this.mesh.scale = new THREE.Vector3(scale, scale, scale);
};


/**
 * Set the position of the mesh.
 *
 * @param {!THREE.Vector3} pos The desired position.
 */
PcaMesh.prototype.setPosition = function(pos) {
    this.mesh.position = new THREE.Vector3(pos[0], pos[1], pos[2]);
};


/**
 * Set the euler angles.
 *
 * @param {!Array.<number>} euler The euler angles.
 */
PcaMesh.prototype.setEulerAngles = function(euler) {
    this.eulerAngles_ = new THREE.Vector3(euler[0], euler[1], euler[2]);
};


/**
 * Set the coordinate system matrix.
 *
 * @param {!Array.<number>} euler The matrix.
 */
PcaMesh.prototype.setEulerMatrix = function(eulerMatrix) {
    this.eulerMatrix_ = eulerMatrix;
};


/**
 * The bounds of the euler angles in the look-up tables.
 * {@see PcaMesh.setEulerMatrix}
 * {@see PcaMesh.setEulerAngles}
 *
 * @type {!Array<number>} mean The mean angles.
 * @type {!Array<number>} min The min angles.
 * @type {!Array<number>} max The max angles.
 */
PcaMesh.prototype.setLutRange = function(mean, min, max) {
    this.lutRangeMin_ = min; 
    this.lutRangeMax_ = max;
    this.lutRangeMean_ = mean;
};


/** 
 * Set the objects material to use the static texture.
 */
PcaMesh.prototype.useStaticTexture = function() {
    var pcaMesh = this;
    var url = URL.createObjectURL(this.staticTexture_);
    var texture = THREE.ImageUtils.loadTexture(url, new THREE.UVMapping());
    var matParams = {color: 0xffffff, map: texture};
    this.mesh.material = new THREE.MeshLambertMaterial(matParams);
};


/**
 * Set the lut coefficients from the current object rotation.
 * TODO(birkbeck): Make this use the camera position as well.
 */
PcaMesh.prototype.setLutCoeffs = function() {
    var roty = -this.mesh.rotation.y + Math.PI;
    while (roty < 0) {
	roty += 2.0 * Math.PI;
    }
    while (roty > 2.0 * Math.PI) {
	roty -= 2.0 * Math.PI;
    }

    this.coeff = [[], [], []];
    for (var i = 0; i < this.getNumChannels(); ++i) {
	var lutCoord = this.lutDesc_[i][0] * (roty / (2.0 * Math.PI));
	var lutMin = Math.max(0, Math.floor(lutCoord));
	var lutMax = Math.min(this.lutDesc_[i][0] - 1, Math.floor(lutCoord) + 1);
	var a = lutCoord - lutMin;
	for (var j = 0; j < 16; ++j) {
	    this.coeff[i][j] = (this.lut_[i][j][lutMin] * (1.0 - a) + 
				this.lut_[i][j][lutMax] * a);
	}
    }
    if (this.mesh.material && this.mesh.material.uniforms) {
	this.uniforms['coeffY'].value = this.coeff[0];
	this.uniforms['coeffU'].value = this.coeff[1];
	this.uniforms['coeffV'].value = this.coeff[2];
    }
};


/**
 * Set the shaders used to render.
 * This also sets up the material that uses the basis for rendering.
 *
 * @param {string} vertShader The vertex shader source.
 * @param {string} fragShader The fragment shader source.
 */
PcaMesh.prototype.setShaders = function(vertShader, fragShader) {
    // The colorspace matrix.
    var yuvToRgb = new THREE.Matrix4(1 , 0 , 1 , 0,
				     1,  0 , 0 , 0,
				     1 , 1 , 0 , 0,
				     0 , 0 , 0 , 1);
    this.setLutCoeffs();

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
	'coeffY': {type: 'fv1', value: this.coeff[0]},
	'coeffU': {type: 'fv1', value: this.coeff[1]},
	'coeffV': {type: 'fv1', value: this.coeff[2]},
	'colorMatrix': {type: 'm4', value: yuvToRgb}
    };

    this.mesh.material = new THREE.ShaderMaterial({
	fragmentShader: fragShader,
	vertexShader: vertShader,
	uniforms: this.uniforms,
	color: 0xffffff
    });

    this.setLutCoeffs();
};


/**
 * Set the static texture to use the given blob.
 *
 * @param {!Blob} blob
 */
PcaMesh.prototype.setStaticTexture = function(blob) {
    this.staticTexture_ = blob;
};


/**
 * Set a subset of the basis images for a given channel starting
 * from the given basisIndex.
 *
 * @param {number} channel The channel of the basis.
 * @param {number} basisIndex The start basis index.
 * @param {!Array.<!Blob>} blobs A set of blob references, one for each
 *     basis images.
 */
PcaMesh.prototype.setBasis = function(channel, basisIndex, blobs) {
    for (var i = 0; i < blobs.length; ++i) {
	this.basis_[channel][basisIndex + i] = blobs[i];
    }
};


/**
 * Get the number of basis elements for the given channel. 
 *
 * @param {number} channel
 * @return {number}
 */
PcaMesh.prototype.getNumBasis = function(channel) {
    console.log(channel);
    return this.basis_[channel].length;
};


/**
 * Get the number of channels.
 *
 * @return {number}
 */
PcaMesh.prototype.getNumChannels = function() {
    return this.basis_.length;
};


/**
 * Get the blobs for the given basis channel. 
 * 
 * @param {number} channel
 * @return {!Array.<!Blob>}
 */
PcaMesh.prototype.getBasis = function(channel) {
    return this.basis_[channel];
};


/**
 * Get the mesh object.
 *
 * @return {!THREE.Mesh}
 */
PcaMesh.prototype.getMesh = function() {
    return this.mesh;
};


/**
 * Load the basis images.
 * 
 * @param {function()} callback Callback when loading is complete.
 */
PcaMesh.prototype.loadBasisImages = function(callback) {
    var loaded = 0;
    var totalImages = 0;
    for (var i = 0; i < this.getNumChannels(); ++i) {
	totalImages += this.getNumBasis(i);
    }

    var pcaMesh = this;
    this.basisImages_ = [];
    for (var i = 0; i < this.getNumChannels(); ++i) {
	var images = [];
	for (var j = 0; j < this.getNumBasis(i); ++j) { 
	    var image = new Image();
	    image.onload = function() {
		loaded++;
		console.log('Loaded:' + loaded);
		if (loaded == totalImages) {
		    var urls = pcaMesh.packTextures();
		    callback(urls);
		}
	    };
	    image.setAttribute('src', URL.createObjectURL(this.getBasis(i)[j]));
	    images[j] = image;
	}
	this.basisImages_[i] = images;
    }
};


/**
 * Pack all the basis images into textures.
 *
 * @return {!Array.<string>}
 */
PcaMesh.prototype.packTextures = function() {
    var canvas = document.createElement('canvas');
    canvas.width = this.basisDesc_[0][0]
    canvas.height = this.basisDesc_[0][1];

    var sepCanvas = document.createElement('canvas');
    sepCanvas.width = this.basisDesc_[0][0]
    sepCanvas.height = this.basisDesc_[0][1];

    var ctx = canvas.getContext('2d');
    var sepCtx = sepCanvas.getContext('2d');

    document.body.appendChild(canvas);
    document.body.appendChild(sepCanvas);

    var urls = [];
    this.textures_ = [];
    for (var i = 0; i < this.getNumChannels(); ++i) {
	this.textures_[i] = [];
	for (var j = 0; j < this.getNumBasis(i); j += 4) {
	    ctx.clearRect(0, 0, this.basisDesc_[i][0], this.basisDesc_[i][1]);

	    var mergedData = ctx.getImageData(0, 0, this.basisDesc_[i][0], 
                this.basisDesc_[i][1]);
	    
	    for (var k = 0; k < 4; ++k) {
		sepCtx.clearRect(0, 0, this.basisDesc_[i][0], 
                    this.basisDesc_[i][1]);
		sepCtx.drawImage(this.basisImages_[i][j + k], 0, 0, 
		    this.basisDesc_[i][0], this.basisDesc_[i][1]);

		var imageData = sepCtx.getImageData(0, 0, 
                    this.basisDesc_[i][0], this.basisDesc_[i][1]);
		var sepPixels = imageData.data;
		var mergedPixels = mergedData.data;
		var length = sepPixels.length * 4;
		for (var z = 0; z < length; z += 4) {
		    mergedPixels[z + k] = sepPixels[z];
		}
	    }
	    ctx.putImageData(mergedData, 0, 0);
	    var url = canvas.toDataURL();

	    var texture = new THREE.DataTexture(new Uint8Array(mergedData.data), 
                this.basisDesc_[i][0], this.basisDesc_[i][1], THREE.RGBAFormat);
	    texture.needsUpdate = true;

	    this.textures_[i][j/4] = texture; 
	    urls.push(url);
	}
    }
    return urls;
};


/**
 * Set the look-up table for the given channel, and basis index.
 * 
 * @param {number} channel The channel that this LUT is for.
 * @param {number} basis Offset of first basis element.
 * @param {number} numBasis Number of basis elements.
 * @param {!Int8Array} byteArray The basis data.
 */
PcaMesh.prototype.setLookupTable = function(channel, basis, numBasis, 
    byteArray) {
    var lutWidth = this.lutDesc_[channel][0];
    var lutHeight = this.lutDesc_[channel][1];
    
    if (basis == 0) {
	for (var i = 0; i < lutWidth*lutHeight; ++i) {
	    this.lut_[channel][0][i] = 1.0;
	}
    }
    console.log(byteArray[0]);
    console.log(byteArray[0] - 128);

    for (var b = 0; b < numBasis; ++b) {
	var basisIndex = basis + b + 1;
	for (var i = 0; i < lutWidth*lutHeight; ++i) {
	    this.lut_[channel][basisIndex][i] = 
		(byteArray[b * lutWidth * lutHeight + i])/128.0;
	}
    }
};
