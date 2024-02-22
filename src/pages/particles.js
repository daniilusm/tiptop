import Particles from 'pages/Particles';

const ParticlesPage = () => {
  return <Particles />;
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

export default Particles;
