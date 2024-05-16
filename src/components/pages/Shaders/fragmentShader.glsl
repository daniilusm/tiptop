varying vec2 vUv;
varying float vTime;

///////////////////////

// void main() {
//     // gl_FragColor = vec4(vUv, vTime, vTime);

//     // float strength = mod(vUv.x * 10.0, 1.0);

//     // float strength = mod(vUv.x * 10.0, 1.0);

//     float strength = abs(vUv.x - 0.5);

//     gl_FragColor = vec4(strength,strength,strength, 1.0);
// }
//////////////////////

float random(vec2 st){
  return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void main(){
  float strength = random(vUv);
  gl_FragColor = vec4(strength,strength,strength, 1.0);
}
//////////////////////

// void main(){
//   vec2 wavedUv = vec2(
//       vUv.x,
//       vUv.y + sin(vUv.x * 30.0) * 0.1
//   );
//   float strength = 1.0 - step(0.01, abs(distance(wavedUv, vec2(0.5)) - 0.25));
//   gl_FragColor = vec4(strength,strength,strength, 1.0);
// }

///////////////////////

