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

    return streetList
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
    if (selectedMode === "endless") {
      selectNewStreet(filteredStreets);
    } else if (selectedMode === "challenge") {
      const shuffled = [...filteredStreets].sort(() => 0.5 - Math.random());
      setRemainingStreets(shuffled.slice(0, streetCount));
      selectNewStreet(shuffled.slice(0, streetCount));
    } else if (selectedMode === "elimination") {
      setRemainingStreets([...filteredStreets]);
      selectNewStreet(filteredStreets);
    }
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
          } else if (selectedMode === "challenge") {
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
        },
      });
    } else {
      toast({
        title: "Incorrect",
        description: `That's ${clickedStreet.name}. The correct street is ${currentStreet.name}. Try again!`,
        status: "error",
        duration: null,
        isClosable: true,
        onCloseComplete: () => {
          setIsToastActive(false);
          setStreetColor(clickedStreet.name, "blue");
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
    const totalStreets = filteredStreets.length;
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
      <Text>Find: {currentStreet?.name}</Text>
      <Text>Score: {score}</Text>
      {selectedMode === "elimination" && (
        <Text>Remaining Streets: {remainingStreets.length}</Text>
      )}
      <Box width="100%" height="70vh">
        <MapContainer
          center={[40.1872, 44.5152]}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          ref={mapRef}
        >
          <MapTileLayer />
          <MapEvents
            onMapClick={handleMapClick}
            isToastActive={isToastActive}
          />
          {marker && <Marker position={marker} />}
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
            <Text>Total Streets: {gameStats?.totalStreets}</Text>
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
