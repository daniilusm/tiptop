import React, { useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';

import { OrbitControls, PerspectiveCamera } from '@react-three/drei';

import s from './Home.module.scss';

const PARAMETERS = {
  PARTICLES: 10000,
  RADIUS: 80,
  BRANCHES: 6,
  SPIN: 0.1,
  RANDOMNESS: 0.2,
  INSIDE_COLOR: '#ff6030',
  OUTSIDE_COLOR: '#1b3984',
};

const Sphere = ({ index }) => {
  const particle = useRef();
  const radius = Math.random() * PARAMETERS.RADIUS;
  const spinAngle = radius * PARAMETERS.SPIN;
  const branchAngle =
    ((index % PARAMETERS.BRANCHES) / PARAMETERS.BRANCHES) * Math.PI * 2;

  const randomX = (Math.random() - 0.5) * PARAMETERS.RANDOMNESS * radius;
  const randomY = (Math.random() - 0.5) * PARAMETERS.RANDOMNESS * radius;
  const randomZ = (Math.random() - 0.5) * PARAMETERS.RANDOMNESS * radius;

  const position = useMemo(() => {
    return [
      Math.cos(branchAngle + spinAngle) * radius + randomX,
      randomY,
      Math.sin(branchAngle + spinAngle) * radius + randomZ,
    ];
  }, []);

  const colors = useMemo(() => {
    const colorInside = new THREE.Color(PARAMETERS.INSIDE_COLOR);
    const colorOutside = new THREE.Color(PARAMETERS.OUTSIDE_COLOR);

    const mixedColor = colorInside.clone();
    mixedColor.lerp(colorOutside, radius / PARAMETERS.RADIUS);

    return [mixedColor.r, mixedColor.g, mixedColor.b];
  }, []);

  return (
    <mesh
      position={position}
      ref={particle}
    >
      <sphereGeometry args={[0.1, 12, 12]} />
      <meshBasicMaterial
        color={colors}
        vertexColors
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
};

// const BasicParticles = () => {
//   const points = useRef();

//   console.info(points);

//   return (
//     <points ref={points}>
//       <icosahedronGeometry args={[1, 24]} />
//       <pointsMaterial
//         color="#ffffff"
//         size={0.015}
//         sizeAttenuation
//       />
//     </points>
//   );
// };

const Particles = () => {
  return (
    <group scale={0.05}>
      {[...Array(PARAMETERS.PARTICLES)].map((_, i) => (
        <Sphere
          key={i}
          index={i}
        />
      ))}
    </group>
  );
};

const Home = ({ className }) => {
  return (
    <div className={cx(s.root, className)}>
      <Canvas>
        <OrbitControls />
        <ambientLight position={[1, 1, 2]} />
        {/* <Environment
          files="https://storage.googleapis.com/abernier-portfolio/lebombo_2k.hdr"
          background
        /> */}
        <PerspectiveCamera position={[0, 0, 0]}>
          <Particles />
          {/* <BasicParticles /> */}
        </PerspectiveCamera>
      </Canvas>
    </div>
  );
};

Home.propTypes = {
  className: PropTypes.string,
};

Home.defaultProps = {};

export default React.memo(Home);
