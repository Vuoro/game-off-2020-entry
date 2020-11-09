import { useState, useEffect, useCallback, useRef } from "react";
import SimplexNoise from "simplex-noise";

import Ground from "./Ground.js";
import Swiper from "./Swiper.js";
import { useCamera } from "./Camera.js";
import { useRenderer, useLoop } from "./WebGL.js";
import {
  pointOnCircle,
  normalizeInPlace,
  clamp,
  mix,
} from "./helpers/maths.js";
import { hexesInRadius, pointyToPixel } from "./helpers/hexes.js";
import { useScroller } from "./helpers/useScroller.js";

const { abs, PI } = Math;

export const viewRadius = 32;
export const cameraHeight = 382;
export const cameraOffset = cameraHeight * 1;
export const cameraTiltOffset = 0.01; // super magic number
export let cameraAngle = 0;

export const heightScale = 8;
export const tileBlendingThreshold = 0.146;

const World = () => {
  const { updateAllUniforms, setClear, clear } = useRenderer();

  const [location, setLocation] = useState([0, 0]);
  const tile = getTile(location[0], location[1]);

  const camera = useCamera();

  const cameraTarget = [
    tile.pixelCoordinates[0],
    tile.pixelCoordinates[1],
    tile.height * heightScale,
  ];
  const cameraFocus = useRef([...cameraTarget]).current;

  const handleCamera = useCallback(() => {
    pointOnCircle(cameraOffset, cameraAngle, camera.position);
    camera.position[0] += cameraFocus[0];
    camera.position[1] += cameraFocus[1];
    camera.position[2] = cameraHeight + cameraFocus[2];
    camera.lookAt(cameraFocus);
    camera.up[0] = 0;
    camera.up[1] = 0;
    camera.up[2] = 1;
    camera.direction[2] += cameraTiltOffset;
    normalizeInPlace(camera.direction);
    camera.update();

    updateAllUniforms("projectionView", camera.projView);
    updateAllUniforms("cameraPosition", camera.position);
  }, [camera, updateAllUniforms, cameraFocus]);

  useEffect(() => {
    window.addEventListener("resize", handleCamera);
    return () => window.removeEventListener("resize", handleCamera);
  }, [handleCamera]);

  const handleScroll = ({ distanceChange }) => {
    cameraAngle -= (distanceChange / 500) % (PI * 2);
  };
  useScroller(undefined, handleScroll, true);

  useEffect(() => {
    setClear([50 / 255, 32 / 255, 62 / 255, 1]);
    updateAllUniforms("light", [1, 0, -1]);
  });

  useLoop((timestamp, clock, frameNumber) => {
    mix(cameraFocus, cameraTarget, 0.1, cameraFocus);
    handleCamera();
    updateAllUniforms("time", clock / 1000);
    updateAllUniforms("cameraFocus", cameraFocus);
    clear();
  });

  return (
    <>
      <div style={{ height: "1000vmax", width: "1000vmax" }} />

      <Swiper tile={tile} setLocation={setLocation} heightScale={heightScale} />

      {hexesInRadius(viewRadius, tile.coordinates).map((hex) => (
        <Ground key={hex.join(",")} x={hex[0]} y={hex[1]} />
      ))}
    </>
  );
};
export default World;

const tileCache = new Map();
export const getTile = (x, y) => {
  const id = `${x},${y}`;

  const cached = tileCache.get(id);
  if (cached) {
    return cached;
  }

  const coordinates = [x, y];
  const pixelCoordinates = pointyToPixel(coordinates);

  let height = noise(pixelCoordinates);

  const flooded =
    1 - abs(noise(coordinates, 0.005, 1) * 2 - 1) >
    0.98 - noise(coordinates, 0.056, 1) * 0.09;

  if (flooded) {
    height = clamp(height - tileBlendingThreshold * 2, 0, 1);
  }

  return {
    coordinates,
    pixelCoordinates,
    height,
    flooded,
  };
};

// https://cmaher.github.io/posts/working-with-simplex-noise/
const noiseGenerator = new SimplexNoise("POHOJOLA");
export const noise = (
  coordinates,
  frequency = 0.01,
  iterations = 8,
  persistence = 0.618,
  amplitude = 0.764,
  frequencyMultiplier = 1.333
) => {
  let noise = 0;
  let maxAmplitude = 0;

  for (let index = 0; index < iterations; index++) {
    noise += noiseGenerator.noise2D(
      coordinates[0] * frequency,
      coordinates[1] * frequency
    );
    maxAmplitude += amplitude;
    amplitude *= persistence;
    frequency *= frequencyMultiplier;
  }

  return clamp((noise / maxAmplitude) * 0.5 + 0.5, 0, 1);
};
