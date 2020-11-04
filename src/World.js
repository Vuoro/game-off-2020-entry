import { useEffect } from "react";

import Ground from "./Ground.js";
import { useCamera } from "./Camera.js";
import { useRenderer, useLoop } from "./WebGL.js";
import { pointOnCircle } from "./helpers/maths.js";
import { hexesInRadius } from "./helpers/hexes.js";

const cameraFocus = [0, 0, 0.618];
const cameraDistance = 15;
const cameraHeight = 35;
const cameraAngle = 0;

const World = () => {
  const { updateAllUniforms, setClear, clear } = useRenderer();
  const camera = useCamera();
  setClear([50 / 255, 32 / 255, 62 / 255, 1]);

  useEffect(() => {
    updateAllUniforms("light", [1, 0, -1]);
  });

  useLoop((timestamp, clock, frameNumber) => {
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

    updateAllUniforms("time", clock / 1000);
    updateAllUniforms("projectionView", camera.projView);
    updateAllUniforms("cameraPosition", camera.position);
    clear();
  });

  return (
    <>
      <h1>POHOJOLA</h1>
      {hexesInRadius(16).map((hex) => (
        <Ground coordinates={hex} />
      ))}
    </>
  );
};
export default World;
