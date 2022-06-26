import {
  HStack,
  VStack,
  Text,
  Kbd,
  Input,
  Button,
  SimpleGrid,
} from '@chakra-ui/react';
import { useState } from 'react';

const shortcuts = [
  {
    keys: ['⌘', 'i'],
    globalShortcut: 'Command+i',
  },
  {
    keys: ['⌘', '⇧', 'i'],
    globalShortcut: 'Command+Shift+i',
  },
  {
    keys: ['⌥', 'i'],
    globalShortcut: 'Option+i',
  },
  {
    keys: ['⌘', '⌥', 'i'],
    globalShortcut: 'Command+Option+i',
  },
];

export default function SettingsPage() {
  const [selectedShortcut, setSelectedShortcut] = useState('');
  const [portNumber, setPortNumber] = useState('');

  return (
    <VStack bg="#171010" h="100vh" py={10} px={6} spacing={16}>
      <HStack w="100%">
        <Text w="30%" color="white" align="start">
          Invoke key combination:
        </Text>

        <SimpleGrid columns={3} spacing={2} w="70%">
          {shortcuts.map((shortcut, index) => {
            return (
              <HStack
                bg={
                  selectedShortcut === shortcut.globalShortcut
                    ? 'gray.600'
                    : 'gray.800'
                }
                px={3}
                py={2}
                rounded="md"
                cursor="pointer"
                _hover={{
                  bg: 'gray.600',
                }}
                onClick={() => {
                  setSelectedShortcut(shortcut.globalShortcut);
                }}
                key={shortcut.globalShortcut}
              >
                {shortcut.keys.map((key) => {
                  return <Kbd>{key}</Kbd>;
                })}
              </HStack>
            );
          })}
        </SimpleGrid>
      </HStack>

      <HStack color="white" w="100%">
        <Text w="30%">Image server port number</Text>

        <VStack w="30%">
          <Input
            type="number"
            placeholder="Port Number"
            value={portNumber}
            onChange={(event) => {
              setPortNumber(event.target.value);
            }}
          />
          <Text fontSize="xs" color="gray.300">
            (Change this only if you know what you&apos;re doing)
          </Text>
        </VStack>
      </HStack>

      <Button colorScheme="gray" size="md">
        Save
      </Button>
    </VStack>
  );
}
