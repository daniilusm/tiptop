import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { CapsuleCollider, RigidBody, useRapier } from '@react-three/rapier';

const SPEED = 5;
const direction = new THREE.Vector3();
const frontVector = new THREE.Vector3();
const sideVector = new THREE.Vector3();
const rotation = new THREE.Vector3();

const Player = ({ lerp = THREE.MathUtils.lerp }) => {
  const ref = useRef();
  const rapier = useRapier();
  const [, get] = useKeyboardControls();

  useFrame(state => {
    const { forward, backward, left, right, jump } = get();

    if (ref.current) {
      const velocity = ref.current.linvel();
      // update camera
      const { x, y, z } = ref.current.translation();
      state.camera.position.set(x, y, z);

      // movement
      frontVector.set(0, 0, backward - forward);
      sideVector.set(left - right, 0, 0);
      direction
        .subVectors(frontVector, sideVector)
        .normalize()
        .multiplyScalar(SPEED)
        .applyEuler(state.camera.rotation);
      ref.current.setLinvel({ x: direction.x, y: velocity.y, z: direction.z });
      // jumping
      // console.info(Object.values(rapier.world));
      // const world = rapier.world.raw();
      // const ray = world.castRay(
      //   new RAPIER.Ray(ref.current.translation(), { x: 0, y: -1, z: 0 })
      // );
      // const grounded = ray && ray.collider && Math.abs(ray.toi) <= 1.75;
      // if (jump && grounded) ref.current.setLinvel({ x: 0, y: 7.5, z: 0 });
    }
  });

  return (
    <>
      <RigidBody
        ref={ref}
        colliders={false}
        mass={1}
        type="dynamic"
        position={[0, 10, 0]}
        enabledRotations={[false, false, false]}
      >
        <CapsuleCollider args={[0.75, 0.5]} />
      </RigidBody>
    </>
  );
};

// export default Player;
