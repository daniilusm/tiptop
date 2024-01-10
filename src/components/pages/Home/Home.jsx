import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import { Canvas } from '@react-three/fiber';

import s from './Home.module.scss';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';

const Home = ({ className }) => {
  const ballRef = useRef(null);

  useEffect(() => {
    // document.addEventListener('mousemove', e => {
    //   console.info(e);
    //   const { innerWidth, innerHeight } = e.view;
    //   const { clientX, clientY } = e;
    //   const progressX = (clientX / (innerWidth / 100)) * 0.05;
    //   const progressY = (clientY / (innerHeight / 100)) * 0.05;
    //   console.info(progressX, progressY);
    //   console.info(ballRef.current.position);
    //   ballRef.current.position.x = progressX;
    //   ballRef.current.position.y = progressY;
    // });

    setInterval(() => {
      const timer = Date.now() * 0.03;

      if (ballRef.current) {
        ballRef.current.position.set(
          Math.cos(timer * 0.1) * 3.2,
          Math.abs(Math.cos(timer * 0.2)) * 5 + 2,
          Math.sin(timer * 0.1) * 3.2
        );
      }
    }, 10);
  }, []);

  return (
    <div className={cx(s.root, className)}>
      <Canvas>
        <OrbitControls />
        <ambientLight
          castShadow
          intensity={1.7}
          position={[1, 5, 7]}
        />
        <PerspectiveCamera position={[0, 0, 0]} />
        <mesh
          position={[0, 10, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <planeGeometry
            args={[10, 10]}
            attach="geometry"
          />
          <meshPhongMaterial color="white" />
        </mesh>
        <mesh
          position={[0, 0, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry
            args={[10, 10]}
            attach="geometry"
          />
          <meshPhongMaterial color="white" />
        </mesh>
        <mesh
          position={[0, 5, 5]}
          rotation={[0, Math.PI, 0]}
        >
          <planeGeometry
            args={[10, 10]}
            attach="geometry"
          />
          <meshPhongMaterial color="white" />
        </mesh>
        <mesh
          position={[5, 5, 0]}
          rotation={[0, -Math.PI / 2, 0]}
        >
          <planeGeometry
            args={[10, 10]}
            attach="geometry"
          />
          <meshPhongMaterial color="white" />
        </mesh>
        <mesh
          position={[-5, 5, 0]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <planeGeometry
            args={[10, 10]}
            attach="geometry"
          />
          <meshPhongMaterial color="white" />
        </mesh>
        <mesh
          position={[0, 5, -5]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <planeGeometry
            args={[10, 10]}
            attach="geometry"
          />
          <meshPhongMaterial color="white" />
        </mesh>
        <mesh
          ref={ballRef}
          position={[0, 0, 0]}
        >
          <sphereGeometry args={[1.5, 26, 26]} />
          <meshStandardMaterial color="black" />
        </mesh>
      </Canvas>
    </div>
  );
};

Home.propTypes = {
  className: PropTypes.string,
};

Home.defaultProps = {};

export default React.memo(Home);
