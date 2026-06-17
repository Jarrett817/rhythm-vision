import{o as e}from"./rolldown-runtime-CMxvf4Kt.js";import{i as t,r as n}from"./motion-BN46AcYK.js";import{C as r,D as i,S as a,T as o,_ as s,b as c,g as l,h as u,i as d,j as f,n as p,r as m,w as h}from"./three-B1pzFvdJ.js";import{d as g}from"./utils-BIXjVjfA.js";import{r as _}from"./audio-response-DBPIgJj4.js";import{n as v}from"./noise-chunks-IXkZrDTk.js";import{n as y,r as b,t as x}from"./scene-environment-Bt9H0KpU.js";var S=g(),C=e(t(),1),w=n(),T=`
${v}

uniform float uTime;
uniform float uBass;
uniform float uIntensity;

varying float vWave;
varying vec3 vWorldPos;
varying vec2 vUv;

void main() {
  vUv = uv;
  vec3 pos = position;
  float n = cnoise(vec3(pos.x * 0.12 + uTime * 0.15, pos.z * 0.1, uTime * 0.1));
  float wave =
    n * 0.35 +
    sin(pos.x * 0.25 + uTime * 0.9) * 0.12 +
    sin(pos.z * 0.2 - uTime * 0.7) * 0.1;
  wave *= 1.0 + uBass * 1.4 * uIntensity;
  csm_Position = pos + vec3(0.0, wave, 0.0);
  vWave = wave;
  vWorldPos = (modelMatrix * vec4(csm_Position, 1.0)).xyz;
}
`,E=`
uniform float uMid;
uniform float uTreble;
uniform vec3 uMoonDir;

varying float vWave;
varying vec3 vWorldPos;
varying vec2 vUv;

void main() {
  vec3 deep = vec3(0.01, 0.04, 0.12);
  vec3 mid = vec3(0.03, 0.1, 0.22);
  vec3 shallow = vec3(0.06, 0.16, 0.28);
  float depth = smoothstep(0.0, 1.0, 1.0 - vUv.y);
  vec3 col = mix(deep, mid, depth * 0.7);
  col = mix(col, shallow, smoothstep(0.15, 0.85, vWave + 0.35) * 0.45);

  vec3 N = normalize(vec3(-dFdx(vWave), 1.0, -dFdz(vWave)));
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 L = normalize(uMoonDir);
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 120.0);
  float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  col += vec3(0.55, 0.65, 0.85) * spec * (0.35 + uTreble * 0.5);
  col += vec3(0.08, 0.12, 0.2) * fresnel * 0.4;
  col += vec3(0.02, 0.04, 0.08) * uMid;

  csm_DiffuseColor = vec4(col, 0.97);
}
`;function D({featuresRef:e,intensity:t,moonDir:n=new f(.45,.75,-.35)}){let r=(0,C.useRef)(null),i=(0,C.useMemo)(()=>({uTime:{value:0},uBass:{value:0},uMid:{value:0},uTreble:{value:0},uIntensity:{value:t},uMoonDir:{value:n.clone()}}),[t,n]);return s(n=>{let i=r.current;if(!i)return;let a=e.current;i.uniforms.uTime.value=n.clock.elapsedTime,i.uniforms.uBass.value=a.bass,i.uniforms.uMid.value=a.mid,i.uniforms.uTreble.value=a.treble,i.uniforms.uIntensity.value=t}),(0,w.jsxs)(`mesh`,{rotation:[-Math.PI/2,0,0],position:[0,-.2,0],children:[(0,w.jsx)(`planeGeometry`,{args:[120,120,160,160]}),(0,w.jsx)(u,{ref:r,baseMaterial:o,vertexShader:T,fragmentShader:E,uniforms:i,transparent:!0,side:2,roughness:.04,metalness:.65,color:`#061018`})]})}var O=6500,k=1200,A=new f(.42,.78,-.38);function j(){let e=(0,S.c)(1),t;return e[0]===Symbol.for(`react.memo_cache_sentinel`)?(t=(0,w.jsxs)(`group`,{position:[14,16,-28],children:[(0,w.jsxs)(`mesh`,{children:[(0,w.jsx)(`sphereGeometry`,{args:[2.2,48,48]}),(0,w.jsx)(`meshBasicMaterial`,{color:`#eef2ff`})]}),(0,w.jsxs)(`mesh`,{children:[(0,w.jsx)(`sphereGeometry`,{args:[4.5,32,32]}),(0,w.jsx)(`meshBasicMaterial`,{color:`#9eb8ff`,transparent:!0,opacity:.06,depthWrite:!1})]}),(0,w.jsxs)(`mesh`,{children:[(0,w.jsx)(`sphereGeometry`,{args:[8,32,32]}),(0,w.jsx)(`meshBasicMaterial`,{color:`#6b8fd4`,transparent:!0,opacity:.025,depthWrite:!1})]}),(0,w.jsx)(`pointLight`,{color:`#d4e4ff`,intensity:4,distance:80,decay:2})]}),e[0]=t):t=e[0],t}function M(e){let t=(0,S.c)(4),{featuresRef:n,intensity:r}=e,i=(0,C.useRef)(null),a=_(n),o;t[0]!==a||t[1]!==r?(o=(e,t)=>{let n=i.current;if(!n)return;a.update(t);let o=e.clock.elapsedTime;n.children.forEach((e,t)=>{let n=e;n.rotation.z=Math.sin(o*.18+t)*.08,n.position.x=(t-2)*8+Math.sin(o*.12+t)*1.2;let i=n.material;i.opacity=.045+a.rms*.05*r+a.treble*.025})},t[0]=a,t[1]=r,t[2]=o):o=t[2],s(o);let c;return t[3]===Symbol.for(`react.memo_cache_sentinel`)?(c=(0,w.jsx)(`group`,{ref:i,position:[0,5,-11],children:Array.from({length:5},N)}),t[3]=c):c=t[3],c}function N(e,t){return(0,w.jsxs)(`mesh`,{rotation:[.12,0,(t-2)*.08],children:[(0,w.jsx)(`planeGeometry`,{args:[4.5,24]}),(0,w.jsx)(`meshBasicMaterial`,{color:`#9fb7ff`,transparent:!0,opacity:.055,blending:2,depthWrite:!1,side:2})]},t)}function P({featuresRef:e,intensity:t}){let n=(0,C.useRef)(null),r=_(e),i=(0,C.useMemo)(()=>Float32Array.from({length:k},()=>24+Math.random()*28),[]),a=(0,C.useMemo)(()=>{let e=new Float32Array(k*6);for(let t=0;t<k;t++){let n=(Math.random()-.5)*52,r=Math.random()*28,i=4+Math.random()*10,a=1.3+Math.random()*2.4;e[t*6]=n,e[t*6+1]=r,e[t*6+2]=i,e[t*6+3]=n+.12,e[t*6+4]=r-a,e[t*6+5]=i+.05}return e},[]);return s((e,a)=>{let o=n.current;if(!o)return;r.update(a);let s=o.geometry.attributes.position.array,c=1+r.bass*.9*t;for(let e=0;e<k;e++){let t=i[e]*c*a;for(let n=0;n<2;n++){let i=e*6+n*3;s[i]+=(.16+r.mid*.5)*a,s[i+1]-=t}if(s[e*6+1]<-1){let t=(Math.random()-.5)*52,n=24+Math.random()*10,r=4+Math.random()*10,i=1.3+Math.random()*2.4;s[e*6]=t,s[e*6+1]=n,s[e*6+2]=r,s[e*6+3]=t+.12,s[e*6+4]=n-i,s[e*6+5]=r+.05}}o.geometry.attributes.position.needsUpdate=!0;let l=o.material;l.opacity=.12+r.treble*.18*t}),(0,w.jsxs)(`lineSegments`,{ref:n,children:[(0,w.jsx)(`bufferGeometry`,{children:(0,w.jsx)(`bufferAttribute`,{attach:`attributes-position`,args:[a,3]})}),(0,w.jsx)(`lineBasicMaterial`,{color:`#dbeafe`,transparent:!0,opacity:.14,depthWrite:!1,blending:2})]})}function F(){let e=(0,S.c)(2),t=(0,C.useRef)(null),n;e[0]===Symbol.for(`react.memo_cache_sentinel`)?(n=e=>{if(!t.current)return;t.current.position.y=1.5+Math.sin(e.clock.elapsedTime*.15)*.4;let n=t.current.material;n.opacity=.08+Math.sin(e.clock.elapsedTime*.2)*.02},e[0]=n):n=e[0],s(n);let r;return e[1]===Symbol.for(`react.memo_cache_sentinel`)?(r=(0,w.jsxs)(`mesh`,{ref:t,position:[0,2,-15],rotation:[-.1,0,0],children:[(0,w.jsx)(`planeGeometry`,{args:[120,18]}),(0,w.jsx)(`meshBasicMaterial`,{color:`#8aa8d8`,transparent:!0,opacity:.08,depthWrite:!1,blending:2})]}),e[1]=r):r=e[1],r}function I({featuresRef:e,intensity:t}){let n=(0,C.useRef)(null),r=_(e),i=(0,C.useMemo)(()=>Float32Array.from({length:O},()=>18+Math.random()*22),[]),a=(0,C.useMemo)(()=>Float32Array.from({length:O},()=>.6+Math.random()*1.4),[]),o=(0,C.useMemo)(()=>{let e=new Float32Array(O*6);for(let t=0;t<O;t++){let n=(Math.random()-.5)*70,r=Math.random()*35,i=(Math.random()-.5)*50,o=a[t];e[t*6]=n,e[t*6+1]=r,e[t*6+2]=i,e[t*6+3]=n+.04,e[t*6+4]=r-o,e[t*6+5]=i+.02}return e},[a]);return s((e,o)=>{let s=n.current;if(!s)return;r.update(o);let c=.3+r.mid*1.2*t,l=1+r.bass*.8*t,u=s.geometry.attributes.position.array;for(let e=0;e<O;e++){let t=i[e]*l*o;for(let n=0;n<2;n++){let r=e*6+n*3;u[r]+=c*o*.6,u[r+1]-=t}if(u[e*6+1]<-.5){let t=(Math.random()-.5)*70,n=28+Math.random()*8,r=(Math.random()-.5)*50,i=a[e];u[e*6]=t,u[e*6+1]=n,u[e*6+2]=r,u[e*6+3]=t+.04,u[e*6+4]=n-i,u[e*6+5]=r+.02}}s.geometry.attributes.position.needsUpdate=!0;let d=s.material;d.opacity=.22+r.treble*.18*t}),(0,w.jsxs)(`lineSegments`,{ref:n,children:[(0,w.jsx)(`bufferGeometry`,{children:(0,w.jsx)(`bufferAttribute`,{attach:`attributes-position`,args:[o,3]})}),(0,w.jsx)(`lineBasicMaterial`,{color:`#b8cce8`,transparent:!0,opacity:.28,depthWrite:!1,blending:1})]})}function L(e){let t=(0,S.c)(6),{featuresRef:n,intensity:a}=e,o=(0,C.useRef)(null),c=_(n),l;t[0]===Symbol.for(`react.memo_cache_sentinel`)?(l=[],t[0]=l):l=t[0];let u=(0,C.useRef)(l),d;t[1]===Symbol.for(`react.memo_cache_sentinel`)?(d=[],t[1]=d):d=t[1];let f=(0,C.useRef)(d),p;t[2]!==c||t[3]!==a?(p=(e,t)=>{let n=o.current;if(n){for(c.update(t),(c.isBeatDrop||c.rms>.35)&&Math.random()>.7&&u.current.length<18&&u.current.push({x:(Math.random()-.5)*30,z:(Math.random()-.5)*20,r:.05,life:1}),u.current=u.current.filter(e=>(e.r+=t*(3+c.bass*2*a),e.life-=t*.9,e.life>0&&e.r<6));f.current.length>u.current.length;){let e=f.current.pop();n.remove(e)}for(;f.current.length<u.current.length;){let e=new r(new i(.96,1,48),new h({color:`#a8c4e8`,transparent:!0,opacity:0,side:2,depthWrite:!1}));e.rotation.x=-Math.PI/2,n.add(e),f.current.push(e)}u.current.forEach((e,t)=>{let n=f.current[t];n.position.set(e.x,.02,e.z),n.scale.setScalar(e.r),n.material.opacity=e.life*.12})}},t[2]=c,t[3]=a,t[4]=p):p=t[4],s(p);let m;return t[5]===Symbol.for(`react.memo_cache_sentinel`)?(m=(0,w.jsx)(`group`,{ref:o}),t[5]=m):m=t[5],m}function R(e){let t=(0,S.c)(35),{featuresRef:n,intensity:r,onCanvasReady:i}=e,o,s;t[0]===Symbol.for(`react.memo_cache_sentinel`)?(o={position:[0,1.8,10],fov:52},s={antialias:!0,alpha:!1},t[0]=o,t[1]=s):(o=t[0],s=t[1]);let u;t[2]===i?u=t[3]:(u=e=>{let{gl:t,scene:n}=e;n.background=new c(`#040810`),n.fog=new a(`#0a1428`,.028),i?.(t.domElement)},t[2]=i,t[3]=u);let f;t[4]===Symbol.for(`react.memo_cache_sentinel`)?(f=(0,w.jsx)(x,{variant:`night`,intensity:.48}),t[4]=f):f=t[4];let h,g,_,v,T;t[5]===Symbol.for(`react.memo_cache_sentinel`)?(h=(0,w.jsx)(`color`,{attach:`background`,args:[`#040810`]}),g=(0,w.jsx)(`ambientLight`,{intensity:.12,color:`#4a6088`}),_=(0,w.jsx)(`hemisphereLight`,{args:[`#1a2848`,`#020408`,.35]}),v=(0,w.jsx)(`directionalLight`,{position:[-8,9,6],intensity:.9,color:`#6ea8ff`}),T=(0,w.jsx)(j,{}),t[5]=h,t[6]=g,t[7]=_,t[8]=v,t[9]=T):(h=t[5],g=t[6],_=t[7],v=t[8],T=t[9]);let E;t[10]!==n||t[11]!==r?(E=(0,w.jsx)(M,{featuresRef:n,intensity:r}),t[10]=n,t[11]=r,t[12]=E):E=t[12];let O;t[13]===Symbol.for(`react.memo_cache_sentinel`)?(O=(0,w.jsx)(F,{}),t[13]=O):O=t[13];let k,N,R,z;t[14]!==n||t[15]!==r?(k=(0,w.jsx)(D,{featuresRef:n,intensity:r,moonDir:A}),N=(0,w.jsx)(I,{featuresRef:n,intensity:r}),R=(0,w.jsx)(P,{featuresRef:n,intensity:r}),z=(0,w.jsx)(L,{featuresRef:n,intensity:r}),t[14]=n,t[15]=r,t[16]=k,t[17]=N,t[18]=R,t[19]=z):(k=t[16],N=t[17],R=t[18],z=t[19]);let B=1.2+r*.8,V;t[20]===B?V=t[21]:(V=(0,w.jsx)(d,{intensity:B,luminanceThreshold:.35,luminanceSmoothing:.9,mipmapBlur:!0}),t[20]=B,t[21]=V);let H;t[22]===Symbol.for(`react.memo_cache_sentinel`)?(H=(0,w.jsx)(m,{eskil:!1,offset:.22,darkness:.65}),t[22]=H):H=t[22];let U;t[23]===V?U=t[24]:(U=(0,w.jsxs)(p,{multisampling:4,children:[V,H]}),t[23]=V,t[24]=U);let W;t[25]!==E||t[26]!==k||t[27]!==N||t[28]!==R||t[29]!==z||t[30]!==U?(W=(0,w.jsx)(y,{children:(0,w.jsxs)(C.Suspense,{fallback:null,children:[f,h,g,_,v,T,E,O,k,N,R,z,U]})}),t[25]=E,t[26]=k,t[27]=N,t[28]=R,t[29]=z,t[30]=U,t[31]=W):W=t[31];let G;return t[32]!==W||t[33]!==u?(G=(0,w.jsx)(b,{children:(0,w.jsx)(l,{className:`size-full`,camera:o,gl:s,onCreated:u,children:W})}),t[32]=W,t[33]=u,t[34]=G):G=t[34],G}export{R as DreamRainScene};