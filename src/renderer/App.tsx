import { useEffect } from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { VStack, Text, Image, Box } from '@chakra-ui/react';

import useStore, { IClipboardItem } from './store/main';
import OptionsMenu from './components/OptionsMenu';

const MainScreen = () => {
  const addClipboardItem = useStore((state) => state.addClipboardItem);
  const clipboardItems = useStore((state) => state.clipboardItems);

  useEffect(() => {
    window.electron.ipcRenderer.on('clipboard-changed', (arg) => {
      addClipboardItem(arg as IClipboardItem);
    });
  }, []);

  const getWrappedContent = (text: string) => {
    if (text.length > 120) {
      let wrappedString = text.substring(0, 120);
      wrappedString += '...';
      return wrappedString;
    }
    return text;
  };

  return (
    <VStack px={4} bg="gray.300" h="100vh" overflowY="auto" pt={3}>
      {clipboardItems.map((item) => {
        return (
          <>
            <VStack
              key={item.id}
              shadow="sm"
              bg="white"
              w="full"
              p={3}
              onClick={() => {
                window.electron.ipcRenderer.invoke('copy-to-clipboard', {
                  id: item.id,
                  type: item.type,
                });
              }}
              minH="87px"
              position="relative"
              zIndex={2}
              overflow="hidden"
              textAlign="left"
              alignItems="flex-start"
            >
              {item.type === 'text' && (
                <Text fontSize="sm">{getWrappedContent(item.content)}</Text>
              )}
              {item.type === 'image' && <Image src={item.content} />}
            </VStack>
            <OptionsMenu />
          </>
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
