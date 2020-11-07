import { useEffect } from "react";

import Ground from "./Ground.js";
import { useCamera } from "./Camera.js";
import { useRenderer, useLoop } from "./WebGL.js";
import { pointOnCircle } from "./helpers/maths.js";
import { hexesInRadius } from "./helpers/hexes.js";
import { useScroller } from "./helpers/useScroller.js";

const cameraFocus = [0, 0, 0.618];
const cameraDistance = 15;
const cameraHeight = 35;
let cameraAngle = 0;

const World = () => {
  const { updateAllUniforms, setClear, clear } = useRenderer();
  const camera = useCamera();

  const handleCamera = () => {
    pointOnCircle(cameraDistance, cameraAngle, camera.position);
    camera.position[0] += cameraFocus[0];
    camera.position[1] += cameraFocus[1];
    camera.position[2] = cameraHeight + cameraFocus[2];
    camera.lookAt(cameraFocus);
    camera.up[0] = 0;
    camera.up[1] = 0;
    camera.up[2] = 1;
    //   camera.direction[2] += cameraShift;
    //   normalizeInPlace(camera.direction);
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

      {hexesInRadius(16).map((hex) => (
        <Ground key={hex} coordinates={hex} />
      ))}
    </>
  );
};
export default World;
