import React from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import { Canvas } from '@react-three/fiber';

import s from './Home.module.scss';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';

const Home = ({ className }) => {
  return (
    <div className={cx(s.root, className)}>
      <Canvas>
        <OrbitControls />
        <ambientLight
          castShadow
          intensity={1.7}
          position={[1, 5, 7]}
        />
        <PerspectiveCamera position={[0, 0, 0]} />
        <mesh position={[0, 0, 0]}>
          <boxGeometry
            args={[2, 2, 2]}
            attach="geometry"
          />
          <meshPhongMaterial
            color="white"
            // transparent
            // opacity={0.9}
            clipShadows
            flatShading
          />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.5, 26, 26]} />
          <meshStandardMaterial color="red" />
        </mesh>
      </Canvas>
    </div>
  );
};

Home.propTypes = {
  className: PropTypes.string,
};

Home.defaultProps = {};

export default React.memo(Home);
