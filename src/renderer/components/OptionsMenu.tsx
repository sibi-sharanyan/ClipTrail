import React from 'react';
import {
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  Link,
  Box,
  Divider,
} from '@chakra-ui/react';
import { BsThreeDots } from 'react-icons/bs';
import useStore, { IClipboardItem } from 'renderer/store/main';

interface Props {
  item: IClipboardItem;
}

export default function OptionsMenu({ item }: Props) {
  return (
    <Menu size="sm">
      {({ isOpen }) => (
        <>
          <MenuButton
            isActive={isOpen}
            as={Link}
            position="absolute"
            right={2}
            top={1}
            zIndex={3}
            color="white"
            mt={2}
          >
            <BsThreeDots />
          </MenuButton>
          <MenuList
            zIndex={4}
            fontSize="sm"
            w="10"
            p={0}
            bg="#171010"
            color="white"
          >
            <MenuItem
              onClick={(e) => {
                e.stopPropagation();
                window.electron.ipcRenderer.invoke('delete-clipboard-item', {
                  id: item.id,
                });
              }}
              _hover={{ bg: '#2B2B2B' }}
              _selected={{ bg: '#2B2B2B' }}
              _focus={{ bg: '#2B2B2B' }}
            >
              Delete
            </MenuItem>
            <MenuItem
              _hover={{ bg: '#2B2B2B' }}
              onClick={() => {
                window.electron.ipcRenderer.invoke('pin-item', {
                  id: item.id,
                  type: item.type,
                });
              }}
            >
              {item.isPinned ? 'Unpin' : 'Pin'}
            </MenuItem>
            <Divider />
            <MenuItem
              _hover={{ bg: '#2B2B2B' }}
              onClick={(e) => {
                e.stopPropagation();
                window.electron.ipcRenderer.invoke(
                  'clear-all-clipboard-items',
                  {
                    id: item.id,
                  }
                );
              }}
            >
              Clear all
            </MenuItem>
          </MenuList>
        </>
      )}
    </Menu>
  );
}
