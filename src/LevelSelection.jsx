import React from "react";
import {
  Box,
  Button,
  Heading,
  VStack,
  useColorModeValue,
} from "@chakra-ui/react";

const LevelButton = ({ level, description, onClick, isSelected, color }) => (
  <Button
    onClick={onClick}
    width="200px"
    height="100px"
    variant={isSelected ? "solid" : "outline"}
    colorScheme={isSelected ? "blue" : color || "gray"}
    _hover={{ transform: "scale(1.05)" }}
    transition="all 0.2s"
  >
    <VStack>
      <Heading size="md">{level}</Heading>
      <Box fontSize="sm">{description}</Box>
    </VStack>
  </Button>
);

const LevelSelection = ({ onSelectLevel, selectedLevel }) => {
  const bg = useColorModeValue("gray.100", "gray.700");

  const levels = [
    { name: "Easy", description: "Beginner-friendly streets", color: "green" },
    { name: "Alik", description: "Intermediate difficulty", color: "yellow" },
    { name: "Xcho", description: "Advanced challenge", color: "orange" },
    { name: "Hard", description: "All streets included", color: "red" },
  ];

  return (
    <Box
      bg={bg}
      p={8}
      borderRadius="lg"
      boxShadow="xl"
      maxWidth="600px"
      margin="auto"
    >
      <Heading size="lg" mb={6} textAlign="center">
        Select Difficulty Level
      </Heading>
      <VStack spacing={4}>
        {levels.map((level) => (
          <LevelButton
            key={level.name}
            level={level.name}
            color={level.color}
            description={level.description}
            onClick={() => onSelectLevel(level.name.toLowerCase())}
            isSelected={selectedLevel === level.name.toLowerCase()}
          />
        ))}
      </VStack>
    </Box>
  );
};

export default LevelSelection;
