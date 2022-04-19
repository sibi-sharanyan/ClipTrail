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

export default function OptionsMenu() {
  return (
    <Menu>
      {({ isOpen }) => (
        <>
          <MenuButton
            isActive={isOpen}
            as={Link}
            position="absolute"
            right={5}
            top={1}
            zIndex={3}
          >
            <BsThreeDots />
          </MenuButton>
          <MenuList zIndex={4}>
            <MenuItem>Delete</MenuItem>
            <MenuItem onClick={() => alert('Kagebunshin')}>Pin</MenuItem>
            <Divider />
            <MenuItem>Clear all</MenuItem>
          </MenuList>
        </>
      )}
    </Menu>
  );
}
