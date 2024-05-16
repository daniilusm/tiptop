import React, { useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { CuboidCollider, MeshCollider, RigidBody } from '@react-three/rapier';

const Map = props => {
  const { nodes, materials } = useGLTF('models/dustMap.gltf');

  console.info(nodes, materials);

  // return (
  //   <mesh
  //     position={[0, 0, 0]}
  //     rotation={[-Math.PI / 2, 0, 0]}
  //   >
  //     <planeGeometry args={[10, 10]} />
  //     <meshBasicMaterial color={'green'} />
  //   </mesh>
  // );

  return (
    <RigidBody
      {...props}
      type="fixed"
      colliders={false}
    >
      <group
        {...props}
        dispose={null}
      >
        <group
          position={[1800, -180, 0]}
          rotation={[-Math.PI, 0, 0]}
          // scale={0.1}
        >
          <MeshCollider type="hull">
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_2.geometry}
              material={materials.material_0}
            />
          </MeshCollider>
          <MeshCollider type="hull">
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_3.geometry}
              material={materials.material_10}
            />
          </MeshCollider>
          <MeshCollider type="hull">
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_4.geometry}
              material={materials.material_11}
            />
          </MeshCollider>
          <MeshCollider type="hull">
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_5.geometry}
              material={materials.material_12}
            />
          </MeshCollider>
          <MeshCollider type="hull">
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_6.geometry}
              material={materials.material_13}
            />
          </MeshCollider>
          <MeshCollider type="hull">
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_7.geometry}
              material={materials.material_14}
            />
          </MeshCollider>
          <MeshCollider type="hull">
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_8.geometry}
              material={materials.material_15}
            />
          </MeshCollider>
          <MeshCollider type="hull">
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_9.geometry}
              material={materials.material_16}
            />
          </MeshCollider>
          <MeshCollider type="hull">
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_10.geometry}
              material={materials.material_17}
            />
          </MeshCollider>
          <MeshCollider type="hull">
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_11.geometry}
              material={materials.material_18}
            />
          </MeshCollider>
          <MeshCollider type="hull">
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_12.geometry}
              material={materials.material_19}
            />
          </MeshCollider>
          <MeshCollider type="hull">
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_13.geometry}
              material={materials.material_20}
            />
          </MeshCollider>
          <MeshCollider type="hull">
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_14.geometry}
              material={materials.material_22}
            />
          </MeshCollider>
          <MeshCollider type="hull">
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_15.geometry}
              material={materials.material_23}
            />
          </MeshCollider>
          <MeshCollider type="hull">
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_16.geometry}
              material={materials.material_24}
            />
          </MeshCollider>
          <MeshCollider type="hull">
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_17.geometry}
              material={materials.material_25}
            />
          </MeshCollider>
          <MeshCollider type="hull">
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_18.geometry}
              material={materials.material_26}
            />
          </MeshCollider>
          <MeshCollider type="hull">
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_19.geometry}
              material={materials.material_27}
            />
          </MeshCollider>
          <MeshCollider type="hull">
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_20.geometry}
              material={materials.material_28}
            />
          </MeshCollider>
          <MeshCollider type="hull">
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_21.geometry}
              material={materials.material_29}
            />
          </MeshCollider>
          <MeshCollider type="hull">
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_22.geometry}
              material={materials.material_3}
            />
          </MeshCollider>
          <MeshCollider type="hull">
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_23.geometry}
              material={materials.material_30}
            />
          </MeshCollider>
          <MeshCollider type="hull">
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_24.geometry}
              material={materials.material_4}
            />
          </MeshCollider>
          <MeshCollider type="hull">
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_25.geometry}
              material={materials.material_5}
            />
          </MeshCollider>
          <MeshCollider type="hull">
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_26.geometry}
              material={materials.material_6}
            />
          </MeshCollider>
          <MeshCollider type="hull">
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_27.geometry}
              material={materials.material_7}
            />
          </MeshCollider>
          <MeshCollider type="hull">
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_28.geometry}
              material={materials.material_8}
            />
          </MeshCollider>
          <MeshCollider type="hull">
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_29.geometry}
              material={materials.material_1}
            />
          </MeshCollider>
          <MeshCollider type="hull">
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_30.geometry}
              material={materials.material_2}
            />
          </MeshCollider>
          <MeshCollider type="hull">
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_31.geometry}
              material={materials.material_21}
            />
          </MeshCollider>
          <MeshCollider type="hull">
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_32.geometry}
              material={materials.material_31}
            />
          </MeshCollider>
          <MeshCollider type="hull">
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_33.geometry}
              material={materials.material_32}
            />
          </MeshCollider>
          <MeshCollider type="hull">
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_34.geometry}
              material={materials.material_33}
            />
          </MeshCollider>
          <MeshCollider type="hull">
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_35.geometry}
              material={materials.material_9}
            />
          </MeshCollider>
        </group>
      </group>
      <CuboidCollider
        args={[1000, 2, 1000]}
        position={[0, -2, 0]}
      />
    </RigidBody>
  );
};

useGLTF.preload('models/dustMap.gltf');

export default Map;
