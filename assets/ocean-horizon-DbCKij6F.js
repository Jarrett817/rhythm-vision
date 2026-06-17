import{o as e}from"./rolldown-runtime-CMxvf4Kt.js";import{i as t,r as n}from"./motion-BN46AcYK.js";import{S as r,T as i,_ as a,g as o,h as s}from"./three-B1pzFvdJ.js";import{d as c}from"./utils-BIXjVjfA.js";import{n as l}from"./themes-NgLBmhVk.js";import{n as u}from"./noise-chunks-IXkZrDTk.js";import{n as d,r as f,t as p}from"./scene-environment-Bt9H0KpU.js";import{t as m}from"./dreamy-postprocessing-D14js4Ds.js";import{n as h,r as g}from"./flow-ribbons-Bp_96KHi.js";var _=c(),v=e(t(),1),y=n(),b=`
${u}

uniform float uTime;
uniform float uBass;
uniform float uIntensity;

varying float vWave;
varying vec2 vUv;

void main() {
  vUv = uv;
  vec3 pos = position;
  float n = cnoise(vec3(pos.x * 0.18 + uTime * 0.2, pos.z * 0.16, uTime * 0.14));
  float wave =
    n * 0.75 +
    sin(pos.x * 0.32 + uTime * 1.1) * 0.22 +
    sin(pos.z * 0.26 - uTime * 0.85) * 0.18;
  wave *= 1.0 + uBass * 2.2 * uIntensity;
  csm_Position = pos + vec3(0.0, wave, 0.0);
  vWave = wave;
}
`,x=`
uniform float uMid;
uniform float uTreble;

varying float vWave;
varying vec2 vUv;

void main() {
  float depth = 1.0 - vUv.y;
  vec3 deep = vec3(0.02, 0.14, 0.34);
  vec3 shallow = vec3(0.07, 0.46, 0.66);
  vec3 foam = vec3(0.75, 0.92, 1.0);
  vec3 col = mix(deep, shallow, depth * 0.82 + vWave * 0.32);
  col = mix(col, foam, smoothstep(0.22, 0.58, vWave + uTreble * 0.35) * 0.38);
  col += vec3(0.02, 0.05, 0.07) * uMid;
  csm_DiffuseColor = vec4(col, 0.94);
}
`;function S(e){let t=(0,_.c)(14),{featuresRef:n,intensity:r}=e,o=(0,v.useRef)(null),c,l,u,d;t[0]===Symbol.for(`react.memo_cache_sentinel`)?(c={value:0},l={value:0},u={value:0},d={value:0},t[0]=c,t[1]=l,t[2]=u,t[3]=d):(c=t[0],l=t[1],u=t[2],d=t[3]);let f;t[4]===r?f=t[5]:(f={uTime:c,uBass:l,uMid:u,uTreble:d,uIntensity:{value:r}},t[4]=r,t[5]=f);let p=f,m;t[6]!==n||t[7]!==r?(m=e=>{let t=o.current;if(!t)return;let i=n.current;t.uniforms.uTime.value=e.clock.elapsedTime,t.uniforms.uBass.value=i.bass,t.uniforms.uMid.value=i.mid,t.uniforms.uTreble.value=i.treble,t.uniforms.uIntensity.value=r},t[6]=n,t[7]=r,t[8]=m):m=t[8],a(m);let h,g,S;t[9]===Symbol.for(`react.memo_cache_sentinel`)?(h=[-Math.PI/2,0,0],g=[0,-1.5,0],S=(0,y.jsx)(`planeGeometry`,{args:[80,80,128,128]}),t[9]=h,t[10]=g,t[11]=S):(h=t[9],g=t[10],S=t[11]);let C;return t[12]===p?C=t[13]:(C=(0,y.jsxs)(`mesh`,{rotation:h,position:g,children:[S,(0,y.jsx)(s,{ref:o,baseMaterial:i,vertexShader:b,fragmentShader:x,uniforms:p,transparent:!0,side:2,roughness:.08,metalness:.35,color:`#0c4a6e`})]}),t[12]=p,t[13]=C),C}function C({featuresRef:e}){let t=(0,v.useRef)(null),n=(0,v.useRef)((()=>{let e=new Float32Array(800*3);for(let t=0;t<800;t++)e[t*3]=(Math.random()-.5)*40,e[t*3+1]=Math.random()*4,e[t*3+2]=(Math.random()-.5)*40;return e})()).current;return a((n,r)=>{let i=t.current;if(!i)return;let a=i.geometry.attributes.position.array;for(let t=0;t<800;t++)a[t*3]+=r*(.2+e.current.mid),a[t*3]>20&&(a[t*3]=-20);i.geometry.attributes.position.needsUpdate=!0,i.position.y=-.5+Math.sin(n.clock.elapsedTime*.3)*.2}),(0,y.jsxs)(`points`,{ref:t,children:[(0,y.jsx)(`bufferGeometry`,{children:(0,y.jsx)(`bufferAttribute`,{attach:`attributes-position`,args:[n,3]})}),(0,y.jsx)(`pointsMaterial`,{color:`#bae6fd`,size:.15,transparent:!0,opacity:.35,blending:2,depthWrite:!1})]})}function w(e){let t=(0,_.c)(3),{featuresRef:n}=e,r=(0,v.useRef)(null),i;t[0]===n?i=t[1]:(i=()=>{let e=r.current;if(!e)return;let{rms:t}=n.current;e.scale.setScalar(2.5+t*1.5);let i=e.material;i.opacity=.35+t*.2},t[0]=n,t[1]=i),a(i);let o;return t[2]===Symbol.for(`react.memo_cache_sentinel`)?(o=(0,y.jsxs)(`mesh`,{ref:r,position:[0,6,-25],children:[(0,y.jsx)(`circleGeometry`,{args:[2,32]}),(0,y.jsx)(`meshBasicMaterial`,{color:`#fdba74`,transparent:!0,opacity:.4,blending:2,depthWrite:!1})]}),t[2]=o):o=t[2],o}function T(e){let t=(0,_.c)(29),{featuresRef:n,intensity:i,onCanvasReady:a}=e,s=l.ocean,c,u;t[0]===Symbol.for(`react.memo_cache_sentinel`)?(c={position:[0,2,12],fov:55},u={antialias:!0},t[0]=c,t[1]=u):(c=t[0],u=t[1]);let b;t[2]===a?b=t[3]:(b=e=>{let{gl:t,scene:n}=e;n.fog=new r(s.fog,.015),a?.(t.domElement)},t[2]=a,t[3]=b);let x;t[4]===Symbol.for(`react.memo_cache_sentinel`)?(x=(0,y.jsx)(v.Suspense,{fallback:null,children:(0,y.jsx)(p,{variant:`sunset`,intensity:.62})}),t[4]=x):x=t[4];let T;t[5]===n?T=t[6]:(T=(0,y.jsx)(g,{featuresRef:n,theme:s}),t[5]=n,t[6]=T);let E,D;t[7]===Symbol.for(`react.memo_cache_sentinel`)?(E=(0,y.jsx)(`ambientLight`,{intensity:.25,color:`#7dd3fc`}),D=(0,y.jsx)(`directionalLight`,{position:[10,8,-5],intensity:1.2,color:`#fdba74`}),t[7]=E,t[8]=D):(E=t[7],D=t[8]);let O,k;t[9]===n?(O=t[10],k=t[11]):(O=(0,y.jsx)(w,{featuresRef:n}),k=(0,y.jsx)(h,{featuresRef:n,color:s.sparkle,count:300}),t[9]=n,t[10]=O,t[11]=k);let A;t[12]!==n||t[13]!==i?(A=(0,y.jsx)(S,{featuresRef:n,intensity:i}),t[12]=n,t[13]=i,t[14]=A):A=t[14];let j;t[15]===n?j=t[16]:(j=(0,y.jsx)(C,{featuresRef:n}),t[15]=n,t[16]=j);let M;t[17]===i?M=t[18]:(M=(0,y.jsx)(m,{intensity:i}),t[17]=i,t[18]=M);let N;t[19]!==A||t[20]!==j||t[21]!==M||t[22]!==T||t[23]!==O||t[24]!==k?(N=(0,y.jsxs)(d,{children:[x,T,E,D,O,k,A,j,M]}),t[19]=A,t[20]=j,t[21]=M,t[22]=T,t[23]=O,t[24]=k,t[25]=N):N=t[25];let P;return t[26]!==N||t[27]!==b?(P=(0,y.jsx)(f,{children:(0,y.jsx)(o,{className:`size-full`,camera:c,gl:u,onCreated:b,children:N})}),t[26]=N,t[27]=b,t[28]=P):P=t[28],P}export{T as OceanHorizonScene};