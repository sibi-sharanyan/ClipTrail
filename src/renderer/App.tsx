import { useEffect } from 'react';
import {
  MemoryRouter as Router,
  Routes,
  Route,
  useNavigate,
} from 'react-router-dom';
import { VStack, Text, Image, Box, HStack } from '@chakra-ui/react';

import useStore, { IClipboardItem } from './store/main';
import OptionsMenu from './components/OptionsMenu';
import './App.css';
import SettingsPage from './SettingsPage';

const MainScreen = () => {
  const navigate = useNavigate();

  const setClipboardItems = useStore((state) => state.setClipboardItems);
  const setSettings = useStore((state) => state.setSettings);
  const clipboardItems = useStore((state) => state.clipboardItems);

  useEffect(() => {
    window.electron.ipcRenderer.on('clipboard-changed', (arg) => {
      console.log('clipboard changed', arg);
      setClipboardItems(arg as IClipboardItem[]);
    });

    window.electron.ipcRenderer.on('goto-settings', (arg: any) => {
      console.log('goto-settings', arg);
      setSettings(arg);
      navigate('/settings');
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
              _hover={{
                border: '1px solid #423F3E',
              }}
              key={item.id}
            >
              <HStack>
                <VStack
                  key={item.id}
                  shadow="sm"
                  w="100%"
                  cursor="default"
                  p={1}
                  zIndex={2}
                  maxH="77px"
                  minH="77px"
                  overflow="hidden"
                  textAlign="left"
                  alignItems="flex-start"
                  color="white"
                  onClick={() => {
                    window.electron.ipcRenderer.invoke('copy-to-clipboard', {
                      id: item.id,
                      type: item.type,
                    });
                  }}
                >
                  {item.type === 'text' && (
                    <Text fontSize="sm" noOfLines={3} w="85%">
                      {item.content}
                    </Text>
                  )}
                  {item.type === 'image' && (
                    <Image src={item.content} w="85%" />
                  )}
                </VStack>
                <OptionsMenu item={item} />
              </HStack>
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
      <Routes>
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Router>
  );
}
