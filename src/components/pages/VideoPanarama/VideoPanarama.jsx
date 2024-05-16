/** @format */
import { Suspense, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

import s from './VideoPanarama.module.scss';

const Controls = props => {
  const { camera, gl } = useThree();
  const ref = useRef();
  useFrame(() => ref.current.update());
  return (
    <OrbitControls
      ref={ref}
      target={[0, 0, 0]}
      {...props}
      args={[camera, gl.domElement]}
    />
  );
};

const Dome = () => {
  let src = '/TestRender_1.mp4';
  //   let src = "https://s.bepro11.com/vr-video-sample.mp4";
  const video = document.createElement('video');
  video.src = src;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = 'anonymous';
  video.play();

  const texture = new THREE.VideoTexture(video);

  return (
    <mesh>
      <sphereGeometry
        attach="geometry"
        args={[500, 60, 40]}
      />
      <meshBasicMaterial
        attach="material"
        map={texture}
        side={THREE.BackSide}
      />
    </mesh>
  );
};

const VideoPanarama = () => {
  return (
    <div className={s.root}>
      <Canvas camera={{ position: [0, 0, 0.1] }}>
        <Controls
          enableZoom={false}
          enablePan={false}
          enableDamping
          dampingFactor={0.2}
        />
        <Suspense fallback={null}>
          <Dome />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default VideoPanarama;
