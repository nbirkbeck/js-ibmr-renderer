varying vec2 vUv;
uniform sampler2D textureY;
uniform sampler2D textureU;
uniform sampler2D textureV;
uniform float coeffY[64];
uniform float coeffU[64];
uniform float coeffV[64];
uniform mat4 colorMatrix;
uniform float offsY;
uniform float offsU;
uniform float offsV;
uniform int numBasisY;
uniform int numBasisU;
uniform int numBasisV;

#define scale(i) (2.0 * i - vec4(1.0, 1.0, 1.0, 1.0))
#define maxtex 64

void main() {
  float y = 0.0, u = 0.0, v = 0.0;
  vec2 tc = vUv;
  tc.y *= offsY;

  for (int i = 0; i < maxtex / 4; i++) {
    vec4 tex = scale(texture2D(textureY, tc));
    y += dot(vec4(coeffY[0 + 4 * i], coeffY[1 + 4 * i],  
		  coeffY[2 + 4 * i], coeffY[3 + 4 * i]), tex);
    tc.y += offsY;
    if (i >= numBasisY / 4) {
      break;
    }
  }

  tc = vUv;
  tc.y *= offsU;

  for (int i = 0; i < maxtex / 4; i++) {
    vec4 tex = scale(texture2D(textureU, tc));
    u += dot(vec4(coeffU[0 + 4 * i], coeffU[1 + 4 * i ], 
		  coeffU[2 + 4 * i], coeffU[3 + 4 * i]), tex);
    tc.y += offsU;
    if (i >= numBasisU / 4) {
      break;
    }
  }

  tc = vUv;
  tc.y *= offsV;

  for (int i = 0; i < maxtex / 4; i++) {
    vec4 tex = scale(texture2D(textureV, tc));
    v += dot(vec4(coeffV[0 + 4 * i], coeffV[1 + 4 * i ], 
		  coeffV[2 + 4 * i], coeffV[3 + 4 * i]), tex);
    tc.y += offsV;
    if (i >= numBasisV / 4) {
      break;
    }
  }

  vec4 rgb = colorMatrix * vec4(y, u, v, 0.0);
  gl_FragColor = vec4(rgb.x, rgb.y, rgb.z, 1.0);
}
