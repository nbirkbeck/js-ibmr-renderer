/**
 * @fileoverview Testing of the reader.
 */

goog.require('goog.testing.DeferredTestCase');
goog.require('goog.testing.jsunit');
goog.require('vis.PcaMesh');

var BLACK_IMAGE = atob('/9j/4AAQSkZJRgABAQEASABIAAD//gATQ3JlYXRlZCB3aXRoIEdJTVD/2wBDAAUDBAQEAwUEBAQF' +
  'BQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/wAAL' +
  'CAACAAIBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAI' +
  'AQEAAD8AGT//2Q==');


var asyncTestCase = null;

/**
 * Test setting of the lookup table.
 */
var testSetLookupTable = function() {
  var basisDesc = [
    [32, 32, 12],
    [32, 32, 12],
    [32, 32, 12]
  ];
  var w = 16;
  var h = 2;
  var lutDesc = [[w, h], [w, h], [w, h]];
  var numBasis = 4;
  var pcaMesh = new vis.PcaMesh(0, basisDesc, lutDesc);
  var data = new Int8Array(16 * 2 * numBasis);
  for (var basis = 0; basis < numBasis; basis++) {
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        data[basis * w * h + y * w + x] = basis * w * h + (y * w + x) - 128;
      }
    }
  }
  for (var channel = 0; channel < 3; channel++) {
    for (var basisIndex = 0; basisIndex < 12; basisIndex += 4) {
      var numBasisCheck = 4;
      var start = basisIndex;
      if (basisIndex == 0) {
        pcaMesh.setLookupTable(channel, basisIndex, 3, data);
        for (var i = 0; i < w * h; i++) {
          assertEquals(1, pcaMesh.lut_[channel][0][i]);
        }
        numBasisCheck = 3;
        start = basisIndex + 1;
      } else {
        pcaMesh.setLookupTable(channel, basisIndex - 1, numBasis, data);
      }
      var j = 0;
      for (var basis = start; basis < basisIndex + numBasisCheck; basis++, j++) {
        for (var y = 0; y < h; y++) {
          for (var x = 0; x < w; x++) {
            assertEquals((data[j * w * h + y * w + x]) / 128.0,
                pcaMesh.lut_[channel][basis][y * w + x]);
          }
        }
      }
    }
  }
  asyncTestCase.continueTesting();
};


/**
 * Test setting of the lookup table blobs.
 */
var testSetLookupTableBlobs = function() {
  var basisDesc = [
     [32, 32, 12],
     [32, 32, 12],
     [32, 32, 12]
  ];
  var w = 2;
  var h = 2;
  var lutDesc = [[w, h], [w, h], [w, h]];
  var arrayBuffer = new ArrayBuffer(BLACK_IMAGE.length);
  var view = new Uint8Array(arrayBuffer);
  for (var i = 0; i < BLACK_IMAGE.length; i++) {
    view[i] = BLACK_IMAGE.charCodeAt(i);
  }
  var blob = new Blob([arrayBuffer], {'type': 'image/jpeg'});
  var pcaMesh = new vis.PcaMesh(0, basisDesc, lutDesc);
  pcaMesh.setLookupTableBlobs(0, 0, [blob]);

  setTimeout(function() {
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        assertEquals(-1, pcaMesh.lut_[0][1][y * w + x]);
      }
    }
    asyncTestCase.continueTesting();
  }, 900);

  asyncTestCase.waitForAsync('Lut render.');
};


/**
 * Test setting of the lookup table coefficients.
 */
var testSetLutCoeffs = function() {
  var basisDesc = [
    [32, 32, 4],
    [32, 32, 4],
    [32, 32, 4]
  ];
  var w = 16;
  var h = 2;
  var lutDesc = [[w, h], [w, h], [w, h]];
  var numBasis = 4;
  var pcaMesh = new vis.PcaMesh(0, basisDesc, lutDesc);
  var data = new Int8Array(w * 2 * numBasis);

  for (var basis = 0; basis < numBasis; basis++) {
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        data[basis * w * h + y * w + x] = x * 16 - 128;
      }
    }
  }

  pcaMesh.lutRangeMin_[1] = 1.;
  pcaMesh.lutRangeMax_[1] = 359.0;

  pcaMesh.setLookupTable(0, 0, 3, data);
  pcaMesh.setLookupTable(1, 0, 3, data);
  pcaMesh.setLookupTable(2, 0, 3, data);

  pcaMesh.mesh.rotation.y = 1 * Math.PI / 180.0 - Math.PI;
  pcaMesh.setLutCoeffs();

  for (var channel = 0; channel < 3; channel++) {
    assertEquals(1, pcaMesh.coeff[channel][0]);
    assertEquals(-1, pcaMesh.coeff[channel][1]);
  }

  pcaMesh.mesh.rotation.y = 359.0 * Math.PI / 180.0 - Math.PI;
  pcaMesh.setLutCoeffs();

  for (var channel = 0; channel < 3; channel++) {
    assertEquals(1, pcaMesh.coeff[channel][0]);
    assertEquals(0.875, pcaMesh.coeff[channel][1]);
  }

  pcaMesh.mesh.rotation.y = 192.0 * Math.PI / 180.0 - Math.PI;
  pcaMesh.setLutCoeffs();

  for (var channel = 0; channel < 3; channel++) {
    assertEquals(1, pcaMesh.coeff[channel][0]);
    assertTrue(Math.abs(pcaMesh.coeff[channel][1]) < 1e-2);
  }
};
