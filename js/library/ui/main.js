/**
 * @fileoverview Main application.
 */
goog.provide('vis.ui.Main');

goog.require('vis.YxvFileReader');
goog.require('vis.PcaMesh');
goog.require('vis.ShaderLoader');
goog.require('vis.ui.Overlay');
goog.require('vis.ui.events.EventType');
goog.require('goog.pubsub.PubSub');
goog.require('goog.debug.Logger');


goog.scope(function() {
var events = vis.ui.events;
var ShaderLoader = vis.ShaderLoader;



/**
 * Main YXV renderer application.
 *
 * @constructor
 */
vis.ui.Main = function() {
    /** @private {!goog.debug.Logger} */
    this.logger_ = goog.debug.Logger.getLogger('vis.ui.Main');

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

    this.pubSub_ = new goog.pubsub.PubSub();

    // Setup the overlay.
    this.overlay_ = new vis.ui.Overlay(this.pubSub_, container);

    ShaderLoader.getInstance().loadShaders(goog.bind(function(numLoaded, numError) {
       this.logger_.info('Loaded shaders:' + numLoaded);
       if (numError) {
	   this.logger_.error('Shader loading with errors:' + numError);
	   this.pubSub_.publish(events.EventType.FATAL_ERROR, 
				'Error loading shaders.');
       }
    }, this));
};
var Main = vis.ui.Main;


/**
 * @type {!vis.PcaMesh}
 */
Main.prototype.object;


/** 
 * @private {number}
 * @const
 */ 
Main.FOVY_ = 75;


/**
 * Load the given model.
 *
 * @param {string} modelFile Url of the model.
 * @param {function(Object)} onLoad Load callback.
 * @param {function(Object)} onError Error callback.
 */
Main.prototype.loadModel = function(modelFile, onLoad, onError) {
  var oReq = new XMLHttpRequest();

  this.logger_.info('LoadModel: Set response type');
  this.pubSub_.publish(events.EventType.DOWNLOAD_STARTED);
  
  this.logger_.info('LoadModel: Adding event listeners');
  oReq.addEventListener("progress", goog.bind(function(evt) {
      if (evt.lengthComputable) {
	  this.logger_.info('Loaded:' + evt.loaded);
	  this.pubSub_.publish(events.EventType.DOWNLOAD_PROGRESS, 
			       evt.loaded, evt.total);
      }
  }, this), false); 

  oReq.onerror = function (oEvent) {
      this.logger_.error('Load model error.');
      if (oEvent) {
	  onError(oEvent);
      }
  }; 

  oReq.onabort = function (oEvent) {
      this.logger_.error('Load model aborted.');
      if (oEvent) {
	  onError(oEvent);
      }
  };

  this.logger_.info('LoadModel: Adding event listeners (onload)');
  oReq.onload = goog.bind(function (oEvent) {
    this.pubSub_.publish(events.EventType.DOWNLOAD_COMPLETED);

    var arrayBuffer = oReq.response;
    if (arrayBuffer) {
	if (!this.onLoadModel_(arrayBuffer)) {
	    this.logger_.error('Error loading model');
	    onError(oEvent);
	}
    } else {
	onError(oEvent);
    }
  }, this);

  this.logger_.info('LoadModel: Opening...');
  oReq.open("GET", modelFile, true);
  oReq.responseType = "arraybuffer";

  this.logger_.info('LoadModel: Sending...');
  oReq.send();
};


/**
 * Subscribe to one of the events.
 *
 * @param {string} topic
 * @param {(Function | null)} fn
 * @param {Object=} opt_context
 */
Main.prototype.subscribe = function(topic, fn, opt_context) {
    return this.pubSub_.subscribe(topic, fn, opt_context);
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
Main.prototype.setUseStaticTexture = function(value) {
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
    var reader = new vis.YxvFileReader();

    if (!reader.read(byteArray)) {
	return false;
    }

    this.object = reader.objects[0];

    var maxHeight = this.object.getMaxHeight();
    this.camera.position.z = 1.7 * (maxHeight / Math.tan(
        Math.PI * Main.FOVY_ / 2.0 / 180.0));

    // Add the object early.
    this.object.setUseStaticTexture(true);
    this.scene.add(this.object.getMesh());
    this.render();
    this.object.useShadedMaterial();
    
    this.object.loadBasisImages(goog.bind(function(value, message) {
	this.pubSub_.publish(events.EventType.TEXTURE_PROGRESS, value, message);
      }, this),
      goog.bind(function(urls) {
	this.object.initShaderMaterial();
	this.pubSub_.publish(events.EventType.OBJECT_READY);
      }, this));
    return true;
};
});  // goog.scope)
