import { memo } from "react";
import { rotate2d } from "./helpers/glsl-transforms.shader.js";
import conditionals from "./helpers/glsl-conditionals.shader.js";
import { round, fStep, fEdge, fX, fY } from "./helpers/glsl-helpers.shader.js";
import {
  pointOnCircle,
  length,
  mix,
  add,
  subtract,
  normalizeInPlace,
} from "./helpers/maths.js";
import { simplexNoise2d } from "./helpers/glsl-noise.shader.js";
import { useCommand } from "./Command.js";
import { hexDirections } from "./helpers/hexes.js";
import { heightScale, tileBlendingThreshold, getTile } from "./World.js";

const { max, min, abs } = Math;

const Ground = memo(({ x, y }) => {
  const { coordinates, pixelCoordinates, height, flooded } = getTile(x, y);
  const finalCoordinates = [
    pixelCoordinates[0],
    pixelCoordinates[1],
    height * heightScale,
  ];
  const Ground = useCommand(drawGround);

  const shadingVector = [0, 0, 0];
  const edges1 = [0, 0, 0];
  const edges2 = [0, 0, 0];

  for (let index = 0; index < 6; index++) {
    const {
      height: neighborHeight,
      pixelCoordinates,
      flooded: neighborFlooded,
    } = getTile(
      coordinates[0] + hexDirections[index % 6][0],
      coordinates[1] + hexDirections[index % 6][1]
    );

    const { height: nextNeighborHeight } = getTile(
      coordinates[0] + hexDirections[(index + 1) % 6][0],
      coordinates[1] + hexDirections[(index + 1) % 6][1]
    );

    const smallestHeight = min(height, neighborHeight, nextNeighborHeight);
    const largestHeight = max(height, neighborHeight, nextNeighborHeight);

    let dontBlend =
      neighborFlooded !== flooded ||
      (!flooded && abs(largestHeight - smallestHeight) > tileBlendingThreshold);

    const finalHeight = neighborHeight * heightScale;

    const shadingCoordinates = [
      pixelCoordinates[0],
      pixelCoordinates[1],
      finalHeight,
    ];
    subtract(finalCoordinates, shadingCoordinates, shadingCoordinates);
    add(shadingVector, shadingCoordinates, shadingVector);

    const edgeIndex = 5 - ((index + 1) % 6);
    const edges = edgeIndex > 2 ? edges2 : edges1;
    const finalIndex = edgeIndex > 2 ? edgeIndex - 3 : edgeIndex;
    edges[finalIndex] = (dontBlend ? -1 : 1) * finalHeight;
  }

  const shadingStrength = length(shadingVector);
  normalizeInPlace(shadingVector);
  shadingVector[3] = shadingStrength / 7;

  return (
    <Ground
      coordinates={finalCoordinates}
      shadingVector={shadingVector}
      edges1={edges1}
      edges2={edges2}
      flooded={flooded}
    />
  );
});

export default Ground;

const position = [];
const edgeIndex = [];
const shouldDropDown = [];
const isExtension = [];

const center = { position: [0, 0], edgeIndex: [-1, -2] };
const corners = [0, 1, 2, 3, 4, 5].map((index) => ({
  position: pointOnCircle(1, -(index / 6) * Math.PI * 2 + 0.5 * Math.PI),
  edgeIndex: [index % 6, (index + 1) % 6],
}));
const addVertex = (corner, extension = false, should = false) => {
  position.push(corner.position);
  edgeIndex.push(corner.edgeIndex);
  shouldDropDown.push(+should);
  isExtension.push(+extension);
};

corners.forEach((corner, index, corners) => {
  const nextCorner = corners[(index + 1) % 6];
  const midpoint = {
    position: mix(corner.position, nextCorner.position, 0.5),
    edgeIndex: [corner.edgeIndex[1], corner.edgeIndex[1]],
  };

  addVertex(corner);
  addVertex(center);
  addVertex(midpoint);

  addVertex(midpoint);
  addVertex(center);
  addVertex(nextCorner);
});

// Square extensions for each corner
for (let index = 0; index < corners.length; index++) {
  const corner = corners[index];
  const nextCorner = corners[(index + 1) % 6];
  const midpoint = {
    position: mix(corner.position, nextCorner.position, 0.5),
    edgeIndex: [corner.edgeIndex[1], corner.edgeIndex[1]],
  };

  addVertex(corner, true, true);
  addVertex(corner, true);
  addVertex(midpoint, true);
  addVertex(corner, true, true);
  addVertex(midpoint, true);
  addVertex(midpoint, true, true);

  addVertex(midpoint, true, true);
  addVertex(midpoint, true);
  addVertex(nextCorner, true);
  addVertex(midpoint, true, true);
  addVertex(nextCorner, true);
  addVertex(nextCorner, true, true);
}

export const drawGround = {
  attributes: {
    position,
    edgeIndex,
    shouldDropDownFloat: shouldDropDown,
    isExtensionFloat: isExtension,
  },
  sortBy: (a, b) => b.attributes.coordinates[2] - a.attributes.coordinates[2],
  order: 0,
  // prettier-ignore
  vertex: (`
    precision highp float;
    attribute highp vec2 position;
    attribute highp vec3 coordinates;
    attribute highp vec4 shadingVector;
    attribute highp vec3 edges1;
    attribute highp vec3 edges2;
    attribute highp vec2 edgeIndex;
    attribute highp float shouldDropDownFloat;
    attribute highp float isExtensionFloat;
    attribute highp float flooded;
    uniform highp mat4 projectionView;
    uniform highp vec3 cameraPosition;
    uniform highp vec3 cameraFocus;
    uniform highp float time;
    uniform highp vec3 light;
    varying highp vec3 uv;
    varying highp vec3 edgeUv;
    varying highp vec4 lightEffects;
    varying highp float isExtensionFloatOut;
    varying highp float isFloodedFloatOut;

    #define PI 3.1415926535897932384626433832795
    #define TAU 6.28318530717958647693
    #define EPSILON 0.0001

    ${rotate2d + round + simplexNoise2d}

    void main() {
      // Edges
      bool isCenter = edgeIndex[0] == -1.0;
      bool isMidpoint = edgeIndex[0] == edgeIndex[1];
      bool isExtension = isExtensionFloat == 1.0;
      isExtensionFloatOut = isExtensionFloat;
      bool shouldDropDown = shouldDropDownFloat == 1.0;
      isFloodedFloatOut = flooded;

      float previousEdge = (
          edgeIndex[0] == 0.0 ? edges1[0] 
        : edgeIndex[0] == 1.0 ? edges1[1] 
        : edgeIndex[0] == 2.0 ? edges1[2] 
        : edgeIndex[0] == 3.0 ? edges2[0] 
        : edgeIndex[0] == 4.0 ? edges2[1] 
        : edgeIndex[0] == 5.0 ? edges2[2] 
        : 0.0
      );
      float nextEdge = (
          edgeIndex[1] == 0.0 ? edges1[0] 
        : edgeIndex[1] == 1.0 ? edges1[1] 
        : edgeIndex[1] == 2.0 ? edges1[2] 
        : edgeIndex[1] == 3.0 ? edges2[0] 
        : edgeIndex[1] == 4.0 ? edges2[1] 
        : edgeIndex[1] == 5.0 ? edges2[2] 
        : 0.0
      );

      bool dontBlendWithPrevious = previousEdge < 0.0;
      bool dontBlendWithNext = nextEdge < 0.0;
      previousEdge = abs(previousEdge);
      nextEdge = abs(nextEdge);
      
      // Height blending
      float ownHeight = coordinates.z;

      float smallestHeight = isCenter ? ownHeight : min(min(ownHeight, previousEdge), nextEdge);

      float heightDifferenceToPrevious = ownHeight - previousEdge;
      float heightDifferenceToNext = ownHeight - nextEdge;
      
      bool blendWithPrevious = !isMidpoint && !dontBlendWithPrevious;
      bool blendWithNext = !dontBlendWithNext;
      bool blendWithBoth = blendWithNext && blendWithPrevious;
      bool blendWithSomething = blendWithNext || blendWithPrevious;
      
      float blendHeight = ownHeight;
      blendHeight += blendWithPrevious 
        ? previousEdge 
        : blendWithSomething 
          ? 0.0 
          : ownHeight;
      blendHeight += blendWithNext 
        ? nextEdge 
        : blendWithSomething 
          ? 0.0 
          : ownHeight;
      blendHeight *= (blendWithSomething && !blendWithBoth) ? 0.5 : 0.333333333;
      
      float height = shouldDropDown /*&& !blendWithBoth*/ ? smallestHeight : blendHeight;
      height = isCenter ? ownHeight : height;

      // Positioning
      vec3 worldPosition = vec3(coordinates.xy + position.xy, height);

      float bevel = isCenter || shouldDropDown || blendWithSomething ? 0.0 : clamp(
        max((height - previousEdge), (height - nextEdge)) 
          * 0.09,
        0.0,
        0.618
      );
      worldPosition.xy -= position.xy * bevel;

      float heightDifference = worldPosition.z - ownHeight;
      
      // Texture coordinates
      vec3 localPosition = worldPosition - coordinates.xyz + EPSILON;
      float elevation = worldPosition.z;
      
      uv.xy = worldPosition.xy;
      uv.z = elevation;

      uv.xy = isExtension 
        ? vec2(
          coordinates.x * 3.0 + coordinates.y * 7.0 
          + dot(normalize(position), vec2(0.0, 1.0)), 
          worldPosition.z
        ) * vec2(1.0, 0.021)
        : uv.xy;
      
      uv.xy *= 5.0;
      uv.xy += time * flooded;
      
      // Outline effects
      edgeUv.xy = sign(rotate2d(PI * 0.25) * position * (isExtension ? 0.0 : 1.0));
      edgeUv.z = !blendWithPrevious && !blendWithNext ? 1.0 : 0.0;
      
      // Light
      const vec3 up = vec3(0.0, 0.0, 1.0);
      const vec3 down = vec3(0.0, 0.0, -1.0);

      vec3 forward = normalize(vec3(localPosition.xy, 0.0));
      vec3 towardsPrevious = vec3(rotate2d(-PI * (isMidpoint ? 0.0 : 0.33333333)) * forward.xy, forward.z);
      vec3 towardsNext = vec3(rotate2d(PI * (isMidpoint ? 0.0 : 0.33333333)) * forward.xy, forward.z);
      vec3 normal = (isExtension) ? forward : up;

      float previousShading = blendWithPrevious || isMidpoint ? 0.0 : max(0.0, -heightDifferenceToPrevious);
      float nextShading = blendWithNext ? 0.0 : max(0.0, -heightDifferenceToNext);
      
      vec3 shading = -towardsPrevious * previousShading;
      shading += -towardsNext * nextShading;
      normal += shading * 2.0;
      normal += down * (shouldDropDown ? 1.0 : 0.0);
      normal += down * (previousShading + nextShading) * 0.5;
      normal -= forward * heightDifference;
      
      float tileShading = max(0.0, dot(light, shadingVector.xyz)) * shadingVector.w;
      normal += down * tileShading;
      
      normal = normalize(normal);
      float lightEffect = dot(light, normal);

      // Camera effects
      vec3 cameraToTile = normalize(worldPosition - cameraPosition);
      vec3 focusToTile = normalize(worldPosition - cameraFocus);
      float gradientDirection = dot(cameraToTile, focusToTile);

      // Clouds
      vec2 cloudOffset = vec2(-time * 0.013, 0.0);
      float cloudNoise = simplexNoise2d(worldPosition.xy * 0.015 + cloudOffset) 
        * simplexNoise2d(worldPosition.xy * 0.013 + cloudOffset);

      lightEffects[0] = lightEffect;
      lightEffects[1] = max(0.0, cloudNoise);
      lightEffects[2] = max(0.0,
        length(worldPosition - cameraFocus) * 0.02
        * gradientDirection
      );
      lightEffects[3] = (worldPosition.z - cameraFocus.z) * 0.056;

      gl_Position = projectionView * vec4(worldPosition, 1.0);
    }
  `),
  // prettier-ignore
  fragment: (`
    #extension GL_OES_standard_derivatives : enable
    precision highp float;
    varying highp vec3 uv;
    varying highp vec3 edgeUv;
    varying highp vec4 lightEffects;
    varying highp float isExtensionFloatOut;
    varying highp float isFloodedFloatOut;

    #define PI 3.1415926535897932384626433832795
    #define TAU 6.28318530717958647693
    #define EPSILON 0.000001

    ${rotate2d + conditionals + simplexNoise2d + round + fStep + fEdge + fX + fY}

    void main() {
      float isExtension = isExtensionFloatOut;
      float notExtension = 1.0 - isExtension;
      float isFlooded = isFloodedFloatOut;

      float outlineEffect = max(abs(edgeUv.x), abs(edgeUv.y));

      float lightEffect = lightEffects[0];
      float cloudShadow = lightEffects[1];
      float distance = lightEffects[2];
      float elevation = lightEffects[3];

      float noise = simplexNoise2d(uv.xy);
      
      float noiseLightEffect = 0.021 + isExtension * 0.09;
      float light = -lightEffect + noise * noiseLightEffect;
      float shadow = lightEffect - noise * noiseLightEffect;
      float cloudEffect = cloudShadow * (1.0 - noise * 0.0015);

      light = clamp(light * 0.5 + 0.5, 0.0, 1.0);
      shadow = clamp(max(cloudEffect, shadow * 0.5 + 0.5), 0.0, 1.0);
      
      const vec3 lightColor = vec3(234.0/255.0, 232.0/255.0, 220.0/255.0);
      const vec3 shadowColor = vec3(50.0/255.0, 32.0/255.0, 62.0/255.0);
      const vec3 rockColor = vec3(129.0/255.0, 152.0/255.0, 199.0/255.0);
      const vec3 waterColor = vec3(97.0/255.0, 158.0/255.0, 194.0/255.0);
      vec3 color = mix(lightColor, rockColor, isExtension);
      color = mix(color, waterColor, isFlooded);
      
      // Elevation gradients
      color = mix(color, lightColor, max(0.0, elevation));
      color = mix(color, shadowColor, max(0.0, -elevation));

      // Light
      const float shadowVolumeThreshold = 0.5;
      float shadowVolume = fStep(shadowVolumeThreshold, shadow);
      color = mix(color, color * shadowColor, (0.236 + shadow * 0.5) * shadowVolume);
      
      // Texture
      vec3 textureColor = mix(shadowColor, lightColor, isFlooded);
      float posture = clamp(dot(vec2(fX(noise), fY(noise)), vec2(0.0, -1.0)) * 5.0, 0.0, 1.0);
      color = mix(color, textureColor, fEdge(0.5, noise) * posture * notExtension);
      
      color = mix(color, shadowColor, 0.056 * isExtension * max(0.0, round(noise)));
      color = mix(color, shadowColor, 0.09 * isExtension * max(0.0, round(-noise)));

      // Outline
      float outlineness = fStep(0.9787101863, outlineEffect) * fStep(0.056, edgeUv.z);
      outlineness += fEdge(shadowVolumeThreshold, shadow) * 0.618;
      outlineness += fEdge(0.5, abs(noise)) * isExtension * 0.618;
      outlineness = clamp(outlineness, 0.0, 1.0);
      color = mix(color, shadowColor, outlineness);
      
      // Fog gradients
      color = mix(color, lightColor, max(0.0, distance) * max(0.0, distance));

      gl_FragColor = vec4(color, 1);
    }
`),
};
