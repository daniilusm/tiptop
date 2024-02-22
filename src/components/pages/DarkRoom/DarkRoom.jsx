import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import { Canvas } from '@react-three/fiber';

import s from './DarkRoom.module.scss';
import {
  Environment,
  OrbitControls,
  PerspectiveCamera,
  useHelper,
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
import {
  Fog,
  PointLightHelper,
  RepeatWrapping,
  SpotLightHelper,
  Vector3,
} from 'three';

const Wall = ({ position, rotation, isFlor }) => {
  const props = useTexture({
    map: isFlor ? florTextures1.src : wallTextures1.src,
    displacementMap: isFlor ? florTextures2.src : wallTextures2.src,
    normalMap: isFlor ? florTextures3.src : wallTextures3.src,
    roughnessMap: isFlor ? florTextures4.src : wallTextures4.src,
    aoMap: isFlor ? florTextures5.src : wallTextures5.src,
  });

  props.map.repeat.set(isFlor ? 8 : 2, isFlor ? 8 : 2);
  props.aoMap.repeat.set(isFlor ? 8 : 2, isFlor ? 8 : 2);
  props.normalMap.repeat.set(isFlor ? 8 : 2, isFlor ? 8 : 2);
  props.roughnessMap.repeat.set(isFlor ? 8 : 2, isFlor ? 8 : 2);

  props.map.wrapS = RepeatWrapping;
  props.aoMap.wrapS = RepeatWrapping;
  props.normalMap.wrapS = RepeatWrapping;
  props.roughnessMap.wrapS = RepeatWrapping;

  props.map.wrapT = RepeatWrapping;
  props.aoMap.wrapT = RepeatWrapping;
  props.normalMap.wrapT = RepeatWrapping;
  props.roughnessMap.wrapT = RepeatWrapping;

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

const Sceen = () => {
  // const spotLight = useRef();

  // useHelper(spotLight, PointLightHelper, 1, 'hotpink');
  return (
    <>
      <OrbitControls />
      <ambientLight position={[1, 1, 2]} />
      {/* <spotLight
        ref={spotLight}
        color="0xffffff"
        intensity={1}
        position={[1, 0, 1]}
        penumbra={0.5}
      /> */}

      <pointLight
        // ref={spotLight}
        color="#ff7d46"
        intensity={9}
        position={[3, 0, 1]}
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
    </>
  );
};

const DarkRoom = ({ className }) => {
  return (
    <div className={cx(s.root, className)}>
      <Canvas>
        <Sceen />
      </Canvas>
    </div>
  );
};

DarkRoom.propTypes = {
  className: PropTypes.string,
};

DarkRoom.defaultProps = {};

export default React.memo(DarkRoom);
