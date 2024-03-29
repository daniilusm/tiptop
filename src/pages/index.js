import Home from 'pages/Home';

const HomePage = () => {
  return <Home />;
};

export async function getStaticProps() {
  try {
    return {
      revalidate: 60,
      props: {},
    };
  } catch (e) {
    console.log(e);
  }
}

export default HomePage;
