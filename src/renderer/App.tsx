import { useEffect } from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { VStack, Text, Image } from '@chakra-ui/react';

import useStore, { IClipboardItem } from './store/main';

const MainScreen = () => {
  const addClipboardItem = useStore((state) => state.addClipboardItem);
  const clipboardItems = useStore((state) => state.clipboardItems);

  useEffect(() => {
    window.electron.ipcRenderer.on('clipboard-changed', (arg) => {
      addClipboardItem(arg as IClipboardItem);
    });
  }, []);

  return (
    <VStack px={4} bg="gray.300" h="100vh" overflowY="auto" pt={3}>
      {clipboardItems.map((item, ind) => {
        return (
          <VStack
            key={ind}
            shadow="sm"
            bg="white"
            h="4.3rem"
            minH="4.3rem"
            w="full"
            overflow="hidden"
            p={3}
          >
            {item.type === 'text' && <Text>{item.content}</Text>}
            {item.type === 'image' && <Image src={item.content} />}
          </VStack>
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
