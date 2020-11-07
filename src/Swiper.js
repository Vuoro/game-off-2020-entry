import { pointOnCircle } from "./helpers/maths.js";
import { useCommand } from "./Command.js";

const { PI } = Math;

const Reticle = ({ x = 0, y = 0, z = 0 }) => {
  const Reticle = useCommand(drawReticle);
  return <Reticle location={[x, y, z]} />;
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
  depth: null,
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
