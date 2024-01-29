import React, { useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import { Canvas, useLoader } from '@react-three/fiber';

import s from './Image.module.scss';
import {
  Mask,
  OrbitControls,
  PerspectiveCamera,
  useMask,
} from '@react-three/drei';
import useCalcVh from 'hooks/useCalcVh';

const Image = ({ className }) => {
  const planeRef = useRef(null);
  const rootRef = useRef(null);
  const elemRef = useRef(null);

  const getMousePositions = (clientX, clientY, parent, element) => {
    const currentWidth = parent.clientWidth - element.clientWidth;
    const offsetX = clientX - currentWidth;

    const currentHeight = parent.clientHeight - element.clientHeight;
    const offsetY = clientY - currentHeight;

    const x = offsetX - element.clientWidth / 2;
    const y = offsetY - element.clientHeight / 2;
    return { x, y };
  };

  const handleScroll = useCallback(e => {
    const { clientX, clientY } = e;

    if (planeRef.current) {
      const { x, y } = getMousePositions(
        clientX,
        clientY,
        rootRef.current,
        elemRef.current
      );
      planeRef.current.position.set(x / 100, -y / 100, -1);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', e => handleScroll(e));
  }, []);

  // const texture = useLoader(THREE.TextureLoader, 'public/images/avatar2.png');
  // console.info(planeRef);

  // useEffect(() => {
  //   if (planeRef.current) {
  //     planeRef.current.parent.rotation.set(1, 1, 1);
  //   }
  // }, []);

  const stencil = useMask(1);
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
          <OrbitControls />
          <ambientLight
            castShadow
            intensity={1.7}
            position={[1, 5, 7]}
          />
          <PerspectiveCamera position={[0, 0, 0]} />
          <Mask
            id={1}
            position={[0, 0, 1]}
          >
            {/* <planeGeometry args={[7, 10]} /> */}
            <ringGeometry args={[2, 4, 64]} />
            <meshPhongMaterial color="black" />
          </Mask>
          <mesh
            position={[0, 0, 1]}
            scale={2.35}
          >
            <ringGeometry args={[0.75, 0.85, 64]} />
            <meshPhongMaterial color="black" />
          </mesh>
          <mesh
            position={[0, 0, 1]}
            scale={5.33}
          >
            <ringGeometry args={[0.75, 0.85, 64]} />
            <meshPhongMaterial color="black" />
          </mesh>
          <mesh
            position={[0, 0, -1]}
            rotation={[0, 0, Math.PI / 2]}
            ref={planeRef}
          >
            <boxGeometry
              args={[2, 2, 2]}
              attach="geometry"
            />
            <meshPhongMaterial
              color="red"
              wireframe
              {...stencil}
            />
          </mesh>
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
