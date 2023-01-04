import { HexGrid, Layout, Hexagon, Text } from "react-hexgrid";
import { useCallback, useEffect, useRef, useState } from "react";
import cn from "classnames";

const App = () => {
  const [grid, setGrid] = useState([]);
  const [arrHexagonsWithValues, setArrHexagonsWithValues] = useState([]);
  const selectRef = useRef(null);
  const [levelState, setLevelState] = useState(2);
  const [gameStatus, setGameStatus] = useState("Select radius");

  const getGameStatus = useCallback((arr) => {
    const arrComparedValues = arr.map((hex1) => {
      const neighboursHexes = arr.filter((hex2) => {
        if (hex1.x === hex2.x && hex1.y === hex2.y && hex1.z === hex2.z) {
          return false;
        }

        return (
          (hex1.x === hex2.x - 1 ||
            hex1.x === hex2.x + 1 ||
            hex1.x === hex2.x) &&
          (hex1.y === hex2.y - 1 ||
            hex1.y === hex2.y + 1 ||
            hex1.y === hex2.y) &&
          (hex1.z === hex2.z - 1 || hex1.z === hex2.z + 1 || hex1.z === hex2.z)
        );
      });

      return neighboursHexes.some((hex3) => hex1.value === hex3.value);
    });

    if (arrComparedValues.every((isTrue) => !isTrue)) {
      setGameStatus("game-over");
    }
  }, []);

  const genGrids = useCallback((gridSize) => {
    const hexes = [];

    for (let i = -gridSize; i <= gridSize; i++) {
      for (let j = -gridSize; j <= gridSize; j++) {
        if (i - j < gridSize + 1 && i - j > -(gridSize + 1)) {
          hexes.push({ x: i, y: -j, z: -i + j, value: 0 });
        }
      }
    }

    return hexes;
  }, []);

  const fetchHex = useCallback(
    async (fetchArr) => {
      const isSameHexesArr = arrHexagonsWithValues.map((hex) => {
        return fetchArr.some(
          (hex2) =>
            hex.x === hex2.x && hex.y === hex2.y && hex.value === hex2.value
        );
      });

      if (isSameHexesArr.every((isTrue) => isTrue)) {
        return;
      }

      const response = await fetch(`${selectRef.current.value}/${levelState}`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json;charset=utf-8",
        },

        body: JSON.stringify(fetchArr),
      });

      const result = await response.json();
      const newArrHexagonsWithValues = [...fetchArr, ...result];
      setArrHexagonsWithValues(newArrHexagonsWithValues);

      if (grid.length === newArrHexagonsWithValues.length) {
        getGameStatus(newArrHexagonsWithValues);
      }
    },
    [arrHexagonsWithValues, getGameStatus, grid.length, levelState]
  );

  const calcCoordinate = useCallback(
    (constCoordinate, key) => {
      const maxNumCoordinate = levelState - 1;
      let maxCoordinate =
        constCoordinate <= 0
          ? maxNumCoordinate
          : maxNumCoordinate - constCoordinate;
      let minCoordinate =
        constCoordinate >= 0
          ? -maxNumCoordinate
          : -maxNumCoordinate - constCoordinate;

      if (key === "w" || key === "e" || key === "d") {
        return maxCoordinate;
      }

      if (key === "s" || key === "q" || key === "a") {
        return minCoordinate;
      }
    },
    [levelState]
  );

  const actionX = useCallback(
    (key) => {
      // Sort by y coordinate
      const sortArr = arrHexagonsWithValues.sort((a, b) => {
        if (key === "w") {
          return a.y < b.y ? 1 : -1;
        }

        return a.y > b.y ? 1 : -1;
      });

      // Move all hexagons to maximum coordinate
      const arrCalcsCoordinates = sortArr.map((hex) => {
        let x = hex.x;
        let y = calcCoordinate(x, key);
        return {
          ...hex,
          y: y,
          z: -x - y,
          oldX: hex.x,
          oldY: hex.y,
          oldZ: hex.z,
        };
      });

      // Array of identical hexagons by coordinates: [[...], [...], [...]]
      const arraysSameCoordinates = arrCalcsCoordinates.reduce((acc, hex) => {
        if (acc.length === 0) {
          acc.push([hex]);
          return acc;
        }

        for (let i = 0; i < acc.length; i++) {
          if (hex.x === acc[i][0].x && hex.y === acc[i][0].y) {
            acc[i].push(hex);
            return acc;
          }
        }

        acc.push([hex]);
        return acc;
      }, []);

      //Calculation of values ​​and offset of hexagons in the opposite direction
      const arrCalcsValuesHexes = arraysSameCoordinates.map((arrHexes) => {
        if (arrHexes.length === 1) {
          return arrHexes[0];
        }

        const skipHex = [];
        const result = [];

        arrHexes.forEach((hex, index) => {
          //Skip hex by current index
          if (skipHex.some((el) => el === index)) {
            return;
          }

          let y;

          if (result.length > 0) {
            y =
              key === "w"
                ? result[result.length - 1].y - 1
                : result[result.length - 1].y + 1;
          }

          if (index === arrHexes.length - 1) {
            result.push({ ...hex, y: y, z: -hex.x - y });
            return;
          }

          if (hex.value === arrHexes[index + 1].value) {
            skipHex.push(index + 1);

            if (result.length > 0) {
              result.push({
                ...hex,
                y: y,
                z: -hex.x - y,
                value: hex.value + arrHexes[index + 1].value,
              });
              return;
            }

            result.push({
              ...hex,
              value: hex.value + arrHexes[index + 1].value,
            });
            return;
          }

          if (index === 0) {
            result.push(hex);
            return;
          }

          result.push({ ...hex, y: y, z: -hex.x - y });
        });

        return result;
      });

      fetchHex(arrCalcsValuesHexes.flat());
    },
    [arrHexagonsWithValues, fetchHex, calcCoordinate]
  );

  const actionY = useCallback(
    (key) => {
      const sortArr = arrHexagonsWithValues.sort((a, b) => {
        if (key === "e") {
          return a.x < b.x ? 1 : -1;
        }

        return a.x > b.x ? 1 : -1;
      });

      const arrCalcsCoordinates = sortArr.map((hex) => {
        let y = hex.y;
        let x = calcCoordinate(y, key);
        return {
          ...hex,
          x: x,
          z: -x - y,
          oldX: hex.x,
          oldY: hex.y,
          oldZ: hex.z,
        };
      });

      const arraysSameCoordinates = arrCalcsCoordinates.reduce((acc, hex) => {
        if (acc.length === 0) {
          acc.push([hex]);
          return acc;
        }

        for (let i = 0; i < acc.length; i++) {
          if (hex.x === acc[i][0].x && hex.y === acc[i][0].y) {
            acc[i].push(hex);
            return acc;
          }
        }

        acc.push([hex]);
        return acc;
      }, []);

      const arrCalcsValuesHexes = arraysSameCoordinates.map((arrHexes) => {
        if (arrHexes.length === 1) {
          return arrHexes[0];
        }

        const skipHex = [];
        const result = [];

        arrHexes.forEach((hex, index) => {
          if (skipHex.some((el) => el === index)) {
            return;
          }

          let x;

          if (result.length > 0) {
            x =
              key === "e"
                ? result[result.length - 1].x - 1
                : result[result.length - 1].x + 1;
          }

          if (index === arrHexes.length - 1) {
            result.push({ ...hex, x: x, z: -hex.y - x });
            return;
          }

          if (hex.value === arrHexes[index + 1].value) {
            skipHex.push(index + 1);

            if (result.length > 0) {
              result.push({
                ...hex,
                x: x,
                z: -hex.y - x,
                value: hex.value + arrHexes[index + 1].value,
              });
              return;
            }

            result.push({
              ...hex,
              value: hex.value + arrHexes[index + 1].value,
            });
            return;
          }

          if (index === 0) {
            result.push(hex);
            return;
          }

          result.push({ ...hex, x: x, z: -hex.y - x });
        });

        return result;
      });

      fetchHex(arrCalcsValuesHexes.flat());
    },
    [arrHexagonsWithValues, fetchHex, calcCoordinate]
  );

  const actionZ = useCallback(
    (key) => {
      const sortArr = arrHexagonsWithValues.sort((a, b) => {
        if (key === "d") {
          return a.x < b.x ? 1 : -1;
        }

        return a.x > b.x ? 1 : -1;
      });

      const arrCalcsCoordinates = sortArr.map((hex) => {
        let z = hex.z;
        let x = calcCoordinate(z, key);
        return {
          ...hex,
          x: x,
          y: -x - z,
          oldX: hex.x,
          oldY: hex.y,
          oldZ: hex.z,
        };
      });

      const arraysSameCoordinates = arrCalcsCoordinates.reduce((acc, hex) => {
        if (acc.length === 0) {
          acc.push([hex]);
          return acc;
        }

        for (let i = 0; i < acc.length; i++) {
          if (hex.x === acc[i][0].x && hex.y === acc[i][0].y) {
            acc[i].push(hex);
            return acc;
          }
        }

        acc.push([hex]);
        return acc;
      }, []);

      const arrCalcsValuesHexes = arraysSameCoordinates.map((arrHexes) => {
        if (arrHexes.length === 1) {
          return arrHexes[0];
        }

        const skipHex = [];
        const result = [];

        arrHexes.forEach((hex, index) => {
          if (skipHex.some((el) => el === index)) {
            return;
          }

          let x;

          if (result.length > 0) {
            x =
              key === "d"
                ? result[result.length - 1].x - 1
                : result[result.length - 1].x + 1;
          }

          if (index === arrHexes.length - 1) {
            result.push({ ...hex, x: x, y: -hex.z - x });
            return;
          }

          if (hex.value === arrHexes[index + 1].value) {
            skipHex.push(index + 1);

            if (result.length > 0) {
              result.push({
                ...hex,
                x: x,
                y: -hex.z - x,
                value: hex.value + arrHexes[index + 1].value,
              });
              return;
            }

            result.push({
              ...hex,
              value: hex.value + arrHexes[index + 1].value,
            });
            return;
          }

          if (index === 0) {
            result.push(hex);
            return;
          }

          result.push({ ...hex, x: x, y: -hex.z - x });
        });

        return result;
      });

      fetchHex(arrCalcsValuesHexes.flat());
    },
    [arrHexagonsWithValues, fetchHex, calcCoordinate]
  );

  const handleClick = useCallback(
    (event) => {
      if (event.key === "q" || event.key === "d") {
        actionZ(event.key);
        return;
      }

      if (event.key === "w" || event.key === "s") {
        actionX(event.key);
        return;
      }

      if (event.key === "e" || event.key === "a") {
        actionY(event.key);
        return;
      }
    },
    [actionX, actionY, actionZ]
  );

  useEffect(() => {
    document.addEventListener("keypress", handleClick);
    return () => document.removeEventListener("keypress", handleClick);
  }, [handleClick]);

  const changeLevel = useCallback(
    async (event) => {
      const level = event.target.innerText;
      setLevelState(level);
      setGameStatus("playing");
      setGrid(genGrids(Number(level) - 1));

      const response = await fetch(`${selectRef.current.value}/${level}`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json;charset=utf-8",
        },

        body: JSON.stringify([]),
      });

      const result = await response.json();
      setArrHexagonsWithValues(result);
    },
    [genGrids]
  );

  return (
    <div className="app">
      <div className="controls">
        <div>RNG-server url</div>

        <select id="url-server" ref={selectRef}>
          <option id="remote" value="https://hex2048-lambda.octa.wtf/2">
            Remote server
          </option>
          <option id="localhost" value="http://localhost:13337">
            Local server
          </option>
        </select>

        <div className="buttons">
          Select radius:
          <button className="button" onClick={changeLevel} type="button">
            2
          </button>
          <button className="button" onClick={changeLevel} type="button">
            3
          </button>
          <button className="button" onClick={changeLevel} type="button">
            4
          </button>
        </div>
      </div>

      <div className="status__text">
        Game Status: <span data-status={gameStatus}>{gameStatus}</span>
      </div>
      {gameStatus === "playing" && (
        <div className="rules__text">Use q, w, e, a, s, d keys for move</div>
      )}

      <div className="field">
        <div className="hexgrid">
          <HexGrid width={800} height={800}>
            <Layout size={{ x: 7, y: 7 }} flat={true} origin={{ x: 0, y: 0 }}>
              {grid.map((cell) => {
                const includes = arrHexagonsWithValues.find((hex) => {
                  return (
                    hex.x === cell.x && hex.y === cell.y && hex.z === cell.z
                  );
                });

                if (!includes) {
                  return (
                    <Hexagon
                      className="hex__empty"
                      q={cell.x}
                      r={cell.z}
                      s={cell.y}
                    >
                      <g
                        data-x={cell.x}
                        data-y={cell.y}
                        data-z={cell.z}
                        data-value="0"
                      />
                    </Hexagon>
                  );
                }

                return (
                  <Hexagon
                    className="hex__empty"
                    q={cell.x}
                    r={cell.z}
                    s={cell.y}
                  />
                );
              })}
            </Layout>
          </HexGrid>
        </div>

        <div className="hexgrid__values">
          <HexGrid width={800} height={800}>
            <Layout size={{ x: 7, y: 7 }} flat={true} origin={{ x: 0, y: 0 }}>
              {arrHexagonsWithValues.map((cell) => (
                <Hexagon
                  className={cn({
                    "color-1": cell.value === 2,
                    "color-2": cell.value === 4,
                    "color-3": cell.value === 8,
                    "color-4": cell.value === 16,
                    "color-5": cell.value === 32,
                    "color-6": cell.value === 64,
                    "color-7": cell.value === 128,
                    "color-8": cell.value === 256,
                    "color-9": cell.value === 512,
                    "color-10": cell.value === 1024,
                    "color-11": cell.value === 2048,
                  })}
                  q={cell.x}
                  r={cell.z}
                  s={cell.y}
                >
                  <g
                    data-x={cell.x}
                    data-y={cell.y}
                    data-z={cell.z}
                    data-value={cell.value}
                  >
                    <Text
                      className={cn({
                        "color-text-1": cell.value === 2 || cell.value === 4,
                        "color-text-2": cell.value !== 2 && cell.value !== 4,
                      })}
                    >
                      {cell.value}
                    </Text>
                  </g>
                </Hexagon>
              ))}
            </Layout>
          </HexGrid>
        </div>
      </div>
    </div>
  );
};
export default App;
