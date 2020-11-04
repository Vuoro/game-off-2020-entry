import WebGL from "./WebGL.js";
import { Camera } from "./Camera.js";
import World from "./World.js";

const fov = 60;

const App = () => {
  return (
    <WebGL className="canvas">
      <Camera fov={(fov * Math.PI) / 180} far={1000} near={0.5}>
        <World />
      </Camera>
    </WebGL>
  );
};

export default App;
