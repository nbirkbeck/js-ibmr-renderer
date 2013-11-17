varying vec2 vUv;
uniform sampler2D textureY0;
uniform sampler2D textureY1;
uniform sampler2D textureY2;
uniform sampler2D textureY3;
uniform sampler2D textureU0;
uniform sampler2D textureU1;
uniform sampler2D textureU2;
uniform sampler2D textureU3;
uniform sampler2D textureV0;
uniform sampler2D textureV1;
uniform sampler2D textureV2;
uniform sampler2D textureV3;
uniform float coeffY[16];
uniform float coeffU[16];
uniform float coeffV[16];
uniform mat4 colorMatrix;

#define scale(i) vec4(2.0 * (i.x - 0.5), 2.0 * (i.y - 0.5), 2.0 * (i.z - 0.5), 2.0 * (i.w - 0.5));

void main() {
  vec4 tex0 = scale(texture2D(textureY0, vUv));
  vec4 tex1 = scale(texture2D(textureY1, vUv));
  vec4 tex2 = scale(texture2D(textureY2, vUv));
  vec4 tex3 = scale(texture2D(textureY3, vUv));

  float y = dot(vec4(coeffY[0], coeffY[1], coeffY[2], coeffY[3]), tex0) + 
     dot(vec4(coeffY[4], coeffY[5], coeffY[6], coeffY[7]), tex1) + 
     dot(vec4(coeffY[8], coeffY[9], coeffY[10], coeffY[11]), tex2) +
     dot(vec4(coeffY[12], coeffY[13], coeffY[14], coeffY[15]), tex3);

  tex0 = scale(texture2D(textureU0, vUv));
  tex1 = scale(texture2D(textureU1, vUv));
  tex2 = scale(texture2D(textureU2, vUv));
  tex3 = scale(texture2D(textureU3, vUv));

  float u = dot(vec4(coeffU[0], coeffU[1], coeffU[2], coeffU[3]), tex0) + 
     dot(vec4(coeffU[4], coeffU[5], coeffU[6], coeffU[7]), tex1) + 
     dot(vec4(coeffU[8], coeffU[9], coeffU[10], coeffU[11]), tex2) +
     dot(vec4(coeffU[12], coeffU[13], coeffU[14], coeffU[15]), tex3);

  tex0 = scale(texture2D(textureV0, vUv));
  tex1 = scale(texture2D(textureV1, vUv));
  tex2 = scale(texture2D(textureV2, vUv));
  tex3 = scale(texture2D(textureV3, vUv));
  float v = dot(vec4(coeffV[0], coeffV[1], coeffV[2], coeffV[3]), tex0) + 
     dot(vec4(coeffV[4], coeffV[5], coeffV[6], coeffV[7]), tex1) + 
     dot(vec4(coeffV[8], coeffV[9], coeffV[10], coeffV[11]), tex2) +
     dot(vec4(coeffV[12], coeffV[13], coeffV[14], coeffV[15]), tex3);

  vec4 rgb = colorMatrix * vec4(y, u, v, 0.0);
  gl_FragColor = vec4(rgb.x, rgb.y, rgb.z, 1.0);
}
