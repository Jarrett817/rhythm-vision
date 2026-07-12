import{o as e}from"./rolldown-runtime-CMxvf4Kt.js";import{i as t,r as n}from"./motion-BN46AcYK.js";import{A as r,C as i,D as a,O as o,T as s,_ as c,k as l,m as u,r as d,v as f,y as p}from"./three-CKEoqEra.js";import{d as m}from"./utils-BIXjVjfA.js";import{n as h,r as g}from"./audio-response-BYIoVSmQ.js";import{t as _}from"./dreamy-postprocessing-2Ubf_pTv.js";import{n as v,t as y}from"./stage-compositor-CCveU24_.js";import{n as b,t as x}from"./noise-chunks-CCpkP8Df.js";var S=m(),C=e(t(),1),w=n(),ee=new i(`#080818`),T=new i(`#e8c98a`),te=new i(`#f4ecd8`),ne=new i(`#e6e6f5`),re=new i(`#1a1040`),ie=new i(`#5a4a8a`),ae=new i(`#3a4a7a`),E=new i(`#f0c6d4`),D=new i(`#faf0e6`),oe=new i(`#c9b5d9`),O=new i(`#ffe8b8`),se=new i(`#ffd4e0`),k=new i(`#050510`),A=`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,j=`
${b}

uniform float uTime;
uniform float uMid;
uniform float uRms;
uniform vec3 uColor;
uniform float uAlpha;
uniform float uSeed;

varying vec2 vUv;

float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * cnoise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = vUv;
  // 水平羽化：避免硬边
  float edgeX = smoothstep(0.0, 0.2, uv.x) * smoothstep(1.0, 0.8, uv.x);
  // 纵向柔和分布：中心亮、上下淡
  float vert = smoothstep(0.0, 0.25, uv.y) * smoothstep(1.0, 0.6, uv.y);

  // 极慢飘动：time * 0.08
  float slow = uTime * 0.08 + uSeed;
  vec3 p = vec3(uv.x * 1.6 + slow * 0.3, uv.y * 1.2 - slow * 0.15, slow * 0.25 + uSeed);
  float n = fbm(p);
  n = smoothstep(-0.3, 0.6, n);

  // 第二层细节
  vec3 p2 = vec3(uv.x * 3.0 - slow * 0.4, uv.y * 2.2 + slow * 0.2, slow * 0.4 + uSeed * 1.7);
  float n2 = fbm(p2) * 0.4;

  float veil = (n + n2) * edgeX * vert;
  // 音频微幅推动：mid 让纱幕更显，rms 整体呼吸
  veil *= 0.75 + uMid * 0.35 + uRms * 0.2;

  float alpha = clamp(veil * uAlpha, 0.0, 0.35);
  if (alpha < 0.002) discard;
  csm_FragColor = vec4(uColor, alpha);
}
`;function ce({featuresRef:e,position:t,size:n,color:r,baseAlpha:i,seed:o}){let s=(0,C.useRef)(null),c=(0,C.useMemo)(()=>({uTime:{value:0},uMid:{value:0},uRms:{value:0},uColor:{value:r.clone()},uAlpha:{value:i},uSeed:{value:o}}),[]),l=g(e),u=(0,C.useRef)(new h(.05)),p=(0,C.useRef)(new h(.03));return f((e,t)=>{let n=s.current;n&&(l.update(t),n.uniforms.uTime.value=e.clock.elapsedTime,n.uniforms.uMid.value=u.current.update(l.mid,t),n.uniforms.uRms.value=p.current.update(l.rms,t))}),(0,w.jsxs)(`mesh`,{position:t,renderOrder:2,children:[(0,w.jsx)(`planeGeometry`,{args:n}),(0,w.jsx)(d,{ref:s,baseMaterial:a,vertexShader:A,fragmentShader:j,uniforms:c,transparent:!0,depthWrite:!1,blending:2,toneMapped:!1,side:2})]})}var M=`
varying vec2 vUv;
void main() {
  vUv = uv;
  // 使⽤ instanceMatrix（虽然这⾥单 mesh，billboard ⻛格）
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,N=`
${x}

uniform float uTime;
uniform float uMid;
uniform float uRms;
uniform float uSection; // 段落亮度
uniform vec3 uColor;
uniform float uWidth; // 底部半宽
uniform float uTopRatio; // 顶部宽度 / 底部宽度
uniform float uSway; // 左右摇摆量（-1~1 外部已传）
uniform float uSeed;

varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  // y: 0=底部, 1=顶部（顶点源处）
  float y = uv.y;

  // 光锥宽度：从底部宽到顶部窄（顶点在顶部）
  float halfW = mix(uWidth, uWidth * uTopRatio, y);
  // 左右摇摆：顶部更稳定，中下部随 uSway 微微偏移（像柔软的追光）
  float swayOffset = uSway * (1.0 - smoothstep(0.0, 0.5, y)) * 0.35;

  float dx = abs(uv.x - 0.5 - swayOffset);
  // ⾼斯衰减：横向
  float gx = exp(-(dx * dx) / (halfW * halfW * 0.35));
  // 纵向衰减：顶部最亮、向下逐渐扩散变淡（雾感）
  float gy = smoothstep(1.02, 0.2, y) * 0.55 + smoothstep(0.0, 0.8, y) * 0.45;
  // 加噪声柔化边缘，让光柱更有体积感
  float n = cnoise(vec2(uv.x * 4.0 + uTime * 0.1 + uSeed, uv.y * 3.0 - uTime * 0.08));
  float shape = gx * gy;
  shape *= 0.85 + n * 0.25;

  // 音频响应：rms 整体呼吸，mid 让光柱更有存在感
  float intensity = shape * (0.5 + uRms * 0.6 + uMid * 0.3) * uSection;

  float alpha = clamp(intensity * 0.11, 0.0, 0.14);
  if (alpha < 0.002) discard;

  // 颜色：核⼼偏⽩，边缘染⾊
  vec3 col = mix(uColor * 0.6, vec3(1.0, 0.96, 0.88), gx * 0.4);
  csm_FragColor = vec4(col, alpha);
}
`;function le({featuresRef:e,position:t,height:n,width:r,color:i,phase:o,sectionRef:s}){let c=(0,C.useRef)(null),l=(0,C.useMemo)(()=>({uTime:{value:0},uMid:{value:0},uRms:{value:0},uSection:{value:.3},uColor:{value:i.clone()},uWidth:{value:.5},uTopRatio:{value:.25},uSway:{value:0},uSeed:{value:o}}),[]),u=g(e),p=(0,C.useRef)(new h(.05)),m=(0,C.useRef)(new h(.03));return f((e,t)=>{let n=c.current;if(!n)return;u.update(t);let i=e.clock.elapsedTime;n.uniforms.uTime.value=i,n.uniforms.uMid.value=p.current.update(u.mid,t),n.uniforms.uRms.value=m.current.update(u.rms,t),n.uniforms.uSection.value=s.current;let a=Math.sin(i*.35+o)*(.6+u.mid*.5);n.uniforms.uSway.value=a,n.uniforms.uWidth.value=r*(.85+s.current*.3+u.rms*.15)}),(0,w.jsxs)(`mesh`,{position:t,renderOrder:3,children:[(0,w.jsx)(`planeGeometry`,{args:[r*2,n]}),(0,w.jsx)(d,{ref:c,baseMaterial:a,vertexShader:M,fragmentShader:N,uniforms:l,transparent:!0,depthWrite:!1,blending:2,toneMapped:!1,side:2})]})}var P=65,F=[E,D,oe,new i(`#ffd9e2`)];function ue({featuresRef:e,intensity:t,densityRef:n}){let a=(0,C.useRef)(null),s=g(e),c=(0,C.useMemo)(()=>new o,[]),l=(0,C.useMemo)(()=>new i,[]),u=(0,C.useRef)([]),d=(0,C.useMemo)(()=>{let e=new r({transparent:!0,depthWrite:!1,side:2,blending:2,uniforms:{},vertexShader:`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,fragmentShader:`
        varying vec2 vUv;
        void main() {
          vec2 uv = vUv - 0.5;
          // 花瓣：纵向稍长椭圆，顶端略尖
          float ax = uv.x * 2.4;
          float ay = uv.y * 2.0;
          // 顶端收尖：y 负向（顶端）稍收
          float taper = 1.0 - smoothstep(0.2, 0.5, -ay) * 0.35;
          ax /= taper;
          float d = ax * ax + ay * ay * 1.2;
          float shape = exp(-d * 2.5);
          // 中央中脉微亮
          float vein = exp(-abs(ax) * 6.0) * 0.25;
          float a = shape;
          if (a < 0.02) discard;
          // 颜色由 instanceColor 提供，alpha 随 shape 衰减
          gl_FragColor = vec4(vec3(1.0) + vein * 0.35, a * 0.75);
        }
      `});return e.toneMapped=!1,e},[]);if(u.current.length===0)for(let e=0;e<P;e++)u.current.push(p(Math.random()));function p(e){let t=F[Math.floor(Math.random()*F.length)];return{x:(Math.random()-.5)*18,y:4+e*10,z:-2-Math.random()*12,vx:(Math.random()-.5)*.15,vy:-(.25+Math.random()*.25),vz:(Math.random()-.5)*.1,rx:Math.random()*Math.PI*2,ry:Math.random()*Math.PI*2,rz:Math.random()*Math.PI*2,rvx:(Math.random()-.5)*.4,rvy:(Math.random()-.5)*.5,rvz:(Math.random()-.5)*.3,swayPhase:Math.random()*Math.PI*2,swayAmp:.4+Math.random()*.5,size:.25+Math.random()*.2,color:t.clone()}}return f((e,r)=>{let i=a.current;if(!i)return;s.update(r);let o=e.clock.elapsedTime,f=1+s.bass*.35,m=n.current,h=Math.floor(P*(.4+m*.6)),g=0;for(let e=0;e<P;e++){let t=u.current[e];if(g>=h){c.position.set(0,-100,0),c.scale.set(0,0,0),c.updateMatrix(),i.setMatrixAt(e,c.matrix),l.set(0,0,0),i.setColorAt(e,l);continue}if(t.y+=t.vy*f*r*1.2,t.x+=t.vx*r+Math.sin(o*.6+t.swayPhase)*t.swayAmp*r,t.z+=t.vz*r,t.rx+=t.rvx*r,t.ry+=t.rvy*r,t.rz+=t.rvz*r,t.y<-2.5){let e=p(0);Object.assign(t,e)}c.position.set(t.x,t.y,t.z),c.rotation.set(t.rx,t.ry,t.rz),c.scale.set(t.size,t.size*1.15,t.size),c.updateMatrix(),i.setMatrixAt(e,c.matrix),l.copy(t.color).multiplyScalar(.8+s.rms*.3),i.setColorAt(e,l),g++}i.instanceMatrix.needsUpdate=!0,i.instanceColor&&(i.instanceColor.needsUpdate=!0),d.opacity=(.55+s.rms*.3)*t,d.transparent=!0}),(0,w.jsx)(`instancedMesh`,{ref:a,args:[void 0,void 0,P],material:d,frustumCulled:!1,renderOrder:8,children:(0,w.jsx)(`planeGeometry`,{args:[1,1]})})}var I=`
varying vec3 vWorldPos;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`,L=`
${b}

uniform float uTime;
uniform float uRms;
uniform float uMid;
uniform vec3 uCoreColor;
uniform vec3 uFloorColor;

varying vec3 vWorldPos;

void main() {
  // 离中⼼越远越暗
  float r = length(vWorldPos.xz);

  // 极微弱的反光：中⼼处有⼀圈柔亮（反射光核/光柱）
  float reflectGlow = exp(-r * r * 0.04) * (0.15 + uRms * 0.25 + uMid * 0.1);

  // 噪声纹理让地⾯不发死
  float n = cnoise(vec3(vWorldPos.xz * 0.15, uTime * 0.05));
  float subtle = 0.92 + n * 0.08;

  vec3 col = uFloorColor * subtle;
  // 中⼼反射染⼀点暖⾦
  col += uCoreColor * reflectGlow * 0.6;

  // 远处雾化：避免硬边
  float edge = smoothstep(22.0, 8.0, r);

  float alpha = edge;
  csm_FragColor = vec4(col, alpha);
}
`;function de(e){let t=(0,S.c)(8),{featuresRef:n}=e,r=(0,C.useRef)(null),i;t[0]===Symbol.for(`react.memo_cache_sentinel`)?(i={uTime:{value:0},uRms:{value:0},uMid:{value:0},uCoreColor:{value:O.clone()},uFloorColor:{value:k.clone()}},t[0]=i):i=t[0];let o=i,s=g(n),c;t[1]===Symbol.for(`react.memo_cache_sentinel`)?(c=new h(.03),t[1]=c):c=t[1];let l=(0,C.useRef)(c),u;t[2]===Symbol.for(`react.memo_cache_sentinel`)?(u=new h(.04),t[2]=u):u=t[2];let p=(0,C.useRef)(u),m;t[3]===s?m=t[4]:(m=(e,t)=>{let n=r.current;n&&(s.update(t),n.uniforms.uTime.value=e.clock.elapsedTime,n.uniforms.uRms.value=l.current.update(s.rms,t),n.uniforms.uMid.value=p.current.update(s.mid,t))},t[3]=s,t[4]=m),f(m);let _,v;t[5]===Symbol.for(`react.memo_cache_sentinel`)?(_=[-Math.PI/2,0,0],v=[0,-1.5,-6],t[5]=_,t[6]=v):(_=t[5],v=t[6]);let y;return t[7]===Symbol.for(`react.memo_cache_sentinel`)?(y=(0,w.jsxs)(`mesh`,{rotation:_,position:v,renderOrder:1,children:[(0,w.jsx)(`planeGeometry`,{args:[50,40]}),(0,w.jsx)(d,{ref:r,baseMaterial:a,vertexShader:I,fragmentShader:L,uniforms:o,transparent:!0,depthWrite:!1,side:2})]}),t[7]=y):y=t[7],y}function fe(e){let t=(0,S.c)(10),{featuresRef:n,intensity:r,brightnessRef:i}=e,a=(0,C.useRef)(null),o=(0,C.useRef)(null),s=g(n),c;t[0]===Symbol.for(`react.memo_cache_sentinel`)?(c=new h(.04),t[0]=c):c=t[0];let l=(0,C.useRef)(c),u;t[1]===Symbol.for(`react.memo_cache_sentinel`)?(u=new h(.05),t[1]=u):u=t[1];let d=(0,C.useRef)(u),p;t[2]===Symbol.for(`react.memo_cache_sentinel`)?(p=[.35,.22,.12,.06],t[2]=p):p=t[2];let m=p,_;t[3]!==s||t[4]!==i||t[5]!==r?(_=(e,t)=>{let n=a.current,c=o.current;if(!n)return;s.update(t);let u=e.clock.elapsedTime,f=3.5*(1+s.rms*.2+s.impact*.15)*r*i.current;n.scale.setScalar(l.current.update(f,t)),n.rotation.y=u*.08;let p=.55+s.rms*.6+s.treble*.3,h=d.current.update(p*i.current,t);if(n.children.forEach((e,t)=>{let n=e.material;n.opacity=(m[t]??.04)*h,t===0?n.color.copy(O).lerp(te,.2+s.treble*.5):n.color.copy(T).lerp(se,t*.15)}),c){let e=c.material;e.opacity=.08*h*r,c.scale.setScalar(1.8+s.rms*.2)}},t[3]=s,t[4]=i,t[5]=r,t[6]=_):_=t[6],f(_);let v;t[7]===Symbol.for(`react.memo_cache_sentinel`)?(v=[0,1,-4],t[7]=v):v=t[7];let y;t[8]===Symbol.for(`react.memo_cache_sentinel`)?(y=(0,w.jsx)(`group`,{ref:a,children:m.map((e,t)=>(0,w.jsxs)(`mesh`,{scale:.7+t*.5,children:[(0,w.jsx)(`sphereGeometry`,{args:[1,32,32]}),(0,w.jsx)(`meshBasicMaterial`,{color:O,transparent:!0,opacity:m[t],blending:2,depthWrite:!1,toneMapped:!1})]},t))}),t[8]=y):y=t[8];let b;return t[9]===Symbol.for(`react.memo_cache_sentinel`)?(b=(0,w.jsxs)(`group`,{position:v,children:[y,(0,w.jsxs)(`mesh`,{ref:o,scale:2.5,children:[(0,w.jsx)(`sphereGeometry`,{args:[1,24,24]}),(0,w.jsx)(`meshBasicMaterial`,{color:se,transparent:!0,opacity:.1,blending:2,depthWrite:!1,toneMapped:!1})]})]}),t[9]=b):b=t[9],b}function pe({intensity:e,brightnessRef:t}){let n=(0,C.useRef)(null);f((e,t)=>{let r=n.current;r&&(r.rotation.y+=t*.03,r.rotation.x+=t*.01)});let r=.5*e;return(0,w.jsxs)(`group`,{ref:n,position:[0,1,-4],children:[(0,w.jsx)(u,{count:60,scale:[8,6,8],size:1.8,speed:.2,opacity:r*t.current,color:te,noise:.8}),(0,w.jsx)(u,{count:40,scale:[5,4,5],size:1.2,speed:.3,opacity:r*.7*t.current,color:T,noise:.9})]})}function me({featuresRef:e,beamBrightnessRef:t,petalDensityRef:n,coreBrightnessRef:r}){let{camera:i,scene:a}=p(),o=g(e),c=(0,C.useRef)(new h(.03)),u=(0,C.useRef)(new h(.03)),d=(0,C.useRef)(new h(.04));return f((e,f)=>{o.update(f);let p=o.section,m=o.tension,h=14,g=1.5,_=52,v=.025,y=.35,b=.5,x=.7;switch(p){case`intro`:h=16,g=1.8,_=50,v=.038,y=.3,b=.4,x=.55;break;case`verse`:h=14,g=1.6,_=52,v=.03,y=.5,b=.6,x=.75;break;case`buildup`:h=10-m*1.5,g=1.3,_=52+m*3,v=.028-m*.006,y=.6+m*.3,b=.7+m*.2,x=.85+m*.15;break;case`drop`:h=13,g=1.5,_=60,v=.02,y=1,b=.95,x=1;break;case`breakdown`:h=16,g=1.8,_=51,v=.036,y=.35,b=.45,x=.6;break}let S=Math.min(1,f*1.5);i.position.z+=(h-i.position.z)*S,i.position.y+=(g-i.position.y)*S,i.position.x+=(0-i.position.x)*Math.min(1,f*1.2),i instanceof l&&(i.fov+=(_-i.fov)*Math.min(1,f*1.5),i.updateProjectionMatrix()),a.fog instanceof s&&(a.fog.density+=(v-a.fog.density)*Math.min(1,f*1)),t.current=c.current.update(y,f),n.current=u.current.update(b,f),r.current=d.current.update(x,f)}),null}function R(e){let t=(0,S.c)(70),{featuresRef:n,intensity:r,onCanvasReady:i}=e,a=(0,C.useRef)(.35),o=(0,C.useRef)(.5),l=(0,C.useRef)(.7),d;t[0]===Symbol.for(`react.memo_cache_sentinel`)?(d=[-3.5,3.5,-12],t[0]=d):d=t[0];let f,p;t[1]===Symbol.for(`react.memo_cache_sentinel`)?(f={position:d,height:13,width:1.8,color:te,phase:0},p=[3,3.5,-11],t[1]=f,t[2]=p):(f=t[1],p=t[2]);let m,h;t[3]===Symbol.for(`react.memo_cache_sentinel`)?(m={position:p,height:12,width:1.6,color:T,phase:1.7},h=[0,4.2,-14],t[3]=m,t[4]=h):(m=t[3],h=t[4]);let g,b;t[5]===Symbol.for(`react.memo_cache_sentinel`)?(g={position:h,height:14,width:2.2,color:se,phase:.8},b=[-6.5,3.2,-10],t[5]=g,t[6]=b):(g=t[5],b=t[6]);let x,E;t[7]===Symbol.for(`react.memo_cache_sentinel`)?(x={position:b,height:11,width:1.4,color:ne,phase:2.6},E=[6,3.2,-10],t[7]=x,t[8]=E):(x=t[7],E=t[8]);let D;t[9]===Symbol.for(`react.memo_cache_sentinel`)?(D=[f,m,g,x,{position:E,height:11,width:1.5,color:T,phase:3.9}],t[9]=D):D=t[9];let oe=D,O,k;t[10]===Symbol.for(`react.memo_cache_sentinel`)?(O={position:[0,1.5,14],fov:52},k={antialias:!0},t[10]=O,t[11]=k):(O=t[10],k=t[11]);let A;t[12]===i?A=t[13]:(A=e=>{let{gl:t,scene:n}=e;n.fog=new s(ee.clone(),.025),i?.(t.domElement)},t[12]=i,t[13]=A);let j,M;t[14]===Symbol.for(`react.memo_cache_sentinel`)?(j=(0,w.jsx)(`color`,{attach:`background`,args:[`#080818`]}),M=(0,w.jsx)(`ambientLight`,{intensity:.15,color:`#2a1f55`}),t[14]=j,t[15]=M):(j=t[14],M=t[15]);let N,P;t[16]===Symbol.for(`react.memo_cache_sentinel`)?(N=[40,22,30],P=[0,4,-22],t[16]=N,t[17]=P):(N=t[16],P=t[17]);let F=.7*r,I;t[18]===F?I=t[19]:(I=(0,w.jsx)(u,{count:200,scale:N,position:P,size:1.5,speed:.12,opacity:F,color:te,noise:.8}),t[18]=F,t[19]=I);let L,R;t[20]===Symbol.for(`react.memo_cache_sentinel`)?(L=[36,18,28],R=[0,3,-20],t[20]=L,t[21]=R):(L=t[20],R=t[21]);let he=.55*r,z;t[22]===he?z=t[23]:(z=(0,w.jsx)(u,{count:120,scale:L,position:R,size:1,speed:.18,opacity:he,color:T,noise:.85}),t[22]=he,t[23]=z);let ge,_e;t[24]===Symbol.for(`react.memo_cache_sentinel`)?(ge=[0,2,-5],_e=[28,14],t[24]=ge,t[25]=_e):(ge=t[24],_e=t[25]);let B;t[26]===n?B=t[27]:(B=(0,w.jsx)(ce,{featuresRef:n,position:ge,size:_e,color:ie,baseAlpha:.15,seed:.3}),t[26]=n,t[27]=B);let ve,ye;t[28]===Symbol.for(`react.memo_cache_sentinel`)?(ve=[0,2.5,-12],ye=[34,16],t[28]=ve,t[29]=ye):(ve=t[28],ye=t[29]);let V;t[30]===n?V=t[31]:(V=(0,w.jsx)(ce,{featuresRef:n,position:ve,size:ye,color:ae,baseAlpha:.12,seed:1.7}),t[30]=n,t[31]=V);let be,xe;t[32]===Symbol.for(`react.memo_cache_sentinel`)?(be=[0,3,-20],xe=[44,20],t[32]=be,t[33]=xe):(be=t[32],xe=t[33]);let H,U,W;t[34]===n?(H=t[35],U=t[36],W=t[37]):(H=(0,w.jsx)(ce,{featuresRef:n,position:be,size:xe,color:re,baseAlpha:.1,seed:2.9}),U=oe.map((e,t)=>(0,w.jsx)(le,{featuresRef:n,position:e.position,height:e.height,width:e.width,color:e.color,phase:e.phase,sectionRef:a},t)),W=(0,w.jsx)(de,{featuresRef:n}),t[34]=n,t[35]=H,t[36]=U,t[37]=W);let G;t[38]!==n||t[39]!==r?(G=(0,w.jsx)(fe,{featuresRef:n,intensity:r,brightnessRef:l}),t[38]=n,t[39]=r,t[40]=G):G=t[40];let K;t[41]===r?K=t[42]:(K=(0,w.jsx)(pe,{intensity:r,brightnessRef:l}),t[41]=r,t[42]=K);let q;t[43]!==n||t[44]!==r?(q=(0,w.jsx)(ue,{featuresRef:n,intensity:r,densityRef:o}),t[43]=n,t[44]=r,t[45]=q):q=t[45];let J,Y,X;t[46]===n?(J=t[47],Y=t[48],X=t[49]):(J=(0,w.jsx)(y,{featuresRef:n,color:`#2a1508`}),Y=(0,w.jsx)(me,{featuresRef:n,beamBrightnessRef:a,petalDensityRef:o,coreBrightnessRef:l}),X=(0,w.jsx)(v,{featuresRef:n}),t[46]=n,t[47]=J,t[48]=Y,t[49]=X);let Z;t[50]===r?Z=t[51]:(Z=(0,w.jsx)(_,{intensity:r}),t[50]=r,t[51]=Z);let Q;t[52]!==I||t[53]!==z||t[54]!==B||t[55]!==V||t[56]!==H||t[57]!==U||t[58]!==W||t[59]!==G||t[60]!==K||t[61]!==q||t[62]!==J||t[63]!==Y||t[64]!==X||t[65]!==Z?(Q=(0,w.jsxs)(C.Suspense,{fallback:null,children:[j,M,I,z,B,V,H,U,W,G,K,q,J,Y,X,Z]}),t[52]=I,t[53]=z,t[54]=B,t[55]=V,t[56]=H,t[57]=U,t[58]=W,t[59]=G,t[60]=K,t[61]=q,t[62]=J,t[63]=Y,t[64]=X,t[65]=Z,t[66]=Q):Q=t[66];let $;return t[67]!==A||t[68]!==Q?($=(0,w.jsx)(c,{className:`size-full`,camera:O,gl:k,onCreated:A,children:Q}),t[67]=A,t[68]=Q,t[69]=$):$=t[69],$}export{R as FestivalStageScene};