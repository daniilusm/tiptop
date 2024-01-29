import Image from 'pages/Image';
import image from 'public/images/www.jpeg';

const ImagePage = ({ image }) => {
  return <Image data={image} />;
};

export async function getStaticProps() {
  try {
    return {
      revalidate: 60,
      props: { image },
    };
  } catch (e) {
    console.log(e);
  }
}

export default ImagePage;
