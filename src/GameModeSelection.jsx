import React from 'react';
import { Box, Button, Heading, VStack, useColorModeValue, Select, Text } from '@chakra-ui/react';

const GameModeSelection = ({ onSelectMode, onSelectStreetCount }) => {
  const bg = useColorModeValue("gray.100", "gray.700");

  const modes = [
    { name: "Endless", description: "Play without limits" },
    { name: "Challenge", description: "Guess a set number of streets" },
    { name: "Elimination", description: "Remove streets as you guess correctly" },
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
        Select Game Mode
      </Heading>
      <VStack spacing={4}>
        {modes.map((mode) => (
          <Button
            key={mode.name}
            onClick={() => onSelectMode(mode.name.toLowerCase())}
            width="200px"
            height="100px"
            variant="outline"
            colorScheme="blue"
            _hover={{ transform: "scale(1.05)" }}
            transition="all 0.2s"
          >
            <VStack>
              <Heading size="md">{mode.name}</Heading>
              <Text whiteSpace="normal"  fontSize="sm">{mode.description}</Text>
            </VStack>
          </Button>
        ))}
      </VStack>
      {onSelectStreetCount && (
        <Box mt={4}>
          <Select placeholder="Select number of streets" onChange={(e) => onSelectStreetCount(Number(e.target.value))}>
            <option value={10}>10 streets</option>
            <option value={20}>20 streets</option>
            <option value={50}>50 streets</option>
          </Select>
        </Box>
      )}
    </Box>
  );
};

export default GameModeSelection;