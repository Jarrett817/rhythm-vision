import{o as e}from"./rolldown-runtime-CMxvf4Kt.js";import{i as t,r as n}from"./motion-BN46AcYK.js";import{S as r,T as i,_ as a,g as o,h as s}from"./three-B1pzFvdJ.js";import{d as c}from"./utils-BIXjVjfA.js";import{n as l}from"./themes-NgLBmhVk.js";import{n as u}from"./noise-chunks-IXkZrDTk.js";import{n as d,r as f,t as p}from"./scene-environment-Bt9H0KpU.js";import{t as m}from"./dreamy-postprocessing-D14js4Ds.js";import{t as h}from"./aurora-sky-WEykALYj.js";var g=c(),_=e(t(),1),v=n(),y=`
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
`,b=`
uniform float uMid;
uniform float uTreble;

varying float vWave;
varying vec2 vUv;

void main() {
  float depth = 1.0 - vUv.y;
  vec3 deep = vec3(0.02, 0.14, 0.34);
  vec3 shallow = vec3(0.07, 0.46, 0.66);
  vec3 foam = vec3(0.62, 0.86, 0.96);
  vec3 col = mix(deep, shallow, depth * 0.74 + vWave * 0.18);
  col = mix(col, foam, smoothstep(0.32, 0.72, vWave + uTreble * 0.18) * 0.18);
  col += vec3(0.015, 0.035, 0.045) * uMid;
  csm_DiffuseColor = vec4(col, 0.94);
}
`;function x(e){let t=(0,g.c)(14),{featuresRef:n,intensity:r}=e,o=(0,_.useRef)(null),c,l,u,d;t[0]===Symbol.for(`react.memo_cache_sentinel`)?(c={value:0},l={value:0},u={value:0},d={value:0},t[0]=c,t[1]=l,t[2]=u,t[3]=d):(c=t[0],l=t[1],u=t[2],d=t[3]);let f;t[4]===r?f=t[5]:(f={uTime:c,uBass:l,uMid:u,uTreble:d,uIntensity:{value:r}},t[4]=r,t[5]=f);let p=f,m;t[6]!==n||t[7]!==r?(m=e=>{let t=o.current;if(!t)return;let i=n.current;t.uniforms.uTime.value=e.clock.elapsedTime,t.uniforms.uBass.value=i.bass,t.uniforms.uMid.value=i.mid,t.uniforms.uTreble.value=i.treble,t.uniforms.uIntensity.value=r},t[6]=n,t[7]=r,t[8]=m):m=t[8],a(m);let h,x,S;t[9]===Symbol.for(`react.memo_cache_sentinel`)?(h=[-Math.PI/2,0,0],x=[0,-1.5,0],S=(0,v.jsx)(`planeGeometry`,{args:[80,80,128,128]}),t[9]=h,t[10]=x,t[11]=S):(h=t[9],x=t[10],S=t[11]);let C;return t[12]===p?C=t[13]:(C=(0,v.jsxs)(`mesh`,{rotation:h,position:x,children:[S,(0,v.jsx)(s,{ref:o,baseMaterial:i,vertexShader:y,fragmentShader:b,uniforms:p,transparent:!0,side:2,roughness:.22,metalness:0,clearcoat:.65,clearcoatRoughness:.2,ior:1.333,transmission:.08,color:`#0c4a6e`})]}),t[12]=p,t[13]=C),C}function S(e){let t=(0,g.c)(4),{featuresRef:n}=e,r=(0,_.useRef)(null),i;t[0]===Symbol.for(`react.memo_cache_sentinel`)?(i=Array.from({length:18},w),t[0]=i):i=t[0];let o=i,s;t[1]===n?s=t[2]:(s=(e,t)=>{let i=r.current;if(!i)return;let a=e.clock.elapsedTime,{mid:s,rms:c}=n.current;i.children.forEach((e,n)=>{let r=e,i=o[n];r.position.x=r.position.x+t*(i.speed+s*.3),r.position.x>24&&(r.position.x=-24),r.position.y=i.y+Math.sin(a*.25+i.phase)*.08,r.scale.set(i.width*(1+c*.12),i.height*(1+c*.18),1);let l=r.material;l.opacity=.055+c*.04+Math.sin(a*.18+i.phase)*.012})},t[1]=n,t[2]=s),a(s);let c;return t[3]===Symbol.for(`react.memo_cache_sentinel`)?(c=(0,v.jsx)(`group`,{ref:r,children:o.map(C)}),t[3]=c):c=t[3],c}function C(e,t){return(0,v.jsxs)(`mesh`,{position:[e.x,e.y,e.z],rotation:[-.22,0,0],children:[(0,v.jsx)(`planeGeometry`,{args:[1,1]}),(0,v.jsx)(`meshBasicMaterial`,{color:`#b8d6df`,transparent:!0,opacity:.06,blending:2,depthWrite:!1,side:2})]},t)}function w(e,t){return{x:-22+t*2.6+(Math.random()-.5)*1.4,y:-.65+Math.random()*.75,z:-10-Math.random()*18,width:5+Math.random()*8,height:.28+Math.random()*.42,phase:Math.random()*Math.PI*2,speed:.08+Math.random()*.16}}function T(e){let t=(0,g.c)(3),{featuresRef:n}=e,r=(0,_.useRef)(null),i;t[0]===n?i=t[1]:(i=()=>{let e=r.current;if(!e)return;let{rms:t}=n.current;e.scale.setScalar(2.5+t*1.5);let i=e.material;i.opacity=.35+t*.2},t[0]=n,t[1]=i),a(i);let o;return t[2]===Symbol.for(`react.memo_cache_sentinel`)?(o=(0,v.jsxs)(`mesh`,{ref:r,position:[0,6,-25],children:[(0,v.jsx)(`circleGeometry`,{args:[2,32]}),(0,v.jsx)(`meshBasicMaterial`,{color:`#fdba74`,transparent:!0,opacity:.4,blending:2,depthWrite:!1})]}),t[2]=o):o=t[2],o}function E(e){let t=(0,g.c)(27),{featuresRef:n,intensity:i,onCanvasReady:a}=e,s=l.ocean,c,u;t[0]===Symbol.for(`react.memo_cache_sentinel`)?(c={position:[0,2,12],fov:55},u={antialias:!0},t[0]=c,t[1]=u):(c=t[0],u=t[1]);let y;t[2]===a?y=t[3]:(y=e=>{let{gl:t,scene:n}=e;n.fog=new r(s.fog,.015),a?.(t.domElement)},t[2]=a,t[3]=y);let b;t[4]===Symbol.for(`react.memo_cache_sentinel`)?(b=(0,v.jsx)(_.Suspense,{fallback:null,children:(0,v.jsx)(p,{variant:`sunset`,intensity:.32})}),t[4]=b):b=t[4];let C;t[5]===n?C=t[6]:(C=(0,v.jsx)(h,{featuresRef:n,theme:s}),t[5]=n,t[6]=C);let w,E;t[7]===Symbol.for(`react.memo_cache_sentinel`)?(w=(0,v.jsx)(`ambientLight`,{intensity:.25,color:`#7dd3fc`}),E=(0,v.jsx)(`directionalLight`,{position:[10,8,-5],intensity:1.2,color:`#fdba74`}),t[7]=w,t[8]=E):(w=t[7],E=t[8]);let D;t[9]===n?D=t[10]:(D=(0,v.jsx)(T,{featuresRef:n}),t[9]=n,t[10]=D);let O;t[11]!==n||t[12]!==i?(O=(0,v.jsx)(x,{featuresRef:n,intensity:i}),t[11]=n,t[12]=i,t[13]=O):O=t[13];let k;t[14]===n?k=t[15]:(k=(0,v.jsx)(S,{featuresRef:n}),t[14]=n,t[15]=k);let A;t[16]===i?A=t[17]:(A=(0,v.jsx)(m,{intensity:i}),t[16]=i,t[17]=A);let j;t[18]!==k||t[19]!==A||t[20]!==C||t[21]!==D||t[22]!==O?(j=(0,v.jsxs)(d,{children:[b,C,w,E,D,O,k,A]}),t[18]=k,t[19]=A,t[20]=C,t[21]=D,t[22]=O,t[23]=j):j=t[23];let M;return t[24]!==j||t[25]!==y?(M=(0,v.jsx)(f,{children:(0,v.jsx)(o,{className:`size-full`,camera:c,gl:u,onCreated:y,children:j})}),t[24]=j,t[25]=y,t[26]=M):M=t[26],M}export{E as OceanHorizonScene};