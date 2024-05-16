/** @format */
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Dashboard } from '@uppy/react';
import Uppy from '@uppy/core';

import '@uppy/core/dist/style.min.css';
import '@uppy/progress-bar/dist/style.min.css';

import '@uppy/core/dist/style.css';
import '@uppy/dashboard/dist/style.css';
import '@uppy/drag-drop/dist/style.css';

import s from './VideoPanarama.module.scss';
import Transloadit from '@uppy/transloadit';
import { useCallback } from 'react';

const loadTextureAsync = (loader, src, cb) => {
  loader.loadAsync(src).then(texture => {
    texture.needsUpdate = true;
    texture.updateMatrix();
    cb(texture);
  });
};

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

const Dome = ({ videoUrl = '/TestRender_1.mp4' }) => {
  const videoRef = useRef(document.createElement('video'));

  useEffect(() => {
    videoRef.current.src = videoUrl;
    videoRef.current.loop = true;
    videoRef.current.muted = true;
    videoRef.current.playsInline = true;
    videoRef.current.crossOrigin = 'anonymous';
    // videoRef.current.play();
  }, [videoUrl]);

  const texture = new THREE.VideoTexture(videoRef.current || {});

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
  const [videoUrl, setVideoUrl] = useState(
    'https://s.bepro11.com/vr-video-sample.mp4'
  );

  const uppy = useMemo(() => {
    return new Uppy({
      id: 'uppy1',
      autoProceed: false,
      restrictions: {
        allowedFileTypes: ['.mp4'],
      },
      allowMultipleUploads: false,
    }).use(Transloadit, {
      waitForEncoding: true,
      assemblyOptions: {
        params: {
          auth: { key: '054f342a9ebf45d18b3c599e50a60510' },
          template_id: '498d48ebbca446f88f17508b749a5c85',
        },
      },
    });
  }, []);

  const setSrc = useCallback(
    assembly => {
      setVideoUrl(assembly.uploads[0].ssl_url);
    },
    [setVideoUrl]
  );

  useEffect(() => {
    uppy.on('transloadit:complete', setSrc);
  }, [uppy]);

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
          <Dome videoUrl={videoUrl} />
        </Suspense>
      </Canvas>
      <div className={s.wrapper}>
        <Dashboard
          height={200}
          uppy={uppy}
          plugins={[]}
          proudlyDisplayPoweredByUppy={false}
          showProgressDetails={true}
          hideUploadButton={false}
          allowMultipleUploads={false}
          target="body"
        />
      </div>
    </div>
  );
};

export default VideoPanarama;
