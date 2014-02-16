/**
 * @fileoverview Unit testing of the BigTextureRenderer.
 */

goog.require('vis.renderer.BigTextureRenderer');

goog.require('goog.testing.jsunit');


var IMAGE_SOURCES_ = [
  '/9j/4AAQSkZJRgABAQEASABIAAD//gATQ3JlYXRlZCB3aXRoIEdJTVD/2wBDAAUDBAQEAwUEBAQF' +
  'BQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/wAAL' +
  'CAACAAIBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAI' +
  'AQEAAD8AZb//2Q==',
  '/9j/4AAQSkZJRgABAQEASABIAAD//gATQ3JlYXRlZCB3aXRoIEdJTVD/2wBDAAUDBAQEAwUEBAQF' +
  'BQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/wAAL' +
  'CAACAAIBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAB//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAI' +
  'AQEAAD8Ac3//2Q==',
  '/9j/4AAQSkZJRgABAQEASABIAAD//gATQ3JlYXRlZCB3aXRoIEdJTVD/2wBDAAUDBAQEAwUEBAQF' +
  'BQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/wAAL' +
  'CAACAAIBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAABv/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAI' +
  'AQEAAD8AJP/Z',
  '/9j/4AAQSkZJRgABAQEASABIAAD//gATQ3JlYXRlZCB3aXRoIEdJTVD/2wBDAAUDBAQEAwUEBAQF' +
  'BQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/wAAL' +
  'CAACAAIBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAI' +
  'AQEAAD8AGT//2Q=='
];


var BASIS_DESC_ = [2, 2, 4];
var BASIS_IMAGES_ = [];
var w = BASIS_DESC_[0];
var h = BASIS_DESC_[1];


/**
 * Perform the loading of images.
 */
var setUp = function() {
  for (var i = 0; i < 4; i++) {
    BASIS_IMAGES_[i] = new Image();
    BASIS_IMAGES_[i].src = 'data:image/jpg;base64,' + IMAGE_SOURCES_[i];
  }
  document.body.appendChild(BASIS_IMAGES_[0]);
};


/**
 * Check that the data in the packed texture image agrees with the expectation.
 */
var assertImage = function(data, offset) {
  offset = offset || 0;

  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      assertEquals(data[4 * (y * w + x) + 0 + offset], 255);
      assertEquals(data[4 * (y * w + x) + 1 + offset], 200);
      assertEquals(data[4 * (y * w + x) + 2 + offset], 100);
      assertEquals(data[4 * (y * w + x) + 3 + offset], 0);
    }
  }
};


/**
 * Test initialization works from a single texture.
 */
var testInitFromTexturesSingle = function() {
  var renderer = new vis.renderer.BigTextureRenderer();
  renderer.initFromTextures([BASIS_DESC_], [BASIS_IMAGES_], function() { });
    
  assertEquals(1, renderer.offs_[0]);
  assertEquals(2, renderer.textures_[0].image.width);
  assertEquals(2, renderer.textures_[0].image.height);
  var data = renderer.textures_[0].image.data;
  assertEquals(w * h * 4, data.length);
  assertImage(data);
};


/**
 * Test the textures work with multiple channels.
 */
var testInitFromTexturesMultiple = function() {
  var renderer = new vis.renderer.BigTextureRenderer();
  renderer.initFromTextures([BASIS_DESC_, BASIS_DESC_],
      [BASIS_IMAGES_, BASIS_IMAGES_], function() { });
    
  for (var i = 0; i < 2; i++) {
    assertEquals(2, renderer.textures_[0].image.width);
    assertEquals(2, renderer.textures_[0].image.height);
    assertEquals(1, renderer.offs_[0]);
    var data = renderer.textures_[i].image.data;
    assertEquals(w * h * 4, data.length);
    assertImage(data);
  }
};


/**
 * Test that the images are properly stacked.
 */
var testInitFromTexturesStacked = function() {
  var basisDesc = goog.object.clone(BASIS_DESC_);
  basisDesc[2] *= 2;

  var images = goog.array.concat(BASIS_IMAGES_, BASIS_IMAGES_);

  var renderer = new vis.renderer.BigTextureRenderer();
  renderer.initFromTextures([basisDesc], [images], function() {});
  
  assertEquals(2, renderer.textures_[0].image.width);
  assertEquals(4, renderer.textures_[0].image.height);
  assertEquals(0.5, renderer.offs_[0]);

  var data = renderer.textures_[0].image.data;
  assertEquals(w * h * 4 * 2, data.length);
  assertImage(data);
  assertImage(data, w * h * 4);
};


