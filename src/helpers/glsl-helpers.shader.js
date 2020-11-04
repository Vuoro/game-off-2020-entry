export const screenSpaceAdjuster = ((window.innerHeight * window.devicePixelRatio) / 2000).toFixed(
  8
);

export const round = `
  float round(float value) { return floor(value + 0.5); }
  vec2 round(vec2 value) { return floor(value + 0.5); }
  vec3 round(vec3 value) { return floor(value + 0.5); }
  vec4 round(vec4 value) { return floor(value + 0.5); }
`;

export const dot2 = `
  float dot2( in vec3 v ) { return dot(v,v); } 
  float dot2( in vec2 v ) { return dot(v,v); }
`;

export const readTexel = `
  highp vec4 readTexel(float index, sampler2D texture, float size) {
    return texture2D(texture, vec2(
      mod(index, size) / (size - 1.0), 
      floor(index / size) / size
    ));
  }

  highp vec4 readTexel(vec2 coordinates, sampler2D texture, float size) {
    return texture2D(texture, vec2(
      mod(coordinates.x, size) / (size - 1.0), 
      mod(coordinates.y, size) / size
    ));
  }
`;

export const fStep = `
  float fStep(float compValue, float gradient) {
    float change = fwidth(gradient) * ${0.5 * screenSpaceAdjuster};
    float lowerEdge = compValue - change;
    float upperEdge = compValue + change;
    float stepped = (gradient - lowerEdge) / (upperEdge - lowerEdge);
    return clamp(stepped, 0.0, 1.0);
  }
`;

export const fEdge = `
  float fEdge(float compValue, float gradient) {
    return max(
      0.0, 
      fStep(compValue, gradient) * fStep(1.0 - compValue, 1.0 - gradient)
    );
  }
`;

export const fX = `
  float fX(float value) {
    return dFdx(value) * ${screenSpaceAdjuster};
  }  
`;

export const fY = `
  float fY(float value) {
    return dFdy(value) * ${screenSpaceAdjuster};
  }  
`;
