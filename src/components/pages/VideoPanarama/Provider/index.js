import { useContext, useMemo, useRef } from 'react';
import VideoPanaramaContext from './context';

export const useVideo = () => {
  return useContext(VideoPanaramaContext);
};

const VideoPanaramaProvider = ({ children }) => {
  const videoRef = useRef(null);

  const value = useMemo(
    () => ({
      video: videoRef,
    }),
    [videoRef]
  );
  return (
    <VideoPanaramaContext.Provider value={value}>
      {children}
    </VideoPanaramaContext.Provider>
  );
};

export default VideoPanaramaProvider;
