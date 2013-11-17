goog.provide('PcaMesh');
goog.require('MultipleTexturesRenderer');


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

    // Setup the default renderer.
    this.renderer_ = new MultipleTexturesRenderer();

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
 *
 * @param {boolean} staticTexture
 */
PcaMesh.prototype.setUseStaticTexture = function(staticTexture) {
    if (staticTexture) {
	var url = URL.createObjectURL(this.staticTexture_);
	var texture = THREE.ImageUtils.loadTexture(url, new THREE.UVMapping());
	var matParams = {color: 0xffffff, map: texture};
	this.mesh.material = new THREE.MeshLambertMaterial(matParams);
    } else {
	this.mesh.material = this.renderer_.material;
    }
};


/** 
 * Set use shaded material.
 */
PcaMesh.prototype.useShadedMaterial = function() {
    var matParams = {color: 0xffffff};
    this.mesh.material = new THREE.MeshLambertMaterial(matParams);
};


/**
 * Set the lut coefficients from the current object rotation.
 * TODO(birkbeck): Make this use the camera position as well.
 */
PcaMesh.prototype.setLutCoeffs = function() {
    var roty = (-this.mesh.rotation.y + Math.PI) * 180.0 / Math.PI;

    while (roty < 0) {
	roty += 360.0;
    }
    while (roty > 360) {
	roty -= 360.0;
    }

    this.coeff = [[], [], []];

    for (var i = 0; i < this.getNumChannels(); ++i) {
	var lutCoord = this.lutDesc_[i][0] * (roty - this.lutRangeMin_[0]) 
	    / (this.lutRangeMax_[0] - this.lutRangeMin_[0]) + 0.5;
	var lutMin = Math.max(0, Math.floor(lutCoord));
	var lutMax = Math.min(this.lutDesc_[i][0] - 1, Math.floor(lutCoord) + 1);
	var a = lutCoord - lutMin;

	if (lutMin == lutMax && lutMin == (this.lutDesc_[i][0] - 1)) {
	    console.log('Wrap around');
	    a = (lutCoord - lutMin) / (this.lutRangeMin_[0] + 360 - this.lutRangeMax_[0]);
	    //lutMax = 0;
	}
	for (var j = 0; j < 16; ++j) {
	    this.coeff[i][j] = (this.lut_[i][j][lutMin] * (1.0 - a) + 
				this.lut_[i][j][lutMax] * a);
	}
    }

    if (this.renderer_ ) {
	this.renderer_.setCoeff(this.coeff);
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
    this.setLutCoeffs();

    this.renderer_.setShaders(vertShader, fragShader, this.coeff);

    this.mesh.material = this.renderer_.material;
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
    goog.array.forEach(blobs, function(blob, i) {
	this.basis_[channel][basisIndex + i] = blob;
    }, this);
};


/**
 * Get the number of basis elements for the given channel. 
 *
 * @param {number} channel
 * @return {number}
 */
PcaMesh.prototype.getNumBasis = function(channel) {
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

    this.basisImages_ = [];
    for (var i = 0; i < this.getNumChannels(); ++i) {
	var images = [];
	for (var j = 0; j < this.getNumBasis(i); ++j) { 
	    var image = new Image();
	    image.onload = goog.bind(function() {
		loaded++;

		if (loaded == totalImages) {
		    var urls = this.renderer_.initFromTextures(this.basisDesc_, this.basisImages_);
		    callback(urls);
		}
      	    }, this);
	    image.setAttribute('src', URL.createObjectURL(this.getBasis(i)[j]));
	    images[j] = image;
	}
	this.basisImages_[i] = images;
    }
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

    for (var b = 0; b < numBasis; ++b) {
	var basisIndex = basis + b + 1;
	for (var i = 0; i < lutWidth*lutHeight; ++i) {
	    this.lut_[channel][basisIndex][i] = 
		(byteArray[b * lutWidth * lutHeight + i])/128.0;
	}
    }
};


PcaMesh.prototype.setLookupTableBlobs = function(channel, basisIndex, blobs) {
    var lutDesc = this.lutDesc_;
    var pcaMesh = this;
    var numLoaded = 0;

    // TODO: Fix up this so that it uses only one canvas.
    var render = function(image, i) {
	return function() {
	    var canvas = document.createElement('canvas');
	    canvas.width = lutDesc[channel][0];
	    canvas.height = lutDesc[channel][1];
	    var ctx = canvas.getContext('2d');

	    ctx.clearRect(0, 0, lutDesc[channel][0], lutDesc[channel][1]);
	    ctx.drawImage(image, 0, 0, lutDesc[channel][0], lutDesc[channel][1]);

	    var imageData = ctx.getImageData(0, 0, lutDesc[channel][0], 
                lutDesc[channel][1]);
	    var pixels = imageData.data;
	    var byteData = new Int8Array(canvas.width * canvas.height);
	    var numPixels = pixels.length / 4;
	    for (var j = 0; j < numPixels; ++j) {
		byteData[j] = pixels[4 * j + 1] - 128;
	    }
	    pcaMesh.setLookupTable(channel, basisIndex + i, 1, byteData);
	}
    };

    for (var i = 0; i < blobs.length; ++i) {
	var image = new Image();
	image.onload = render(image, i);
	image.setAttribute('src', URL.createObjectURL(blobs[i]));
    }
};