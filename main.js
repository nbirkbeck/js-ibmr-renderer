goog.provide('Main');

goog.require('YxvFileReader');
goog.require('PcaMesh');

Main = function() {
    this.image = document.getElementById('image');
    
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, 640/480, 0.1, 1000);
    this.camera.position.z = 1.5;

    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(640, 480);
    this.renderer.setDepthTest(true);
    this.renderer.setDepthWrite(true);
    
    var container = document.getElementById('container');
    container.appendChild(this.renderer.domElement);
    
    var directionalLight = new THREE.DirectionalLight(0xffffff, 0.5 );
    directionalLight.position.set( 0, 0, 1 );
    this.scene.add(directionalLight);
    
    var geometry = new THREE.CubeGeometry(1,1,1);
    var material = new THREE.MeshLambertMaterial({color: 0x00ff00});
    
    //var cube = new THREE.Mesh(geometry, material);

};


/**
 * @type {!PcaMesh}
 */
Main.prototype.object;


/**
 * @type {!Element};
 */
Main.prototype.image;


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
      console.log('error');
      if (oEvent) {
	  onError(oEvent);
      }
  }; 

  oReq.onabort = function (oEvent) {
      console.log('error');
      if (oEvent) {
	  onError(oEvent);
      }
  };
  oReq.onload = goog.bind(function (oEvent) {
    var arrayBuffer = oReq.response;
    if (arrayBuffer) {
	this.onLoadModel_(arrayBuffer);
    } else {
	onError(oEvent);
    }
    //object.useStaticTexture();
  }, this);

  oReq.open("GET", modelFile, true);
  oReq.send();
};


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
 * Render the scene.
 */
Main.prototype.render = function () {
    requestAnimationFrame(goog.bind(this.render, this));
    
    if (this.object) {
	this.object.mesh.rotation.x = Math.PI;
	this.object.mesh.rotation.y += 0.02;
	//  cube.material = object.mesh.material;
	
	this.object.setLutCoeffs();
    }
    
    this.renderer.render(this.scene, this.camera);
};


/**
 * @private
 */
Main.prototype.onLoadModel_ = function(arrayBuffer) {
    var byteArray = new Uint8Array(arrayBuffer);
    var reader = new YxvFileReader();

    reader.read(byteArray);
    
    console.log(reader);
    console.log(reader.objects);

    var blob = reader.objects[0].getBasis(1)[0]; 
    this.object = reader.objects[0];
      
    this.object.loadBasisImages(goog.bind(function(urls) {
	//image.setAttribute('src', URL.createObjectURL(object.lutTextureBlobs[0]));
	//image.setAttribute('src', urls[0]);
		
	var vertShader = document.getElementById('vertexShader');
	var fragShader = document.getElementById('fragmentShader');
		
	this.object.setShaders(vertShader.innerHTML, fragShader.innerHTML);
	this.scene.add(this.object.getMesh());
    }, this));
};