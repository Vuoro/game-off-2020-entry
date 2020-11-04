import { rotateArray, normalizeInPlace } from "./maths.js";
const { floor, ceil, round, sqrt, abs, sign } = Math;

const origo = [0, 0];

export const flatSize = sqrt(3);
export const pointySize = 2;
export const flatDistance = flatSize;
export const pointyDistance = 1.5;

// Commonly used coordinate systems: cube and axial
export const cubeToAxial = (cube, out = []) => {
  out[0] = cube[0];
  out[1] = cube[2];
  return out;
};
export const axialToCube = (hex, out = []) => {
  let x = hex[0];
  let z = hex[1];
  let y = -x - z;
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
};

// tile = odd-r/odd-q offset coordinate system
export const axialToPointyTile = ([q, r], out = []) => {
  const x = q + (r - (r & 1)) / 2;
  const y = r;
  out[0] = x;
  out[1] = y;
  return out;
};
export const pointyTileToAxial = ([tileX, tileY], out = []) => {
  const x = tileX - (tileY - (tileY & 1)) / 2;
  const z = tileY;
  out[0] = x;
  out[1] = z;
  return out;
};
export const axialToFlatTile = ([q, r], out = []) => {
  const x = q;
  const y = r + (q - (q & 1)) / 2;
  out[0] = x;
  out[1] = y;
  return out;
};
export const flatTileToAxial = ([tileX, tileY], out = []) => {
  const x = tileX;
  const z = tileY - (tileX - (tileX & 1)) / 2;
  out[0] = x;
  out[1] = z;
  return out;
};

// Pixel conversions (multiply results with hex size)
export const pointyToPixel = ([q, r], out = []) => {
  out[0] = flatSize * q + (flatSize / 2) * r;
  out[1] = pointyDistance * r;
  return out;
};
export const pixelToPointy = (x, y, size = 1, out = []) => {
  out[0] = ((flatSize / 3) * x - (1 / 3) * -y) / size;
  out[1] = ((2 / 3) * -y) / size;
  return cubeToAxial(roundCube(axialToCube(out, out), out), out);
};
export const flatToPixel = ([q, r], out = []) => {
  const x = (3 / 2) * q;
  const y = (sqrt(3) / 2) * q + sqrt(3) * r;
  out[0] = x;
  out[1] = y;
  return out;
};
export const pixelToFlat = (x, y, size = 1, out = []) => {
  out[0] = ((2 / 3) * x) / size;
  out[1] = ((-1 / 3) * x + (sqrt(3) / 3) * y) / size;
  return cubeToAxial(roundCube(axialToCube(out, out), out), out);
};

export const pointyAngles = [330, 30, 90, 150, 210, 270];

export const pointyDirections = {
  NW: [0, -1],
  NE: [1, -1],
  E: [1, 0],
  SE: [0, 1],
  SW: [-1, 1],
  W: [-1, 0],
};
export const pointyDirectionNames = {
  "0,-1": "NW",
  "1,-1": "NE",
  "1,0": "E",
  "0,1": "SE",
  "-1,1": "SW",
  "-1,0": "W",
};

export const flatAngles = [0, 60, 120, 180, 240, 300];
export const flatDirections = {
  N: [0, -1],
  NE: [1, -1],
  SE: [1, 0],
  S: [0, 1],
  SW: [-1, 1],
  NW: [-1, 0],
};
export const flatDirectionNames = {
  "0,-1": "N",
  "1,-1": "NE",
  "1,0": "SE",
  "0,1": "S",
  "-1,1": "SW",
  "-1,0": "NW",
};

export const hexDirections = Object.values(pointyDirections);
export const hexDirectionsEast = [
  hexDirections[1],
  hexDirections[2],
  hexDirections[3],
];
export const hexDirectionsWest = [
  hexDirections[0],
  hexDirections[4],
  hexDirections[5],
];
export const getNeighborHexes = ([x, y]) =>
  hexDirections.map(([dx, dy]) => [x + dx, y + dy]);
export const neighborInDirection = ([x, y], direction) => [
  x + direction[0],
  y + direction[1],
];

export const roundCube = ([x, y, z], out = []) => {
  let rx = round(x);
  let ry = round(y);
  let rz = round(z);

  const x_diff = abs(rx - x);
  const y_diff = abs(ry - y);
  const z_diff = abs(rz - z);

  if (x_diff > y_diff && x_diff > z_diff) {
    rx = -ry - rz;
  } else if (y_diff > z_diff) {
    ry = -rx - rz;
  } else {
    rz = -rx - ry;
  }

  out[0] = rx;
  out[1] = ry;
  out[2] = rz;
  return out;
};

export const roundHex = (hex, out = []) =>
  cubeToAxial(roundCube(axialToCube(hex, out), out), out);

export const distanceBetween = ([fromX, fromY], [toX, toY] = [0, 0]) => {
  const x = toX - fromX;
  const y = toY - fromY;
  return sqrt(Math.pow(x, 2) + Math.pow(y, 2) + x * y);
};

export const hexesInRadius = (radius = 1, from = origo, out = []) => {
  const [fromX, fromY, fromZ] = axialToCube(from);

  for (let x = -radius; x <= radius; x++) {
    for (
      let y = Math.max(-radius, -x - radius);
      y <= Math.min(radius, -x + radius);
      y++
    ) {
      let z = -x - y;
      const hex = [x + fromX, y + fromY, z + fromZ];
      out.push(cubeToAxial(hex, hex));
    }
  }
  return out;
};

export const sortHexesByDistance = (hexes, from = origo) => {
  const distances = new Map();
  for (const hex of hexes) {
    distances.set(hex, distanceBetween(from, hex));
  }
  hexes.sort((a, b) => distances.get(a) > distances.get(b));

  return hexes;
};

export const flatHexesInRectangle = (
  from = origo,
  width = 2,
  height = width
) => {
  const rectangle = [];

  for (let y = ceil(-height / 2); y < ceil(height / 2); y++) {
    for (let x = ceil(-width / 2); x < ceil(width / 2); x++) {
      const hex = flatTileToAxial([x, y]);
      hex[0] += from[0];
      hex[1] += from[1];
      rectangle.push(hex);
    }
  }

  return rectangle;
};

export const pointyHexesInRectangle = (
  from = origo,
  width = 2,
  height = width
) => {
  const rectangle = [];

  for (let y = ceil(-height / 2); y < ceil(height / 2); y++) {
    for (let x = ceil(-width / 2); x < ceil(width / 2); x++) {
      const hex = pointyTileToAxial([x, y]);
      hex[0] += from[0];
      hex[1] += from[1];
      rectangle.push(hex);
    }
  }

  return rectangle;
};

export const directionBetween = (from, to, out = []) => {
  out[0] = to[0] - from[0];
  out[1] = to[1] - from[1];
  normalizeInPlace(out);

  if (abs(round(out[0])) === 1 && abs(round(out[1])) === 1) {
    if (out[0] === out[1]) {
      out[0] = 0;
      out[1] = 1 * sign(round(out[1]));
      return out;
    }

    if (out[0] < out[1]) {
      out[0] = floor(out[0]);
      out[1] = ceil(out[1]);
      return out;
    } else {
      out[0] = ceil(out[0]);
      out[1] = floor(out[1]);
      return out;
    }
  }

  out[0] = round(out[0]);
  out[1] = round(out[1]);

  return out;
};

export const pointyAngleBetween = (from, to) => {
  const direction = directionBetween(from, to);
  const directionIndex = Object.keys(pointyDirectionNames).indexOf(
    direction.join()
  );
  return pointyAngles[directionIndex];
};

export const flatAngleBetween = (from, to) => {
  const direction = directionBetween(from, to);
  const directionIndex = Object.keys(flatDirectionNames).indexOf(
    direction.join()
  );
  return flatAngles[directionIndex];
};

export const rotate = (hex, times, out = []) => {
  const cube = axialToCube(hex);
  let [x, y, z] = cube;

  for (
    let time = 0;
    times < 0 ? time > times : time < times;
    time += Math.sign(times)
  ) {
    let x2, y2, z2;

    if (times > 0) {
      x2 = -z;
      y2 = -x;
      z2 = -y;
    } else {
      x2 = -y;
      y2 = -z;
      z2 = -x;
    }

    x = x2;
    y = y2;
    z = z2;
  }

  out[0] = x;
  out[1] = y;
  out[2] = z;

  return cubeToAxial(out, out);
};

export const sortFlatCoordinates = (a, b) =>
  a[1] === b[1] ? (a[0] > b[0] ? -1 : 1) : a[1] > b[1] ? -1 : 1;
export const sortPointyCoordinates = (a, b) =>
  a[1] === b[1] ? (a[0] < b[0] ? -1 : 1) : a[1] > b[1] ? -1 : 1;

// from/to inverted as a hack to make the 0th location appear at the top
export const locationsOnPath = ([to, from], pathRadius) => {
  const distance = distanceBetween(from.center, to.center);
  const forwardDirection = directionBetween(from.center, to.center);

  const forwardIndex = Object.keys(pointyDirectionNames).indexOf(
    forwardDirection.join()
  );

  const leftIndex = forwardIndex === 0 ? 5 : forwardIndex - 1;
  const rightIndex = forwardIndex === 5 ? 0 : forwardIndex + 1;
  const leftDirection = Object.values(pointyDirections)[leftIndex];
  const rightDirection = Object.values(pointyDirections)[rightIndex];

  const locations = [];

  for (let forward = -pathRadius; forward <= distance + pathRadius; forward++) {
    const middle = [
      from.center[0] + forward * forwardDirection[0],
      from.center[1] + forward * forwardDirection[1],
    ];
    locations.push(middle);

    for (
      let left = 1;
      left <= pathRadius - Math.max(0, forward - distance);
      left++
    ) {
      locations.push([
        middle[0] + left * leftDirection[0],
        middle[1] + left * leftDirection[1],
      ]);
    }

    for (
      let right = 1;
      right <= pathRadius - Math.max(0, forward - distance);
      right++
    ) {
      locations.push([
        middle[0] + right * rightDirection[0],
        middle[1] + right * rightDirection[1],
      ]);
    }
  }

  return locations;
};

export const pathsAroundRegions = (regions, regionMap) => {
  return regions
    .flatMap(({ coordinates }) =>
      getNeighborHexes(coordinates).map((neighborCoordinates) => {
        const neighbor =
          regionMap[`${neighborCoordinates[0]},${neighborCoordinates[1]}`];

        return neighbor
          ? [coordinates, neighborCoordinates]
              .sort(sortFlatCoordinates)
              .join(";")
          : null;
      })
    )
    .filter((path, index, list) => path && list.indexOf(path) === index)
    .map((path) =>
      path.split(";").map((id) => {
        const coordinates = id.split(",");
        coordinates[0] = +coordinates[0];
        coordinates[1] = +coordinates[1];
        return coordinates;
      })
    );
};

export const regionToStaggeredCenter = (
  [x = 0, y = 0] = origo,
  r = 1,
  out = []
) => {
  out[0] = x * 2 * r + x + r * y;
  out[1] = y * -2 * r - y - x + -r * x;
  return out;
};

// https://observablehq.com/@sanderevers/hexagon-tiling-of-an-hexagonal-grid
export const hexToStaggeredRegion = (
  axialCoordinates = origo,
  regionRadius = 1,
  out = []
) => {
  const area = 3 * Math.pow(regionRadius, 2) + 3 * regionRadius + 1;
  const shift = 3 * regionRadius + 2;

  const [x, y, z] = axialToCube(axialCoordinates, out);

  const xh = Math.floor((y + shift * x) / area),
    yh = Math.floor((z + shift * y) / area),
    zh = Math.floor((x + shift * z) / area);
  const i = Math.floor((1 + xh - yh) / 3),
    // j = Math.floor((1 + yh - zh) / 3),
    k = Math.floor((1 + zh - xh) / 3);

  // [xh, yh, zh] may be useful for something

  // I don't know why this matches the results of regionToStaggeredCenter,
  // but it does
  out[0] = i;
  out[1] = -k - i;
  return out;
};

export const hexesInRing = (from = origo, radius = 2) => {
  const [fromX, fromY, fromZ] = axialToCube(from);
  const found = new Set();

  for (let x = -radius; x <= radius; x++) {
    for (
      let y = Math.max(-radius, -x - radius);
      y <= Math.min(radius, -x + radius);
      y++
    ) {
      let z = -x - y;

      if (
        Math.abs(x) === radius ||
        Math.abs(y) === radius ||
        Math.abs(z) === radius
      ) {
        found.add(cubeToAxial([x + fromX, y + fromY, z + fromZ]));
      }
    }
  }

  // Order the hexes by walking them
  const size = found.size;
  const walked = new Set();
  let walkingOn = found.values().next().value;
  walked.add(walkingOn);
  found.delete(walkingOn);

  const walkHex = (hex) => {
    if (distanceBetween(walkingOn, hex) === 1) {
      walkingOn = hex;
      walked.add(hex);
      found.delete(hex);
    }
  };

  while (walked.size < size) {
    found.forEach(walkHex);
  }

  return [...walked];
};

export const hexWalls = (radius) => {
  const results = [];

  hexesInRing(undefined, radius).forEach((hex, index, hexes) => {
    const neighbors = hexesInRing(hex, 1);
    const rotated = rotateArray(
      neighbors,
      round(
        ((index + round(hexes.length / 2)) / hexes.length) * neighbors.length
      )
    );
    // const neighbors = hexesInRing(hex, 1);
    rotated.forEach((neighbor) => {
      if (distanceBetween(origo, neighbor) > radius) {
        results.push([hex, neighbor]);
      }
    });
  });

  return results;
};
