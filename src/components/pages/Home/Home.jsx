import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import { Canvas } from '@react-three/fiber';

import s from './Home.module.scss';
import {
  Environment,
  OrbitControls,
  PerspectiveCamera,
} from '@react-three/drei';

import textures1 from 'public/textures/Fabric_Quilt_003_basecolor.jpg';
import textures2 from 'public/textures/Fabric_Quilt_003_height.png';
import textures3 from 'public/textures/Fabric_Quilt_003_normal.jpg';
import textures4 from 'public/textures/Fabric_Quilt_003_roughness.jpg';
import textures5 from 'public/textures/Fabric_Quilt_003_ambientOcclusion.jpg';

const Sphere = ({ ballRef }) => {
  // const props = useTexture({
  //   map: textures1.src,
  //   displacementMap: textures2.src,
  //   normalMap: textures3.src,
  //   roughnessMap: textures4.src,
  //   aoMap: textures5.src,
  // });

  // console.info(props);

  // return (
  //   <mesh ref={ballRef}>
  //     <torusGeometry
  //       args={[1, 0.5, 16, 100]}
  //       position={[0, 0, 0]}
  //     />
  //     <meshStandardMaterial {...props} />
  //   </mesh>
  // );

  return (
    <mesh ref={ballRef}>
      <icosahedronGeometry
        args={[1, 0]}
        position={[0, 0, 0]}
      />

      <meshPhysicalMaterial
        transmission={1}
        ior={1.333}
        thickness={1}
        metalness={0.1}
        roughness={0.5}
      />
    </mesh>
  );
};

const Home = ({ className }) => {
  const ballRef = useRef(null);

  return (
    <div className={cx(s.root, className)}>
      <Canvas>
        <OrbitControls />
        <ambientLight position={[1, 1, 2]} />
        <PerspectiveCamera position={[0, 0, 0]} />
        <Environment
          files="https://storage.googleapis.com/abernier-portfolio/lebombo_2k.hdr"
          background
        />

        <Sphere ballRef={ballRef} />
      </Canvas>
    </div>
  );
};

Home.propTypes = {
  className: PropTypes.string,
};

Home.defaultProps = {};

export default React.memo(Home);
