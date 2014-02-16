/**
 * @fileoverview Reader of yxv files.
 */

goog.provide('vis.YxvFileReader');

goog.require('vis.PcaMesh');
goog.require('goog.dom');
goog.require('goog.debug.Logger');
goog.require('goog.pubsub.PubSub');


goog.scope(function() {


/**
 * A class to read in a yxv file.
 *
 * @constructor
 */
vis.YxvFileReader = function() {
  /** @type {number} */
  this.version = 0;

  /** @type {number} */
  this.offset = 0;

  /** @private {!goog.debug.Logger} */
  this.logger_ = goog.debug.Logger.getLogger('vis.YxvFileReader');

  /**
   * The objects as they are loaded.
   * @type {!Array.<!vis.PcaMesh>}
   */
  this.objects = [];

  /** @private {!goog.pubsub.PubSub} */
  this.pubSub_ = new goog.pubsub.PubSub();
};
var YxvFileReader = vis.YxvFileReader;


/** 
 * Each block begins with a 4-byte tag and length. 
 *
 * @typedef {{
 *   tag: string,
 *   length: number
 * }}
 */
YxvFileReader.BlockHeader;


/**
 * @enum {string}
 * @const
 */
YxvFileReader.EventType = {
  GEOMETRY: 'geom',
  STATIC_TEXTURE: 'static',
  BASIS: 'basis',
  LUT: 'lut'
};


/**
 * Read in the yxv file from the given data.
 *
 * @param {!Uint8Array} byteArray The array of data.
 */
YxvFileReader.prototype.read = function(byteArray) {
  if (this.offset == 0) {
    var block = this.getBlockHeader_(byteArray, 0);
    if (block.tag != 'PCAO') {
      this.error_('Unable to read byte array, invalid tag:' + block.tag + ' '
	  + 'length:' + block.length + ' total length:' 
	  + byteArray.byteLength);
      return false;
    }
    var numObjects = this.getInteger_(byteArray, 8);
    this.offset = 12;
    this.logger_.info('Reading yxv file len:' + block.length + ' #obj:' + 
	numObjects);
  }

  // Iterate over each tag.
  for (; this.offset + 8 < byteArray.length; ) {
    var block = this.getBlockHeader_(byteArray, this.offset);
    if (this.offset + block.length >= byteArray.length) {
      return true;
    }
    if (YxvFileReader.TAGS_[block.tag]) {
      if (!YxvFileReader.TAGS_[block.tag].call(this, block, byteArray, 
	  this.offset + 8)) {
        this.error_('Error loading tag:' + block.tag);
	return false;
      }
    } else {
      this.logger_.warning('Unknown tag:' + block.tag);
      console.log('Unknown tag:' + block.tag);
    }
    this.offset += 8 + block.length;
  }
  return true;
};


/**
 * Subscribe to events.
 *
 * @param {string} event
 * @param {function()} callback
 */
YxvFileReader.prototype.subscribe = function(event, callback) {
  return this.pubSub_.subscribe(event, callback);
};


/**
 * Handle the PCAO (PcaObject) tag.
 *
 * @param {!YxvFileReader.BlockHeader} block The parsed block header.
 * @param {!Uint8Array} byteArray The byte array.
 * @param {number} offset The current offset.
 * @return {boolean}
 * @private
 */
YxvFileReader.prototype.handlePcaObject_ = function(block, byteArray, offset) {
  var objectId = this.getInteger_(byteArray, offset);
  var numChannels = this.getInteger_(byteArray, offset + 4);
  var basisSizes = [];
  var lutSizes = [];

  offset += 8;

  // For each channel we have basis [w, h, numEig].
  for (var i = 0; i < numChannels; ++i) {
    var dims = this.getIntegers_(byteArray, offset, 3);
    basisSizes.push(dims);
    offset += 12;
  }

  // Then for each channel we have lut dimensions [w, h].
  for (var i = 0; i < numChannels; ++i) {
    var dims = this.getIntegers_(byteArray, offset, 2);
    lutSizes.push(dims);
    offset += 8;
  }

  this.objects[objectId] = new vis.PcaMesh(objectId, basisSizes, lutSizes);
  return true;
};


/**
 * Handle the version number.
 *
 * @param {!YxvFileReader.BlockHeader} block The parsed block header.
 * @param {!Uint8Array} byteArray The byte array.
 * @param {number} offset The current offset.
 * @return {boolean}
 * @private
 */
YxvFileReader.prototype.handleVers_ = function(block, byteArray, offset) {
  this.version = this.getInteger_(byteArray, offset);
  return true;
};


/**
 * Handle the LUT range (process the ranges of the lookup tables).
 *
 * @param {!YxvFileReader.BlockHeader} block The parsed block header.
 * @param {!Uint8Array} byteArray The byte array.
 * @param {number} offset The current offset.
 * @return {boolean}
 * @private
 */
YxvFileReader.prototype.handleLutRange_ = function(block, byteArray, offset) {
  var objectId = this.getInteger_(byteArray, offset);
  var length = this.getInteger_(byteArray, offset + 4); // Should be 3.
  offset += 8;

  var mean = this.getFloats_(byteArray, offset, 3); offset += 12;
  var min = this.getFloats_(byteArray, offset, 3); offset += 12;
  var max = this.getFloats_(byteArray, offset, 3); offset += 12;
  this.objects[objectId].setLutRange(mean, min, max);
  return true;
};


/**
 * Handle the STAJ tag (static jpeg-compressed texture).
 *
 * @param {!YxvFileReader.BlockHeader} block The parsed block header.
 * @param {!Uint8Array} byteArray The byte array.
 * @param {number} offset The current offset.
 * @return {boolean}
 * @private
 */
YxvFileReader.prototype.handleStaj_ = function(block, byteArray, offset) {
  var objectIndex = this.getInteger_(byteArray, offset);
  var width = this.getInteger_(byteArray, offset + 4);
  var height = this.getInteger_(byteArray, offset + 8);
  var dataView = new Uint8Array(byteArray.buffer, offset + 12, block.length - 12);
  var blob = new Blob([dataView], {type: 'image/jpeg'});

  this.objects[objectIndex].setStaticTexture(blob);
  this.pubSub_.publish(YxvFileReader.EventType.STATIC_TEXTURE, objectIndex);
  return true;
};


/**
 * Handle the LUTB tag (binary look-up tables).
 *
 * @param {!YxvFileReader.BlockHeader} block The parsed block header.
 * @param {!Uint8Array} byteArray The byte array.
 * @param {number} offset The current offset.
 * @return {boolean}
 * @private
 */
YxvFileReader.prototype.handleLutb_ = function(block, byteArray, offset) {
  var objectIndex = this.getInteger_(byteArray, offset);
  var channel = this.getInteger_(byteArray, offset + 4);
  var basisIndex = this.getInteger_(byteArray, offset + 8);
  var numBasis  = this.getInteger_(byteArray, offset + 12);
  
  // The rest of the data is just stored in the array.
  var dataView = new Int8Array(byteArray.buffer, offset + 16, 
      block.length - 16);
  this.objects[objectIndex].setLookupTable(channel, basisIndex, numBasis, 
      dataView);
  this.pubSub_.publish(YxvFileReader.EventType.LUT, objectIndex);
  return true;
};


/**
 * Handle the LUTJ tag (binary look-up tables).
 *
 * @param {!FileReader.BlockHeader} block The parsed block header.
 * @param {!Uint8Array} byteArray The byte array.
 * @param {number} offset The current offset.
 * @return {boolean}
 * @private
 */
YxvFileReader.prototype.handleLutj_ = function(block, byteArray, offset) {
  var objectIndex = this.getInteger_(byteArray, offset);
  var channel = this.getInteger_(byteArray, offset + 4);
  var basisIndex = this.getInteger_(byteArray, offset + 8);
  var numBasis  = this.getInteger_(byteArray, offset + 12);
  offset += 16;

  var dataView = new Uint8Array(byteArray.buffer, offset, block.length - 16);
  var segments = this.getJpegSegments_(dataView);
  if (segments.length != (numBasis + 1)) {
    this.error_('Wrong number of segments in LUTJ tag.' + segments.length + 
	' ' + (numBasis + 1) + ' ' + block.length);
    return false;
  }

  var lutTextureBlobs = [];
  var object = this.objects[objectIndex];
  for (var i = 0; i < segments.length - 1; ++i) {
    var imageView = new Uint8Array(byteArray.buffer, offset + segments[i],
	segments[i + 1] - segments[i]);
    lutTextureBlobs[i] = new Blob([imageView], {type: 'image/jpeg'});
  }
  this.objects[objectIndex].lutTextureBlobs = lutTextureBlobs;

  this.objects[objectIndex].setLookupTableBlobs(channel, basisIndex, 
						  lutTextureBlobs);
  this.pubSub_.publish(YxvFileReader.EventType.LUT, objectIndex);
  return true;
};


/**
 * Handle the POS tag (position of object).
 *
 * @param {!YxvFileReader.BlockHeader} block The parsed block header.
 * @param {!Uint8Array} byteArray The byte array.
 * @param {number} offset The current offset.
 * @return {boolean}
 * @private
 */
YxvFileReader.prototype.handlePos_ = function(block, byteArray, offset) {
  var objectIndex = this.getInteger_(byteArray, offset);
  var position = this.getFloats_(byteArray, offset + 4, 3);
  this.objects[objectIndex].setPosition(position);
  return true;
};


/**
 * Handle the ROT tag (rotation angles for the object).
 *
 * @param {!YxvFileReader.BlockHeader} block The parsed block header.
 * @param {!Uint8Array} byteArray The byte array.
 * @param {number} offset The current offset.
 * @return {boolean}
 * @private
 */
YxvFileReader.prototype.handleRot_ = function(block, byteArray, offset) {
  var objectIndex = this.getInteger_(byteArray, offset);
  var rot = this.getDoubles_(byteArray, offset + 4, 3);
  this.objects[objectIndex].setEulerAngles(rot);
  return true;
};


/**
 * Handle the SCA tag (scale value for an object).
 *
 * @param {!YxvFileReader.BlockHeader} block The parsed block header.
 * @param {!Uint8Array} byteArray The byte array.
 * @param {number} offset The current offset.
 * @return {boolean}
 * @private
 */
YxvFileReader.prototype.handleSca_ = function(block, byteArray, offset) {
  var objectIndex = this.getInteger_(byteArray, offset);
  var scale = this.getFloat_(byteArray, offset + 4);
  this.objects[objectIndex].setScale(scale);
  return true;
};


/**
 * Handle the EUA tag (euler angles rotation matrix).
 *
 * @param {!YxvFileReader.BlockHeader} block The parsed block header.
 * @param {!Uint8Array} byteArray The byte array.
 * @param {number} offset The current offset.
 * @return {boolean}
 * @private
 */
YxvFileReader.prototype.handleEulerAngles_ = function(block, byteArray, offset) {
  var objectIndex = this.getInteger_(byteArray, offset);
  offset += 4;

  var axis = [];
  for (var i = 0; i < 3; ++i) {
    axis[i] = this.getFloats_(byteArray, offset, 3);
    offset += 12;
  }
  this.objects[objectIndex].setEulerMatrix(axis);
  return true;
};


/**
 * Handle the GEOA tag (binary geometry).
 *
 * @param {!YxvFileReader.BlockHeader} block The parsed block header.
 * @param {!Uint8Array} byteArray The byte array.
 * @param {number} offset The current offset.
 * @return {boolean}
 * @private
 */
YxvFileReader.prototype.handleGeoa_ = function(block, byteArray, offset) {
  var objectIndex = this.getInteger_(byteArray, offset);
  offset += 4;

  var str = '';
  for (var i = 0; i < block.length; ++i) {
	str += String.fromCharCode(byteArray[offset + i]);
  }
  var lines = str.split('\n');
  var numVert = parseInt(lines[0]);

  var geometry = new THREE.Geometry();
  geometry.vertices.length = numVert;
  for (var i = 1; i <= numVert; ++i) {
	var v = lines[i].split(' ');
	geometry.vertices[i - 1] = new THREE.Vector3(parseFloat(v[0]), 
						     parseFloat(v[1]), 
						     parseFloat(v[2]));
  }
  var numTexVert = parseInt(lines[numVert + 1]);
  lines = lines.slice(numVert + 2);
  var texVert = [];
  texVert.length = numTexVert;
  for (var i = 0; i < numTexVert; ++i) {
    var v = lines[i].split(' ');
    texVert[i] = new THREE.Vector2(parseFloat(v[0]), 
	1.0 - parseFloat(v[1]));
  }

  var numFaces = parseInt(lines[numTexVert]);
  lines = lines.slice(numTexVert + 1);
  for (var i = 0; i < numFaces; ++i) {
    var v = lines[i].split(' ');
    var v1 = parseInt(v[0]);
    var v2 = parseInt(v[1]);
    var v3 = parseInt(v[2]);
    geometry.faces[i] = new THREE.Face3(v1, v2, v3);

    var uvs = [texVert[v1], texVert[v2], texVert[v3]];
    geometry.faceVertexUvs[0][i] = uvs;
  }

  geometry.computeFaceNormals();
  geometry.computeVertexNormals();
  this.objects[objectIndex].setGeometry(geometry);
  this.pubSub_.publish(YxvFileReader.EventType.GEOMETRY, objectIndex);
  return true;
};



/**
 * Handle the GEOB tag (binary geometry).
 *
 * @param {!YxvFileReader.BlockHeader} block The parsed block header.
 * @param {!Uint8Array} byteArray The byte array.
 * @param {number} offset The current offset.
 * @return {boolean}
 * @private
 */
YxvFileReader.prototype.handleGeob_ = function(block, byteArray, offset) {
  var objectIndex = this.getInteger_(byteArray, offset);
  offset += 4;

  var numVert = this.getInteger_(byteArray, offset);
  offset += 4;
  var vert = this.getFloats_(byteArray, offset, numVert * 3);
  offset += 12 * numVert;

  var numTexVert = this.getInteger_(byteArray, offset);
  offset += 4;
  var texVert = this.getFloats_(byteArray, offset, numVert * 2);
  offset += 8 * numTexVert;

  var numTris = this.getInteger_(byteArray, offset);
  offset += 4;
  var tris = this.getIntegers_(byteArray, offset, numTris * 3);
  offset += 12 * numTris;
  
  var geometry = new THREE.Geometry();
  geometry.vertices.length = numVert;
  for (var i = 0; i < numVert; ++i) {
	geometry.vertices[i] = new THREE.Vector3(-vert[3 * i], 
	    this.version == 0 ? vert[3 * i + 1] : - vert[3 * i + 1], 
	    vert[3 * i + 2]);
  }

  geometry.faces.length = numTris;
  for (var i = 0; i < numTris; ++i) {
    var v1 = tris[3 * i];
    var v2 = tris[3 * i + 1];
    var v3 = tris[3 * i + 2];

    geometry.faces[i] = new THREE.Face3(v1, v2, v3, 
	new THREE.Vector3(0, 0, 1));

    var uvs = [
      new THREE.Vector2(texVert[2 * v1], 1 - texVert[2 * v1 + 1]),
      new THREE.Vector2(texVert[2 * v2], 1 - texVert[2 * v2 + 1]),
      new THREE.Vector2(texVert[2 * v3], 1 - texVert[2 * v3 + 1])
    ];
    geometry.faceVertexUvs[0][i] = uvs;
  }

  geometry.computeFaceNormals();
  geometry.computeVertexNormals();
  this.objects[objectIndex].setGeometry(geometry);
  this.pubSub_.publish(YxvFileReader.EventType.GEOMETRY, objectIndex);
  return true;
};


/**
 * Handle the BASJ tag.
 *
 * @param {!YxvFileReader.BlockHeader} block The parsed block header.
 * @param {!Uint8Array} byteArray The byte array.
 * @param {number} offset The current offset.
 * @return {boolean}
 * @private
 */
YxvFileReader.prototype.handleBasj_ = function(block, byteArray, offset) {
    var objectIndex = this.getInteger_(byteArray, offset);
    var channel = this.getInteger_(byteArray, offset + 4);
    var basisIndex = this.getInteger_(byteArray, offset + 8);
    var numBasis = this.getInteger_(byteArray, offset + 12);
    offset += 16;
    
    var dataView = new Uint8Array(byteArray.buffer, offset, block.length - 16);
    var segments = this.getJpegSegments_(dataView);
    if (segments.length != (numBasis + 1)) {
	this.error_('Wrong number of segments in BASJ tag.  Had:' + 
		    segments.length + ' expected ' + (numBasis + 1));
	return false;
    }
    var textureBlobs = [];
    for (var i = 0; i < segments.length - 1; ++i) {
	var imageView = new Uint8Array(byteArray.buffer, offset + segments[i], 
				       segments[i + 1] - segments[i]);
	textureBlobs[i] = new Blob([imageView], {type: 'image/jpeg'});
    }
    this.objects[objectIndex].setBasis(channel, basisIndex, textureBlobs);
    this.pubSub_.publish(YxvFileReader.EventType.BASIS, objectIndex);
    return true;
};


/**
 * Try and determine the start index of jpeg streams that have been concatenated
 * into a single buffer.
 *
 * @return {!Array.<number>}
 * @private
 */
YxvFileReader.prototype.getJpegSegments_ = function(dataView) {
  var segments = [];
  for (var i = 0; i < dataView.length - 10; ++i) {
    if (((i == 0) || (dataView[i - 2] == 0xff && dataView[i - 1] == 0xd9)) &&
      dataView[i] == 0xff && dataView[i + 1] == 0xd8 &&
      dataView[i + 2] == 0xff && dataView[i + 3] == 0xe0) {
      var jfif = String.fromCharCode(dataView[6]) + 
	  String.fromCharCode(dataView[7]) + 
	  String.fromCharCode(dataView[8]) +
	  String.fromCharCode(dataView[9]);
      if (jfif == 'JFIF' && dataView[10] == 0) {
	segments.push(i);
      }
    }	    
  }
  segments.push(dataView.length);
  return segments;
};


/**
 * Get the next tag and the length of the IFF block from the byte array.
 *
 * @return {!YxvFileReader.BlockHeader}
 * @private
 */
YxvFileReader.prototype.getBlockHeader_ = function(byteArray, i) {
  var tag = String.fromCharCode(byteArray[i + 0]) +
      String.fromCharCode(byteArray[i + 1]) +
      String.fromCharCode(byteArray[i + 2]) +
      String.fromCharCode(byteArray[i + 3]);

  var length = this.getInteger_(byteArray, i + 4);
  return {tag: tag, length: length};
};


/** 
 * Get an integer from the byte array at offset i.
 *
 * @param {!Uint8Array} byteArray The byte array.
 * @param {number} i The offset.
 * @return {number}
 * @private
 */
YxvFileReader.prototype.getInteger_ = function(byteArray, i) {
  return byteArray[i + 0] | (byteArray[i + 1]<<8) |
    (byteArray[i + 2]<<16) |   (byteArray[i + 3]<<24);
};


/** 
 * Get an array of integers from the byte array.
 * 
 * @param {!Uint8Array} byteArray The byte array.
 * @param {number} i The offset.
 * @param {number} num The number of integers to process.
 * @return {!Int32Array}
 */
YxvFileReader.prototype.getIntegers_ = function(byteArray, i, num) {
  return new Int32Array(byteArray.buffer, i, num);
};


/** 
 * Get a float from the byte array.
 * 
 * @param {!Uint8Array} byteArray The byte array.
 * @param {number} i The offset. 
 * @return {number}
 */
YxvFileReader.prototype.getFloat_ = function(byteArray, i) {
  return this.getFloats_(byteArray, i, 1)[0];
};


/** 
 * Get an array of floats from a byte array.
 * 
 * @param {!Uint8Array} byteArray The byte array.
 * @param {number} i The offset. 
 * @param {number} num The number of floats.
 * @return {!Float32Array}
 * @private
 */
YxvFileReader.prototype.getFloats_ = function(byteArray, i, num) {
  try {
    return new Float32Array(byteArray.buffer, i, num);
  } catch (err) {
    var dataView = new DataView(byteArray.buffer);
    var floatView = new Float32Array(num);
    for (var j = 0; j < num; ++j) {
      floatView[j] = dataView.getFloat32(j * 4 + i, true);
    }
    return floatView;
  }
};


/** 
 * Get an array of floats from a byte array.
 * 
 * @param {!Uint8Array} byteArray The byte array.
 * @param {number} i The offset. 
 * @param {number} num The number of floats.
 * @return {!Float64Array}
 * @private
 */
YxvFileReader.prototype.getDoubles_ = function(byteArray, i, num) {
  try {
    return new Float64Array(byteArray.buffer, i, num);
  } catch (err) {
    var dataView = new DataView(byteArray.buffer);
    var floatView = new Float64Array(num);
    for (var j = 0; j < num; ++j) {
      floatView[j] = dataView.getFloat64(j * 8 + i, true);
    }
    return floatView;
  }
};


/** 
 * Log the error message.
 *
 * @param {string} msg The error message.
 * @private
 */
YxvFileReader.prototype.error_ = function(msg) {
  if (window.console && console.log) {
    console.log('Error:' + msg);
  }
  this.logger_.severe(msg);
};


/**
 * Mapping from file tag to the handler callback.
 *
 * @private
 */
YxvFileReader.TAGS_ = {
  'POBJ': YxvFileReader.prototype.handlePcaObject_,
  'VERS': YxvFileReader.prototype.handleVers_,
  'LUTR': YxvFileReader.prototype.handleLutRange_,
  'LUTB': YxvFileReader.prototype.handleLutb_,
  'LUTJ': YxvFileReader.prototype.handleLutj_,
  'STAJ': YxvFileReader.prototype.handleStaj_,
  'EUA ': YxvFileReader.prototype.handleEulerAngles_,
  'POS ': YxvFileReader.prototype.handlePos_,
  'ROT ': YxvFileReader.prototype.handleRot_,
  'SCA ': YxvFileReader.prototype.handleSca_,
  'GEOB': YxvFileReader.prototype.handleGeob_,
  'GEOA': YxvFileReader.prototype.handleGeoa_,
  'BASJ': YxvFileReader.prototype.handleBasj_
};
});  // goog.scope)
