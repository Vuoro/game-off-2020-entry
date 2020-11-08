import { useRef, useEffect } from "react";

import { pointOnCircle, mix, normalize, rotate } from "./helpers/maths.js";
import { pixelToPointy } from "./helpers/hexes.js";
import { useCommand } from "./Command.js";
import { useLoop } from "./WebGL.js";
import { useCamera } from "./Camera.js";

const { PI } = Math;

const pointerStart = [0, 0];
const pointerDirection = [0, 0];
const pointerWorldDirection = [0, 0];
const cameraDirection = [1, 0];
let started = false;

const setPointerStart = (event) => {
  const { clientX, clientY } = event.touches ? event.changedTouches[0] : event;
  pointerStart[0] = clientX;
  pointerStart[1] = clientY;
};

const setPointerDirection = (event) => {
  const { clientX, clientY } = event.touches ? event.changedTouches[0] : event;
  pointerDirection[0] = clientX - pointerStart[0];
  pointerDirection[1] = clientY - pointerStart[1];
};

const Reticle = ({ cameraFocus, setLocation, location }) => {
  const Reticle = useCommand(drawReticle);
  const reticleRef = useRef();
  const origin = [...cameraFocus];
  const { direction } = useCamera();

  useLoop(() => {
    const update = reticleRef.current.updateAttribute;
    const location = reticleRef.current.attributes.location;

    cameraDirection[0] = direction[0];
    cameraDirection[1] = direction[1];
    normalize(cameraDirection, cameraDirection);

    rotate(
      pointerDirection,
      -Math.atan2(cameraDirection[1], cameraDirection[0]) + PI / 2,
      undefined,
      pointerWorldDirection
    );

    cameraFocus[0] += pointerWorldDirection[0] * 0.005;
    cameraFocus[1] -= pointerWorldDirection[1] * 0.005;
    mix(location, cameraFocus, 0.91, location);
    update("location");
  });

  const handleTopStart = (event) => {
    if (!event.touches) {
      setPointerStart(event);
      started = true;
    }
  };

  const handleBottomStart = (event) => {
    setPointerStart(event);
    started = true;
  };

  useEffect(() => {
    const handleMove = (event) => {
      if (started) {
        setPointerDirection(event);
      }
    };

    const handleStop = (event) => {
      if (started) {
        setPointerDirection(event);

        const [x, y] = pixelToPointy(cameraFocus[0], -cameraFocus[1]);
        if (x !== location[0] || y !== location[1]) {
          setLocation([x, y]);
        }

        pointerDirection[0] = 0;
        pointerDirection[1] = 0;
        started = false;
        cameraFocus[0] = origin[0];
        cameraFocus[1] = origin[1];
        cameraFocus[2] = origin[2];
      }
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleStop);
    document.addEventListener("touchmove", handleMove);
    document.addEventListener("touchend", handleStop);

    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleStop);
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("touchend", handleStop);
    };
  });

  return (
    <>
      <Reticle ref={reticleRef} location={[...cameraFocus]} />
      <button
        onMouseDown={handleTopStart}
        onTouchStart={handleTopStart}
        type="button"
        className="interaction top"
      ></button>
      <button
        onMouseDown={handleBottomStart}
        onTouchStart={handleBottomStart}
        type="button"
        className="interaction bottom"
      ></button>
    </>
  );
};

export default Reticle;

export const drawReticle = {
  attributes: {
    position: [
      [0, 0],
      ...[...Array(16)].map((v, index) =>
        pointOnCircle(0.618, (index / (16 - 1)) * PI * 2)
      ),
    ],
  },
  order: 10,
  mode: "TRIANGLE_FAN",
  // prettier-ignore
  vertex: (`
    precision highp float;
    attribute highp vec2 position;
    attribute highp vec3 location;
    uniform highp mat4 projectionView;
    uniform highp float time;
    uniform highp vec3 cameraPosition;

    #define PI 3.1415926535897932384626433832795
    #define TAU 6.28318530717958647693
    #define EPSILON 0.0001

    void main() {
      vec3 worldPosition = vec3(position, 0.0) + location;
      gl_Position = projectionView * vec4(worldPosition, 1.0);
    }
  `),
  // prettier-ignore
  fragment: (`
    #extension GL_OES_standard_derivatives : enable
    precision highp float;

    #define PI 3.1415926535897932384626433832795
    #define TAU 6.28318530717958647693
    #define EPSILON 0.000001

    void main() {
      gl_FragColor = vec4(1.0, 0.0, 0.0, 1);
    }
`),
};
