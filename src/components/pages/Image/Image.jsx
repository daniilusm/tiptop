import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import { Canvas, useLoader, useThree } from '@react-three/fiber';

import s from './Image.module.scss';
import {
  Mask,
  OrbitControls,
  PerspectiveCamera,
  useMask,
} from '@react-three/drei';
import { TextureLoader } from 'three';

const TIMELINES = { START: 14, END: 31.5 };
const ROTATIONS = {
  CUBE: { FIRST: 10, SECOND: 6 },
  SCENE: { FIRST: 10, SECOND: 5 },
};

const Models = ({ scrollProgress, rootRef, elemRef, data }) => {
  const texture = useLoader(TextureLoader, data.src);
  const planeRef = useRef(null);

  const stencil = useMask(1);

  const { scene } = useThree();

  const getMousePositions = (clientX, clientY, parent, element) => {
    const currentWidth = parent.clientWidth - element.clientWidth;
    const offsetX = clientX - currentWidth;

    const currentHeight = parent.clientHeight - element.clientHeight;
    const offsetY = clientY - currentHeight;

    const x = offsetX - element.clientWidth / 2;
    const y = offsetY - element.clientHeight / 2;
    return { x, y };
  };

  // const handleMouseMove = useCallback(
  //   e => {
  //     const { clientX, clientY } = e;

  //     if (planeRef.current && rootRef && elemRef) {
  //       const { x, y } = getMousePositions(clientX, clientY, rootRef, elemRef);
  //       console.info(x, y);
  //       planeRef.current.position.set(x / 100, -y / 100, -1);
  //     }
  //   },
  //   [rootRef, elemRef]
  // );

  // useEffect(() => {
  //   document.addEventListener('mousemove', e => handleMouseMove(e));

  //   return () =>
  //     document.removeEventListener('mousemove', e => handleMouseMove(e));
  // }, []);

  useEffect(() => {
    if (scrollProgress < TIMELINES.START) {
      scene.rotation.x = 0;
      planeRef.current.rotation.x = 0;
      scene.rotation.y = scrollProgress / ROTATIONS.SCENE.FIRST;
      planeRef.current.rotation.y = -scrollProgress / ROTATIONS.CUBE.FIRST;
    }
    if (scrollProgress > TIMELINES.START && scrollProgress < TIMELINES.END) {
      scene.rotation.y = 0;
      planeRef.current.rotation.y = 0;
      scene.rotation.x = -scrollProgress / ROTATIONS.SCENE.SECOND;
      planeRef.current.rotation.x =
        (scrollProgress - TIMELINES.END) / ROTATIONS.CUBE.SECOND;
    }
    if (scrollProgress > TIMELINES.START) {
      scene.position.set(0, 0, scrollProgress / 35);
      planeRef.current.position.set(0, 0, -(scrollProgress / 35));
    }
  }, [scrollProgress]);

  return (
    <>
      <Mask
        id={1}
        position={[0, 0, 1]}
      >
        {/* <planeGeometry args={[7, 10]} /> */}
        <circleGeometry args={[2.5, 64]} />
        <meshPhongMaterial color="black" />
      </Mask>
      {/* <mesh
        position={[0, 0, 1]}
        scale={3}
      >
        <ringGeometry args={[0.8, 0.85, 64]} />
        <meshPhongMaterial color="black" />
      </mesh> */}
      <mesh
        position={[0, 0, -1]}
        rotation={[0, 0, 0]}
        ref={planeRef}
      >
        <planeGeometry args={[14, 8]} />
        <meshBasicMaterial
          attach="material"
          map={texture}
          {...stencil}
        />
        {/* <boxGeometry
          args={[1, 1, 1]}
          attach="geometry"
        />
        <meshPhongMaterial
          color="black"
          wireframe
          transparent
          {...stencil}
        /> */}
      </mesh>
    </>
  );
};

const Image = ({ className, data }) => {
  const rootRef = useRef(null);
  const elemRef = useRef(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const handleScroll = useCallback(() => {
    if (elemRef.current && rootRef.current) {
      const winScroll = elemRef.current.offsetTop;
      const height =
        rootRef.current.scrollHeight - document.documentElement.clientHeight;
      const progress = (winScroll / height) * 100;
      setScrollProgress(progress);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('scroll', handleScroll);

    return () => document.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className={cx(s.root, className)}
      ref={rootRef}
    >
      <div
        ref={elemRef}
        className={s.wrapper}
      >
        <Canvas>
          {/* <OrbitControls /> */}
          <ambientLight
            castShadow
            intensity={2}
            position={[1, 9, 0]}
          />
          <PerspectiveCamera position={[0, 0, 0]} />
          <Models
            scrollProgress={scrollProgress}
            rootRef={rootRef.current}
            elemRef={elemRef.current}
            data={data}
          />
        </Canvas>
      </div>
    </div>
  );
};

Image.propTypes = {
  className: PropTypes.string,
};

Image.defaultProps = {};

export default React.memo(Image);
