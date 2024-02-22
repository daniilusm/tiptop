import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import { Canvas } from '@react-three/fiber';

import s from './DarkRoom.module.scss';
import {
  Environment,
  OrbitControls,
  PerspectiveCamera,
  useTexture,
} from '@react-three/drei';

import wallTextures1 from 'public/textures/wall/Concrete_Wall_008_basecolor.jpg';
import wallTextures2 from 'public/textures/wall/Concrete_Wall_008_height.png';
import wallTextures3 from 'public/textures/wall/Concrete_Wall_008_normal.jpg';
import wallTextures4 from 'public/textures/wall/Concrete_Wall_008_roughness.jpg';
import wallTextures5 from 'public/textures/wall/Concrete_Wall_008_ambientOcclusion.jpg';

import florTextures1 from 'public/textures/flor/Metal_Plate_048_basecolor.jpg';
import florTextures2 from 'public/textures/flor/Metal_Plate_048_height.png';
import florTextures3 from 'public/textures/flor/Metal_Plate_048_normal.jpg';
import florTextures4 from 'public/textures/flor/Metal_Plate_048_roughness.jpg';
import florTextures5 from 'public/textures/flor/Metal_Plate_048_ambientOcclusion.jpg';
import { Vector3 } from 'three';

const Wall = ({ position, rotation, isFlor }) => {
  const props = useTexture({
    map: isFlor ? florTextures1.src : wallTextures1.src,
    displacementMap: isFlor ? florTextures2.src : wallTextures2.src,
    normalMap: isFlor ? florTextures3.src : wallTextures3.src,
    roughnessMap: isFlor ? florTextures4.src : wallTextures4.src,
    aoMap: isFlor ? florTextures5.src : wallTextures5.src,
  });

  return (
    <mesh
      position={position}
      rotation={rotation}
    >
      <planeGeometry args={isFlor ? [8, 8] : [8, 2]} />
      <meshStandardMaterial {...props} />
    </mesh>
  );
};

const DarkRoom = ({ className }) => {
  return (
    <div className={cx(s.root, className)}>
      <Canvas>
        <OrbitControls />
        <ambientLight position={[1, 1, 2]} />
        <spotLight
          color="0xffffff"
          intensity={1}
          position={[1, 0, 1]}
          penumbra={0.5}
        />
        <PerspectiveCamera position={[0, 0, 0]} />
        {/* <Environment
          files="https://storage.googleapis.com/abernier-portfolio/lebombo_2k.hdr"
          background
        /> */}

        <Wall
          position={[0, 1, 4]}
          rotation={[Math.PI / 2, 0, 0]}
          isFlor
        />
        <Wall
          position={[0, -1, 4]}
          rotation={[-Math.PI / 2, 0, 0]}
          isFlor
        />
        <Wall
          position={[0, 0, 8]}
          rotation={[0, Math.PI, 0]}
        />
        <Wall
          position={[4, 0, 4]}
          rotation={[0, -Math.PI / 2, 0]}
        />
        <Wall
          position={[-4, 0, 4]}
          rotation={[0, Math.PI / 2, 0]}
        />
        <Wall />
      </Canvas>
    </div>
  );
};

DarkRoom.propTypes = {
  className: PropTypes.string,
};

DarkRoom.defaultProps = {};

export default React.memo(DarkRoom);
