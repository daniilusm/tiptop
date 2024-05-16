import Shaders from 'pages/Shaders';

const ShadersPage = () => {
  return <Shaders />;
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

export default ShadersPage;
