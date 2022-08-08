import {
  HStack,
  VStack,
  Text,
  Kbd,
  Input,
  Button,
  SimpleGrid,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import useStore, { IClipboardItem } from './store/main';

export const shortcuts = [
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
    keys: ['⌃', '⇧', 'i'],
    globalShortcut: 'Control+Shift+i',
  },
  {
    keys: ['⌃', 'i'],
    globalShortcut: 'Control+i',
  },
  {
    keys: ['⌘', '⌥', 'i'],
    globalShortcut: 'Command+Option+i',
  },
];

export default function SettingsPage() {
  const settings = useStore((state) => state.settings);

  const [selectedShortcut, setSelectedShortcut] = useState('Command+i');
  const [clipboardItemsLimit, setClipboardItemsLimit] = useState(30);
  const [portNumber, setPortNumber] = useState(3800);

  useEffect(() => {
    if (settings.portNumber) {
      setPortNumber(settings.portNumber);
    }

    if (settings.selectedShortcut) {
      setSelectedShortcut(settings.selectedShortcut);
    }

    if (settings.clipboardItemsLimit) {
      setClipboardItemsLimit(settings.clipboardItemsLimit);
    }
  }, [settings]);

  return (
    <VStack bg="#171010" h="100vh" py={10} px={6} spacing={16}>
      <HStack w="100%">
        <Text w="40%" color="white" align="start">
          Invoke key combination:
        </Text>

        <SimpleGrid columns={2} spacing={2} w="60%">
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

      {/* <HStack color="white" w="100%">
        <Text w="40%">Items to store in clipboard:</Text>

        <VStack w="60%">
          <Input
            type="number"
            placeholder="Clipboard Items Limit"
            min={20}
            max={100}
            value={clipboardItemsLimit}
            onChange={(event) => {
              setClipboardItemsLimit(Number(event.target.value));
            }}
          />
          <Text fontSize="xs" color="gray.300">
            Older clipboard items beyond this limit will be discarded
          </Text>
        </VStack>
      </HStack> */}

      <HStack color="white" w="100%">
        <Text w="40%">Server port:</Text>

        <VStack w="60%">
          <Input
            type="number"
            placeholder="Port Number"
            value={portNumber}
            onChange={(event) => {
              setPortNumber(Number(event.target.value));
            }}
          />
          <Text fontSize="xs" color="gray.300">
            The port that the app server runs on
          </Text>
        </VStack>
      </HStack>

      <Button
        colorScheme="gray"
        size="md"
        w="28"
        onClick={() => {
          window.electron.ipcRenderer.invoke('settings-updated', {
            portNumber,
            selectedShortcut,
            clipboardItemsLimit,
          });
        }}
      >
        Save
      </Button>
    </VStack>
  );
}
