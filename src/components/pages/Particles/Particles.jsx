import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';

import {
  Detailed,
  Environment,
  OrbitControls,
  PerspectiveCamera,
} from '@react-three/drei';

import s from './Particles.module.scss';

const particlesCount = 800;

const Sphere = props => {
  return (
    <Detailed
      distances={[0, 15, 25, 35, 100]}
      {...props}
    >
      <mesh>
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
    </Detailed>
  );
};

const BasicParticles = () => {
  const points = useRef();

  return (
    <points ref={points}>
      <icosahedronGeometry args={[1, 24]} />
      <pointsMaterial
        color="#ffffff"
        size={0.015}
        sizeAttenuation
      />
    </points>
  );
};

const Particles = () => {
  const positions = [...Array(particlesCount)].map(() => ({
    position: [
      40 - Math.random() * 80,
      40 - Math.random() * 80,
      40 - Math.random() * 80,
    ],
    rotation: [
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
    ],
  }));
  return (
    <>
      {positions.map((props, i) => (
        <Sphere
          key={i}
          {...props}
        />
      ))}
    </>
  );
};

const ParticlesPage = ({ className }) => {
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
        {/* <Sphere /> */}
        <Particles />
        <BasicParticles />
      </Canvas>
    </div>
  );
};

ParticlesPage.propTypes = {
  className: PropTypes.string,
};

ParticlesPage.defaultProps = {};

export default React.memo(ParticlesPage);
