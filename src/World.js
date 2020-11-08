import { useState, useEffect, useCallback } from "react";
import SimplexNoise from "simplex-noise";

import Ground from "./Ground.js";
import Swiper from "./Swiper.js";
import { useCamera } from "./Camera.js";
import { useRenderer, useLoop } from "./WebGL.js";
import { pointOnCircle, normalizeInPlace, clamp } from "./helpers/maths.js";
import { hexesInRadius, pointyToPixel } from "./helpers/hexes.js";
import { useScroller } from "./helpers/useScroller.js";

const { abs, PI } = Math;

const viewRadius = 8;
const cameraFocus = [0, 0, 0];
const cameraOffset = 10;
const cameraHeight = 15;
let cameraAngle = 0;

export const waterLevel = 0.5;
export const heightScale = 10;
export const tileBlendingThreshold = 0.4;

const World = () => {
  const [location, setLocation] = useState([0, 0]);
  const tile = getTile(location[0], location[1]);
  cameraFocus[0] = tile.pixelCoordinates[0];
  cameraFocus[1] = tile.pixelCoordinates[0];
  cameraFocus[2] = tile.height * heightScale;

  const { updateAllUniforms, setClear, clear } = useRenderer();
  const camera = useCamera();

  const handleCamera = useCallback(() => {
    pointOnCircle(cameraOffset, cameraAngle, camera.position);
    camera.position[0] += cameraFocus[0];
    camera.position[1] += cameraFocus[1];
    camera.position[2] = cameraHeight + cameraFocus[2];
    camera.lookAt(cameraFocus);
    camera.up[0] = 0;
    camera.up[1] = 0;
    camera.up[2] = 1;
    camera.direction[2] += cameraOffset * 0.004;
    normalizeInPlace(camera.direction);
    camera.update();

    updateAllUniforms("projectionView", camera.projView);
    updateAllUniforms("cameraPosition", camera.position);
  }, [camera, updateAllUniforms]);

  useEffect(() => {
    handleCamera();
    window.addEventListener("resize", handleCamera);
    return () => window.removeEventListener("resize", handleCamera);
  }, [handleCamera]);

  const handleScroll = ({ distanceChange }) => {
    cameraAngle -= (distanceChange / 500) % (PI * 2);
    handleCamera();
  };
  useScroller(undefined, handleScroll, true);

  useEffect(() => {
    setClear([50 / 255, 32 / 255, 62 / 255, 1]);
    updateAllUniforms("light", [1, 0, -1]);
  });

  useLoop((timestamp, clock, frameNumber) => {
    updateAllUniforms("time", clock / 1000);
    updateAllUniforms("cameraFocus", cameraFocus);
    clear();
  });

  return (
    <>
      <div style={{ height: "1000vmax", width: "1000vmax" }} />

      <Swiper x={cameraFocus[0]} y={cameraFocus[1]} z={cameraFocus[2]} />

      {hexesInRadius(viewRadius).map((hex) => (
        <Ground key={hex} x={hex[0]} y={hex[1]} />
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

  const flooded = 1 - abs(noise(pixelCoordinates) * 2 - 1) > 0.854;
  if (flooded) {
    height -= tileBlendingThreshold;
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
  iterations = 3,
  persistence = 0.618,
  amplitude = 0.764,
  frequency = 0.021,
  frequencyMultiplier = 2
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
