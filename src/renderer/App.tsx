import { useEffect } from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { VStack, Text, Image, Box } from '@chakra-ui/react';

import useStore, { IClipboardItem } from './store/main';
import OptionsMenu from './components/OptionsMenu';
import './App.css';

const MainScreen = () => {
  const setClipboardItems = useStore((state) => state.setClipboardItems);
  const clipboardItems = useStore((state) => state.clipboardItems);

  useEffect(() => {
    window.electron.ipcRenderer.on('clipboard-changed', (arg) => {
      console.log('clipboard changed', arg);
      setClipboardItems(arg as IClipboardItem[]);
    });
  }, []);

  return (
    <VStack
      px={4}
      bg="#171010"
      h="100vh"
      overflowY="scroll"
      pt={3}
      className="container"
    >
      {([] as IClipboardItem[])
        .concat(clipboardItems)
        .reverse()
        .map((item, ind) => {
          return (
            <Box
              w="full"
              position="relative"
              bg="#2B2B2B"
              cursor="pointer"
              _hover={{
                border: '1px solid #423F3E',
              }}
              key={item.id}
              onClick={() => {
                console.log('copy-to-clipboard', item);
                window.electron.ipcRenderer.invoke('copy-to-clipboard', {
                  id: item.id,
                  type: item.type,
                });
              }}
            >
              <VStack
                key={item.id}
                shadow="sm"
                w="85%"
                p={1}
                zIndex={2}
                maxH="77px"
                minH="77px"
                overflow="hidden"
                textAlign="left"
                alignItems="flex-start"
                color="white"
              >
                {item.type === 'text' && (
                  <Text fontSize="sm" noOfLines={3}>
                    {item.content}
                  </Text>
                )}
                {item.type === 'image' && <Image src={item.content} />}
                <OptionsMenu item={item} />
              </VStack>
            </Box>
          );
        })}
    </VStack>
  );
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainScreen />} />
      </Routes>
    </Router>
  );
}
