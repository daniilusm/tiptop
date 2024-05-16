import React, { useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { OrbitControls, PerspectiveCamera, Stars } from '@react-three/drei';

import s from './Shaders.module.scss';

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

const ShadersComp = () => {
  const plane = useRef();

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

  // useFrame(state => {
  //   const { clock } = state;

  //   if (clock.elapsedTime / 10 < 1) {
  //     console.info(plane.current);
  //     console.info(clock.elapsedTime / 10);
  //     plane.current.material.uniforms.uTime.value = clock.elapsedTime / 10;
  //   }
  // });

  return (
    <mesh ref={plane}>
      <planeGeometry args={[4, 4]} />
      <shaderMaterial
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        fragmentShader={fragmentShader}
        vertexShader={vertexShader}
        uniforms={uniforms}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

const Shaders = ({ className }) => {
  return (
    <div className={cx(s.root, className)}>
      <Canvas>
        <OrbitControls />
        <ambientLight position={[1, 1, 2]} />
        <PerspectiveCamera position={[0, 0, 0]}>
          <ShadersComp />
        </PerspectiveCamera>
      </Canvas>
    </div>
  );
};

Shaders.propTypes = {
  className: PropTypes.string,
};

Shaders.defaultProps = {};

export default React.memo(Shaders);
