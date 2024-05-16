import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import { Canvas } from '@react-three/fiber';
// import {
//   KeyboardControls,
//   OrbitControls,
//   PerspectiveCamera,
//   PointerLockControls,
//   Sky,
// } from '@react-three/drei';

import { Sky, PointerLockControls, KeyboardControls } from '@react-three/drei';

import Map from './Map';

import s from './Dust.module.scss';
import { Physics } from '@react-three/rapier';
import { Cube, Cubes } from './Cube';
import { Player } from './Player';
import { Ground } from './Ground';

const DustMap = ({ className }) => {
  return (
    <div className={cx(s.root, className)}>
      <KeyboardControls
        map={[
          { name: 'forward', keys: ['ArrowUp', 'w', 'W'] },
          { name: 'backward', keys: ['ArrowDown', 's', 'S'] },
          { name: 'left', keys: ['ArrowLeft', 'a', 'A'] },
          { name: 'right', keys: ['ArrowRight', 'd', 'D'] },
          { name: 'jump', keys: ['Space'] },
        ]}
      >
        <Canvas
          shadows
          camera={{ fov: 45 }}
        >
          <Sky sunPosition={[100, 20, 100]} />
          <ambientLight intensity={0.3} />
          <pointLight
            castShadow
            intensity={0.8}
            position={[100, 100, 100]}
          />
          <Physics gravity={[0, -30, 0]}>
            <Ground />
            <Player />
            <Cube position={[0, 0.5, -10]} />
            <Cubes />
          </Physics>
          <PointerLockControls />
        </Canvas>
      </KeyboardControls>
    </div>
  );
};

DustMap.propTypes = {
  className: PropTypes.string,
};

DustMap.defaultProps = {};

export default React.memo(DustMap);
