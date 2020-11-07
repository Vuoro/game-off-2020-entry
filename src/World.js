import { useEffect } from "react";

import Ground from "./Ground.js";
import { useCamera } from "./Camera.js";
import { useRenderer, useLoop } from "./WebGL.js";
import { pointOnCircle, normalizeInPlace } from "./helpers/maths.js";
import { hexesInRadius } from "./helpers/hexes.js";
import { useScroller } from "./helpers/useScroller.js";

const viewRadius = 24;
const cameraFocus = [0, 0, 0.618];
const cameraOffset = 10;
const cameraHeight = 15;
let cameraAngle = 0;

export const waterLevel = 0.5;
export const heightScale = 2;
export const tileBlendingThreshold = 0.4;

const World = () => {
  const { updateAllUniforms, setClear, clear } = useRenderer();
  const camera = useCamera();

  const handleCamera = () => {
    pointOnCircle(cameraOffset, cameraAngle, camera.position);
    camera.position[0] += cameraFocus[0];
    camera.position[1] += cameraFocus[1];
    camera.position[2] = cameraHeight + cameraFocus[2] * heightScale;
    camera.lookAt(cameraFocus);
    camera.up[0] = 0;
    camera.up[1] = 0;
    camera.up[2] = 1;
    camera.direction[2] += cameraOffset * 0.005;
    normalizeInPlace(camera.direction);
    camera.update();

    updateAllUniforms("projectionView", camera.projView);
    updateAllUniforms("cameraPosition", camera.position);
  };

  const handleScroll = ({ distanceChange }) => {
    cameraAngle -= (distanceChange / 500) % (Math.PI * 2);
    handleCamera();
  };
  useScroller(undefined, handleScroll, true);

  useEffect(() => {
    handleCamera();
    setClear([50 / 255, 32 / 255, 62 / 255, 1]);
    updateAllUniforms("light", [1, 0, -1]);
  });

  useLoop((timestamp, clock, frameNumber) => {
    updateAllUniforms("time", clock / 1000);
    clear();
  });

  return (
    <>
      <div style={{ height: "1000vmax" }} />

      {hexesInRadius(viewRadius).map((hex) => (
        <Ground key={hex} coordinates={hex} />
      ))}
    </>
  );
};
export default World;
