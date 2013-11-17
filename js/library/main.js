goog.provide('Main');

goog.require('YxvFileReader');
goog.require('PcaMesh');



/**
 * Main YXV renderer application.
 *
 * @constructor
 */
Main = function() {
    /** @private {boolean} */
    this.freeze_ = false;

    /** @type {!THREE.Scene} */
    this.scene = new THREE.Scene();

    /** @type {!THREE.PerspectiveCamera} */
    this.camera = new THREE.PerspectiveCamera(Main.FOVY_, 640/480, 0.1, 1000);
    this.camera.position.z = 1.5;

    /** @type {!THREE.WebGLRenderer} */
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(640, 480);
    this.renderer.setDepthTest(true);
    this.renderer.setDepthWrite(true);
    
    var container = document.getElementById('container');
    container.appendChild(this.renderer.domElement);
    
    var directionalLight = new THREE.DirectionalLight(0xffffff, 0.95);
    directionalLight.position.set(0, 0, 1);
    this.scene.add(directionalLight);
};


/** 
 * @private {number}
 * @const
 */ 
Main.FOVY_ = 75;


/**
 * @type {!PcaMesh}
 */
Main.prototype.object;


/**
 * Load the given model.
 *
 * @param {string} modelFile
 * @param {function(Object)} onLoad Load callback.
 * @param {function(Object)} onError Error callback.
 */
Main.prototype.loadModel = function(modelFile, onLoad, onError) {
  var oReq = new XMLHttpRequest();
  oReq.responseType = "arraybuffer";

  oReq.onerror = function (oEvent) {
      console.error('error');
      if (oEvent) {
	  onError(oEvent);
      }
  }; 

  oReq.onabort = function (oEvent) {
      console.error('error');
      if (oEvent) {
	  onError(oEvent);
      }
  };
  oReq.onload = goog.bind(function (oEvent) {
    var arrayBuffer = oReq.response;
    if (arrayBuffer) {
	if (!this.onLoadModel_(arrayBuffer)) {
	    console.error('Error loading model');
	    onError(oEvent);
	}
    } else {
	onError(oEvent);
    }
  }, this);

  oReq.open("GET", modelFile, true);
  oReq.send();
};


/**
 * Run the main application.
 */
Main.prototype.run = function() {
    this.render();
};


/**
 * Remove all objects from the scene.
 */
Main.prototype.removeAllObjects = function() {
    if (this.object) {
	this.scene.remove(this.object.getMesh());
	this.object = undefined;    
    }
};


/**
 * Set use the static texture.
 * @param {boolean} value Enable the static texture.
 */
Main.prototype.setUseStaticTexture = function (value) {
    this.object.setUseStaticTexture(value);
};


/**
 * Set use the shaded material.
 * @param {boolean} value Use the shaded material.
 */
Main.prototype.useShadedMaterial = function (value) {
    this.object.useShadedMaterial();
};


/**
 * Render the scene.
 */
Main.prototype.render = function () {
    requestAnimationFrame(goog.bind(this.render, this));
    
    if (this.object) {
	this.object.mesh.rotation.x = Math.PI;
	this.object.mesh.rotation.y += 0.02;
	if (!this.freeze_) {
	    this.object.setLutCoeffs();
	}
    }
    this.renderer.render(this.scene, this.camera);
};


/**
 * @type {boolean} freeze
 */
Main.prototype.setFreeze = function(freeze) {
    this.freeze_ = freeze;
};


/**
 * Callback function when the loading of the model is complete.
 *
 * @return {boolean} True on success.
 * @private
 */
Main.prototype.onLoadModel_ = function(arrayBuffer) {
    var byteArray = new Uint8Array(arrayBuffer);
    var reader = new YxvFileReader();

    if (!reader.read(byteArray)) {
	return false;
    }

    var blob = reader.objects[0].getBasis(1)[0]; 
    this.object = reader.objects[0];

    var maxHeight = this.object.getMaxHeight();
    this.camera.position.z = 1.7 * (maxHeight / Math.tan(Math.PI * Main.FOVY_ / 2.0 / 180.0));

    this.object.loadBasisImages(goog.bind(function(urls) {
	//image.setAttribute('src', URL.createObjectURL(object.lutTextureBlobs[0]));
	//image.setAttribute('src', urls[0]);
	this.object.initShaderMaterial();
	this.scene.add(this.object.getMesh());
    }, this));
    return true;
};