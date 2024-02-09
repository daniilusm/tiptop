/* eslint react-hooks/exhaustive-deps: 1 */
import * as React from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { DEG2RAD } from 'three/src/math/MathUtils';

// export type MediaPipeFaceMesh = typeof FacemeshDatas.SAMPLE_FACE;

// export type MediaPipePoints =
//   | typeof FacemeshDatas.SAMPLE_FACE.keypoints
//   | (typeof FacemeshDatas.SAMPLE_FACELANDMARKER_RESULT.faceLandmarks)[0];

// export type FacemeshProps = {
//   /** an array of 468+ keypoints as returned by google/mediapipe tasks-vision, default: a sample face */
//   points?: MediaPipePoints;
//   /** @deprecated an face object as returned by tensorflow/tfjs-models face-landmarks-detection */
//   face?: MediaPipeFaceMesh;
//   /** constant width of the mesh, default: undefined */
//   width?: number;
//   /** or constant height of the mesh, default: undefined */
//   height?: number;
//   /** or constant depth of the mesh, default: 1 */
//   depth?: number;
//   /** a landmarks tri supposed to be vertical, default: [159, 386, 200] (see: https://github.com/tensorflow/tfjs-models/tree/master/face-landmarks-detection#mediapipe-facemesh-keypoints) */
//   verticalTri?: [number, number, number];
//   /** a landmark index (to get the position from) or a vec3 to be the origin of the mesh. default: undefined (ie. the bbox center) */
//   origin?: number | THREE.Vector3;
//   /** A facial transformation matrix, as returned by FaceLandmarkerResult.facialTransformationMatrixes (see: https://developers.google.com/mediapipe/solutions/vision/face_landmarker/web_js#handle_and_display_results) */
//   facialTransformationMatrix?: (typeof FacemeshDatas.SAMPLE_FACELANDMARKER_RESULT.facialTransformationMatrixes)[0];
//   /** Apply position offset extracted from `facialTransformationMatrix` */
//   offset?: boolean;
//   /** Offset sensitivity factor, less is more sensible */
//   offsetScalar?: number;
//   /** Fface blendshapes, as returned by FaceLandmarkerResult.faceBlendshapes (see: https://developers.google.com/mediapipe/solutions/vision/face_landmarker/web_js#handle_and_display_results) */
//   faceBlendshapes?: (typeof FacemeshDatas.SAMPLE_FACELANDMARKER_RESULT.faceBlendshapes)[0];
//   /** whether to enable eyes (nb. `faceBlendshapes` is required for), default: true */
//   eyes?: boolean;
//   /** Force `origin` to be the middle of the 2 eyes (nb. `eyes` is required for), default: false */
//   eyesAsOrigin?: boolean;
//   /** debug mode, default: false */
//   debug?: boolean;
// } & Omit<JSX.IntrinsicElements["group"], "ref">;

// export type FacemeshApi = {
//   meshRef: React.RefObject<THREE.Mesh>;
//   outerRef: React.RefObject<THREE.Group>;
//   eyeRightRef: React.RefObject<FacemeshEyeApi>;
//   eyeLeftRef: React.RefObject<FacemeshEyeApi>;
// };

const defaultLookAt = new THREE.Vector3(0, 0, -1);

const normal = (function () {
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();

  return function (
    v1,
    v2,
    v3,
    v // result
  ) {
    a.copy(v1);
    b.copy(v2);
    c.copy(v3);

    ab.copy(b).sub(a);
    ac.copy(c).sub(a);

    return v.crossVectors(ac, ab).normalize();
  };
})();

function mean(v1, v2) {
  return v1.clone().add(v2).multiplyScalar(0.5);
}

export const Facemesh = React.forwardRef(
  (
    {
      points = FacemeshDatas.SAMPLE_FACELANDMARKER_RESULT.faceLandmarks[0],
      face,
      facialTransformationMatrix,
      faceBlendshapes,
      offset,
      offsetScalar = 80,
      width,
      height,
      depth = 1,
      verticalTri = [159, 386, 152],
      origin,
      eyes = true,
      eyesAsOrigin = false,
      debug = false,
      children,
      ...props
    },
    fref
  ) => {
    if (face) {
      points = face.keypoints;
      console.warn('Facemesh `face` prop is deprecated: use `points` instead');
    }

    const offsetRef = React.useRef(null);
    const scaleRef = React.useRef(null);
    const originRef = React.useRef(null);
    const outerRef = React.useRef(null);
    const meshRef = React.useRef(null);
    const eyeRightRef = React.useRef(null);
    const eyeLeftRef = React.useRef(null);

    const [sightDir] = React.useState(() => new THREE.Vector3());
    const [transform] = React.useState(() => new THREE.Object3D());
    const [sightDirQuaternion] = React.useState(() => new THREE.Quaternion());
    const [_origin] = React.useState(() => new THREE.Vector3());

    const { invalidate } = useThree();

    React.useEffect(() => {
      meshRef.current?.geometry.setIndex(FacemeshDatas.TRIANGULATION);
    }, []);

    const [bboxSize] = React.useState(() => new THREE.Vector3());

    React.useEffect(() => {
      const faceGeometry = meshRef.current?.geometry;
      if (!faceGeometry) return;

      faceGeometry.setFromPoints(points);
      faceGeometry.setDrawRange(0, FacemeshDatas.TRIANGULATION.length);

      //
      // A. compute sightDir vector
      //
      //  - either from `facialTransformationMatrix` if available
      //  - or from `verticalTri`
      //

      if (facialTransformationMatrix) {
        // from facialTransformationMatrix
        transform.matrix.fromArray(facialTransformationMatrix.data);
        transform.matrix.decompose(
          transform.position,
          transform.quaternion,
          transform.scale
        );

        // Rotation: y and z axes are inverted
        transform.rotation.y *= -1;
        transform.rotation.z *= -1;
        sightDirQuaternion.setFromEuler(transform.rotation);

        // Offset: y and z axes are inverted
        if (offset) {
          transform.position.y *= -1;
          transform.position.z *= -1;
          offsetRef.current?.position.copy(
            transform.position.divideScalar(offsetScalar)
          );
        } else {
          offsetRef.current?.position.set(0, 0, 0); // reset
        }
      } else {
        // normal to verticalTri
        normal(
          points[verticalTri[0]],
          points[verticalTri[1]],
          points[verticalTri[2]],
          sightDir
        );

        sightDirQuaternion.setFromUnitVectors(defaultLookAt, sightDir);
      }

      const sightDirQuaternionInverse = sightDirQuaternion.clone().invert();

      //
      // B. geometry (straightened)
      //

      // 1. center (before rotate back)
      faceGeometry.computeBoundingBox();
      if (debug) invalidate(); // invalidate to force re-render for box3Helper (after .computeBoundingBox())
      faceGeometry.center();

      // 2. rotate back + rotate outerRef (once 1.)
      faceGeometry.applyQuaternion(sightDirQuaternionInverse);
      outerRef.current?.setRotationFromQuaternion(sightDirQuaternion);

      // 3. 👀 eyes
      if (eyes) {
        if (!faceBlendshapes) {
          console.warn(
            'Facemesh `eyes` option only works if `faceBlendshapes` is provided: skipping.'
          );
        } else {
          if (eyeRightRef.current && eyeLeftRef.current && originRef.current) {
            if (eyesAsOrigin) {
              // compute the middle of the 2 eyes as the `origin`
              const eyeRightSphere =
                eyeRightRef.current._computeSphere(faceGeometry);
              const eyeLeftSphere =
                eyeLeftRef.current._computeSphere(faceGeometry);
              const eyesCenter = mean(
                eyeRightSphere.center,
                eyeLeftSphere.center
              );
              origin = eyesCenter.negate(); // eslint-disable-line react-hooks/exhaustive-deps

              eyeRightRef.current._update(
                faceGeometry,
                faceBlendshapes,
                eyeRightSphere
              );
              eyeLeftRef.current._update(
                faceGeometry,
                faceBlendshapes,
                eyeLeftSphere
              );
            } else {
              eyeRightRef.current._update(faceGeometry, faceBlendshapes);
              eyeLeftRef.current._update(faceGeometry, faceBlendshapes);
            }
          }
        }
      }

      // 3. origin
      if (originRef.current) {
        if (origin !== undefined) {
          if (typeof origin === 'number') {
            const position = faceGeometry.getAttribute('position');
            _origin.set(
              -position.getX(origin),
              -position.getY(origin),
              -position.getZ(origin)
            );
          } else if (origin.isVector3) {
            _origin.copy(origin);
          }
        } else {
          _origin.setScalar(0);
        }

        originRef.current.position.copy(_origin);
      }

      // 4. re-scale
      if (scaleRef.current) {
        let scale = 1;
        if (width || height || depth) {
          faceGeometry.boundingBox.getSize(bboxSize);
          if (width) scale = width / bboxSize.x; // fit in width
          if (height) scale = height / bboxSize.y; // fit in height
          if (depth) scale = depth / bboxSize.z; // fit in depth
        }

        scaleRef.current.scale.setScalar(scale !== 1 ? scale : 1);
      }

      faceGeometry.computeVertexNormals();
      faceGeometry.attributes.position.needsUpdate = true;
    }, [
      points,
      facialTransformationMatrix,
      faceBlendshapes,
      transform,
      offset,
      offsetScalar,
      width,
      height,
      depth,
      verticalTri,
      origin,
      eyes,
      debug,
      invalidate,
      sightDir,
      sightDirQuaternion,
      bboxSize,
      _origin,
    ]);

    //
    // API
    //

    const api = React.useMemo(
      () => ({
        outerRef,
        meshRef,
        eyeRightRef,
        eyeLeftRef,
      }),
      []
    );
    React.useImperativeHandle(fref, () => api, [api]);

    const [meshBboxSize] = React.useState(() => new THREE.Vector3());
    const bbox = meshRef.current?.geometry.boundingBox;
    const one = bbox?.getSize(meshBboxSize).z || 1;
    return (
      <group {...props}>
        <group ref={offsetRef}>
          <group ref={outerRef}>
            <group ref={scaleRef}>
              {debug ? (
                <>
                  <axesHelper args={[one]} />
                  <Line
                    points={[
                      [0, 0, 0],
                      [0, 0, -one],
                    ]}
                    color={0x00ffff}
                  />
                </>
              ) : null}

              <group ref={originRef}>
                {eyes && faceBlendshapes && (
                  <group name="eyes">
                    <FacemeshEye
                      side="left"
                      ref={eyeRightRef}
                      debug={debug}
                    />
                    <FacemeshEye
                      side="right"
                      ref={eyeLeftRef}
                      debug={debug}
                    />
                  </group>
                )}
                <mesh
                  ref={meshRef}
                  name="face"
                >
                  {children}

                  {debug ? <>{bbox && <box3Helper args={[bbox]} />}</> : null}
                </mesh>
              </group>
            </group>
          </group>
        </group>
      </group>
    );
  }
);

//
// 👁️ FacemeshEye
//

// export type FacemeshEyeProps = {
//   side: "left" | "right";
//   debug?: boolean;
// };
// export type FacemeshEyeApi = {
//   eyeMeshRef: React.RefObject<THREE.Group>;
//   irisDirRef: React.RefObject<THREE.Group>;
//   _computeSphere: (faceGeometry: THREE.BufferGeometry) => THREE.Sphere;
//   _update: (
//     faceGeometry: THREE.BufferGeometry,
//     faceBlendshapes: FacemeshProps["faceBlendshapes"],
//     sphere?: THREE.Sphere
//   ) => void;
// };

export const FacemeshEyeDefaults = {
  contourLandmarks: {
    right: [33, 133, 159, 145, 153],
    left: [263, 362, 386, 374, 380],
  },
  blendshapes: {
    right: [14, 16, 18, 12], // lookIn,lookOut, lookUp,lookDown
    left: [13, 15, 17, 11], // lookIn,lookOut, lookUp,lookDown
  },
  color: {
    right: 'red',
    left: '#00ff00',
  },
  fov: {
    horizontal: 100,
    vertical: 90,
  },
};

export const FacemeshEye = React.forwardRef(({ side, debug = true }, fref) => {
  const eyeMeshRef = React.useRef(null);
  const irisDirRef = React.useRef(null);

  //
  // _computeSphere()
  //
  // Compute eye's sphere .position and .radius
  //

  const [sphere] = React.useState(() => new THREE.Sphere());
  const _computeSphere = React.useCallback(
    faceGeometry => {
      const position = faceGeometry.getAttribute('position');

      // get some eye contour landmarks points (from geometry)
      const eyeContourLandmarks = FacemeshEyeDefaults.contourLandmarks[side];
      const eyeContourPoints = eyeContourLandmarks.map((i) => new THREE.Vector3(position.getX(i), position.getY(i), position.getZ(i))) // prettier-ignore

      // compute center (centroid from eyeContourPoints)
      sphere.center.set(0, 0, 0);
      eyeContourPoints.forEach(v => sphere.center.add(v));
      sphere.center.divideScalar(eyeContourPoints.length);

      // radius (eye half-width)
      sphere.radius = eyeContourPoints[0].sub(eyeContourPoints[1]).length() / 2;

      return sphere;
    },
    [sphere, side]
  );

  //
  // _update()
  //
  // Update:
  //   - A. eye's mesh (according to sphere)
  //   - B. iris direction (according to "look*" blendshapes)
  //

  const [rotation] = React.useState(() => new THREE.Euler());
  const _update = React.useCallback(
    (faceGeometry, faceBlendshapes, sphere) => {
      // A.
      if (eyeMeshRef.current) {
        sphere ??= _computeSphere(faceGeometry); // compute sphere dims (if not passed)
        eyeMeshRef.current.position.copy(sphere.center);
        eyeMeshRef.current.scale.setScalar(sphere.radius);
      }

      // B.
      if (faceBlendshapes && irisDirRef.current) {
        const blendshapes = FacemeshEyeDefaults.blendshapes[side];

        const lookIn = faceBlendshapes.categories[blendshapes[0]].score;
        const lookOut = faceBlendshapes.categories[blendshapes[1]].score;
        const lookUp = faceBlendshapes.categories[blendshapes[2]].score;
        const lookDown = faceBlendshapes.categories[blendshapes[3]].score;

        const hfov = FacemeshEyeDefaults.fov.horizontal * DEG2RAD;
        const vfov = FacemeshEyeDefaults.fov.vertical * DEG2RAD;
        const rx = hfov * 0.5 * (lookDown - lookUp);
        const ry = vfov * 0.5 * (lookIn - lookOut) * (side === 'left' ? 1 : -1);
        rotation.set(rx, ry, 0);

        irisDirRef.current.setRotationFromEuler(rotation);
      }
    },
    [_computeSphere, side, rotation]
  );

  //
  // API
  //

  const api = React.useMemo(
    () => ({
      eyeMeshRef: eyeMeshRef,
      irisDirRef: irisDirRef,
      _computeSphere,
      _update,
    }),
    [_computeSphere, _update]
  );
  React.useImperativeHandle(fref, () => api, [api]);

  const color = FacemeshEyeDefaults.color[side];
  return (
    <group>
      <group ref={eyeMeshRef}>
        {debug && <axesHelper />}

        <group ref={irisDirRef}>
          <>
            {debug && (
              <Line
                points={[
                  [0, 0, 0],
                  [0, 0, -2],
                ]}
                lineWidth={1}
                color={color}
              />
            )}
          </>
        </group>
      </group>
    </group>
  );
});

//
// Sample datas
//

export const FacemeshDatas = {
  // Extracted from: https://github.com/tensorflow/tfjs-models/blob/a8f500809f5afe38feea27870c77e7ba03a6ece4/face-landmarks-detection/demos/shared/triangulation.js
  // prettier-ignore
  TRIANGULATION: [
    127, 34, 139, 11, 0, 37, 232, 231, 120, 72, 37, 39, 128, 121, 47, 232, 121, 128, 104, 69, 67, 175, 171, 148, 157, 154, 155, 118, 50, 101, 73, 39, 40, 9, 151, 108, 48, 115, 131, 194, 204, 211, 74, 40, 185, 80, 42, 183, 40, 92, 186, 230, 229, 118, 202, 212, 214, 83, 18, 17, 76, 61, 146, 160, 29, 30, 56, 157, 173, 106, 204, 194, 135, 214, 192, 203, 165, 98, 21, 71, 68, 51, 45, 4, 144, 24, 23, 77, 146, 91, 205, 50, 187, 201, 200, 18, 91, 106, 182, 90, 91, 181, 85, 84, 17, 206, 203, 36, 148, 171, 140, 92, 40, 39, 193, 189, 244, 159, 158, 28, 247, 246, 161, 236, 3, 196, 54, 68, 104, 193, 168, 8, 117, 228, 31, 189, 193, 55, 98, 97, 99, 126, 47, 100, 166, 79, 218, 155, 154, 26, 209, 49, 131, 135, 136, 150, 47, 126, 217, 223, 52, 53, 45, 51, 134, 211, 170, 140, 67, 69, 108, 43, 106, 91, 230, 119, 120, 226, 130, 247, 63, 53, 52, 238, 20, 242, 46, 70, 156, 78, 62, 96, 46, 53, 63, 143, 34, 227, 173, 155, 133, 123, 117, 111, 44, 125, 19, 236, 134, 51, 216, 206, 205, 154, 153, 22, 39, 37, 167, 200, 201, 208, 36, 142, 100, 57, 212, 202, 20, 60, 99, 28, 158, 157, 35, 226, 113, 160, 159, 27, 204, 202, 210, 113, 225, 46, 43, 202, 204, 62, 76, 77, 137, 123, 116, 41, 38, 72, 203, 129, 142, 64, 98, 240, 49, 102, 64, 41, 73, 74, 212, 216, 207, 42, 74, 184, 169, 170, 211, 170, 149, 176, 105, 66, 69, 122, 6, 168, 123, 147, 187, 96, 77, 90, 65, 55, 107, 89, 90, 180, 101, 100, 120, 63, 105, 104, 93, 137, 227, 15, 86, 85, 129, 102, 49, 14, 87, 86, 55, 8, 9, 100, 47, 121, 145, 23, 22, 88, 89, 179, 6, 122, 196, 88, 95, 96, 138, 172, 136, 215, 58, 172, 115, 48, 219, 42, 80, 81, 195, 3, 51, 43, 146, 61, 171, 175, 199, 81, 82, 38, 53, 46, 225, 144, 163, 110, 246, 33, 7, 52, 65, 66, 229, 228, 117, 34, 127, 234, 107, 108, 69, 109, 108, 151, 48, 64, 235, 62, 78, 191, 129, 209, 126, 111, 35, 143, 163, 161, 246, 117, 123, 50, 222, 65, 52, 19, 125, 141, 221, 55, 65, 3, 195, 197, 25, 7, 33, 220, 237, 44, 70, 71, 139, 122, 193, 245, 247, 130, 33, 71, 21, 162, 153, 158, 159, 170, 169, 150, 188, 174, 196, 216, 186, 92, 144, 160, 161, 2, 97, 167, 141, 125, 241, 164, 167, 37, 72, 38, 12, 145, 159, 160, 38, 82, 13, 63, 68, 71, 226, 35, 111, 158, 153, 154, 101, 50, 205, 206, 92, 165, 209, 198, 217, 165, 167, 97, 220, 115, 218, 133, 112, 243, 239, 238, 241, 214, 135, 169, 190, 173, 133, 171, 208, 32, 125, 44, 237, 86, 87, 178, 85, 86, 179, 84, 85, 180, 83, 84, 181, 201, 83, 182, 137, 93, 132, 76, 62, 183, 61, 76, 184, 57, 61, 185, 212, 57, 186, 214, 207, 187, 34, 143, 156, 79, 239, 237, 123, 137, 177, 44, 1, 4, 201, 194, 32, 64, 102, 129, 213, 215, 138, 59, 166, 219, 242, 99, 97, 2, 94, 141, 75, 59, 235, 24, 110, 228, 25, 130, 226, 23, 24, 229, 22, 23, 230, 26, 22, 231, 112, 26, 232, 189, 190, 243, 221, 56, 190, 28, 56, 221, 27, 28, 222, 29, 27, 223, 30, 29, 224, 247, 30, 225, 238, 79, 20, 166, 59, 75, 60, 75, 240, 147, 177, 215, 20, 79, 166, 187, 147, 213, 112, 233, 244, 233, 128, 245, 128, 114, 188, 114, 217, 174, 131, 115, 220, 217, 198, 236, 198, 131, 134, 177, 132, 58, 143, 35, 124, 110, 163, 7, 228, 110, 25, 356, 389, 368, 11, 302, 267, 452, 350, 349, 302, 303, 269, 357, 343, 277, 452, 453, 357, 333, 332, 297, 175, 152, 377, 384, 398, 382, 347, 348, 330, 303, 304, 270, 9, 336, 337, 278, 279, 360, 418, 262, 431, 304, 408, 409, 310, 415, 407, 270, 409, 410, 450, 348, 347, 422, 430, 434, 313, 314, 17, 306, 307, 375, 387, 388, 260, 286, 414, 398, 335, 406, 418, 364, 367, 416, 423, 358, 327, 251, 284, 298, 281, 5, 4, 373, 374, 253, 307, 320, 321, 425, 427, 411, 421, 313, 18, 321, 405, 406, 320, 404, 405, 315, 16, 17, 426, 425, 266, 377, 400, 369, 322, 391, 269, 417, 465, 464, 386, 257, 258, 466, 260, 388, 456, 399, 419, 284, 332, 333, 417, 285, 8, 346, 340, 261, 413, 441, 285, 327, 460, 328, 355, 371, 329, 392, 439, 438, 382, 341, 256, 429, 420, 360, 364, 394, 379, 277, 343, 437, 443, 444, 283, 275, 440, 363, 431, 262, 369, 297, 338, 337, 273, 375, 321, 450, 451, 349, 446, 342, 467, 293, 334, 282, 458, 461, 462, 276, 353, 383, 308, 324, 325, 276, 300, 293, 372, 345, 447, 382, 398, 362, 352, 345, 340, 274, 1, 19, 456, 248, 281, 436, 427, 425, 381, 256, 252, 269, 391, 393, 200, 199, 428, 266, 330, 329, 287, 273, 422, 250, 462, 328, 258, 286, 384, 265, 353, 342, 387, 259, 257, 424, 431, 430, 342, 353, 276, 273, 335, 424, 292, 325, 307, 366, 447, 345, 271, 303, 302, 423, 266, 371, 294, 455, 460, 279, 278, 294, 271, 272, 304, 432, 434, 427, 272, 407, 408, 394, 430, 431, 395, 369, 400, 334, 333, 299, 351, 417, 168, 352, 280, 411, 325, 319, 320, 295, 296, 336, 319, 403, 404, 330, 348, 349, 293, 298, 333, 323, 454, 447, 15, 16, 315, 358, 429, 279, 14, 15, 316, 285, 336, 9, 329, 349, 350, 374, 380, 252, 318, 402, 403, 6, 197, 419, 318, 319, 325, 367, 364, 365, 435, 367, 397, 344, 438, 439, 272, 271, 311, 195, 5, 281, 273, 287, 291, 396, 428, 199, 311, 271, 268, 283, 444, 445, 373, 254, 339, 263, 466, 249, 282, 334, 296, 449, 347, 346, 264, 447, 454, 336, 296, 299, 338, 10, 151, 278, 439, 455, 292, 407, 415, 358, 371, 355, 340, 345, 372, 390, 249, 466, 346, 347, 280, 442, 443, 282, 19, 94, 370, 441, 442, 295, 248, 419, 197, 263, 255, 359, 440, 275, 274, 300, 383, 368, 351, 412, 465, 263, 467, 466, 301, 368, 389, 380, 374, 386, 395, 378, 379, 412, 351, 419, 436, 426, 322, 373, 390, 388, 2, 164, 393, 370, 462, 461, 164, 0, 267, 302, 11, 12, 374, 373, 387, 268, 12, 13, 293, 300, 301, 446, 261, 340, 385, 384, 381, 330, 266, 425, 426, 423, 391, 429, 355, 437, 391, 327, 326, 440, 457, 438, 341, 382, 362, 459, 457, 461, 434, 430, 394, 414, 463, 362, 396, 369, 262, 354, 461, 457, 316, 403, 402, 315, 404, 403, 314, 405, 404, 313, 406, 405, 421, 418, 406, 366, 401, 361, 306, 408, 407, 291, 409, 408, 287, 410, 409, 432, 436, 410, 434, 416, 411, 264, 368, 383, 309, 438, 457, 352, 376, 401, 274, 275, 4, 421, 428, 262, 294, 327, 358, 433, 416, 367, 289, 455, 439, 462, 370, 326, 2, 326, 370, 305, 460, 455, 254, 449, 448, 255, 261, 446, 253, 450, 449, 252, 451, 450, 256, 452, 451, 341, 453, 452, 413, 464, 463, 441, 413, 414, 258, 442, 441, 257, 443, 442, 259, 444, 443, 260, 445, 444, 467, 342, 445, 459, 458, 250, 289, 392, 290, 290, 328, 460, 376, 433, 435, 250, 290, 392, 411, 416, 433, 341, 463, 464, 453, 464, 465, 357, 465, 412, 343, 412, 399, 360, 363, 440, 437, 399, 456, 420, 456, 363, 401, 435, 288, 372, 383, 353, 339, 255, 249, 448, 261, 255, 133, 243, 190, 133, 155, 112, 33, 246, 247, 33, 130, 25, 398, 384, 286, 362, 398, 414, 362, 463, 341, 263, 359, 467, 263, 249, 255, 466, 467, 260, 75, 60, 166, 238, 239, 79, 162, 127, 139, 72, 11, 37, 121, 232, 120, 73, 72, 39, 114, 128, 47, 233, 232, 128, 103, 104, 67, 152, 175, 148, 173, 157, 155, 119, 118, 101, 74, 73, 40, 107, 9, 108, 49, 48, 131, 32, 194, 211, 184, 74, 185, 191, 80, 183, 185, 40, 186, 119, 230, 118, 210, 202, 214, 84, 83, 17, 77, 76, 146, 161, 160, 30, 190, 56, 173, 182, 106, 194, 138, 135, 192, 129, 203, 98, 54, 21, 68, 5, 51, 4, 145, 144, 23, 90, 77, 91, 207, 205, 187, 83, 201, 18, 181, 91, 182, 180, 90, 181, 16, 85, 17, 205, 206, 36, 176, 148, 140, 165, 92, 39, 245, 193, 244, 27, 159, 28, 30, 247, 161, 174, 236, 196, 103, 54, 104, 55, 193, 8, 111, 117, 31, 221, 189, 55, 240, 98, 99, 142, 126, 100, 219, 166, 218, 112, 155, 26, 198, 209, 131, 169, 135, 150, 114, 47, 217, 224, 223, 53, 220, 45, 134, 32, 211, 140, 109, 67, 108, 146, 43, 91, 231, 230, 120, 113, 226, 247, 105, 63, 52, 241, 238, 242, 124, 46, 156, 95, 78, 96, 70, 46, 63, 116, 143, 227, 116, 123, 111, 1, 44, 19, 3, 236, 51, 207, 216, 205, 26, 154, 22, 165, 39, 167, 199, 200, 208, 101, 36, 100, 43, 57, 202, 242, 20, 99, 56, 28, 157, 124, 35, 113, 29, 160, 27, 211, 204, 210, 124, 113, 46, 106, 43, 204, 96, 62, 77, 227, 137, 116, 73, 41, 72, 36, 203, 142, 235, 64, 240, 48, 49, 64, 42, 41, 74, 214, 212, 207, 183, 42, 184, 210, 169, 211, 140, 170, 176, 104, 105, 69, 193, 122, 168, 50, 123, 187, 89, 96, 90, 66, 65, 107, 179, 89, 180, 119, 101, 120, 68, 63, 104, 234, 93, 227, 16, 15, 85, 209, 129, 49, 15, 14, 86, 107, 55, 9, 120, 100, 121, 153, 145, 22, 178, 88, 179, 197, 6, 196, 89, 88, 96, 135, 138, 136, 138, 215, 172, 218, 115, 219, 41, 42, 81, 5, 195, 51, 57, 43, 61, 208, 171, 199, 41, 81, 38, 224, 53, 225, 24, 144, 110, 105, 52, 66, 118, 229, 117, 227, 34, 234, 66, 107, 69, 10, 109, 151, 219, 48, 235, 183, 62, 191, 142, 129, 126, 116, 111, 143, 7, 163, 246, 118, 117, 50, 223, 222, 52, 94, 19, 141, 222, 221, 65, 196, 3, 197, 45, 220, 44, 156, 70, 139, 188, 122, 245, 139, 71, 162, 145, 153, 159, 149, 170, 150, 122, 188, 196, 206, 216, 92, 163, 144, 161, 164, 2, 167, 242, 141, 241, 0, 164, 37, 11, 72, 12, 144, 145, 160, 12, 38, 13, 70, 63, 71, 31, 226, 111, 157, 158, 154, 36, 101, 205, 203, 206, 165, 126, 209, 217, 98, 165, 97, 237, 220, 218, 237, 239, 241, 210, 214, 169, 140, 171, 32, 241, 125, 237, 179, 86, 178, 180, 85, 179, 181, 84, 180, 182, 83, 181, 194, 201, 182, 177, 137, 132, 184, 76, 183, 185, 61, 184, 186, 57, 185, 216, 212, 186, 192, 214, 187, 139, 34, 156, 218, 79, 237, 147, 123, 177, 45, 44, 4, 208, 201, 32, 98, 64, 129, 192, 213, 138, 235, 59, 219, 141, 242, 97, 97, 2, 141, 240, 75, 235, 229, 24, 228, 31, 25, 226, 230, 23, 229, 231, 22, 230, 232, 26, 231, 233, 112, 232, 244, 189, 243, 189, 221, 190, 222, 28, 221, 223, 27, 222, 224, 29, 223, 225, 30, 224, 113, 247, 225, 99, 60, 240, 213, 147, 215, 60, 20, 166, 192, 187, 213, 243, 112, 244, 244, 233, 245, 245, 128, 188, 188, 114, 174, 134, 131, 220, 174, 217, 236, 236, 198, 134, 215, 177, 58, 156, 143, 124, 25, 110, 7, 31, 228, 25, 264, 356, 368, 0, 11, 267, 451, 452, 349, 267, 302, 269, 350, 357, 277, 350, 452, 357, 299, 333, 297, 396, 175, 377, 381, 384, 382, 280, 347, 330, 269, 303, 270, 151, 9, 337, 344, 278, 360, 424, 418, 431, 270, 304, 409, 272, 310, 407, 322, 270, 410, 449, 450, 347, 432, 422, 434, 18, 313, 17, 291, 306, 375, 259, 387, 260, 424, 335, 418, 434, 364, 416, 391, 423, 327, 301, 251, 298, 275, 281, 4, 254, 373, 253, 375, 307, 321, 280, 425, 411, 200, 421, 18, 335, 321, 406, 321, 320, 405, 314, 315, 17, 423, 426, 266, 396, 377, 369, 270, 322, 269, 413, 417, 464, 385, 386, 258, 248, 456, 419, 298, 284, 333, 168, 417, 8, 448, 346, 261, 417, 413, 285, 326, 327, 328, 277, 355, 329, 309, 392, 438, 381, 382, 256, 279, 429, 360, 365, 364, 379, 355, 277, 437, 282, 443, 283, 281, 275, 363, 395, 431, 369, 299, 297, 337, 335, 273, 321, 348, 450, 349, 359, 446, 467, 283, 293, 282, 250, 458, 462, 300, 276, 383, 292, 308, 325, 283, 276, 293, 264, 372, 447, 346, 352, 340, 354, 274, 19, 363, 456, 281, 426, 436, 425, 380, 381, 252, 267, 269, 393, 421, 200, 428, 371, 266, 329, 432, 287, 422, 290, 250, 328, 385, 258, 384, 446, 265, 342, 386, 387, 257, 422, 424, 430, 445, 342, 276, 422, 273, 424, 306, 292, 307, 352, 366, 345, 268, 271, 302, 358, 423, 371, 327, 294, 460, 331, 279, 294, 303, 271, 304, 436, 432, 427, 304, 272, 408, 395, 394, 431, 378, 395, 400, 296, 334, 299, 6, 351, 168, 376, 352, 411, 307, 325, 320, 285, 295, 336, 320, 319, 404, 329, 330, 349, 334, 293, 333, 366, 323, 447, 316, 15, 315, 331, 358, 279, 317, 14, 316, 8, 285, 9, 277, 329, 350, 253, 374, 252, 319, 318, 403, 351, 6, 419, 324, 318, 325, 397, 367, 365, 288, 435, 397, 278, 344, 439, 310, 272, 311, 248, 195, 281, 375, 273, 291, 175, 396, 199, 312, 311, 268, 276, 283, 445, 390, 373, 339, 295, 282, 296, 448, 449, 346, 356, 264, 454, 337, 336, 299, 337, 338, 151, 294, 278, 455, 308, 292, 415, 429, 358, 355, 265, 340, 372, 388, 390, 466, 352, 346, 280, 295, 442, 282, 354, 19, 370, 285, 441, 295, 195, 248, 197, 457, 440, 274, 301, 300, 368, 417, 351, 465, 251, 301, 389, 385, 380, 386, 394, 395, 379, 399, 412, 419, 410, 436, 322, 387, 373, 388, 326, 2, 393, 354, 370, 461, 393, 164, 267, 268, 302, 12, 386, 374, 387, 312, 268, 13, 298, 293, 301, 265, 446, 340, 380, 385, 381, 280, 330, 425, 322, 426, 391, 420, 429, 437, 393, 391, 326, 344, 440, 438, 458, 459, 461, 364, 434, 394, 428, 396, 262, 274, 354, 457, 317, 316, 402, 316, 315, 403, 315, 314, 404, 314, 313, 405, 313, 421, 406, 323, 366, 361, 292, 306, 407, 306, 291, 408, 291, 287, 409, 287, 432, 410, 427, 434, 411, 372, 264, 383, 459, 309, 457, 366, 352, 401, 1, 274, 4, 418, 421, 262, 331, 294, 358, 435, 433, 367, 392, 289, 439, 328, 462, 326, 94, 2, 370, 289, 305, 455, 339, 254, 448, 359, 255, 446, 254, 253, 449, 253, 252, 450, 252, 256, 451, 256, 341, 452, 414, 413, 463, 286, 441, 414, 286, 258, 441, 258, 257, 442, 257, 259, 443, 259, 260, 444, 260, 467, 445, 309, 459, 250, 305, 289, 290, 305, 290, 460, 401, 376, 435, 309, 250, 392, 376, 411, 433, 453, 341, 464, 357, 453, 465, 343, 357, 412, 437, 343, 399, 344, 360, 440, 420, 437, 456, 360, 420, 363, 361, 401, 288, 265, 372, 353, 390, 339, 249, 339, 448, 255
  ],
  // My face as default (captured with a 640x480 webcam)
  // prettier-ignore
  SAMPLE_FACE: {
    "keypoints": [
      {"x":356.2804412841797,"y":295.1960563659668,"z":-23.786449432373047,"name":"lips"},
      {"x":354.8859405517578,"y":264.69520568847656,"z":-36.718435287475586},
      {"x":355.2180862426758,"y":275.3360366821289,"z":-21.183712482452393},
      {"x":347.349853515625,"y":242.4400234222412,"z":-25.093655586242676},{"x":354.40135955810547,"y":256.67933464050293,"z":-38.23572635650635},{"x":353.7689971923828,"y":247.54886627197266,"z":-34.5475435256958},{"x":352.1288299560547,"y":227.34312057495117,"z":-13.095386028289795},{"x":303.5013198852539,"y":234.67002868652344,"z":12.500141859054565,"name":"rightEye"},{"x":351.09378814697266,"y":211.87547206878662,"z":-6.413471698760986},{"x":350.7115936279297,"y":202.1251630783081,"z":-6.413471698760986},{"x":348.33667755126953,"y":168.7741756439209,"z":6.483500003814697,"name":"faceOval"},{"x":356.4806365966797,"y":299.2995357513428,"z":-23.144519329071045},{"x":356.5511703491211,"y":302.66146659851074,"z":-21.020312309265137},{"x":356.6239547729492,"y":304.1536331176758,"z":-18.137459754943848,"name":"lips"},{"x":356.5807342529297,"y":305.1840591430664,"z":-18.767719268798828,"name":"lips"},{"x":356.8241500854492,"y":308.25711250305176,"z":-20.16829490661621},{"x":357.113037109375,"y":312.26277351379395,"z":-22.10575819015503},{"x":357.34962463378906,"y":317.1123218536377,"z":-21.837315559387207,"name":"lips"},{"x":357.6658630371094,"y":325.51036834716797,"z":-16.27002477645874},{"x":355.0201416015625,"y":269.36279296875,"z":-33.73054027557373},{"x":348.5237503051758,"y":270.33411026000977,"z":-24.93025302886963},{"x":279.97331619262695,"y":213.24176788330078,"z":47.759642601013184,"name":"faceOval"},{"x":322.66529083251953,"y":238.5027265548706,"z":5.535193085670471},{"x":316.0983657836914,"y":239.94489669799805,"z":5.777376294136047},{"x":309.9431610107422,"y":240.24518966674805,"z":7.510589361190796},{"x":301.31994247436523,"y":237.86138534545898,"z":13.118728399276733},{"x":328.14266204833984,"y":235.80496788024902,"z":6.646900177001953},{"x":313.7326431274414,"y":222.11161136627197,"z":3.9887237548828125},{"x":320.45196533203125,"y":221.87729358673096,"z":4.601476192474365},{"x":307.35679626464844,"y":223.63793849945068,"z":5.932023525238037},{"x":303.0031204223633,"y":226.3743782043457,"z":8.479321002960205},{"x":296.80023193359375,"y":242.94299125671387,"z":15.931552648544312},{"x":332.2352981567383,"y":340.77341079711914,"z":-10.165848731994629},{"x":301.38587951660156,"y":233.46447944641113,"z":14.764405488967896,"name":"rightEye"},{"x":279.0147018432617,"y":244.37155723571777,"z":45.77549457550049},{"x":289.60548400878906,"y":239.1807460784912,"z":23.191204071044922},{"x":320.32257080078125,"y":267.1292781829834,"z":-4.954537749290466},{"x":347.64583587646484,"y":294.4955062866211,"z":-23.062820434570312,"name":"lips"},{"x":349.28138732910156,"y":303.1095886230469,"z":-20.238323211669922},{"x":338.9453125,"y":298.19186210632324,"z":-19.456336498260498,"name":"lips"},{"x":333.36788177490234,"y":302.6706790924072,"z":-14.776077270507812,"name":"lips"},{"x":342.89188385009766,"y":304.3561363220215,"z":-17.752301692962646},{"x":337.7375030517578,"y":306.0098361968994,"z":-13.410515785217285},{"x":325.6159210205078,"y":316.22995376586914,"z":-6.681914925575256},{"x":349.0104675292969,"y":264.9818515777588,"z":-36.274919509887695},{"x":347.7138900756836,"y":257.5664806365967,"z":-37.67549514770508},{"x":291.79357528686523,"y":218.88171672821045,"z":11.578094959259033,"name":"rightEyebrow"},{"x":332.2689437866211,"y":247.56946563720703,"z":-3.3730539679527283},{"x":332.0074462890625,"y":267.1201229095459,"z":-19.969879388809204},{"x":331.27952575683594,"y":263.6967658996582,"z":-17.47218608856201},{"x":301.04373931884766,"y":269.56552505493164,"z":3.61815482378006},{"x":347.4863815307617,"y":249.0706443786621,"z":-32.633421421051025},{"x":307.26118087768555,"y":208.2646894454956,"z":1.1591226607561111,"name":"rightEyebrow"},{"x":297.91919708251953,"y":212.22604751586914,"z":5.914516448974609,"name":"rightEyebrow"},{"x":285.1651382446289,"y":197.98450469970703,"z":36.391637325286865,"name":"faceOval"},{"x":337.04097747802734,"y":211.25229835510254,"z":-4.548954665660858},{"x":326.5912628173828,"y":223.16698551177979,"z":6.670243740081787},{"x":320.05664825439453,"y":309.5834255218506,"z":-4.055835008621216},{"x":289.6866226196289,"y":314.617395401001,"z":53.875489234924316,"name":"faceOval"},{"x":337.4256896972656,"y":270.8755302429199,"z":-17.67060160636902},{"x":343.69922637939453,"y":273.0000400543213,"z":-18.756048679351807},{"x":327.4242401123047,"y":309.22399520874023,"z":-4.703601002693176,"name":"lips"},{"x":330.37220001220703,"y":308.3323001861572,"z":-6.442649960517883},{"x":293.87027740478516,"y":207.7961826324463,"z":9.821539521217346,"name":"rightEyebrow"},{"x":332.11437225341797,"y":271.22812271118164,"z":-16.64351224899292},{"x":320.1197814941406,"y":207.40366458892822,"z":-2.48164564371109,"name":"rightEyebrow"},{"x":318.59575271606445,"y":201.07443809509277,"z":-3.110446035861969,"name":"rightEyebrow"},{"x":310.72303771972656,"y":175.75075149536133,"z":13.328815698623657,"name":"faceOval"},{"x":289.67578887939453,"y":202.29835510253906,"z":21.370456218719482},{"x":315.30879974365234,"y":187.35260009765625,"z":5.0304025411605835},{"x":287.8936767578125,"y":216.54793739318848,"z":17.81065821647644,"name":"rightEyebrow"},{"x":283.9391899108887,"y":215.01142501831055,"z":32.04984903335571},{"x":348.35330963134766,"y":299.4155788421631,"z":-22.47924566268921},{"x":341.1790466308594,"y":301.8221855163574,"z":-18.977805376052856},{"x":335.69713592529297,"y":304.4266891479492,"z":-14.682706594467163},{"x":339.4615173339844,"y":272.3654365539551,"z":-16.38674020767212},{"x":328.99600982666016,"y":308.86685371398926,"z":-5.616893768310547},{"x":332.00313568115234,"y":309.1875743865967,"z":-10.335084199905396},{"x":331.0068130493164,"y":307.9274368286133,"z":-6.681914925575256,"name":"lips"},{"x":341.13792419433594,"y":266.4876937866211,"z":-26.56425952911377},{"x":339.02950286865234,"y":305.6663703918457,"z":-12.33674168586731,"name":"lips"},{"x":344.22935485839844,"y":304.9452781677246,"z":-15.161235332489014,"name":"lips"},{"x":350.1844024658203,"y":304.374303817749,"z":-17.5305438041687,"name":"lips"},{"x":348.52630615234375,"y":325.9562301635742,"z":-16.164982318878174},{"x":348.6581802368164,"y":317.1624183654785,"z":-21.510512828826904,"name":"lips"},{"x":348.9766311645508,"y":312.1923065185547,"z":-21.708929538726807},{"x":349.2427444458008,"y":308.0660820007324,"z":-19.643079042434692},{"x":349.67491149902344,"y":305.42747497558594,"z":-18.16080331802368,"name":"lips"},{"x":337.95589447021484,"y":306.6535949707031,"z":-12.803598642349243,"name":"lips"},{"x":337.06878662109375,"y":307.63169288635254,"z":-14.274203777313232},{"x":335.77449798583984,"y":309.8449516296387,"z":-15.698124170303345},{"x":334.6099090576172,"y":312.7997016906738,"z":-14.764405488967896,"name":"lips"},{"x":327.2330856323242,"y":293.80866050720215,"z":-11.864047050476074},{"x":280.97679138183594,"y":279.79928970336914,"z":68.90834331512451,"name":"faceOval"},{"x":355.13843536376953,"y":271.7875671386719,"z":-25.350427627563477},{"x":334.7235870361328,"y":307.4656391143799,"z":-9.302158951759338,"name":"lips"},{"x":333.5293960571289,"y":307.89782524108887,"z":-10.200862884521484},{"x":346.29688262939453,"y":276.4256286621094,"z":-19.748122692108154},{"x":335.16246795654297,"y":276.22097969055176,"z":-12.313398122787476},{"x":345.09132385253906,"y":274.7082996368408,"z":-19.304605722427368},{"x":325.4267883300781,"y":252.95130729675293,"z":-1.6661019623279572},{"x":315.347843170166,"y":259.05200958251953,"z":-0.25604281574487686},{"x":330.44933319091797,"y":267.7570152282715,"z":-14.017432928085327},{"x":294.96768951416016,"y":185.26001930236816,"z":23.903164863586426,"name":"faceOval"},{"x":299.63531494140625,"y":192.7913761138916,"z":12.640198469161987},{"x":304.5452117919922,"y":202.4142837524414,"z":3.244667649269104,"name":"rightEyebrow"},{"x":331.6915512084961,"y":320.0467872619629,"z":-10.632705688476562},{"x":334.5911407470703,"y":201.27566814422607,"z":-6.133356094360352,"name":"rightEyebrow"},{"x":331.4815902709961,"y":185.44180870056152,"z":0.6627205014228821},{"x":328.05816650390625,"y":170.8385467529297,"z":7.358860373497009,"name":"faceOval"},{"x":304.49764251708984,"y":239.76297855377197,"z":10.387605428695679},{"x":290.6382179260254,"y":248.85257720947266,"z":19.03616428375244},{"x":331.5682601928711,"y":233.20727348327637,"z":7.837390303611755},{"x":295.5115509033203,"y":228.9834451675415,"z":14.41426157951355},{"x":336.94332122802734,"y":241.8259334564209,"z":-5.27842104434967},{"x":336.2792205810547,"y":262.7049922943115,"z":-26.12074375152588},{"x":284.4102478027344,"y":255.3262710571289,"z":25.467140674591064},{"x":295.1420593261719,"y":253.02655220031738,"z":12.430112361907959},{"x":303.5196113586426,"y":254.20703887939453,"z":6.139191389083862},{"x":315.73450088500977,"y":251.64799690246582,"z":3.3788898587226868},{"x":324.69661712646484,"y":247.56494522094727,"z":2.3328344523906708},{"x":331.57970428466797,"y":243.02241325378418,"z":1.1423448473215103},{"x":345.6210708618164,"y":229.9976634979248,"z":-10.825285911560059},{"x":286.26644134521484,"y":270.37991523742676,"z":21.708929538726807},{"x":290.2525520324707,"y":228.4921360015869,"z":17.71728754043579},{"x":351.65367126464844,"y":269.3400764465332,"z":-33.450424671173096},{"x":333.1378936767578,"y":253.88388633728027,"z":-7.230473756790161},{"x":277.8318977355957,"y":246.95331573486328,"z":68.20805549621582,"name":"faceOval"},{"x":336.6680908203125,"y":238.10003757476807,"z":0.7688578963279724},{"x":329.95800018310547,"y":269.18323516845703,"z":-7.207130789756775},{"x":299.17491912841797,"y":234.13324356079102,"z":15.95489501953125},{"x":335.61729431152344,"y":258.71752738952637,"z":-23.016133308410645},{"x":284.1079330444336,"y":297.0343494415283,"z":63.25934886932373,"name":"faceOval"},{"x":331.44542694091797,"y":230.6892442703247,"z":9.92658257484436,"name":"rightEye"},{"x":341.41536712646484,"y":253.01264762878418,"z":-29.038610458374023},{"x":303.5472869873047,"y":327.5896739959717,"z":16.725212335586548},{"x":304.7756576538086,"y":337.4389457702637,"z":27.38126277923584,"name":"faceOval"},{"x":280.80501556396484,"y":275.32050132751465,"z":45.0752067565918},{"x":295.43582916259766,"y":318.4501647949219,"z":26.2608003616333},{"x":281.4303207397461,"y":228.7355661392212,"z":40.94350814819336},{"x":331.2549591064453,"y":349.4216537475586,"z":-7.376367449760437},{"x":352.4247741699219,"y":271.7330074310303,"z":-24.953596591949463},{"x":327.5672912597656,"y":260.41900634765625,"z":-5.456410646438599},{"x":284.5432472229004,"y":241.7647933959961,"z":29.668869972229004},{"x":310,"y":235.66174507141113,"z":8.502663969993591,"name":"rightEye"},{"x":315.7071113586426,"y":235.7572603225708,"z":6.938687562942505,"name":"rightEye"},{"x":330.41088104248047,"y":311.04143142700195,"z":-9.325502514839172,"name":"lips"},{"x":288.5377502441406,"y":285.31983375549316,"z":21.837315559387207},{"x":344.55039978027344,"y":359.4300842285156,"z":-6.705257892608643,"name":"faceOval"},{"x":323.41880798339844,"y":351.67362213134766,"z":7.802375555038452,"name":"faceOval"},{"x":314.64088439941406,"y":346.11894607543945,"z":16.36339783668518,"name":"faceOval"},{"x":349.4945526123047,"y":184.8434829711914,"z":-0.21847527474164963},{"x":359.24694061279297,"y":359.8348903656006,"z":-8.403456211090088,"name":"faceOval"},{"x":321.26182556152344,"y":234.64492321014404,"z":6.90950870513916,"name":"rightEye"},{"x":326.318359375,"y":232.90250301361084,"z":8.029969334602356,"name":"rightEye"},{"x":329.6211624145508,"y":231.6195774078369,"z":9.722331762313843,"name":"rightEye"},{"x":285.9398078918457,"y":228.2351303100586,"z":24.650139808654785},{"x":325.79288482666016,"y":227.88007736206055,"z":7.469738721847534,"name":"rightEye"},{"x":320.1699447631836,"y":227.5934886932373,"z":6.168370842933655,"name":"rightEye"},{"x":314.85408782958984,"y":227.85282611846924,"z":6.2675780057907104,"name":"rightEye"},{"x":309.3084907531738,"y":229.1516876220703,"z":7.7031683921813965,"name":"rightEye"},{"x":305.5621337890625,"y":230.92366218566895,"z":9.722331762313843,"name":"rightEye"},{"x":277.8681945800781,"y":228.5354232788086,"z":59.71122741699219,"name":"faceOval"},{"x":306.1444664001465,"y":235.1954698562622,"z":10.603528022766113,"name":"rightEye"},{"x":355.4478454589844,"y":281.96210861206055,"z":-20.565123558044434},{"x":333.02661895751953,"y":288.0105400085449,"z":-14.72939133644104},{"x":337.15728759765625,"y":269.2059516906738,"z":-19.8414945602417},{"x":345.9898376464844,"y":283.5453128814697,"z":-20.4834246635437},{"x":351.48963928222656,"y":219.98916149139404,"z":-7.0378947257995605},{"x":312.39574432373047,"y":336.50628089904785,"z":8.671900033950806},{"x":321.32152557373047,"y":343.1755256652832,"z":0.9067271649837494},{"x":343.78379821777344,"y":353.2975959777832,"z":-14.355905055999756},{"x":296.8791389465332,"y":327.91497230529785,"z":41.01353645324707,"name":"faceOval"},{"x":329.6939468383789,"y":229.27897453308105,"z":8.934508562088013,"name":"rightEye"},{"x":341.6905212402344,"y":241.4073657989502,"z":-14.589333534240723},{"x":359.03079986572266,"y":353.48859786987305,"z":-15.803166627883911},{"x":333.1861877441406,"y":356.43213272094727,"z":-1.0234417766332626,"name":"faceOval"},{"x":283.97483825683594,"y":291.4318656921387,"z":41.94725513458252},{"x":343.33770751953125,"y":305.830135345459,"z":-15.756480693817139,"name":"lips"},{"x":342.40283966064453,"y":307.7453899383545,"z":-17.4021577835083},{"x":341.53621673583984,"y":311.0595703125,"z":-19.047834873199463},{"x":340.9107208251953,"y":315.4837703704834,"z":-18.5576331615448,"name":"lips"},{"x":339.1478729248047,"y":323.42233657836914,"z":-14.367576837539673},{"x":333.3201599121094,"y":307.4406337738037,"z":-9.617288708686829},{"x":331.2411117553711,"y":306.9811820983887,"z":-9.669809937477112},{"x":329.23255920410156,"y":306.0508346557617,"z":-9.582273960113525,"name":"lips"},{"x":322.4586486816406,"y":301.33323669433594,"z":-7.720675468444824},{"x":297.1712112426758,"y":286.9552803039551,"z":8.240055441856384},{"x":341.3060760498047,"y":235.4432201385498,"z":-7.504753470420837},{"x":336.9318389892578,"y":224.3451976776123,"z":5.829898118972778},{"x":332.65323638916016,"y":226.70403957366943,"z":8.105834126472473},{"x":334.67357635498047,"y":306.4397621154785,"z":-8.981193900108337,"name":"lips"},{"x":297.4601936340332,"y":306.29210472106934,"z":15.476365089416504},{"x":342.9119110107422,"y":222.37077713012695,"z":-2.754466235637665},{"x":335.4629898071289,"y":332.20250129699707,"z":-11.823196411132812},{"x":353.2412338256836,"y":240.56339263916016,"z":-27.147831916809082},{"x":346.3080596923828,"y":236.41446590423584,"z":-18.452589511871338},{"x":352.6475143432617,"y":234.1420555114746,"z":-19.748122692108154},{"x":337.3209762573242,"y":253.39937210083008,"z":-16.024924516677856},{"x":358.6122131347656,"y":344.90861892700195,"z":-18.592647314071655},{"x":358.1117248535156,"y":334.64990615844727,"z":-17.49552845954895},{"x":346.4450454711914,"y":335.0321102142334,"z":-16.32838249206543},{"x":319.17640686035156,"y":320.2833938598633,"z":-3.276764452457428},{"x":325.2540588378906,"y":276.2369728088379,"z":-6.460157036781311},{"x":326.7214584350586,"y":327.3939514160156,"z":-7.417217493057251},{"x":310.7190132141113,"y":277.2265148162842,"z":-3.5452082753181458},{"x":319.78355407714844,"y":284.8238182067871,"z":-6.4543211460113525},{"x":305.773983001709,"y":290.83580017089844,"z":0.06907138042151928},{"x":344.4001770019531,"y":344.85408782958984,"z":-16.946970224380493},{"x":333.1879425048828,"y":258.74256134033203,"z":-11.90489649772644},{"x":313.80598068237305,"y":327.08919525146484,"z":2.2277912497520447},{"x":322.9637908935547,"y":334.6819496154785,"z":-3.3643004298210144},{"x":313.4055519104004,"y":311.2166690826416,"z":-1.1175429821014404},{"x":291.0865783691406,"y":298.2831001281738,"z":22.467575073242188},{"x":305.6580924987793,"y":313.3707904815674,"z":5.561453700065613},{"x":288.23760986328125,"y":305.9941864013672,"z":36.765122413635254},{"x":315.10692596435547,"y":296.26991271972656,"z":-4.604393839836121},{"x":337.50518798828125,"y":247.5944423675537,"z":-10.597691535949707},{"x":338.8450622558594,"y":265.47778129577637,"z":-27.778091430664062},{"x":334.25254821777344,"y":269.0671920776367,"z":-20.938611030578613},{"x":341.64512634277344,"y":259.6387195587158,"z":-32.189905643463135},{"x":331.44081115722656,"y":219.0976095199585,"z":4.207563698291779},{"x":320.56339263916016,"y":216.49658203125,"z":2.930997312068939},{"x":311.21912002563477,"y":216.57853603363037,"z":2.9674705862998962},{"x":303.46256256103516,"y":218.54614734649658,"z":5.357203483581543},{"x":297.99999237060547,"y":222.505202293396,"z":9.325502514839172},{"x":294.93839263916016,"y":236.39654159545898,"z":18.534289598464966},{"x":278.87489318847656,"y":259.7095584869385,"z":45.68212032318115},{"x":300.3782653808594,"y":245.38593292236328,"z":12.278382778167725},{"x":307.06348419189453,"y":246.36857986450195,"z":8.164191246032715},{"x":315.5229187011719,"y":245.3949737548828,"z":5.503097176551819},{"x":323.71395111083984,"y":242.75178909301758,"z":4.6335723996162415},{"x":330.2785873413086,"y":239.34658527374268,"z":4.937030673027039},{"x":334.6982192993164,"y":236.0460376739502,"z":4.823233783245087},{"x":279.3412208557129,"y":263.5196113586426,"z":70.91583728790283,"name":"faceOval"},{"x":334.65972900390625,"y":271.6648578643799,"z":-17.775644063949585},{"x":342.05677032470703,"y":246.99846267700195,"z":-20.84523916244507},{"x":344.0357971191406,"y":264.5701503753662,"z":-32.936880588531494},{"x":348.25531005859375,"y":268.6645030975342,"z":-30.695960521697998},{"x":344.12227630615234,"y":266.34212493896484,"z":-29.808926582336426},{"x":337.12318420410156,"y":274.2556858062744,"z":-15.768152475357056},{"x":349.49047088623047,"y":269.071683883667,"z":-32.51670837402344},{"x":350.1683044433594,"y":271.4691352844238,"z":-24.93025302886963},{"x":333.9634704589844,"y":230.56639194488525,"z":8.89949381351471},{"x":338.2147979736328,"y":231.4807891845703,"z":4.6715047955513},{"x":340.4712677001953,"y":231.74463272094727,"z":-0.34996166825294495},{"x":303.28975677490234,"y":232.24980354309082,"z":11.916568279266357,"name":"rightEye"},{"x":299.4649124145508,"y":229.53842639923096,"z":12.325069904327393},{"x":359.09618377685547,"y":241.77349090576172,"z":-24.650139808654785},{"x":399.46216583251953,"y":229.89503860473633,"z":15.919880867004395,"name":"leftEye"},{"x":361.38919830322266,"y":269.6129894256592,"z":-24.510080814361572},{"x":416.9973373413086,"y":206.0895538330078,"z":53.26857566833496,"name":"faceOval"},{"x":381.32179260253906,"y":235.5476474761963,"z":7.6214683055877686},{"x":387.8068542480469,"y":236.25958442687988,"z":8.345099091529846},{"x":393.95751953125,"y":235.8660364151001,"z":10.475142002105713},{"x":401.84600830078125,"y":232.77019500732422,"z":16.760226488113403},{"x":375.70568084716797,"y":233.48456382751465,"z":8.234220147132874},{"x":388.17752838134766,"y":218.94717693328857,"z":6.810300946235657},{"x":381.64928436279297,"y":219.2656660079956,"z":6.711093783378601},{"x":394.4760513305664,"y":219.66821193695068,"z":9.173773527145386},{"x":398.8843536376953,"y":221.8837022781372,"z":12.03328251838684},{"x":406.5454864501953,"y":237.12156772613525,"z":19.7131085395813},{"x":383.87447357177734,"y":337.6932907104492,"z":-8.631049990653992},{"x":401.2682342529297,"y":228.5916566848755,"z":18.359217643737793,"name":"leftEye"},{"x":422.0449447631836,"y":236.73934936523438,"z":51.16771221160889},{"x":412.69153594970703,"y":232.80198097229004,"z":27.52131938934326},{"x":387.3497772216797,"y":263.298397064209,"z":-2.8609684109687805},{"x":364.5124053955078,"y":293.39221000671387,"z":-22.397546768188477,"name":"lips"},{"x":363.62987518310547,"y":302.1291446685791,"z":-19.643079042434692},{"x":373.2334518432617,"y":295.8647060394287,"z":-18.125789165496826,"name":"lips"},{"x":378.83365631103516,"y":299.5177745819092,"z":-13.153743743896484,"name":"lips"},{"x":369.91477966308594,"y":302.5704002380371,"z":-16.65518283843994},{"x":374.9167251586914,"y":303.5416603088379,"z":-11.963253021240234},{"x":387.58888244628906,"y":312.2716999053955,"z":-4.680258631706238},{"x":360.6635284423828,"y":264.31986808776855,"z":-35.94811677932739},{"x":361.04564666748047,"y":256.8225860595703,"z":-37.278664112091064},{"x":408.3855438232422,"y":213.52088928222656,"z":15.756480693817139,"name":"leftEyebrow"},{"x":373.2946014404297,"y":245.38101196289062,"z":-1.9316278398036957},{"x":376.83860778808594,"y":264.3721103668213,"z":-18.510947227478027},{"x":376.9546127319336,"y":261.0010528564453,"z":-15.989909172058105},{"x":406.1498260498047,"y":263.5030174255371,"z":7.072908878326416},{"x":360.07205963134766,"y":248.3631706237793,"z":-32.16656446456909},{"x":393.11119079589844,"y":205.10473251342773,"z":3.7786373496055603,"name":"leftEyebrow"},{"x":402.12791442871094,"y":207.89000988006592,"z":9.383859634399414,"name":"leftEyebrow"},{"x":410.8693313598633,"y":191.6182279586792,"z":41.27030849456787,"name":"faceOval"},{"x":364.9509811401367,"y":210.40483474731445,"z":-3.758212625980377},{"x":375.94444274902344,"y":221.1331844329834,"z":8.368442058563232},{"x":392.1904754638672,"y":305.0360298156738,"z":-1.752179116010666},{"x":419.50225830078125,"y":307.25592613220215,"z":58.96425247192383,"name":"faceOval"},{"x":372.0027160644531,"y":268.7212657928467,"z":-16.631840467453003},{"x":366.1614227294922,"y":271.6237449645996,"z":-18.219159841537476},{"x":385.00938415527344,"y":305.3863334655762,"z":-2.567722797393799},{"x":381.99771881103516,"y":304.9723720550537,"z":-4.575215280056},{"x":405.078125,"y":203.21216583251953,"z":13.713973760604858,"name":"leftEyebrow"},{"x":377.13207244873047,"y":268.4710121154785,"z":-15.266278982162476},{"x":380.9713363647461,"y":205.36980628967285,"z":-0.7250899076461792,"name":"leftEyebrow"},{"x":381.7788314819336,"y":198.9268398284912,"z":-1.184653863310814,"name":"leftEyebrow"},{"x":385.5204772949219,"y":172.1484375,"z":16.04826807975769,"name":"faceOval"},{"x":407.94189453125,"y":196.76236152648926,"z":25.723915100097656},{"x":383.03890228271484,"y":184.5157527923584,"z":7.393874526023865},{"x":411.61781311035156,"y":210.79241752624512,"z":22.315845489501953,"name":"leftEyebrow"},{"x":414.30870056152344,"y":208.4643030166626,"z":37.021894454956055},{"x":364.28722381591797,"y":298.35777282714844,"z":-21.86065673828125},{"x":371.3682556152344,"y":299.78848457336426,"z":-17.834001779556274},{"x":376.88201904296875,"y":301.6696071624756,"z":-13.153743743896484},{"x":370.2193832397461,"y":270.49095153808594,"z":-15.569736957550049},{"x":383.5081100463867,"y":305.2726364135742,"z":-3.673594295978546},{"x":380.73760986328125,"y":305.96869468688965,"z":-8.660228252410889},{"x":381.2334442138672,"y":304.63574409484863,"z":-4.820316135883331,"name":"lips"},{"x":368.1698989868164,"y":264.8884963989258,"z":-25.653886795043945},{"x":373.5087203979492,"y":303.4233856201172,"z":-10.95950722694397,"name":"lips"},{"x":368.4544372558594,"y":303.29601287841797,"z":-14.169161319732666,"name":"lips"},{"x":362.76554107666016,"y":303.5735607147217,"z":-16.911956071853638,"name":"lips"},{"x":366.60980224609375,"y":324.8870658874512,"z":-15.616422891616821},{"x":365.7067108154297,"y":315.95678329467773,"z":-20.903596878051758,"name":"lips"},{"x":365.0083923339844,"y":311.2232208251953,"z":-21.066999435424805},{"x":364.1508102416992,"y":307.0583438873291,"z":-18.907777070999146},{"x":363.37512969970703,"y":304.5721435546875,"z":-17.42550015449524,"name":"lips"},{"x":374.580078125,"y":304.3059539794922,"z":-11.40302300453186,"name":"lips"},{"x":375.55362701416016,"y":305.0998020172119,"z":-12.861957550048828},{"x":377.2437286376953,"y":307.1674346923828,"z":-14.215847253799438},{"x":378.68587493896484,"y":309.9015712738037,"z":-13.223772048950195,"name":"lips"},{"x":383.8992691040039,"y":290.29629707336426,"z":-9.97326910495758},{"x":423.3871841430664,"y":271.91688537597656,"z":74.37058925628662,"name":"faceOval"},{"x":377.68043518066406,"y":304.62209701538086,"z":-7.603961229324341,"name":"lips"},{"x":379.00428771972656,"y":304.9314594268799,"z":-8.57852816581726},{"x":364.00279998779297,"y":275.2813911437988,"z":-19.25792098045349},{"x":374.68231201171875,"y":273.82555961608887,"z":-11.28047227859497},{"x":365.0354766845703,"y":273.4548568725586,"z":-18.791062831878662},{"x":380.61901092529297,"y":249.8848056793213,"z":0.15501167625188828},{"x":391.14158630371094,"y":254.7934627532959,"z":2.0906515419483185},{"x":378.1761169433594,"y":264.9612236022949,"z":-12.605184316635132},{"x":400.9540557861328,"y":179.99592304229736,"z":27.82477855682373,"name":"faceOval"},{"x":398.0038833618164,"y":188.50656509399414,"z":16.094952821731567},{"x":394.8717498779297,"y":199.0359592437744,"z":6.226727366447449,"name":"leftEyebrow"},{"x":382.10926055908203,"y":316.83926582336426,"z":-8.946179747581482},{"x":366.51588439941406,"y":200.32583713531494,"z":-5.24632453918457,"name":"leftEyebrow"},{"x":367.4893569946289,"y":183.87210845947266,"z":1.9039081037044525},{"x":368.6243438720703,"y":168.8127565383911,"z":8.736093044281006,"name":"faceOval"},{"x":398.96175384521484,"y":234.9675178527832,"z":13.713973760604858},{"x":412.9645538330078,"y":242.23042488098145,"z":23.272905349731445},{"x":372.05257415771484,"y":231.41919136047363,"z":9.226294755935669},{"x":406.0722351074219,"y":223.58965873718262,"z":18.370890617370605},{"x":368.27442169189453,"y":240.2039337158203,"z":-4.166713654994965},{"x":372.3575210571289,"y":260.66442489624023,"z":-24.976940155029297},{"x":419.2244338989258,"y":247.9079246520996,"z":30.299127101898193},{"x":409.43885803222656,"y":246.60913467407227,"z":16.398411989212036},{"x":401.69139862060547,"y":248.76328468322754,"z":9.395531415939331},{"x":389.7608184814453,"y":247.56915092468262,"z":5.841569304466248},{"x":380.5461883544922,"y":244.55984115600586,"z":4.263003468513489},{"x":373.25817108154297,"y":240.80214500427246,"z":2.5356262922286987},{"x":358.77086639404297,"y":229.35615062713623,"z":-10.387605428695679},{"x":419.5793914794922,"y":262.8478717803955,"z":26.5175724029541},{"x":410.8808898925781,"y":222.51372814178467,"z":22.199130058288574},{"x":358.45714569091797,"y":268.91467094421387,"z":-33.17030906677246},{"x":373.4129333496094,"y":251.6385841369629,"z":-5.771540403366089},{"x":422.5408172607422,"y":239.23919677734375,"z":74.04378890991211,"name":"faceOval"},{"x":367.8171920776367,"y":236.58040523529053,"z":1.820748895406723},{"x":378.51959228515625,"y":266.2532329559326,"z":-5.74819803237915},{"x":403.3472442626953,"y":229.05112266540527,"z":19.689764976501465},{"x":372.34840393066406,"y":256.6451168060303,"z":-21.872329711914062},{"x":422.54566192626953,"y":289.1587829589844,"z":68.67491245269775,"name":"faceOval"},{"x":371.9297409057617,"y":228.90116214752197,"z":11.432201862335205,"name":"leftEye"},{"x":366.21360778808594,"y":251.6158962249756,"z":-28.19826364517212},{"x":409.1571807861328,"y":321.3156223297119,"z":20.2266526222229},{"x":408.52943420410156,"y":331.44238471984863,"z":31.09278917312622,"name":"faceOval"},{"x":424.2788314819336,"y":267.1992301940918,"z":50.467424392700195},{"x":415.60352325439453,"y":311.6528606414795,"z":30.579242706298828},{"x":418.12793731689453,"y":221.59927368164062,"z":46.26569747924805},{"x":385.68286895751953,"y":346.0184955596924,"z":-5.70151150226593},{"x":357.82936096191406,"y":271.3758373260498,"z":-24.836881160736084},{"x":379.588623046875,"y":257.5071716308594,"z":-3.755294680595398},{"x":417.4592590332031,"y":234.71948146820068,"z":34.5475435256958},{"x":393.4684371948242,"y":231.58967971801758,"z":11.408859491348267,"name":"leftEye"},{"x":387.8864288330078,"y":232.14245796203613,"z":9.51808214187622,"name":"leftEye"},{"x":382.4981689453125,"y":307.5654888153076,"z":-7.522260546684265,"name":"lips"},{"x":419.00169372558594,"y":277.8332805633545,"z":26.424202919006348},{"x":373.62953186035156,"y":357.6375102996826,"z":-5.75986921787262,"name":"faceOval"},{"x":392.8708267211914,"y":347.72446632385254,"z":10.154176950454712,"name":"faceOval"},{"x":400.3953552246094,"y":341.0005187988281,"z":19.39797878265381,"name":"faceOval"},{"x":382.25440979003906,"y":231.66935920715332,"z":8.998700976371765,"name":"leftEye"},{"x":377.14550018310547,"y":230.4228687286377,"z":9.804032444953918,"name":"leftEye"},{"x":373.8358688354492,"y":229.64950561523438,"z":11.292144060134888,"name":"leftEye"},{"x":414.5794677734375,"y":221.67891025543213,"z":29.412097930908203},{"x":377.00672149658203,"y":225.66201210021973,"z":9.360517263412476,"name":"leftEye"},{"x":382.29530334472656,"y":224.8431158065796,"z":8.32175612449646,"name":"leftEye"},{"x":387.5133514404297,"y":224.49507236480713,"z":8.917000889778137,"name":"leftEye"},{"x":393.15906524658203,"y":225.24795055389404,"z":10.737749338150024,"name":"leftEye"},{"x":397.05554962158203,"y":226.55359268188477,"z":13.002015352249146,"name":"leftEye"},{"x":420.5299377441406,"y":221.014666557312,"z":65.40690422058105,"name":"faceOval"},{"x":397.06920623779297,"y":230.6661558151245,"z":13.807345628738403,"name":"leftEye"},{"x":377.94647216796875,"y":285.1647090911865,"z":-13.305472135543823},{"x":372.1118927001953,"y":267.1267318725586,"z":-18.83774757385254},{"x":364.9968719482422,"y":282.24411964416504,"z":-19.818150997161865},{"x":401.973876953125,"y":331.20131492614746,"z":11.566424369812012},{"x":394.3083190917969,"y":338.86693954467773,"z":3.142542541027069},{"x":373.9820861816406,"y":351.4504623413086,"z":-13.50388765335083},{"x":414.3888854980469,"y":321.24735832214355,"z":45.51872253417969,"name":"faceOval"},{"x":373.44234466552734,"y":227.33163356781006,"z":10.626870393753052,"name":"leftEye"},{"x":364.0731430053711,"y":240.31539916992188,"z":-13.807345628738403},{"x":384.2658233642578,"y":353.3793067932129,"z":0.7385850697755814,"name":"faceOval"},{"x":423.20526123046875,"y":283.5176181793213,"z":47.152724266052246},{"x":369.42798614501953,"y":304.0898895263672,"z":-14.647691249847412,"name":"lips"},{"x":370.63812255859375,"y":305.90051651000977,"z":-16.211668252944946},{"x":371.91192626953125,"y":309.0167713165283,"z":-17.84567356109619},{"x":373.0583953857422,"y":313.3545398712158,"z":-17.378815412521362,"name":"lips"},{"x":375.39905548095703,"y":321.09289169311523,"z":-13.118728399276733},{"x":379.2567825317383,"y":304.3582534790039,"z":-7.924926280975342},{"x":381.18797302246094,"y":303.7031364440918,"z":-7.843226194381714},{"x":383.0918502807617,"y":302.4884605407715,"z":-7.6506465673446655,"name":"lips"},{"x":389.09461975097656,"y":297.1475315093994,"z":-5.5497825145721436},{"x":411.6408920288086,"y":280.24898529052734,"z":12.02161192893982},{"x":363.3110809326172,"y":234.27620887756348,"z":-6.775286793708801},{"x":366.0474395751953,"y":223.29872131347656,"z":6.827808618545532},{"x":370.34427642822266,"y":225.1457118988037,"z":9.558931589126587},{"x":377.5371551513672,"y":303.60079765319824,"z":-7.358860373497009,"name":"lips"},{"x":412.9557800292969,"y":299.53579902648926,"z":19.39797878265381},{"x":360.0810241699219,"y":221.72012329101562,"z":-2.153385728597641},{"x":379.82784271240234,"y":329.47723388671875,"z":-10.48097848892212},{"x":359.08477783203125,"y":235.7911491394043,"z":-18.079102039337158},{"x":369.6688461303711,"y":251.5407943725586,"z":-14.962821006774902},{"x":369.5555114746094,"y":333.5307312011719,"z":-15.67478060722351},{"x":394.0193176269531,"y":315.6973171234131,"z":-0.9920747578144073},{"x":383.78997802734375,"y":272.7268695831299,"z":-4.689012169837952},{"x":387.67765045166016,"y":323.6722755432129,"z":-5.640236139297485},{"x":397.8769302368164,"y":272.1331214904785,"z":-0.9395531564950943},{"x":389.87476348876953,"y":280.5630111694336,"z":-4.29218202829361},{"x":403.83888244628906,"y":285.1167869567871,"z":3.0229100584983826},{"x":372.5467300415039,"y":343.1070327758789,"z":-16.153310537338257},{"x":374.1112518310547,"y":256.3721466064453,"z":-10.574349164962769},{"x":399.73785400390625,"y":321.77515983581543,"z":4.849494695663452},{"x":392.03365325927734,"y":330.56447982788086,"z":-1.3407598435878754},{"x":398.59134674072266,"y":305.93902587890625,"z":1.517290621995926},{"x":417.95997619628906,"y":290.9716987609863,"z":26.89105987548828},{"x":406.04541778564453,"y":307.35154151916504,"z":8.666064143180847},{"x":420.75328826904297,"y":298.40752601623535,"z":41.78385257720947},{"x":395.4522705078125,"y":291.4153575897217,"z":-2.1752697229385376},{"x":368.6452102661133,"y":245.8882999420166,"z":-9.453888535499573},{"x":370.34900665283203,"y":263.56690406799316,"z":-26.75100326538086},{"x":374.98477935791016,"y":266.6126346588135,"z":-19.77146625518799},{"x":366.99840545654297,"y":258.12140464782715,"z":-31.372904777526855},{"x":371.00616455078125,"y":217.63479709625244,"z":5.60522198677063},{"x":381.30577087402344,"y":214.14087295532227,"z":4.983716309070587},{"x":390.1496124267578,"y":213.38221549987793,"z":5.593550801277161},{"x":397.7696990966797,"y":214.3659782409668,"z":8.57852816581726},{"x":403.1652069091797,"y":217.65509605407715,"z":13.013685941696167},{"x":407.3551940917969,"y":230.72525024414062,"z":22.444231510162354},{"x":424.0876770019531,"y":251.7839241027832,"z":51.16771221160889},{"x":403.50196838378906,"y":239.88757610321045,"z":15.803166627883911},{"x":397.31719970703125,"y":241.49806022644043,"z":11.233787536621094},{"x":388.99425506591797,"y":241.4366912841797,"z":7.948269248008728},{"x":380.7804489135742,"y":239.78078842163086,"z":6.600214838981628},{"x":374.01336669921875,"y":237.11946487426758,"z":6.349278092384338},{"x":369.39125061035156,"y":234.35351371765137,"z":5.987462401390076},{"x":422.9730987548828,"y":255.76455116271973,"z":76.61150932312012,"name":"faceOval"},{"x":374.73915100097656,"y":269.24214363098145,"z":-16.608498096466064},{"x":364.61681365966797,"y":245.71088790893555,"z":-20.02823829650879},{"x":365.3834533691406,"y":263.34174156188965,"z":-32.32996463775635},{"x":361.58252716064453,"y":267.8273677825928,"z":-30.345816612243652},{"x":365.37208557128906,"y":265.0249671936035,"z":-29.178667068481445},{"x":372.72605895996094,"y":272.05135345458984,"z":-14.834434986114502},{"x":360.48614501953125,"y":268.34827423095703,"z":-32.189905643463135},{"x":359.9516296386719,"y":270.8049201965332,"z":-24.650139808654785},{"x":369.5049285888672,"y":229.01945114135742,"z":10.107489824295044},{"x":365.5447769165039,"y":230.24096488952637,"z":5.593550801277161},{"x":363.50669860839844,"y":230.6208372116089,"z":0.43622106313705444},{"x":399.3529510498047,"y":227.65677452087402,"z":15.35965085029602,"name":"leftEye"},{"x":402.5693130493164,"y":224.60190296173096,"z":15.931552648544312}
    ],
    "box": {
      "xMin":277.8318977355957,
      "yMin":168.7741756439209,
      "xMax":424.2788314819336,
      "yMax":359.8348903656006,
      "width":146.4469337463379,
      "height":191.0607147216797
    }
  },
  // Tasks-vision: https://developers.google.com/mediapipe/solutions/vision/face_landmarker/web_js
  // prettier-ignore
  SAMPLE_FACELANDMARKER_RESULT: {
    "faceLandmarks": [
      [
        { "x": 0.5760777592658997, "y": 0.8639070391654968, "z": -0.030997956171631813 },
        { "x": 0.572094738483429, "y": 0.7886289358139038, "z": -0.07189624011516571 },
        { "x": 0.5723551511764526, "y": 0.8075382709503174, "z": -0.03578168898820877 }, { "x": 0.5548420548439026, "y": 0.7188365459442139, "z": -0.057787876576185226 }, { "x": 0.5706077814102173, "y": 0.7674974799156189, "z": -0.07740399986505508 }, { "x": 0.5681378245353699, "y": 0.7387768030166626, "z": -0.07356284558773041 }, { "x": 0.5621535181999207, "y": 0.6681165099143982, "z": -0.04189874976873398 }, { "x": 0.46613582968711853, "y": 0.6679812073707581, "z": 0.011289681307971478 }, { "x": 0.5579932928085327, "y": 0.6174106597900391, "z": -0.03502821549773216 }, { "x": 0.5563451647758484, "y": 0.5905600190162659, "z": -0.03928658738732338 }, { "x": 0.5487832427024841, "y": 0.4900572597980499, "z": -0.029898937791585922 }, { "x": 0.5765544176101685, "y": 0.8692144751548767, "z": -0.02831427752971649 }, { "x": 0.5771114230155945, "y": 0.873644232749939, "z": -0.02345779910683632 }, { "x": 0.5771905779838562, "y": 0.877016007900238, "z": -0.016658689826726913 }, { "x": 0.5778058767318726, "y": 0.8770116567611694, "z": -0.014505492523312569 }, { "x": 0.5783766508102417, "y": 0.8835000991821289, "z": -0.015996402129530907 }, { "x": 0.5792440176010132, "y": 0.8913810849189758, "z": -0.01924579218029976 }, { "x": 0.5796768069267273, "y": 0.8996334671974182, "z": -0.018261712044477463 }, { "x": 0.5817288160324097, "y": 0.9255813956260681, "z": -0.007126849144697189 }, { "x": 0.5726592540740967, "y": 0.7992473244667053, "z": -0.0643521398305893 }, { "x": 0.5579419136047363, "y": 0.7996989488601685, "z": -0.04566684365272522 }, { "x": 0.4216199815273285, "y": 0.5958762764930725, "z": 0.06776496022939682 }, { "x": 0.5052269697189331, "y": 0.6796539425849915, "z": -0.0010737782577052712 }, { "x": 0.49243026971817017, "y": 0.6838865876197815, "z": -0.0005227324436418712 }, { "x": 0.4796970784664154, "y": 0.6856290102005005, "z": 0.002684245817363262 }, { "x": 0.4618356227874756, "y": 0.6764569878578186, "z": 0.013439622707664967 }, { "x": 0.5160380601882935, "y": 0.6737282276153564, "z": -0.000017607348127057776 }, { "x": 0.48070961236953735, "y": 0.6255870461463928, "z": -0.008339674212038517 }, { "x": 0.49719780683517456, "y": 0.6256808042526245, "z": -0.008027955889701843 }, { "x": 0.46674346923828125, "y": 0.6317623853683472, "z": -0.004460199736058712 }, { "x": 0.4582492709159851, "y": 0.641118049621582, "z": 0.0011905613355338573 }, { "x": 0.45408669114112854, "y": 0.6911458969116211, "z": 0.020514748990535736 }, { "x": 0.535312294960022, "y": 0.9619986414909363, "z": 0.012499462813138962 }, { "x": 0.4608460068702698, "y": 0.6628725528717041, "z": 0.01517564244568348 }, { "x": 0.4206731915473938, "y": 0.6828458309173584, "z": 0.07848648726940155 }, { "x": 0.4390624463558197, "y": 0.6796106696128845, "z": 0.03283142298460007 }, { "x": 0.5029968619346619, "y": 0.7701570391654968, "z": -0.009734481573104858 }, { "x": 0.5595027208328247, "y": 0.8607323169708252, "z": -0.030043255537748337 }, { "x": 0.5621269941329956, "y": 0.8738374710083008, "z": -0.021709579974412918 }, { "x": 0.5451499819755554, "y": 0.865527331829071, "z": -0.022014077752828598 }, { "x": 0.5351184010505676, "y": 0.8705098032951355, "z": -0.011602800339460373 }, { "x": 0.5495014190673828, "y": 0.8744956254959106, "z": -0.016490943729877472 }, { "x": 0.5395170450210571, "y": 0.8759440779685974, "z": -0.007333362940698862 }, { "x": 0.5183624029159546, "y": 0.8959754705429077, "z": 0.010520773939788342 }, { "x": 0.5604349374771118, "y": 0.7895449995994568, "z": -0.07082037627696991 }, { "x": 0.557381272315979, "y": 0.7687489986419678, "z": -0.07590588927268982 }, { "x": 0.4432901442050934, "y": 0.6308897733688354, "z": 0.0027153254486620426 }, { "x": 0.5258325338363647, "y": 0.7151225805282593, "z": -0.014676518738269806 }, { "x": 0.5271827578544617, "y": 0.7833116054534912, "z": -0.037643320858478546 }, { "x": 0.5257382988929749, "y": 0.7717816233634949, "z": -0.03401920944452286 }, { "x": 0.46516409516334534, "y": 0.7705106735229492, "z": 0.0065747760236263275 }, { "x": 0.5558893084526062, "y": 0.7420997619628906, "z": -0.0694495290517807 }, { "x": 0.4720408320426941, "y": 0.6066038608551025, "z": -0.021204356104135513 }, { "x": 0.45432573556900024, "y": 0.6158540844917297, "z": -0.011054684408009052 }, { "x": 0.4305151402950287, "y": 0.5608053803443909, "z": 0.0396830290555954 }, { "x": 0.5310865640640259, "y": 0.6157484650611877, "z": -0.03081176057457924 }, { "x": 0.5114666223526001, "y": 0.6329749226570129, "z": -0.00335998204536736 }, { "x": 0.506435751914978, "y": 0.8786543607711792, "z": 0.012980876490473747 }, { "x": 0.4480472207069397, "y": 0.8640613555908203, "z": 0.12569651007652283 }, { "x": 0.5372058153152466, "y": 0.7942581176757812, "z": -0.03168361634016037 }, { "x": 0.5488379597663879, "y": 0.8001630306243896, "z": -0.03280917927622795 }, { "x": 0.5213388204574585, "y": 0.8794381618499756, "z": 0.011892606504261494 }, { "x": 0.5242055654525757, "y": 0.8789222240447998, "z": 0.008370225317776203 }, { "x": 0.4477175176143646, "y": 0.6039950251579285, "z": -0.0050799972377717495 }, { "x": 0.526964008808136, "y": 0.7916748523712158, "z": -0.02968614175915718 }, { "x": 0.4971255660057068, "y": 0.6050706505775452, "z": -0.028175678104162216 }, { "x": 0.4938119053840637, "y": 0.5882453918457031, "z": -0.03210941329598427 }, { "x": 0.4757143557071686, "y": 0.5094879865646362, "z": -0.01300730835646391 }, { "x": 0.43947282433509827, "y": 0.5816648006439209, "z": 0.01415177434682846 }, { "x": 0.485664039850235, "y": 0.5477864146232605, "z": -0.023685332387685776 }, { "x": 0.43635931611061096, "y": 0.6226438283920288, "z": 0.013606148771941662 }, { "x": 0.42910251021385193, "y": 0.6102726459503174, "z": 0.03926564007997513 }, { "x": 0.5605402588844299, "y": 0.8680099248886108, "z": -0.027318159118294716 }, { "x": 0.5474816560745239, "y": 0.8702861070632935, "z": -0.019686367362737656 }, { "x": 0.5373021364212036, "y": 0.8728838562965393, "z": -0.010484928265213966 }, { "x": 0.540735125541687, "y": 0.7979167103767395, "z": -0.029073253273963928 }, { "x": 0.5228585004806519, "y": 0.87913578748703, "z": 0.009915109723806381 }, { "x": 0.530497670173645, "y": 0.8815253973007202, "z": 0.0020524784922599792 }, { "x": 0.5259912610054016, "y": 0.8790552616119385, "z": 0.007895970717072487 }, { "x": 0.5433906316757202, "y": 0.7882310748100281, "z": -0.05121905356645584 }, { "x": 0.541388213634491, "y": 0.8777219653129578, "z": -0.00466804439201951 }, { "x": 0.5515822172164917, "y": 0.8767023086547852, "z": -0.010475946590304375 }, { "x": 0.5637003779411316, "y": 0.877059817314148, "z": -0.015273625031113625 }, { "x": 0.5640299320220947, "y": 0.9263423085212708, "z": -0.00658724969252944 }, { "x": 0.5642300248146057, "y": 0.8993074893951416, "z": -0.017653480172157288 }, { "x": 0.5637336373329163, "y": 0.8910360932350159, "z": -0.01852807030081749 }, { "x": 0.5637134313583374, "y": 0.8837276697158813, "z": -0.01482592523097992 }, { "x": 0.564205527305603, "y": 0.8768964409828186, "z": -0.01331155002117157 }, { "x": 0.5419867634773254, "y": 0.8778373599052429, "z": -0.0037720394320786 }, { "x": 0.5404468774795532, "y": 0.880696177482605, "z": -0.005610354244709015 }, { "x": 0.5392338633537292, "y": 0.8845721483230591, "z": -0.007352025713771582 }, { "x": 0.538469672203064, "y": 0.8891173601150513, "z": -0.005154991988092661 }, { "x": 0.5189250111579895, "y": 0.8452741503715515, "z": -0.009755070321261883 }, { "x": 0.4258975088596344, "y": 0.7662280797958374, "z": 0.1387351155281067 }, { "x": 0.5725725293159485, "y": 0.8041572570800781, "z": -0.04583907872438431 }, { "x": 0.5342061519622803, "y": 0.8785833120346069, "z": 0.002659974154084921 }, { "x": 0.5324031114578247, "y": 0.8804071545600891, "z": 0.0017832003068178892 }, { "x": 0.5538818836212158, "y": 0.8078407645225525, "z": -0.03254539892077446 }, { "x": 0.5325431823730469, "y": 0.8026832938194275, "z": -0.019140373915433884 }, { "x": 0.5514076948165894, "y": 0.8043903112411499, "z": -0.03313535451889038 }, { "x": 0.5131856203079224, "y": 0.7284771800041199, "z": -0.009399853646755219 }, { "x": 0.49331504106521606, "y": 0.7443980574607849, "z": -0.005225230939686298 }, { "x": 0.5239617824554443, "y": 0.7807451486587524, "z": -0.025881027802824974 }, { "x": 0.4473606050014496, "y": 0.5315827131271362, "z": 0.011164786294102669 }, { "x": 0.45718759298324585, "y": 0.5604941248893738, "z": -0.005943301599472761 }, { "x": 0.4670005738735199, "y": 0.5909327268600464, "z": -0.019681761041283607 }, { "x": 0.5311570167541504, "y": 0.9076261520385742, "z": 0.00389476353302598 }, { "x": 0.5249923467636108, "y": 0.5893563628196716, "z": -0.037981919944286346 }, { "x": 0.5166932344436646, "y": 0.5429551005363464, "z": -0.03319704160094261 }, { "x": 0.5085030198097229, "y": 0.49676206707954407, "z": -0.02691275253891945 }, { "x": 0.4687720239162445, "y": 0.6834565997123718, "z": 0.008113506250083447 }, { "x": 0.4426414966583252, "y": 0.7069531679153442, "z": 0.028577271848917007 }, { "x": 0.5230373740196228, "y": 0.6675713658332825, "z": 0.001773772411979735 }, { "x": 0.4481240212917328, "y": 0.6527872085571289, "z": 0.012414850294589996 }, { "x": 0.5339856743812561, "y": 0.7012367844581604, "z": -0.020220188423991203 }, { "x": 0.5347223281860352, "y": 0.7761190533638, "z": -0.05141595005989075 }, { "x": 0.4315067231655121, "y": 0.7211957573890686, "z": 0.04381405934691429 }, { "x": 0.45203351974487305, "y": 0.7206180095672607, "z": 0.017288070172071457 }, { "x": 0.46892452239990234, "y": 0.7265436053276062, "z": 0.005602988880127668 }, { "x": 0.49314674735069275, "y": 0.7202282547950745, "z": -0.0006408205372281373 }, { "x": 0.5104925632476807, "y": 0.7091827392578125, "z": -0.00362918758764863 }, { "x": 0.5232142210006714, "y": 0.698553740978241, "z": -0.00787867046892643 }, { "x": 0.5497883558273315, "y": 0.6743605136871338, "z": -0.036349106580019 }, { "x": 0.43658503890037537, "y": 0.7627100348472595, "z": 0.042555369436740875 }, { "x": 0.4397648870944977, "y": 0.6528646349906921, "z": 0.017956094816327095 }, { "x": 0.5653332471847534, "y": 0.7992802858352661, "z": -0.06365057826042175 }, { "x": 0.5285563468933105, "y": 0.736810564994812, "z": -0.018836988136172295 }, { "x": 0.4180678725242615, "y": 0.6792560815811157, "z": 0.12284679710865021 }, { "x": 0.5328429937362671, "y": 0.6865872144699097, "z": -0.010484723374247551 }, { "x": 0.5230283141136169, "y": 0.7809416055679321, "z": -0.011922398582100868 }, { "x": 0.4551771283149719, "y": 0.6650775074958801, "z": 0.01774493046104908 }, { "x": 0.5337203741073608, "y": 0.7618928551673889, "z": -0.04697106033563614 }, { "x": 0.43463975191116333, "y": 0.8133478164672852, "z": 0.1354849934577942 }, { "x": 0.5225707292556763, "y": 0.6605283617973328, "z": 0.004980515688657761 }, { "x": 0.5441933870315552, "y": 0.7497199773788452, "z": -0.06091512367129326 }, { "x": 0.4774007797241211, "y": 0.9159183502197266, "z": 0.059622734785079956 }, { "x": 0.48068761825561523, "y": 0.9364941716194153, "z": 0.08404944837093353 }, { "x": 0.4268292486667633, "y": 0.7657528519630432, "z": 0.09051097184419632 }, { "x": 0.46051913499832153, "y": 0.8880485892295837, "z": 0.0738474428653717 }, { "x": 0.4243420660495758, "y": 0.6434382200241089, "z": 0.06230505183339119 }, { "x": 0.5342157483100891, "y": 0.9835634231567383, "z": 0.021662971004843712 }, { "x": 0.5668109655380249, "y": 0.8042187094688416, "z": -0.044937074184417725 }, { "x": 0.5176341533660889, "y": 0.7530587315559387, "z": -0.012967454269528389 }, { "x": 0.430206298828125, "y": 0.6835605502128601, "z": 0.04612284153699875 }, { "x": 0.4794231951236725, "y": 0.6732114553451538, "z": 0.003970044665038586 }, { "x": 0.49073347449302673, "y": 0.6722435355186462, "z": 0.0008692514384165406 }, { "x": 0.5294116139411926, "y": 0.884677529335022, "z": 0.004413890186697245 }, { "x": 0.4430122375488281, "y": 0.80235356092453, "z": 0.04987282305955887 }, { "x": 0.5603825449943542, "y": 1.0092442035675049, "z": 0.026417359709739685 }, { "x": 0.5186598300933838, "y": 0.9828659892082214, "z": 0.0513598807156086 }, { "x": 0.5010536909103394, "y": 0.9640932679176331, "z": 0.06591596454381943 }, { "x": 0.5524769425392151, "y": 0.539441704750061, "z": -0.035816047340631485 }, { "x": 0.5879997611045837, "y": 1.0091472864151, "z": 0.02285068854689598 }, { "x": 0.5016193985939026, "y": 0.6684437990188599, "z": 0.00028415941051207483 }, { "x": 0.511952817440033, "y": 0.6642197370529175, "z": 0.0021144719794392586 }, { "x": 0.5194343328475952, "y": 0.6623469591140747, "z": 0.004674181342124939 }, { "x": 0.4321230351924896, "y": 0.6496355533599854, "z": 0.03124697133898735 }, { "x": 0.508686363697052, "y": 0.6479565501213074, "z": -0.00044765998609364033 }, { "x": 0.4963986277580261, "y": 0.6431032419204712, "z": -0.0032507688738405704 }, { "x": 0.4845542013645172, "y": 0.6430778503417969, "z": -0.002903624437749386 }, { "x": 0.4733612537384033, "y": 0.647506833076477, "z": 0.00023347247042693198 }, { "x": 0.4668654501438141, "y": 0.653346598148346, "z": 0.004762572236359119 }, { "x": 0.41815051436424255, "y": 0.633708119392395, "z": 0.09809435904026031 }, { "x": 0.47159942984580994, "y": 0.6711485385894775, "z": 0.007849935442209244 }, { "x": 0.5734396576881409, "y": 0.8256140351295471, "z": -0.03155219927430153 }, { "x": 0.5306524038314819, "y": 0.8337990641593933, "z": -0.018351426348090172 }, { "x": 0.5371729135513306, "y": 0.7910830974578857, "z": -0.037286680191755295 }, { "x": 0.5549534559249878, "y": 0.8275275826454163, "z": -0.030664825811982155 }, { "x": 0.5597432255744934, "y": 0.6418541669845581, "z": -0.03318847343325615 }, { "x": 0.4958484172821045, "y": 0.9429569244384766, "z": 0.048340678215026855 }, { "x": 0.5140507817268372, "y": 0.9634028077125549, "z": 0.03589847311377525 }, { "x": 0.5587693452835083, "y": 0.9951097369194031, "z": 0.00908728688955307 }, { "x": 0.46411189436912537, "y": 0.9051855206489563, "z": 0.10601935535669327 }, { "x": 0.5181609392166138, "y": 0.6554316878318787, "z": 0.002546071307733655 }, { "x": 0.5436590909957886, "y": 0.7085841298103333, "z": -0.03844436630606651 }, { "x": 0.5872187614440918, "y": 0.9960382580757141, "z": 0.0063423276878893375 }, { "x": 0.5379653573036194, "y": 0.9989125728607178, "z": 0.03636329993605614 }, { "x": 0.4350326955318451, "y": 0.8088565468788147, "z": 0.09147704392671585 }, { "x": 0.5523084998130798, "y": 0.8773422837257385, "z": -0.009068487212061882 }, { "x": 0.5510149598121643, "y": 0.8816931843757629, "z": -0.011043853126466274 }, { "x": 0.5503793954849243, "y": 0.88776695728302, "z": -0.01348799467086792 }, { "x": 0.5501549243927002, "y": 0.8954370617866516, "z": -0.012142189778387547 }, { "x": 0.546072781085968, "y": 0.9192524552345276, "z": -0.003157563041895628 }, { "x": 0.5314661860466003, "y": 0.8771666884422302, "z": 0.0005075141089037061 }, { "x": 0.5293324589729309, "y": 0.8762547969818115, "z": 0.00039177737198770046 }, { "x": 0.5275698900222778, "y": 0.8750609755516052, "z": 0.000047732755774632096 }, { "x": 0.5104271173477173, "y": 0.8607332110404968, "z": 0.0012934643309563398 }, { "x": 0.45938700437545776, "y": 0.8134918212890625, "z": 0.023569690063595772 }, { "x": 0.5418947339057922, "y": 0.6864100694656372, "z": -0.027333909645676613 }, { "x": 0.531914234161377, "y": 0.6456130743026733, "z": -0.005434140563011169 }, { "x": 0.523697018623352, "y": 0.647885262966156, "z": -0.0002466466394253075 }, { "x": 0.5338191390037537, "y": 0.8783687353134155, "z": 0.002268768846988678 }, { "x": 0.46226605772972107, "y": 0.8610277771949768, "z": 0.04718952998518944 }, { "x": 0.5434442758560181, "y": 0.6456181406974792, "z": -0.02327350154519081 }, { "x": 0.5399754643440247, "y": 0.940219521522522, "z": 0.005075343884527683 }, { "x": 0.5661457777023315, "y": 0.71457839012146, "z": -0.06242101639509201 }, { "x": 0.5523148775100708, "y": 0.6974870562553406, "z": -0.04863070324063301 }, { "x": 0.5639959573745728, "y": 0.6923378109931946, "z": -0.05180761218070984 }, { "x": 0.5367592573165894, "y": 0.7423217296600342, "z": -0.03623027727007866 }, { "x": 0.5853689908981323, "y": 0.9752064943313599, "z": -0.002361974213272333 }, { "x": 0.5835235118865967, "y": 0.9493685960769653, "z": -0.003941743168979883 }, { "x": 0.5615018606185913, "y": 0.949194610118866, "z": -0.0015953965485095978 }, { "x": 0.5068561434745789, "y": 0.9048219323158264, "z": 0.01862684078514576 }, { "x": 0.5134067535400391, "y": 0.7971825003623962, "z": -0.008485661819577217 }, { "x": 0.5223897099494934, "y": 0.925589919090271, "z": 0.01249657291918993 }, { "x": 0.48500555753707886, "y": 0.7959478497505188, "z": -0.0032065745908766985 }, { "x": 0.5037734508514404, "y": 0.8184596300125122, "z": -0.004932103678584099 }, { "x": 0.4766361117362976, "y": 0.828806459903717, "z": 0.01027688942849636 }, { "x": 0.5589827299118042, "y": 0.974656343460083, "z": 0.0009666886180639267 }, { "x": 0.5294582843780518, "y": 0.7541216611862183, "z": -0.025603046640753746 }, { "x": 0.4973002076148987, "y": 0.9208990931510925, "z": 0.031931452453136444 }, { "x": 0.5163551568984985, "y": 0.9432790875434875, "z": 0.024321340024471283 }, { "x": 0.49399662017822266, "y": 0.8814862370491028, "z": 0.018687399104237556 }, { "x": 0.44948166608810425, "y": 0.836137592792511, "z": 0.05702034756541252 }, { "x": 0.47898444533348083, "y": 0.8836610913276672, "z": 0.03150695189833641 }, { "x": 0.4454479217529297, "y": 0.8499438166618347, "z": 0.08868525922298431 }, { "x": 0.49572959542274475, "y": 0.8452823758125305, "z": 0.0036111653316766024 }, { "x": 0.5362502336502075, "y": 0.7222585678100586, "z": -0.027912352234125137 }, { "x": 0.5393770337104797, "y": 0.7850722074508667, "z": -0.05415399745106697 }, { "x": 0.531399667263031, "y": 0.7898418307304382, "z": -0.03883346915245056 }, { "x": 0.5451627373695374, "y": 0.7717036604881287, "z": -0.06480253487825394 }, { "x": 0.5206395983695984, "y": 0.6287745833396912, "z": -0.010521138086915016 }, { "x": 0.4974782466888428, "y": 0.6191938519477844, "z": -0.014098240062594414 }, { "x": 0.4774145185947418, "y": 0.6193130612373352, "z": -0.013643337413668633 }, { "x": 0.4616098403930664, "y": 0.6259890198707581, "z": -0.008448202162981033 }, { "x": 0.4516478478908539, "y": 0.6368461847305298, "z": 0.00009050309745362028 }, { "x": 0.4485096037387848, "y": 0.6719120740890503, "z": 0.022984720766544342 }, { "x": 0.42177659273147583, "y": 0.7240667343139648, "z": 0.08511673659086227 }, { "x": 0.4616215229034424, "y": 0.6988231539726257, "z": 0.014238474890589714 }, { "x": 0.4755798876285553, "y": 0.7034608721733093, "z": 0.00625590980052948 }, { "x": 0.4924992024898529, "y": 0.7005885243415833, "z": 0.0009391739731654525 }, { "x": 0.5082254409790039, "y": 0.693384051322937, "z": -0.0009464038303121924 }, { "x": 0.5203112959861755, "y": 0.6849707961082458, "z": -0.0022114769089967012 }, { "x": 0.52867591381073, "y": 0.6779075860977173, "z": -0.002962538506835699 }, { "x": 0.4213953912258148, "y": 0.7219811677932739, "z": 0.1350894570350647 }, { "x": 0.5320829749107361, "y": 0.794858992099762, "z": -0.03181503340601921 }, { "x": 0.5452795028686523, "y": 0.7286570072174072, "z": -0.04771539941430092 }, { "x": 0.5496407747268677, "y": 0.7866933345794678, "z": -0.06452003121376038 }, { "x": 0.557040274143219, "y": 0.7962084412574768, "z": -0.05837344378232956 }, { "x": 0.549176812171936, "y": 0.7895247936248779, "z": -0.057761140167713165 }, { "x": 0.5362890362739563, "y": 0.8005836606025696, "z": -0.026903774589300156 }, { "x": 0.560200035572052, "y": 0.7983731031417847, "z": -0.06172555685043335 }, { "x": 0.5616944432258606, "y": 0.8022753596305847, "z": -0.045200999826192856 }, { "x": 0.5273328423500061, "y": 0.6611284017562866, "z": 0.0029021520167589188 }, { "x": 0.534850537776947, "y": 0.6660012006759644, "z": -0.005215510260313749 }, { "x": 0.5394860506057739, "y": 0.6701375246047974, "z": -0.014931917190551758 }, { "x": 0.4634307324886322, "y": 0.658291757106781, "z": 0.009295716881752014 }, { "x": 0.4538393020629883, "y": 0.6519932150840759, "z": 0.00930330716073513 }, { "x": 0.5776031613349915, "y": 0.7159298658370972, "z": -0.057365912944078445 }, { "x": 0.6504855155944824, "y": 0.6461779475212097, "z": 0.014184834435582161 }, { "x": 0.5860154032707214, "y": 0.7962266206741333, "z": -0.04522843658924103 }, { "x": 0.6842049360275269, "y": 0.5631637573242188, "z": 0.07207967340946198 }, { "x": 0.6152560710906982, "y": 0.6674962639808655, "z": 0.0007529259892180562 }, { "x": 0.6280948519706726, "y": 0.6684326529502869, "z": 0.0016892586136236787 }, { "x": 0.6408625245094299, "y": 0.6663892269134521, "z": 0.005331226624548435 }, { "x": 0.6557814478874207, "y": 0.6534678936004639, "z": 0.01646413467824459 }, { "x": 0.6035663485527039, "y": 0.6639701724052429, "z": 0.0013799630105495453 }, { "x": 0.6329053044319153, "y": 0.608010470867157, "z": -0.006195899099111557 }, { "x": 0.6167260408401489, "y": 0.6117533445358276, "z": -0.006319951266050339 }, { "x": 0.6471013426780701, "y": 0.6112449765205383, "z": -0.0017843559617176652 }, { "x": 0.6560901999473572, "y": 0.6185776591300964, "z": 0.004047257360070944 }, { "x": 0.6666946411132812, "y": 0.6651176810264587, "z": 0.023647578433156013 }, { "x": 0.6311345100402832, "y": 0.9495396018028259, "z": 0.014004078693687916 }, { "x": 0.6544655561447144, "y": 0.6397901773452759, "z": 0.01809609681367874 }, { "x": 0.6965808868408203, "y": 0.6482675075531006, "z": 0.08304904401302338 }, { "x": 0.679817259311676, "y": 0.650188148021698, "z": 0.03632688894867897 }, { "x": 0.6336516737937927, "y": 0.7541458010673523, "z": -0.007742783520370722 }, { "x": 0.5921701192855835, "y": 0.8567668199539185, "z": -0.029399123042821884 }, { "x": 0.591663658618927, "y": 0.870215654373169, "z": -0.02103729173541069 }, { "x": 0.6068367958068848, "y": 0.8584195375442505, "z": -0.020668085664510727 }, { "x": 0.6176617741584778, "y": 0.860965371131897, "z": -0.009790095500648022 }, { "x": 0.6040634512901306, "y": 0.8686612844467163, "z": -0.015289564616978168 }, { "x": 0.6143736839294434, "y": 0.8671170473098755, "z": -0.005712216719985008 }, { "x": 0.6373105049133301, "y": 0.8815656900405884, "z": 0.012672550976276398 }, { "x": 0.5832505822181702, "y": 0.7866312861442566, "z": -0.07051534950733185 }, { "x": 0.5836675763130188, "y": 0.7658692598342896, "z": -0.07566110789775848 }, { "x": 0.6709531545639038, "y": 0.604898989200592, "z": 0.005951565690338612 }, { "x": 0.6029891967773438, "y": 0.705652117729187, "z": -0.013388276100158691 }, { "x": 0.6131622195243835, "y": 0.7728396058082581, "z": -0.036248479038476944 }, { "x": 0.6123163104057312, "y": 0.7612020373344421, "z": -0.03264721855521202 }, { "x": 0.6696187853813171, "y": 0.744706928730011, "z": 0.009673702530562878 }, { "x": 0.5803102254867554, "y": 0.7385968565940857, "z": -0.0689152330160141 }, { "x": 0.6404349207878113, "y": 0.5877999663352966, "z": -0.01929756999015808 }, { "x": 0.6588467955589294, "y": 0.5929454565048218, "z": -0.008487257175147533 }, { "x": 0.6720337867736816, "y": 0.530631422996521, "z": 0.043437421321868896 }, { "x": 0.584305465221405, "y": 0.6099005341529846, "z": -0.030301367864012718 }, { "x": 0.6034283638000488, "y": 0.6217452883720398, "z": -0.001970183802768588 }, { "x": 0.6460927724838257, "y": 0.8608663082122803, "z": 0.015541625209152699 }, { "x": 0.6957815289497375, "y": 0.8326103091239929, "z": 0.13015234470367432 }, { "x": 0.6043362617492676, "y": 0.7861682772636414, "z": -0.030476901680231094 }, { "x": 0.594293475151062, "y": 0.7942103147506714, "z": -0.032218821346759796 }, { "x": 0.6324057579040527, "y": 0.8665139675140381, "z": 0.014255806803703308 }, { "x": 0.6296147704124451, "y": 0.8667733669281006, "z": 0.010388285852968693 }, { "x": 0.663644552230835, "y": 0.5798642635345459, "z": -0.0022301070857793093 }, { "x": 0.6140630841255188, "y": 0.7809288501739502, "z": -0.02835679054260254 }, { "x": 0.615908145904541, "y": 0.5921698212623596, "z": -0.026804860681295395 }, { "x": 0.617181122303009, "y": 0.5748661756515503, "z": -0.03060605563223362 }, { "x": 0.6222207546234131, "y": 0.49137672781944275, "z": -0.011151673272252083 }, { "x": 0.6669357419013977, "y": 0.5541607141494751, "z": 0.017466170713305473 }, { "x": 0.6182981729507446, "y": 0.5320425629615784, "z": -0.021793590858578682 }, { "x": 0.6760554313659668, "y": 0.595052182674408, "z": 0.017115700989961624 }, { "x": 0.6801463961601257, "y": 0.5800720453262329, "z": 0.043127160519361496 }, { "x": 0.5922210812568665, "y": 0.8644017577171326, "z": -0.02662893570959568 }, { "x": 0.6054555177688599, "y": 0.8637874722480774, "z": -0.018363753333687782 }, { "x": 0.6161889433860779, "y": 0.8641164898872375, "z": -0.008808949030935764 }, { "x": 0.6017249822616577, "y": 0.7901403307914734, "z": -0.028126630932092667 }, { "x": 0.631446123123169, "y": 0.8664817810058594, "z": 0.012112865224480629 }, { "x": 0.6249198913574219, "y": 0.8716511130332947, "z": 0.003882825840264559 }, { "x": 0.6281915903091431, "y": 0.867301881313324, "z": 0.009891441091895103 }, { "x": 0.5986843109130859, "y": 0.7813931703567505, "z": -0.050227612257003784 }, { "x": 0.6126407384872437, "y": 0.869275689125061, "z": -0.0031255714129656553 }, { "x": 0.6027271151542664, "y": 0.8711842894554138, "z": -0.009324162267148495 }, { "x": 0.59088134765625, "y": 0.8742044568061829, "z": -0.014608660712838173 }, { "x": 0.5984604358673096, "y": 0.9216185212135315, "z": -0.005981989670544863 }, { "x": 0.5950398445129395, "y": 0.8964707255363464, "z": -0.01703473925590515 }, { "x": 0.5941568613052368, "y": 0.8882410526275635, "z": -0.017784785479307175 }, { "x": 0.5928806662559509, "y": 0.8803883194923401, "z": -0.014153128489851952 }, { "x": 0.5909661054611206, "y": 0.8748103976249695, "z": -0.012609979137778282 }, { "x": 0.6128016710281372, "y": 0.8702545762062073, "z": -0.0022550546564161777 }, { "x": 0.6150846481323242, "y": 0.8726804256439209, "z": -0.00414019962772727 }, { "x": 0.6173093914985657, "y": 0.8770190477371216, "z": -0.005970994010567665 }, { "x": 0.619335412979126, "y": 0.8814800977706909, "z": -0.0036864024586975574 }, { "x": 0.6292637586593628, "y": 0.8314558267593384, "z": -0.007714875973761082 }, { "x": 0.702275276184082, "y": 0.7320667505264282, "z": 0.1433621346950531 }, { "x": 0.6204835176467896, "y": 0.8689177632331848, "z": 0.0044869170524179935 }, { "x": 0.6223508715629578, "y": 0.8704851269721985, "z": 0.00352082890458405 }, { "x": 0.590448260307312, "y": 0.8029727935791016, "z": -0.03200828656554222 }, { "x": 0.6097423434257507, "y": 0.7933741211891174, "z": -0.018042555078864098 }, { "x": 0.59229576587677, "y": 0.7993767261505127, "z": -0.032564569264650345 }, { "x": 0.6171364188194275, "y": 0.7153720259666443, "z": -0.007672437466681004 }, { "x": 0.6389747858047485, "y": 0.726390540599823, "z": -0.002999067772179842 }, { "x": 0.6151940226554871, "y": 0.769412100315094, "z": -0.024427521973848343 }, { "x": 0.6526776552200317, "y": 0.505868136882782, "z": 0.01412637997418642 }, { "x": 0.6475822329521179, "y": 0.5375454425811768, "z": -0.0033899128902703524 }, { "x": 0.6433356404304504, "y": 0.5714520215988159, "z": -0.017428796738386154 }, { "x": 0.626949667930603, "y": 0.8962116837501526, "z": 0.005602736957371235 }, { "x": 0.5868416428565979, "y": 0.5829002261161804, "z": -0.03727729618549347 }, { "x": 0.5877229571342468, "y": 0.5345035791397095, "z": -0.032396964728832245 }, { "x": 0.5887066125869751, "y": 0.48655083775520325, "z": -0.025856535881757736 }, { "x": 0.6507197618484497, "y": 0.6612282991409302, "z": 0.011114613153040409 }, { "x": 0.6803066730499268, "y": 0.677992045879364, "z": 0.032125361263751984 }, { "x": 0.5963194370269775, "y": 0.6598632335662842, "z": 0.002976928371936083 }, { "x": 0.667536199092865, "y": 0.6274255514144897, "z": 0.015618261881172657 }, { "x": 0.5930740833282471, "y": 0.6940041780471802, "z": -0.019217798486351967 }, { "x": 0.6053346395492554, "y": 0.7676517963409424, "z": -0.050308309495449066 }, { "x": 0.6934473514556885, "y": 0.6884298920631409, "z": 0.04794462397694588 }, { "x": 0.6738007664680481, "y": 0.6934011578559875, "z": 0.020697161555290222 }, { "x": 0.6588084697723389, "y": 0.7033141851425171, "z": 0.008462334051728249 }, { "x": 0.6346072554588318, "y": 0.7029502391815186, "z": 0.001542167621664703 }, { "x": 0.6157816648483276, "y": 0.6966525912284851, "z": -0.002009218093007803 }, { "x": 0.6015574336051941, "y": 0.688928484916687, "z": -0.006588225718587637 }, { "x": 0.5746836066246033, "y": 0.6711069345474243, "z": -0.03597589209675789 }, { "x": 0.6947521567344666, "y": 0.7309479117393494, "z": 0.046707939356565475 }, { "x": 0.6759101152420044, "y": 0.6249120831489563, "z": 0.021654341369867325 }, { "x": 0.5794773101806641, "y": 0.7971615195274353, "z": -0.06339326500892639 }, { "x": 0.6041849851608276, "y": 0.727514922618866, "z": -0.017512541264295578 }, { "x": 0.6968844532966614, "y": 0.6440950036048889, "z": 0.12727996706962585 }, { "x": 0.5910853147506714, "y": 0.679325520992279, "z": -0.009497715160250664 }, { "x": 0.6157375574111938, "y": 0.7695677280426025, "z": -0.010624290443956852 }, { "x": 0.6606494784355164, "y": 0.6410489678382874, "z": 0.0208158977329731 }, { "x": 0.6040687561035156, "y": 0.7531470656394958, "z": -0.045887019485235214 }, { "x": 0.7012156248092651, "y": 0.780247151851654, "z": 0.14028730988502502 }, { "x": 0.595149576663971, "y": 0.6527782678604126, "z": 0.006308757700026035 }, { "x": 0.5925500392913818, "y": 0.7436665892601013, "z": -0.060151755809783936 }, { "x": 0.6780198812484741, "y": 0.8905693888664246, "z": 0.0626060739159584 }, { "x": 0.676746666431427, "y": 0.9113880395889282, "z": 0.08726003766059875 }, { "x": 0.7030686140060425, "y": 0.7312687635421753, "z": 0.09529774636030197 }, { "x": 0.688987135887146, "y": 0.8588417172431946, "z": 0.07752864807844162 }, { "x": 0.6883691549301147, "y": 0.6109960675239563, "z": 0.06669612973928452 }, { "x": 0.6358906030654907, "y": 0.9702065587043762, "z": 0.023120900616049767 }, { "x": 0.5781539678573608, "y": 0.8023634552955627, "z": -0.044763918966054916 }, { "x": 0.6170316934585571, "y": 0.7408350706100464, "z": -0.011375460773706436 }, { "x": 0.688542366027832, "y": 0.6516284346580505, "z": 0.050206027925014496 }, { "x": 0.6385149359703064, "y": 0.6540714502334595, "z": 0.006462941411882639 }, { "x": 0.6279382109642029, "y": 0.6563615798950195, "z": 0.003062846139073372 }, { "x": 0.6268895268440247, "y": 0.8736732006072998, "z": 0.00627936702221632 }, { "x": 0.6944946050643921, "y": 0.7709181308746338, "z": 0.053824134171009064 }, { "x": 0.614617109298706, "y": 1.0022112131118774, "z": 0.02719894051551819 }, { "x": 0.6493719220161438, "y": 0.9665167927742004, "z": 0.053563784807920456 }, { "x": 0.6624587178230286, "y": 0.943530797958374, "z": 0.068605437874794 }, { "x": 0.6162528991699219, "y": 0.6558693051338196, "z": 0.002187855076044798 }, { "x": 0.6058168411254883, "y": 0.654328465461731, "z": 0.0036193584091961384 }, { "x": 0.5987918972969055, "y": 0.6536934971809387, "z": 0.006134530063718557 }, { "x": 0.6831037402153015, "y": 0.6195642948150635, "z": 0.03511790186166763 }, { "x": 0.6062582731246948, "y": 0.6356398463249207, "z": 0.001280312892049551 }, { "x": 0.6174948811531067, "y": 0.62776118516922, "z": -0.0013642468256875873 }, { "x": 0.6297246217727661, "y": 0.6253792643547058, "z": -0.0007034156005829573 }, { "x": 0.6407091617584229, "y": 0.627578616142273, "z": 0.0028144705574959517 }, { "x": 0.6479622721672058, "y": 0.6322650909423828, "z": 0.00750273372977972 }, { "x": 0.6915091276168823, "y": 0.5990704298019409, "z": 0.10270945727825165 }, { "x": 0.6457163095474243, "y": 0.6504453420639038, "z": 0.010696077719330788 }, { "x": 0.6164222955703735, "y": 0.8231936097145081, "z": -0.016772059723734856 }, { "x": 0.6042401194572449, "y": 0.7830976843833923, "z": -0.03630910441279411 }, { "x": 0.5922216773033142, "y": 0.8228387236595154, "z": -0.029992375522851944 }, { "x": 0.6646111011505127, "y": 0.92097008228302, "z": 0.050967294722795486 }, { "x": 0.651232898235321, "y": 0.9460107088088989, "z": 0.038000158965587616 }, { "x": 0.6140977144241333, "y": 0.9882472157478333, "z": 0.009882091544568539 }, { "x": 0.6870781183242798, "y": 0.8768675327301025, "z": 0.10980932414531708 }, { "x": 0.5986856818199158, "y": 0.6456438899040222, "z": 0.003999010659754276 }, { "x": 0.585981547832489, "y": 0.7034481763839722, "z": -0.0377722829580307 }, { "x": 0.6342031359672546, "y": 0.9867448806762695, "z": 0.03786521404981613 }, { "x": 0.7013950943946838, "y": 0.776049017906189, "z": 0.09598205983638763 }, { "x": 0.6030206680297852, "y": 0.8719133138656616, "z": -0.007931148633360863 }, { "x": 0.6050592064857483, "y": 0.8767156004905701, "z": -0.009791925549507141 }, { "x": 0.6073468923568726, "y": 0.8831382393836975, "z": -0.012361008673906326 }, { "x": 0.6087977290153503, "y": 0.890143632888794, "z": -0.01098148338496685 }, { "x": 0.6147705316543579, "y": 0.9110084772109985, "z": -0.0018823575228452682 }, { "x": 0.622577965259552, "y": 0.8670604825019836, "z": 0.002609190298244357 }, { "x": 0.6241236329078674, "y": 0.8651344180107117, "z": 0.0025534380692988634 }, { "x": 0.6257084608078003, "y": 0.8638408184051514, "z": 0.0023300074972212315 }, { "x": 0.639931321144104, "y": 0.8449671268463135, "z": 0.0038123116828501225 }, { "x": 0.6810906529426575, "y": 0.7856625318527222, "z": 0.02717764675617218 }, { "x": 0.583532452583313, "y": 0.6811994910240173, "z": -0.026588857173919678 }, { "x": 0.5855660438537598, "y": 0.6393819451332092, "z": -0.004512844607234001 }, { "x": 0.5932201743125916, "y": 0.6398029327392578, "z": 0.0008020466193556786 }, { "x": 0.6200879812240601, "y": 0.8683351874351501, "z": 0.00417016725987196 }, { "x": 0.6842559576034546, "y": 0.8330534100532532, "z": 0.050836317241191864 }, { "x": 0.5754412412643433, "y": 0.6418221592903137, "z": -0.022838059812784195 }, { "x": 0.6232790350914001, "y": 0.9295297265052795, "z": 0.006339520215988159 }, { "x": 0.5764067769050598, "y": 0.694546639919281, "z": -0.04825803264975548 }, { "x": 0.59778892993927, "y": 0.7343927621841431, "z": -0.035004377365112305 }, { "x": 0.6042810678482056, "y": 0.9441440105438232, "z": -0.0010970570147037506 }, { "x": 0.6496372222900391, "y": 0.8869078159332275, "z": 0.021036235615611076 }, { "x": 0.6274012327194214, "y": 0.7830310463905334, "z": -0.006658440921455622 }, { "x": 0.637792706489563, "y": 0.9104999899864197, "z": 0.014290250837802887 }, { "x": 0.6549934148788452, "y": 0.7748609185218811, "z": -0.0006672973395325243 }, { "x": 0.6404005289077759, "y": 0.801220715045929, "z": -0.0026642554439604282 }, { "x": 0.6671456694602966, "y": 0.8045546412467957, "z": 0.013180811889469624 }, { "x": 0.6107483506202698, "y": 0.9680658578872681, "z": 0.001778992242179811 }, { "x": 0.6060343980789185, "y": 0.744587242603302, "z": -0.024382334202528 }, { "x": 0.6602751612663269, "y": 0.8998945355415344, "z": 0.0344940721988678 }, { "x": 0.6463775038719177, "y": 0.9262562394142151, "z": 0.02617623284459114 }, { "x": 0.6579852104187012, "y": 0.8602304458618164, "z": 0.021586716175079346 }, { "x": 0.6926165223121643, "y": 0.8053340315818787, "z": 0.061075080186128616 }, { "x": 0.6724731922149658, "y": 0.8594399690628052, "z": 0.03457934781908989 }, { "x": 0.6975721716880798, "y": 0.8183245062828064, "z": 0.09300774335861206 }, { "x": 0.6512877941131592, "y": 0.8258221745491028, "z": 0.006324059329926968 }, { "x": 0.594887375831604, "y": 0.7148372530937195, "z": -0.026898479089140892 }, { "x": 0.6017440557479858, "y": 0.7773507833480835, "z": -0.05312420800328255 }, { "x": 0.6096571683883667, "y": 0.7806998491287231, "z": -0.037646256387233734 }, { "x": 0.5952993035316467, "y": 0.7654367685317993, "z": -0.06398405134677887 }, { "x": 0.5950021147727966, "y": 0.6201304793357849, "z": -0.009297547861933708 }, { "x": 0.6165438890457153, "y": 0.6052900552749634, "z": -0.012455573305487633 }, { "x": 0.6362661719322205, "y": 0.6015968918800354, "z": -0.011649220250546932 }, { "x": 0.6522727608680725, "y": 0.6046400666236877, "z": -0.005903332494199276 }, { "x": 0.6625409722328186, "y": 0.6128141283988953, "z": 0.0030042496509850025 }, { "x": 0.6688099503517151, "y": 0.6457712054252625, "z": 0.026322703808546066 }, { "x": 0.7013440728187561, "y": 0.6893666386604309, "z": 0.08984331786632538 }, { "x": 0.6608623266220093, "y": 0.6749406456947327, "z": 0.0172116681933403 }, { "x": 0.6482325196266174, "y": 0.6823726296424866, "z": 0.008881398476660252 }, { "x": 0.6313265562057495, "y": 0.6842025518417358, "z": 0.0031308617908507586 }, { "x": 0.6147016286849976, "y": 0.6809731721878052, "z": 0.0007630771724507213 }, { "x": 0.6018834114074707, "y": 0.6755372285842896, "z": -0.0008834321051836014 }, { "x": 0.5925027132034302, "y": 0.670681357383728, "z": -0.001968748401850462 }, { "x": 0.700127363204956, "y": 0.6871103644371033, "z": 0.13980500400066376 }, { "x": 0.6095665693283081, "y": 0.7853189706802368, "z": -0.03074747882783413 }, { "x": 0.5880423784255981, "y": 0.7229287028312683, "z": -0.04691500961780548 }, { "x": 0.5930182337760925, "y": 0.7811514139175415, "z": -0.06398335844278336 }, { "x": 0.5867722034454346, "y": 0.7922660112380981, "z": -0.05794971063733101 }, { "x": 0.5933279991149902, "y": 0.7842848896980286, "z": -0.05714067071676254 }, { "x": 0.6063535809516907, "y": 0.7920218706130981, "z": -0.02590685710310936 }, { "x": 0.5839452743530273, "y": 0.794978141784668, "z": -0.0615212507545948 }, { "x": 0.5828126072883606, "y": 0.8000800013542175, "z": -0.0449722595512867 }, { "x": 0.5909603834152222, "y": 0.6541213393211365, "z": 0.003991890233010054 }, { "x": 0.5852181911468506, "y": 0.6602938771247864, "z": -0.004428438376635313 }, { "x": 0.5825737714767456, "y": 0.6651063561439514, "z": -0.014345290139317513 }, { "x": 0.6517343521118164, "y": 0.6362385153770447, "z": 0.012151890434324741 }, { "x": 0.6615052819252014, "y": 0.6281577944755554, "z": 0.0123682152479887 }, { "x": 0.4856873154640198, "y": 0.6568945646286011, "z": 0.000720038078725338 }, { "x": 0.49988406896591187, "y": 0.6547410488128662, "z": 0.0006949726957827806 }, { "x": 0.48438939452171326, "y": 0.6392973065376282, "z": 0.000705525919329375 }, { "x": 0.47143134474754333, "y": 0.6589511632919312, "z": 0.0006980331381782889 }, { "x": 0.48704618215560913, "y": 0.6752797961235046, "z": 0.0006921177846379578 }, { "x": 0.6243702173233032, "y": 0.640461802482605, "z": -0.00006592126737814397 }, { "x": 0.6390967965126038, "y": 0.6385173797607422, "z": -0.00016105435497593135 }, { "x": 0.6230536699295044, "y": 0.6224825382232666, "z": -0.00016136496560648084 }, { "x": 0.6095397472381592, "y": 0.641917884349823, "z": -0.0001803556369850412 }, { "x": 0.6250996589660645, "y": 0.6586247682571411, "z": -0.0001785515050869435 }
      ]
    ],
    "faceBlendshapes": [
      {
        "categories": [
          { "index": 0, "score": 0.000005187174338061595, "categoryName": "_neutral", "displayName": "" },
          { "index": 1, "score": 0.24521504342556, "categoryName": "browDownLeft", "displayName": "" },
          { "index": 2, "score": 0.1987743377685547, "categoryName": "browDownRight", "displayName": "" }, { "index": 3, "score": 0.013400448486208916, "categoryName": "browInnerUp", "displayName": "" }, { "index": 4, "score": 0.012361560948193073, "categoryName": "browOuterUpLeft", "displayName": "" }, { "index": 5, "score": 0.019305096939206123, "categoryName": "browOuterUpRight", "displayName": "" }, { "index": 6, "score": 0.000028426356948330067, "categoryName": "cheekPuff", "displayName": "" }, { "index": 7, "score": 3.4500112633395474e-7, "categoryName": "cheekSquintLeft", "displayName": "" }, { "index": 8, "score": 4.83789051486383e-7, "categoryName": "cheekSquintRight", "displayName": "" }, { "index": 9, "score": 0.07650448381900787, "categoryName": "eyeBlinkLeft", "displayName": "" }, { "index": 10, "score": 0.05070012807846069, "categoryName": "eyeBlinkRight", "displayName": "" }, { "index": 11, "score": 0.13978900015354156, "categoryName": "eyeLookDownLeft", "displayName": "" }, { "index": 12, "score": 0.14198613166809082, "categoryName": "eyeLookDownRight", "displayName": "" }, { "index": 13, "score": 0.2177766114473343, "categoryName": "eyeLookInLeft", "displayName": "" }, { "index": 14, "score": 0.014739357866346836, "categoryName": "eyeLookInRight", "displayName": "" }, { "index": 15, "score": 0.02361512929201126, "categoryName": "eyeLookOutLeft", "displayName": "" }, { "index": 16, "score": 0.19679604470729828, "categoryName": "eyeLookOutRight", "displayName": "" }, { "index": 17, "score": 0.04874616861343384, "categoryName": "eyeLookUpLeft", "displayName": "" }, { "index": 18, "score": 0.049392376095056534, "categoryName": "eyeLookUpRight", "displayName": "" }, { "index": 19, "score": 0.34944331645965576, "categoryName": "eyeSquintLeft", "displayName": "" }, { "index": 20, "score": 0.2939716875553131, "categoryName": "eyeSquintRight", "displayName": "" }, { "index": 21, "score": 0.005955042317509651, "categoryName": "eyeWideLeft", "displayName": "" }, { "index": 22, "score": 0.006776117719709873, "categoryName": "eyeWideRight", "displayName": "" }, { "index": 23, "score": 0.000016942436559475027, "categoryName": "jawForward", "displayName": "" }, { "index": 24, "score": 0.0045165494084358215, "categoryName": "jawLeft", "displayName": "" }, { "index": 25, "score": 0.07803940027952194, "categoryName": "jawOpen", "displayName": "" }, { "index": 26, "score": 0.00002090057751047425, "categoryName": "jawRight", "displayName": "" }, { "index": 27, "score": 0.06032035872340202, "categoryName": "mouthClose", "displayName": "" }, { "index": 28, "score": 0.00228882092051208, "categoryName": "mouthDimpleLeft", "displayName": "" }, { "index": 29, "score": 0.00781762320548296, "categoryName": "mouthDimpleRight", "displayName": "" }, { "index": 30, "score": 0.0017093931091949344, "categoryName": "mouthFrownLeft", "displayName": "" }, { "index": 31, "score": 0.0019319106359034777, "categoryName": "mouthFrownRight", "displayName": "" }, { "index": 32, "score": 0.00008485237776767462, "categoryName": "mouthFunnel", "displayName": "" }, { "index": 33, "score": 0.0009051355300471187, "categoryName": "mouthLeft", "displayName": "" }, { "index": 34, "score": 0.0003630454302765429, "categoryName": "mouthLowerDownLeft", "displayName": "" }, { "index": 35, "score": 0.00017601238505449146, "categoryName": "mouthLowerDownRight", "displayName": "" }, { "index": 36, "score": 0.12865161895751953, "categoryName": "mouthPressLeft", "displayName": "" }, { "index": 37, "score": 0.20137207210063934, "categoryName": "mouthPressRight", "displayName": "" }, { "index": 38, "score": 0.0022203284315764904, "categoryName": "mouthPucker", "displayName": "" }, { "index": 39, "score": 0.0009096377179957926, "categoryName": "mouthRight", "displayName": "" }, { "index": 40, "score": 0.34189721941947937, "categoryName": "mouthRollLower", "displayName": "" }, { "index": 41, "score": 0.11409689486026764, "categoryName": "mouthRollUpper", "displayName": "" }, { "index": 42, "score": 0.17172536253929138, "categoryName": "mouthShrugLower", "displayName": "" }, { "index": 43, "score": 0.004038424696773291, "categoryName": "mouthShrugUpper", "displayName": "" }, { "index": 44, "score": 0.00023205230536404997, "categoryName": "mouthSmileLeft", "displayName": "" }, { "index": 45, "score": 0.00019313619122840464, "categoryName": "mouthSmileRight", "displayName": "" }, { "index": 46, "score": 0.0018571305554360151, "categoryName": "mouthStretchLeft", "displayName": "" }, { "index": 47, "score": 0.0023813238367438316, "categoryName": "mouthStretchRight", "displayName": "" }, { "index": 48, "score": 0.000024323100660694763, "categoryName": "mouthUpperUpLeft", "displayName": "" }, { "index": 49, "score": 0.00003161552012898028, "categoryName": "mouthUpperUpRight", "displayName": "" }, { "index": 50, "score": 1.08198406678639e-7, "categoryName": "noseSneerLeft", "displayName": "" }, { "index": 51, "score": 0.0000012652527630052646, "categoryName": "noseSneerRight", "displayName": "" }
        ],
        "headIndex": -1,
        "headName": ""
      }
    ],
    "facialTransformationMatrixes": [
      {
        "rows": 4,
        "columns": 4,
        "data": [ 0.9947517514228821, 0.10230544209480286, 0.0013679931871592999, 0, -0.10230997204780579, 0.9947447776794434, 0.003816320328041911, 0, -0.000970348424743861, -0.0039362297393381596, 0.9999914169311523, 0, 2.8888821601867676, -7.808934211730957, -30.52109146118164, 1 ]
      }
    ]
  },
};
