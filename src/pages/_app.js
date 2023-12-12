import useCalcVh from 'hooks/useCalcVh';

import 'styles/config/index.scss';

function MyApp({ Component, pageProps }) {
  useCalcVh();

  return <Component {...pageProps} />;
}

export default MyApp;
