import React, { useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { OrbitControls, PerspectiveCamera, Stars } from '@react-three/drei';

import s from './Home.module.scss';

import vertexShader from '!!raw-loader!./vertexShader.glsl';
import fragmentShader from '!!raw-loader!./fragmentShader.glsl';

const PARAMETERS = {
  PARTICLES: 10000,
  RADIUS: 2,
  BRANCHES: 8,
  SPIN: 0.01,
  RANDOMNESS: 0.4,
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
      <meshBasicMaterial color={colors} />
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

// const Particles = () => {
//   return (
//     <group scale={0.05}>
//       {[...Array(PARAMETERS.PARTICLES)].map((_, i) => (
//         <Sphere
//           key={i}
//           index={i}
//         />
//       ))}
//     </group>
//   );
// };

const Particles = () => {
  const points = useRef();

  const particlesPosition = useMemo(() => {
    const positions = new Float32Array(PARAMETERS.PARTICLES * 3);

    for (let i = 0; i < PARAMETERS.PARTICLES; i++) {
      const radius = Math.random() * PARAMETERS.RADIUS;
      const spinAngle = radius * PARAMETERS.SPIN;
      const branchAngle =
        ((i % PARAMETERS.BRANCHES) / PARAMETERS.BRANCHES) * Math.PI * 2;

      const randomX = (Math.random() - 0.5) * PARAMETERS.RANDOMNESS * radius;
      const randomY = (Math.random() - 0.5) * PARAMETERS.RANDOMNESS * radius;
      const randomZ = (Math.random() - 0.5) * PARAMETERS.RANDOMNESS * radius;

      positions.set(
        [
          Math.cos(branchAngle + spinAngle) * radius + randomX,
          randomY,
          Math.sin(branchAngle + spinAngle) * radius + randomZ,
        ],
        i * 3
      );
    }

    return positions;
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: {
        value: 0.0,
      },
      uRadius: {
        value: PARAMETERS.RADIUS,
      },
    }),
    []
  );

  useFrame(state => {
    const { clock } = state;

    points.current.material.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particlesPosition.length / 3}
          array={particlesPosition}
          itemSize={3}
        />
      </bufferGeometry>
      <shaderMaterial
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        fragmentShader={fragmentShader}
        vertexShader={vertexShader}
        uniforms={uniforms}
      />
    </points>
  );
};

const Home = ({ className }) => {
  return (
    <div className={cx(s.root, className)}>
      <Canvas>
        <OrbitControls />
        <ambientLight position={[1, 1, 2]} />
        <Stars
          radius={100}
          depth={50}
          count={5000}
          factor={4}
          saturation={0}
          fade
          speed={1}
        />
        <PerspectiveCamera position={[0, -1, 0]}>
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
