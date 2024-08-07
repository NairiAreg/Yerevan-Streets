import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Box,
  Button,
  Text,
  VStack,
  HStack,
  useToast,
  Switch,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  RadioGroup,
  Radio,
} from "@chakra-ui/react";
import {
  MapContainer,
  Marker,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "leaflet-geometryutil";
import streets from "./yerevan_streets.json";
import easy from "./easy.json";
import xcho from "./xcho.json";
import alik from "./alik.json";
import irenchik from "./irenchik.json";
import LevelSelection from "./LevelSelection";
import GameModeSelection from "./GameModeSelection";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function calculateDistanceToStreet(map, point, streetPath) {
  let minDistance = Infinity;
  for (let i = 0; i < streetPath.length - 1; i++) {
    const start = L.latLng(streetPath[i]);
    const end = L.latLng(streetPath[i + 1]);
    const distance = L.GeometryUtil.distanceSegment(map, point, start, end);
    if (distance < minDistance) {
      minDistance = distance;
    }
  }
  return minDistance;
}

const MapEvents = ({ onMapClick, isToastActive }) => {
  const map = useMap();
  useMapEvents({
    click(e) {
      if (!isToastActive) {
        onMapClick(e.latlng, map);
      }
    },
  });
  return null;
};

const YerevanStreetGame = () => {
  const [currentStreet, setCurrentStreet] = useState(null);
  const [score, setScore] = useState(0);
  const [marker, setMarker] = useState(null);
  const [showStreetNames, setShowStreetNames] = useState(false);
  const [streetColors, setStreetColors] = useState({});
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [selectedMode, setSelectedMode] = useState(null);
  const [streetCount, setStreetCount] = useState(10);
  const [remainingStreets, setRemainingStreets] = useState([]);
  const [gameStats, setGameStats] = useState(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isToastActive, setIsToastActive] = useState(false);
  const [showCorrectStreet, setShowCorrectStreet] = useState(false);
  const [uniqueStreetCount, setUniqueStreetCount] = useState(0);
  const [options, setOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState("");

  const toast = useToast();
  const mapRef = useRef(null);

  const filteredStreets = useMemo(() => {
    let streetList = streets;
    if (selectedLevel === "easy") {
      streetList = streets.filter(({ name }) =>
        easy.map((e) => e.toLowerCase()).includes(name.toLowerCase())
      );
    } else if (selectedLevel === "xcho") {
      streetList = streets.filter(({ name }) =>
        xcho.map((e) => e.toLowerCase()).includes(name.toLowerCase())
      );
    } else if (selectedLevel === "irenchik") {
      streetList = streets.filter(({ name }) =>
        irenchik.map((e) => e.toLowerCase()).includes(name.toLowerCase())
      );
    } else if (selectedLevel === "alik") {
      streetList = streets.filter(({ name }) =>
        alik.map((e) => e.toLowerCase()).includes(name.toLowerCase())
      );
    }

    const filteredList = streetList
      .filter(
        ({ name }) =>
          (name.toLowerCase().includes("street") ||
            name.toLowerCase().includes("highway") ||
            name.toLowerCase().includes("square") ||
            name.toLowerCase().includes("avenue")) &&
          !name.toLowerCase().includes("th ") &&
          !name.toLowerCase().includes("nd ")
      )
      .map((street, index) => ({
        ...street,
        uniqueId: `${street.name}-${index}`,
      }));

    // Calculate unique street count
    const uniqueNames = new Set(
      filteredList.map((street) => street.name.toLowerCase())
    );
    setUniqueStreetCount(uniqueNames.size);

    return filteredList;
  }, [selectedLevel]);

  useEffect(() => {
    if (selectedLevel && selectedMode) {
      initializeGame();
    }
  }, [selectedLevel, selectedMode, streetCount]);

  const initializeGame = () => {
    setScore(0);
    setGameStats(null);
    setIsGameOver(false);
    resetStreetColors();
    if (selectedMode === "multiple choice") {
      selectNewStreetMultipleChoice(filteredStreets);
    } else if (selectedMode === "endless") {
      selectNewStreet(filteredStreets);
    } else if (selectedMode === "challenge") {
      const shuffled = [...filteredStreets].sort(() => 0.5 - Math.random());
      const uniqueShuffled = Array.from(
        new Set(shuffled.map((s) => s.name))
      ).map((name) => shuffled.find((s) => s.name === name));
      const selectedStreets = uniqueShuffled.slice(0, streetCount);
      setRemainingStreets(selectedStreets);
      setUniqueStreetCount(selectedStreets.length);
      selectNewStreet(selectedStreets);
    } else if (selectedMode === "elimination") {
      const uniqueStreets = Array.from(
        new Set(filteredStreets.map((s) => s.name))
      ).map((name) => filteredStreets.find((s) => s.name === name));
      setRemainingStreets(uniqueStreets);
      setUniqueStreetCount(uniqueStreets.length);
      selectNewStreet(uniqueStreets);
    }
  };
  const selectNewStreetMultipleChoice = (streetList) => {
    if (streetList.length === 0) {
      endGame();
      return;
    }
    const correctStreet =
      streetList[Math.floor(Math.random() * streetList.length)];
    setCurrentStreet(correctStreet);
    setStreetColor(correctStreet.name, "green");

    // Generate 3 random incorrect options
    const incorrectOptions = streetList
      .filter((street) => street.name !== correctStreet.name)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3)
      .map((street) => street.name);

    // Combine correct and incorrect options, then shuffle
    const allOptions = [correctStreet.name, ...incorrectOptions].sort(
      () => 0.5 - Math.random()
    );
    setOptions(allOptions);
    setSelectedOption("");
  };

  const handleOptionSelect = (value) => {
    setSelectedOption(value);
  };

  const handleSubmitAnswer = () => {
    if (!selectedOption) return;

    const isCorrect = selectedOption === currentStreet.name;

    if (isCorrect) {
      setScore(score + 1);
      toast({
        title: "Correct!",
        description: `You found ${currentStreet.name}!`,
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    } else {
      toast({
        title: "Incorrect",
        description: `The correct street is ${currentStreet.name}.`,
        status: "error",
        duration: 2000,
        isClosable: true,
      });
    }

    // Reset street color and select a new street
    setStreetColor(currentStreet.name, "blue");
    selectNewStreetMultipleChoice(filteredStreets);
  };

  const selectNewStreet = (streetList) => {
    if (streetList.length === 0) {
      endGame();
      return;
    }
    const randomStreet =
      streetList[Math.floor(Math.random() * streetList.length)];
    setCurrentStreet(randomStreet);
  };

  const handleMapClick = (latlng, map) => {
    if (isToastActive) return;

    setMarker(latlng);
    const clickedStreet = filteredStreets.reduce((closest, street) => {
      const distance = calculateDistanceToStreet(map, latlng, street.path);
      return distance < calculateDistanceToStreet(map, latlng, closest.path)
        ? street
        : closest;
    });

    const isCorrect = clickedStreet.name === currentStreet.name;

    setStreetColor(clickedStreet.name, isCorrect ? "green" : "red");

    if (!isCorrect && showCorrectStreet) {
      setStreetColor(currentStreet.name, "green");
    }

    setIsToastActive(true);

    if (isCorrect) {
      setScore(score + 1);
      toast({
        title: "Correct!",
        description: `You found ${currentStreet.name}!`,
        status: "success",
        duration: null,
        isClosable: true,
        onCloseComplete: () => {
          setIsToastActive(false);
          if (selectedMode === "elimination") {
            const updatedStreets = remainingStreets.filter(
              (street) => street.name !== currentStreet.name
            );
            setRemainingStreets(updatedStreets);
            setStreetColor(currentStreet.name, "gray");
            if (updatedStreets.length > 0) {
              selectNewStreet(updatedStreets);
            } else {
              endGame();
            }
          } else {
            setStreetColor(currentStreet.name, "blue");
            if (selectedMode === "challenge") {
              const updatedStreets = remainingStreets.filter(
                (street) => street.name !== currentStreet.name
              );
              setRemainingStreets(updatedStreets);
              if (updatedStreets.length > 0) {
                selectNewStreet(updatedStreets);
              } else {
                endGame();
              }
            } else {
              selectNewStreet(filteredStreets);
            }
          }
        },
      });
    } else {
      toast({
        title: "Incorrect",
        description: `That's ${clickedStreet.name}.${
          showCorrectStreet ? "The correct street is highlighted in green." : ""
        }`,
        status: "error",
        duration: null,
        isClosable: true,
        onCloseComplete: () => {
          setIsToastActive(false);
          setStreetColor(clickedStreet.name, "blue");
          if (selectedMode === "elimination") {
            setStreetColor(currentStreet.name, "blue");
          } else {
            setStreetColor(currentStreet.name, "blue");
            if (selectedMode === "challenge") {
              const updatedStreets = remainingStreets.filter(
                (street) => street.name !== currentStreet.name
              );
              setRemainingStreets(updatedStreets);
              if (updatedStreets.length > 0) {
                selectNewStreet(updatedStreets);
              } else {
                endGame();
              }
            } else {
              selectNewStreet(filteredStreets);
            }
          }
        },
      });
    }
  };

  const resetStreetColors = () => {
    setStreetColors({});
  };

  const setStreetColor = (streetName, color) => {
    setStreetColors((prevColors) => ({
      ...prevColors,
      [streetName]: color,
    }));
  };

  const endGame = () => {
    const totalStreets =
      selectedMode === "challenge" ? streetCount : uniqueStreetCount;
    const percentCorrect = (score / totalStreets) * 100;
    setGameStats({
      totalStreets,
      correctGuesses: score,
      percentCorrect: percentCorrect.toFixed(2),
    });
    setIsGameOver(true);
  };

  const MapTileLayer = () => {
    const map = useMap();

    useEffect(() => {
      map.eachLayer((layer) => {
        if (layer instanceof L.TileLayer) {
          map.removeLayer(layer);
        }
      });

      L.tileLayer(
        showStreetNames
          ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
          : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attribution">CARTO</a>',
        }
      ).addTo(map);
    }, [showStreetNames, map]);

    return null;
  };

  if (!selectedLevel) {
    return (
      <LevelSelection
        onSelectLevel={setSelectedLevel}
        selectedLevel={selectedLevel}
      />
    );
  }

  if (!selectedMode) {
    return (
      <GameModeSelection
        onSelectMode={setSelectedMode}
        onSelectStreetCount={setStreetCount}
      />
    );
  }

  return (
    <VStack spacing={4} width="100%" height="100vh" p={4}>
      <Text fontSize="2xl">
        Yerevan Street Game - {selectedLevel.toUpperCase()} Level -{" "}
        {selectedMode.toUpperCase()} Mode
      </Text>
      {selectedMode === "multiple choice" ? (
        <>
          <Text>Score: {score}</Text>
          <Text>Select the correct street name:</Text>
          <RadioGroup onChange={handleOptionSelect} value={selectedOption}>
            <VStack align="start">
              {options.map((option) => (
                <Radio key={option} value={option}>
                  {option}
                </Radio>
              ))}
            </VStack>
          </RadioGroup>
          <Button onClick={handleSubmitAnswer} isDisabled={!selectedOption}>
            Submit Answer
          </Button>
        </>
      ) : (
        <>
          <Text>Find: {currentStreet?.name}</Text>
          {selectedMode === "challenge" ? (
            <Text>
              Progress: {score}/{streetCount} streets
            </Text>
          ) : (
            <Text>Score: {score}</Text>
          )}
          {selectedMode === "elimination" && (
            <Text>Remaining Unique Streets: {remainingStreets.length}</Text>
          )}
        </>
      )}
      <Box width="100%" height="70vh">
        <MapContainer
          center={[40.1872, 44.5152]}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          ref={mapRef}
        >
          <MapTileLayer />
          {selectedMode !== "multiple choice" && (
            <MapEvents
              onMapClick={handleMapClick}
              isToastActive={isToastActive}
            />
          )}
          {filteredStreets.map((street) => (
            <Polyline
              key={street.uniqueId}
              positions={street.path}
              pathOptions={{
                color: streetColors[street.name] || "blue",
                weight: streetColors[street.name] ? 4 : 2,
              }}
            />
          ))}
        </MapContainer>
      </Box>
      <HStack>
        <Switch
          isChecked={showStreetNames}
          onChange={(e) => setShowStreetNames(e.target.checked)}
        />
        <Text>Show Street Names</Text>
        {selectedMode !== "multiple choice" && (
          <>
            <Switch
              isChecked={showCorrectStreet}
              onChange={(e) => setShowCorrectStreet(e.target.checked)}
            />
            <Text>Show Correct Street on Incorrect Guess</Text>
          </>
        )}
      </HStack>
      <Button
        onClick={() => {
          setSelectedLevel(null);
          setSelectedMode(null);
        }}
      >
        Change Level/Mode
      </Button>

      <Modal isOpen={isGameOver} onClose={() => setIsGameOver(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Game Over</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>Total Unique Streets: {gameStats?.totalStreets}</Text>
            <Text>Correct Guesses: {gameStats?.correctGuesses}</Text>
            <Text>Accuracy: {gameStats?.percentCorrect}%</Text>
            <Button mt={4} onClick={initializeGame}>
              Play Again
            </Button>
          </ModalBody>
        </ModalContent>
      </Modal>
    </VStack>
  );
};

export default YerevanStreetGame;
