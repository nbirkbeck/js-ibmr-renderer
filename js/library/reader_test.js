/**
 * @fileoverview Testing of the reader.
 */

goog.require('vis.YxvFileReader');

goog.require('goog.testing.jsunit');


var basisDesc = [[2, 2, 4], [2, 2, 4], [2, 2, 4]];
var lutDesc = [[2, 2], [2, 2], [2, 2]];

// This is 4 images that are 2x2 single color gray-scale images (255, 200, 100, 0).
var imageData = atob(
  '/9j/4AAQSkZJRgABAQEASABIAAD//gATQ3JlYXRlZCB3aXRoIEdJTVD/2wBDAAUDBAQEAwUEBAQF' +
  'BQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/wAAL' +
  'CAACAAIBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAI' +
  'AQEAAD8AZb//2f/Y/+AAEEpGSUYAAQEBAEgASAAA//4AE0NyZWF0ZWQgd2l0aCBHSU1Q/9sAQwAF' +
  'AwQEBAMFBAQEBQUFBgcMCAcHBwcPCwsJDBEPEhIRDxERExYcFxMUGhURERghGBodHR8fHxMXIiQi' +
  'HiQcHh8e/8AACwgAAgACAQERAP/EABQAAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAA' +
  'AAAAAAAA/9oACAEBAAA/AHN//9n/2P/gABBKRklGAAEBAQBIAEgAAP/+ABNDcmVhdGVkIHdpdGgg' +
  'R0lNUP/bAEMABQMEBAQDBQQEBAUFBQYHDAgHBwcHDwsLCQwRDxISEQ8RERMWHBcTFBoVEREYIRga' +
  'HR0fHx8TFyIkIh4kHB4fHv/AAAsIAAIAAgEBEQD/xAAUAAEAAAAAAAAAAAAAAAAAAAAG/8QAFBAB' +
  'AAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAAPwAk/9n/2P/gABBKRklGAAEBAQBIAEgAAP/+ABNDcmVh' +
  'dGVkIHdpdGggR0lNUP/bAEMABQMEBAQDBQQEBAUFBQYHDAgHBwcHDwsLCQwRDxISEQ8RERMWHBcT' +
  'FBoVEREYIRgaHR0fHx8TFyIkIh4kHB4fHv/AAAsIAAIAAgEBEQD/xAAUAAEAAAAAAAAAAAAAAAAA' +
  'AAAI/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAAPwAZP//Z');

var sizes = [181, 181, 180, 181];

var setTag = function(dataView, offset, tag, length) {
    dataView.setUint8(offset + 0, tag.charCodeAt(0));
    dataView.setUint8(offset + 1, tag.charCodeAt(1));
    dataView.setUint8(offset + 2, tag.charCodeAt(2));
    dataView.setUint8(offset + 3, tag.charCodeAt(3));
    dataView.setInt32(offset + 4, length, true);   
};


var generateBuffer = function(numObjects, blocks) {
    var totalLength = 12;
    goog.array.forEach(blocks, function(block) {
      totalLength += 8 + block.length;
    });

    var buffer = new ArrayBuffer(totalLength);
    var dataView = new DataView(buffer);
    setTag(dataView, 0, 'PCAO', totalLength);
    dataView.setInt32(8, numObjects);

    var offset = 12;
    goog.array.forEach(blocks, function(block) {
      setTag(dataView, offset, block.tag, block.length);
      offset += 8;
      if (block.data) {
	  new Uint8Array(buffer, offset).set(block.data);
      }
      offset += block.length;
    });
    return new Uint8Array(buffer);
};


var floatDataBlock = function(tag, index, data32, data64) {
    var length = 4 + data32.length * 4 + data64.length * 8;
    var buffer = new ArrayBuffer(length);
    var dataView = new DataView(buffer);
    dataView.setInt32(0, index, true);
    for (var i = 0; i < data32.length; i++) {
	dataView.setFloat32(4*i + 4, data32[i], true);
    }
    for (var i = 0; i < data64.length; i++) {
	dataView.setFloat64(8*i + 4, data64[i], true);
    }
    return {
	tag: tag,
	length: length,
	data: new Uint8Array(buffer)
    };
};


var versBlock = function(version) {
    var buffer = new ArrayBuffer(4);
    new DataView(buffer).setInt32(0, version, true);

    return {
       tag: 'VERS',
       length: 4,
       data: new Uint8Array(buffer)
    };
};

var pobjBlock = function(index, basisDesc, lutDesc) {
    var numChannels = basisDesc.length;
    var length = 8 + numChannels * 4 * 5;
    var buffer = new ArrayBuffer(length);
    var dataView = new DataView(buffer);

    var offset = 8;
    dataView.setInt32(0, index, true);
    dataView.setInt32(4, numChannels, true);

    for (var i = 0; i < numChannels; i++) {
       dataView.setInt32(offset, basisDesc[i][0], true);
       dataView.setInt32(offset + 4, basisDesc[i][1], true);
       dataView.setInt32(offset + 8, basisDesc[i][2], true);
       offset += 12;
    };
    for (var i = 0; i < numChannels; i++) {
       dataView.setInt32(offset, lutDesc[i][0], true);
       dataView.setInt32(offset + 4, lutDesc[i][1], true);
       offset += 8;
    }

    // id, numChannels, [w, h, numEig]_{channel} [lutw, luth]_{channel}
    return { 
       tag: 'POBJ',
       length: length,
       data: new Uint8Array(buffer)
    };
};


/**
 * Test whether the reader returns false on invalid input.
 */ 
var testInvalidInput = function() {
    var reader = new vis.YxvFileReader();
    assertFalse(reader.read(new Uint8Array()));
};


/**
 * Test whether the reader returns true on the simplest of files.
 */ 
var testEmptyFileInput = function() {
    var reader = new vis.YxvFileReader();
    var data = generateBuffer(0, []);
    assertTrue(reader.read(data));
    assertEquals(0, reader.objects.length);
};


/**
 * Test whether the reader correctly loads version tag.
 */ 
var testVersion = function() {
    var reader = new vis.YxvFileReader();
    var version = 1012;
    var data = generateBuffer(0, [versBlock(version)]);

    assertTrue(reader.read(data));
    assertEquals(version, reader.version);
    assertEquals(0, reader.objects.length);
};


/**
 * Test whether the reader correctly loads when there is an unknown tag.
 */ 
var testInvalidTag = function() {
    var reader = new vis.YxvFileReader();
    var version = 1012;
    var data = generateBuffer(0, [{tag: 'INVD', length: 0}, versBlock(version)]);

    assertTrue(reader.read(data));
    assertEquals(version, reader.version);
    assertEquals(0, reader.objects.length);
};


/**
 * Test whether the reader correctly loads a pca object.
 */ 
var testPobj = function() {
    var numChannels = 3;
    var reader = new vis.YxvFileReader();
    var w = [128, 256, 512];
    var h = [512, 256, 128];
    var numEig = [4, 8, 12];
    var lutw = [128, 256, 512];
    var luth = [256, 512, 128];
    var basisDesc = [
      [w[0], h[0], numEig[0]],
      [w[1], h[1], numEig[1]],
      [w[2], h[2], numEig[2]]
    ];
    var lutDesc = [ 
      [lutw[0], luth[0]],
      [lutw[1], luth[1]],
      [lutw[2], luth[2]],
    ];
    var data = generateBuffer(1, [pobjBlock(0, basisDesc, lutDesc)]);

    assertTrue(reader.read(data));
    assertEquals(1, reader.objects.length);

    var object = reader.objects[0];
    for (var i = 0; i < numChannels; i++) {
      assertEquals(object.basisDesc_[i][0], w[i]);
      assertEquals(object.basisDesc_[i][1], h[i]);
      assertEquals(object.basisDesc_[i][2], numEig[i]);
      assertEquals(object.lutDesc_[i][0], lutw[i]);
      assertEquals(object.lutDesc_[i][1], luth[i]);
    }
};


/**
 * Test whether the reader correctly loads a pca object.
 */ 
var testLutRange = function() {
    var reader = new vis.YxvFileReader();
    var basisDesc = [[128, 128, 4]];
    var lutDesc = [[32, 32]];
    var buffer = new ArrayBuffer(11*4);
    var dataView = new DataView(buffer);
    
    // Object and length.
    dataView.setInt32(0, 0, true);
    dataView.setInt32(4, 3, true); 

    var values = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    var offset = 8;
    goog.array.forEach(values, function(value) {
      dataView.setFloat32(offset, value, true);      
      offset += 4;
    });

    var data = generateBuffer(1, [pobjBlock(0, basisDesc, lutDesc), {
      tag: 'LUTR',
      length: 11*4,
      data: new Uint8Array(buffer)
    }]);

    assertTrue(reader.read(data));
    assertEquals(1, reader.objects.length);
    var object = reader.objects[0];
    assertEquals(values[0], object.lutRangeMean_[0]);
    assertEquals(values[1], object.lutRangeMean_[1]);
    assertEquals(values[2], object.lutRangeMean_[2]);

    assertEquals(values[3], object.lutRangeMin_[0]);
    assertEquals(values[4], object.lutRangeMin_[1]);
    assertEquals(values[5], object.lutRangeMin_[2]);

    assertEquals(values[6], object.lutRangeMax_[0]);
    assertEquals(values[7], object.lutRangeMax_[1]);
    assertEquals(values[8], object.lutRangeMax_[2]);
};


/**
 * Test setting the pos, orient, and scale tags.
 */
var testPos = function() {
    var pos = [-1., 1., 2.];
    var data = generateBuffer(1, [
      pobjBlock(0, basisDesc, lutDesc),
      floatDataBlock('POS ', 0, pos, []),
    ]);

    var reader = new vis.YxvFileReader();
    assertTrue(reader.read(data));
    assertEquals(1, reader.objects.length);
    var object = reader.objects[0];

    assertEquals(pos[0], object.mesh.position.x);
    assertEquals(pos[1], object.mesh.position.y);
    assertEquals(pos[2], object.mesh.position.z);
};


/**
 * Test setting of the scale.
 */
var testSca = function() {
    var scale = [3];
    var data = generateBuffer(1, [
      pobjBlock(0, basisDesc, lutDesc),
      floatDataBlock('SCA ', 0, scale, []),
    ]);

    var reader = new vis.YxvFileReader();
    assertTrue(reader.read(data));
    assertEquals(1, reader.objects.length);
    var object = reader.objects[0];

    assertEquals(scale[0], object.mesh.scale.x);
    assertEquals(scale[0], object.mesh.scale.y);
    assertEquals(scale[0], object.mesh.scale.z);
};


/**
 * Test setting of the rotation.
 */
var testRot = function() {
    var rot = [-1, -2, -3];
    var data = generateBuffer(1, [
      pobjBlock(0, basisDesc, lutDesc),
      floatDataBlock('ROT ', 0, [], rot)
    ]);

    var reader = new vis.YxvFileReader();
    assertTrue(reader.read(data));
    assertEquals(1, reader.objects.length);

    var object = reader.objects[0];
    assertEquals(rot[0], object.eulerAngles_.x);
    assertEquals(rot[1], object.eulerAngles_.y);
    assertEquals(rot[2], object.eulerAngles_.z);
};

var assertGeometry = function(object) {
    assertEquals(3, object.mesh.geometry.vertices.length);
    for (var i = 0; i < 3; i++) {
	assertEquals(i, object.mesh.geometry.vertices[i].x);
	assertEquals(i + 0.25, object.mesh.geometry.vertices[i].y);
	assertEquals(i + 0.5, object.mesh.geometry.vertices[i].z);
    }
    for (var i = 0; i < 3; ++i) {
	assertEquals(i, object.mesh.geometry.faceVertexUvs[0][0][i].x);
	assertEquals(1.0 - (i + 0.5), object.mesh.geometry.faceVertexUvs[0][0][i].y);
    }
    assertEquals(0, object.mesh.geometry.faces[0].a);
    assertEquals(1, object.mesh.geometry.faces[0].b);
    assertEquals(2, object.mesh.geometry.faces[0].c);
};


/**
 * Test setting of the ascii geometry.
 */
var testGeoa = function() {
    var str = '3\n0 0.25 0.5\n1 1.25 1.5\n2 2.25 2.5\n3\n0 0.5\n1 1.5\n2 2.5\n1\n0 1 2\n';
    var buffer = new ArrayBuffer(str.length + 4);
    var view = new DataView(buffer);
    view.setInt32(0, 0, true);
    for (var i = 0; i < str.length; i++) {
	view.setUint8(4 + i, str.charCodeAt(i));
    }
    var data = generateBuffer(1, [
      pobjBlock(0, basisDesc, lutDesc), {
	  tag: 'GEOA',
	  length: buffer.byteLength,
	  data: new Uint8Array(buffer)
      }
    ]);
    var reader = new vis.YxvFileReader();
    assertTrue(reader.read(data));
    assertEquals(1, reader.objects.length);
    assertGeometry(reader.objects[0]);
};


/**
 * Test setting of the ascii geometry.
 */
var testGeob = function() {
    for (var version = 0; version <= 1; version++) {
      var buffer = new ArrayBuffer(4 + 3*4 + 3*3*4 + 3*2*4 + 3*4);
      var view = new DataView(buffer);
      view.setInt32(0, 0, true);
      view.setInt32(4, 3, true);
      var offset = 8;
      for (var i = 0; i < 3; i++) {
        var y = i + .25;
        if (version == 1) y = -y;
 	view.setFloat32(offset, -i, true); // x-coord is negated in geob
	view.setFloat32(offset + 4, y, true);
	view.setFloat32(offset + 8, i + .5, true);
	offset += 12;
      }
      view.setInt32(offset, 3, true);
      offset += 4;
      for (var i = 0; i < 3; i++) {
	  view.setFloat32(offset, i, true);
	  view.setFloat32(offset + 4, i + .5, true);
	  offset += 8;
      }
      
      view.setInt32(offset, 1, true);
      offset += 4;
      
      view.setInt32(offset, 0, true);
      view.setInt32(offset + 4, 1, true);
      view.setInt32(offset + 8, 2, true);
      
      var data = generateBuffer(1, [
        pobjBlock(0, basisDesc, lutDesc), {
 	  tag: 'GEOB',
	  length: buffer.byteLength,
	  data: new Uint8Array(buffer)
        }
      ]);
      var reader = new vis.YxvFileReader();
      reader.version = version;
      
      assertTrue(reader.read(data));
      assertEquals(1, reader.objects.length);
      assertGeometry(reader.objects[0]);
    }
};


/**
 * Helper function to test when the basis/lut are being set by jpeg.
 */
var doJpegTests = function(tag, functionName) {
    var numBasis = 4;
    for (var testChannel = 0; testChannel < 3; testChannel++) {
	for (var testBasisIndex = 0; testBasisIndex <= 4; testBasisIndex += 4) {
	    var reader = new vis.YxvFileReader();
	    var object = new vis.PcaMesh(0, basisDesc, lutDesc);

	    var called = 0;
	    // Proxy the setLookupTableBlobs, where we do the checks.
	    object[functionName] = function(channel, basisIndex, blobs) {
		assertEquals(testChannel, channel);
		assertEquals(testBasisIndex, basisIndex);
		assertEquals(numBasis, blobs.length);

		for (var k = 0; k < blobs.length; k++) {
		    assertEquals(sizes[k], blobs[k].size);
		}
		called++;
	    }
	    reader.objects = [object];
	    
	    var buffer = new ArrayBuffer(4 * 4 + imageData.length);
	    var dataView = new DataView(buffer);

	    dataView.setInt32(0, 0, true);
	    dataView.setInt32(4, testChannel, true);
	    dataView.setInt32(8, testBasisIndex, true);
	    dataView.setInt32(12, numBasis, true);

	    var offset = 16;
	    for (var i = 0; i < imageData.length; i++) {
		dataView.setUint8(offset + i, imageData.charCodeAt(i));
	    }
	    
	    var data = generateBuffer(1, [{
		tag: tag,
		length: buffer.byteLength,
		data: new Uint8Array(buffer)
	    }]);
	    assertTrue(reader.read(data));
	    assertEquals(1, called);
	}
    }
};


/**
 * Setup the lookup table via jpeg.
 */
var testLutj = function() {
    doJpegTests('LUTJ', 'setLookupTableBlobs');
};


/**
 * Setup the basis via jpeg.
 */
var testBasj = function() {
    doJpegTests('BASJ', 'setBasis');
};

	   
/**
 * Test setting of the lut via jpeg.
 */
var testStaj = function() {
    var buffer = new ArrayBuffer(4 * 3 + sizes[0]);
    var dataView = new DataView(buffer);
    
    dataView.setInt32(0, 0, true);
    dataView.setInt32(4, 2, true);
    dataView.setInt32(8, 2, true);

    var offset = 12;
    for (var i = 0; i < sizes[0]; i++) {
	dataView.setUint8(offset + i, imageData.charCodeAt(i));
    }
    var reader = new vis.YxvFileReader();
    var object = new vis.PcaMesh(0, basisDesc, lutDesc);
    
    // Proxy setStaticTexture and make sure it gets called with the blob.
    var called = 0;
    object.setStaticTexture = function(blob) {
	assertEquals(sizes[0], blob.size);
	called++;
    };
    reader.objects = [object];
    var data = generateBuffer(1, [{
        tag: 'STAJ',
	length: buffer.byteLength,
	data: new Uint8Array(buffer)
    }]);
    assertTrue(reader.read(data));
    assertEquals(1, called);
 };


/**
 * Test setting of the lut via binary data.
 */
var testLutb = function() {
    var testNumBasis = 4;
    for (var testChannel = 0; testChannel < 3; testChannel++) {
	for (var testBasisIndex = 0; testBasisIndex <= 4; testBasisIndex += 4) {
	    var buffer = new ArrayBuffer(4 * 4 + 2 * 2 * testNumBasis);
	    var dataView = new DataView(buffer);

	    dataView.setInt32(0, 0, true);
	    dataView.setInt32(4, testChannel, true);
	    dataView.setInt32(8, testBasisIndex, true);
	    dataView.setInt32(12, testNumBasis, true);
	    
	    var reader = new vis.YxvFileReader();
	    var object = new vis.PcaMesh(0, basisDesc, lutDesc);

	    // Proxy setStaticTexture and make sure it gets called with the blob.
	    var called = 0;
	    object.setLookupTable = function(channel, basisIndex, numBasis, dataView) {
		assertEquals(testChannel, channel);
		assertEquals(testBasisIndex, basisIndex);
		assertEquals(testNumBasis, numBasis);
		assertEquals(2 * 2 * numBasis, dataView.byteLength);
		called++;
	    };
	    
	    reader.objects = [object];
	    var data = generateBuffer(1, [{
	      tag: 'LUTB',
	      length: buffer.byteLength,
	      data: new Uint8Array(buffer)
	    }]);

	    assertTrue(reader.read(data));
	    assertEquals(1, called);
	}
    }
};


/*
    'BASJ': YxvFileReader.prototype.handleBasj_
*/
