import { CopyIcon, SunIcon } from '@chakra-ui/icons';
import { VStack, Text, Kbd, HStack } from '@chakra-ui/react';
import React from 'react';
import { shortcuts } from 'renderer/SettingsPage';
import useStore, { IClipboardItem } from '../store/main';

export default function ClipboardEmpty() {
  const settings = useStore((state) => state.settings);

  return (
    <VStack color="gray.400" spacing={10} mt={7}>
      <CopyIcon fontSize="9xl" color="gray.300" />
      <Text align="center">
        No items in clipboard. Start copying things to add items here.
      </Text>

      <Text align="center">
        You can toggle me with
        <HStack display="inline" mx={2}>
          {shortcuts
            .find((s) => s.globalShortcut === settings.selectedShortcut)
            ?.keys.map((key) => (
              <Kbd color="black" key={key} fontSize="lg">
                {key}
              </Kbd>
            ))}
        </HStack>
      </Text>

      <Text align="center">
        To customize the behavior of this widget, look for the menu bar icon
        and. click it.
      </Text>
    </VStack>
  );
}
