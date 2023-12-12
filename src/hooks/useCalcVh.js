/** @format */

import React from 'react';
import debounce from 'lodash.debounce';

const useCalcVh = () => {
  const handleCalcRealVh = React.useCallback(() => {
    const vh = (window.innerHeight + 1) * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }, []);

  React.useEffect(() => {
    const debouncedVh = debounce(handleCalcRealVh, 33, {
      trailing: true,
      leading: false,
    });

    debouncedVh();

    window.addEventListener('resize', debouncedVh);

    return () => {
      window.removeEventListener('resize', debouncedVh);
    };
  }, [handleCalcRealVh]);
};

export default useCalcVh;
