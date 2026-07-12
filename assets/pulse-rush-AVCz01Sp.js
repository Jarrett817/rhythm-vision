import{o as e}from"./rolldown-runtime-CMxvf4Kt.js";import{i as t,r as n}from"./motion-BN46AcYK.js";import{C as r,D as i,E as a,M as o,N as s,P as c,S as l,T as u,_ as d,a as f,c as p,d as m,f as h,h as g,i as _,k as v,l as y,m as b,o as x,r as S,s as C,u as w,v as T,y as E}from"./three-CKEoqEra.js";import{d as D}from"./utils-BIXjVjfA.js";import{n as O,r as k}from"./audio-response-BYIoVSmQ.js";import{n as A,r as j,t as M}from"./scene-environment-ChjgSWre.js";import{n as N,t as ee}from"./stage-compositor-CCveU24_.js";import{n as P,t as F}from"./noise-chunks-CCpkP8Df.js";var I=D(),L=e(t(),1),R=n(),z=`
varying vec2 vUv;
void main() {
  vUv = uv;
}
`,B=`
${F}

uniform float uTime;
uniform float uEnergy;
uniform float uMid;
uniform float uTreble;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;

varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  float n1 = cnoise(uv * 3.5 + vec2(uTime * 0.08, -uTime * 0.05));
  float n2 = cnoise(uv * 5.0 + vec2(-uTime * 0.06, uTime * 0.09));
  float band1 = sin(uv.x * 5.0 + uTime * 0.35 + n1 * 1.2) * 0.5 + 0.5;
  float band2 = sin(uv.y * 4.0 - uTime * 0.22 + n2 * 1.4) * 0.5 + 0.5;
  float swirl = sin((uv.x * 2.0 + uv.y * 3.0) + uTime * 0.18 + n1 * 0.8) * 0.5 + 0.5;
  vec3 col = mix(uColor1, uColor2, band1);
  col = mix(col, uColor3, band2 * (0.35 + uEnergy * 0.65));
  col += swirl * uTreble * 0.18;
  col *= 0.85 + uMid * 0.3;
  csm_FragColor = vec4(col, 1.0);
}
`;function V(e){let t=(0,I.c)(27),{featuresRef:n,theme:a}=e,o=(0,L.useRef)(null),s,c,l,u;t[0]===Symbol.for(`react.memo_cache_sentinel`)?(s={value:0},c={value:0},l={value:0},u={value:0},t[0]=s,t[1]=c,t[2]=l,t[3]=u):(s=t[0],c=t[1],l=t[2],u=t[3]);let d;t[4]===a.color1?d=t[5]:(d=new r(a.color1),t[4]=a.color1,t[5]=d);let f;t[6]===d?f=t[7]:(f={value:d},t[6]=d,t[7]=f);let p;t[8]===a.color2?p=t[9]:(p=new r(a.color2),t[8]=a.color2,t[9]=p);let m;t[10]===p?m=t[11]:(m={value:p},t[10]=p,t[11]=m);let h;t[12]===a.color3?h=t[13]:(h=new r(a.color3),t[12]=a.color3,t[13]=h);let g;t[14]===h?g=t[15]:(g={value:h},t[14]=h,t[15]=g);let _;t[16]!==g||t[17]!==f||t[18]!==m?(_={uTime:s,uEnergy:c,uMid:l,uTreble:u,uColor1:f,uColor2:m,uColor3:g},t[16]=g,t[17]=f,t[18]=m,t[19]=_):_=t[19];let v=_,y;t[20]===n?y=t[21]:(y=e=>{let t=o.current;if(!t)return;let r=n.current;t.uniforms.uTime.value=e.clock.elapsedTime,t.uniforms.uEnergy.value=r.rms,t.uniforms.uMid.value=r.mid,t.uniforms.uTreble.value=r.treble},t[20]=n,t[21]=y),T(y);let b,x,C;t[22]===Symbol.for(`react.memo_cache_sentinel`)?(b=[0,2,-35],x=[.1,0,0],C=(0,R.jsx)(`planeGeometry`,{args:[120,70]}),t[22]=b,t[23]=x,t[24]=C):(b=t[22],x=t[23],C=t[24]);let w;return t[25]===v?w=t[26]:(w=(0,R.jsxs)(`mesh`,{position:b,rotation:x,children:[C,(0,R.jsx)(S,{ref:o,baseMaterial:i,vertexShader:z,fragmentShader:B,uniforms:v,depthWrite:!1})]}),t[25]=v,t[26]=w),w}var H=5;function U(e){let t=(0,I.c)(14),{featuresRef:n,intensity:r,index:i,hue:a}=e,o=(0,L.useRef)(null),u;t[0]===i?u=t[1]:(u=new l(Array.from({length:24},(e,t)=>{let n=t/23;return new c(Math.sin(n*Math.PI*2+i)*6,(n-.5)*8,Math.cos(n*Math.PI*2+i*.7)*6)})),t[0]=i,t[1]=u);let d=u,f;t[2]===d?f=t[3]:(f=new s(d,64,.04,8,!1),t[2]=d,t[3]=f);let p=f,m;t[4]!==n||t[5]!==a||t[6]!==i||t[7]!==r?(m=e=>{let t=o.current;if(!t)return;let{rms:s,mid:c,bass:l}=n.current,u=e.clock.elapsedTime;t.rotation.y=u*(.08+i*.02)+l*.5,t.rotation.x=Math.sin(u*.3+i)*.3,t.scale.setScalar(1+s*r*.6);let d=t.material;d.opacity=.15+c*.35+Math.sin(u*1.5+i)*.08,d.color.setHSL(a/360,.85,.65)},t[4]=n,t[5]=a,t[6]=i,t[7]=r,t[8]=m):m=t[8],T(m);let h=`hsl(${a}, 85%, 65%)`,g;t[9]===h?g=t[10]:(g=(0,R.jsx)(`meshBasicMaterial`,{color:h,transparent:!0,opacity:.25,blending:2,depthWrite:!1}),t[9]=h,t[10]=g);let _;return t[11]!==p||t[12]!==g?(_=(0,R.jsx)(`mesh`,{ref:o,geometry:p,children:g}),t[11]=p,t[12]=g,t[13]=_):_=t[13],_}function te(e){let t=(0,I.c)(4),{featuresRef:n,intensity:r,baseHue:i}=e,a=i===void 0?260:i,o;return t[0]!==a||t[1]!==n||t[2]!==r?(o=(0,R.jsx)(`group`,{children:Array.from({length:H},(e,t)=>(0,R.jsx)(U,{index:t,featuresRef:n,intensity:r,hue:a+t*25},t))}),t[0]=a,t[1]=n,t[2]=r,t[3]=o):o=t[3],o}function ne(e){let t=(0,I.c)(9),{featuresRef:n,color:r,count:i}=e,a=r===void 0?`#ffffff`:r,o=i===void 0?400:i,s=(0,L.useRef)(null),c;t[0]===n?c=t[1]:(c=e=>{let t=s.current;if(!t)return;t.rotation.y=e.clock.elapsedTime*.04;let r=1+n.current.rms*.5;t.scale.setScalar(r)},t[0]=n,t[1]=c),T(c);let l;t[2]===Symbol.for(`react.memo_cache_sentinel`)?(l=[30,18,30],t[2]=l):l=t[2];let u;t[3]!==a||t[4]!==o?(u=(0,R.jsx)(b,{count:o,scale:l,size:3,speed:.5,opacity:.6,color:a}),t[3]=a,t[4]=o,t[5]=u):u=t[5];let d;t[6]===Symbol.for(`react.memo_cache_sentinel`)?(d=(0,R.jsx)(g,{radius:50,depth:40,count:1200,factor:2,saturation:.4,fade:!0,speed:.5}),t[6]=d):d=t[6];let f;return t[7]===u?f=t[8]:(f=(0,R.jsxs)(`group`,{ref:s,children:[u,d]}),t[7]=u,t[8]=f),f}var W=new r(`#2a0a4a`),G=new r(`#f5a623`),K=new r(`#7c1f6e`),q={color1:`#0c0518`,color2:`#3b0a52`,color3:`#b26b1f`,fog:`#0a0512`,sparkle:`#e9c46a`},J=`
varying vec2 vUv;
void main() {
  vUv = uv;
}
`,Y=`
${P}

uniform float uTime;
uniform float uEnergy;
uniform vec3 uColorLow;
uniform vec3 uColorMid;
uniform vec3 uColorHigh;

varying vec2 vUv;

// 三段 fbm 体积雾
float fbm(vec3 p) {
  float f = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    f += amp * cnoise(p);
    p *= 2.02;
    amp *= 0.5;
  }
  return f;
}

void main() {
  vec2 uv = vUv - 0.5;
  // 极慢流场，与其他层完全解耦
  float t = uTime * 0.08;
  vec3 p = vec3(uv * 2.4, t);
  float n = fbm(p);
  float n2 = fbm(p * 1.7 + vec3(3.1, -1.2, t * 0.6));
  // 混合两层 fbm 造出"体积翻卷"感
  float dense = smoothstep(-0.6, 0.9, n * 0.6 + n2 * 0.4);
  // 径向 falloff：把能量往中偏下集中，边缘融入暗背景（不做全屏铺满）
  float radial = smoothstep(0.95, 0.15, length(uv * vec2(1.0, 1.35)));
  float mask = dense * radial;

  // 三段渐变：暗紫 → 品红 → 琥珀高光（能量高时高光带才浮现）
  vec3 col = mix(uColorLow, uColorMid, mask);
  col = mix(col, uColorHigh, pow(mask, 3.0) * (0.15 + uEnergy * 0.6));

  // 整体偏暗：作为背景层不能抢注意力
  float alpha = mask * (0.55 + uEnergy * 0.35);
  csm_FragColor = vec4(col, alpha);
}
`;function X(e){let t=(0,I.c)(5),{featuresRef:n}=e,r=(0,L.useRef)(null),a;t[0]===Symbol.for(`react.memo_cache_sentinel`)?(a=new O(.04),t[0]=a):a=t[0];let o=(0,L.useRef)(a),s;t[1]===Symbol.for(`react.memo_cache_sentinel`)?(s={uTime:{value:0},uEnergy:{value:0},uColorLow:{value:W.clone().multiplyScalar(.55)},uColorMid:{value:K.clone()},uColorHigh:{value:G.clone()}},t[1]=s):s=t[1];let c=s,l;t[2]===n?l=t[3]:(l=(e,t)=>{let i=r.current;if(!i)return;let a=n.current;i.uniforms.uTime.value=e.clock.elapsedTime,i.uniforms.uEnergy.value=o.current.update(a.rms,t)},t[2]=n,t[3]=l),T(l);let u;return t[4]===Symbol.for(`react.memo_cache_sentinel`)?(u=(0,R.jsxs)(`mesh`,{position:[0,0,-18],rotation:[0,0,0],children:[(0,R.jsx)(`planeGeometry`,{args:[68,40]}),(0,R.jsx)(S,{ref:r,baseMaterial:i,vertexShader:J,fragmentShader:Y,uniforms:c,transparent:!0,depthWrite:!1,blending:1})]}),t[4]=u):u=t[4],u}function Z(e){let t=(0,I.c)(7),{featuresRef:n,intensity:i}=e,a=(0,L.useRef)(null),o=k(n),s;if(t[0]===Symbol.for(`react.memo_cache_sentinel`)){let e=new Float32Array(4200),n=new Float32Array(1400),r=new Uint8Array(1400),i=new Float32Array(1400);for(let t=0;t<1400;t++){let a=Math.random()*Math.PI*2,o=2+Math.random()*20;e[t*3]=Math.cos(a)*o,e[t*3+1]=(Math.random()-.5)*22,e[t*3+2]=(Math.random()-.5)*36,n[t]=.3+Math.random()*.7,r[t]=Math.floor(Math.random()*3),i[t]=Math.random()*Math.PI*2}s={positions:e,speeds:n,bands:r,phases:i},t[0]=s}else s=t[0];let c=s,l=(0,L.useRef)(c.positions),u;t[1]===Symbol.for(`react.memo_cache_sentinel`)?(u=new r,t[1]=u):u=t[1];let d=(0,L.useRef)(u),f;t[2]!==o||t[3]!==n||t[4]!==i?(f=(e,t)=>{let r=a.current;if(!r)return;o.update(t);let{mid:s,rms:u,bass:f,treble:p}=n.current,m=(1.1+s*6.5+u*1.2)*i*t,h=l.current;for(let e=0;e<1400;e++){let t=c.bands[e]===0?1+f*1.4:c.bands[e]===1?1+s*.8:1+p*1.8,n=h[e*3+2]+m*c.speeds[e]*t;if(n>18){h[e*3+2]=-18;let t=Math.random()*Math.PI*2,n=2+Math.random()*20;h[e*3]=Math.cos(t)*n,h[e*3+1]=(Math.random()-.5)*22}else h[e*3+2]=n}r.geometry.attributes.position.needsUpdate=!0,r.rotation.y=r.rotation.y+t*(.15+s*1.3),r.rotation.x=Math.sin(e.clock.elapsedTime*.2)*.18;let g=r.material;g.size=(.06+u*.22+o.impact*.12)*i;let _=Math.min(1,p*.7+o.impact*.6);d.current.copy(K).lerp(G,_),g.color.copy(d.current).multiplyScalar(.85+u*.35),g.opacity=.7+u*.25},t[2]=o,t[3]=n,t[4]=i,t[5]=f):f=t[5],T(f);let p;return t[6]===Symbol.for(`react.memo_cache_sentinel`)?(p=(0,R.jsxs)(`points`,{ref:a,children:[(0,R.jsx)(`bufferGeometry`,{children:(0,R.jsx)(`bufferAttribute`,{attach:`attributes-position`,args:[c.positions,3]})}),(0,R.jsx)(`pointsMaterial`,{size:.08,transparent:!0,opacity:.75,blending:2,depthWrite:!1,sizeAttenuation:!0})]}),t[6]=p):p=t[6],p}function re({featuresRef:e}){let{camera:t}=E(),n=k(e);return T((e,r)=>{n.update(r);let i=n.tension,a=n.release,o=n.impact,s=performance.now()/1e3,c=9-i*1.8+a*1.2+o*.5,l=65+o*12+a*4,u=o*(Math.random()-.5)*.25,d=o*(Math.random()-.5)*.18;t.position.z+=(c-t.position.z)*Math.min(1,r*4),t.position.y+=(Math.sin(s*.5)*.1*(1-a*.3)-t.position.y)*Math.min(1,r*2),t.position.x+=(u-t.position.x*.2)*Math.min(1,r*10),t.position.y+=d*Math.min(1,r*10),t instanceof v&&(t.fov+=(l-t.fov)*Math.min(1,r*5),t.updateProjectionMatrix())}),null}function ie({featuresRef:e,intensity:t}){let n=(0,L.useRef)(null),r=k(e),s=(0,L.useRef)([]),c=(0,L.useRef)(0),l=(0,L.useMemo)(()=>{let e=new o(1,.025,8,96);return Array.from({length:4},()=>{let t=new a(e,new i({color:G.clone(),transparent:!0,opacity:0,blending:2,depthWrite:!1}));return t.visible=!1,t})},[]);return(0,L.useEffect)(()=>{let e=n.current;if(e){for(let t of l)e.add(t);return()=>{for(let t of l)e.remove(t),t.material.dispose();l[0]?.geometry.dispose()}}},[l]),T((e,i)=>{if(n.current){r.update(i),c.current-=i,r.isBeatDrop&&c.current<=0&&s.current.length<4&&(s.current.push({life:1,speed:4+r.impact*2,tilt:(Math.random()-.5)*.6}),c.current=.12),s.current=s.current.filter(e=>(e.life-=i*e.speed,e.life>0));for(let e=0;e<4;e++){let n=l[e],r=s.current[e];if(r){n.visible=!0;let e=(1-r.life)*14*t;n.scale.set(e,e,e*.15),n.rotation.x=Math.PI/2+r.tilt,n.rotation.z=r.tilt*1.5;let i=n.material;i.opacity=r.life**.6*.75,i.color.copy(K).lerp(G,1-r.life)}else n.visible=!1}}}),(0,R.jsx)(`group`,{ref:n})}function Q(e){let t=(0,I.c)(46),{featuresRef:n,intensity:r,onCanvasReady:i}=e,a,o;t[0]===Symbol.for(`react.memo_cache_sentinel`)?(a={position:[0,0,9],fov:65},o={antialias:!0},t[0]=a,t[1]=o):(a=t[0],o=t[1]);let s;t[2]===i?s=t[3]:(s=e=>{let{gl:t,scene:n}=e;n.fog=new u(q.fog,.025),i?.(t.domElement)},t[2]=i,t[3]=s);let c;t[4]===Symbol.for(`react.memo_cache_sentinel`)?(c=(0,R.jsx)(M,{variant:`studio`,intensity:.5}),t[4]=c):c=t[4];let l,g;t[5]===n?(l=t[6],g=t[7]):(l=(0,R.jsx)(V,{featuresRef:n,theme:q}),g=(0,R.jsx)(X,{featuresRef:n}),t[5]=n,t[6]=l,t[7]=g);let v,b,S;t[8]===Symbol.for(`react.memo_cache_sentinel`)?(v=(0,R.jsx)(`ambientLight`,{intensity:.18,color:`#3a1a5a`}),b=(0,R.jsx)(`pointLight`,{position:[3,2,4],intensity:2.6,color:`#f5a623`,distance:30}),S=(0,R.jsx)(`pointLight`,{position:[-4,-1,2],intensity:1.8,color:`#7c1f6e`,distance:28}),t[8]=v,t[9]=b,t[10]=S):(v=t[8],b=t[9],S=t[10]);let T;t[11]===n?T=t[12]:(T=(0,R.jsx)(ne,{featuresRef:n,color:`#e9c46a`,count:300}),t[11]=n,t[12]=T);let E,D,O;t[13]!==n||t[14]!==r?(E=(0,R.jsx)(te,{featuresRef:n,intensity:r,baseHue:285}),D=(0,R.jsx)(Z,{featuresRef:n,intensity:r}),O=(0,R.jsx)(ie,{featuresRef:n,intensity:r}),t[13]=n,t[14]=r,t[15]=E,t[16]=D,t[17]=O):(E=t[15],D=t[16],O=t[17]);let k,P,F;t[18]===n?(k=t[19],P=t[20],F=t[21]):(k=(0,R.jsx)(ee,{featuresRef:n,color:`#2a0a4a`}),P=(0,R.jsx)(re,{featuresRef:n}),F=(0,R.jsx)(N,{featuresRef:n}),t[18]=n,t[19]=k,t[20]=P,t[21]=F);let z;t[22]===Symbol.for(`react.memo_cache_sentinel`)?(z=(0,R.jsx)(C,{focusDistance:.012,focalLength:.045,bokehScale:3.5}),t[22]=z):z=t[22];let B=1.6+r*1.2,H;t[23]===B?H=t[24]:(H=(0,R.jsx)(w,{intensity:B,luminanceThreshold:.35,luminanceSmoothing:.9,mipmapBlur:!0}),t[23]=B,t[24]=H);let U,W,G,K,J;t[25]===Symbol.for(`react.memo_cache_sentinel`)?(U=(0,R.jsx)(m,{blendFunction:h.NORMAL,offset:[6e-4,6e-4],radialModulation:!0,modulationOffset:.4}),W=(0,R.jsx)(x,{hue:-.05,saturation:.12}),G=(0,R.jsx)(f,{brightness:-.02,contrast:.12}),K=(0,R.jsx)(_,{opacity:.035,blendFunction:h.OVERLAY}),J=(0,R.jsx)(y,{eskil:!1,offset:.28,darkness:.72}),t[25]=U,t[26]=W,t[27]=G,t[28]=K,t[29]=J):(U=t[25],W=t[26],G=t[27],K=t[28],J=t[29]);let Y;t[30]===H?Y=t[31]:(Y=(0,R.jsxs)(p,{multisampling:2,children:[z,H,U,W,G,K,J]}),t[30]=H,t[31]=Y);let Q;t[32]!==T||t[33]!==E||t[34]!==D||t[35]!==O||t[36]!==k||t[37]!==P||t[38]!==F||t[39]!==Y||t[40]!==l||t[41]!==g?(Q=(0,R.jsx)(A,{children:(0,R.jsxs)(L.Suspense,{fallback:null,children:[c,l,g,v,b,S,T,E,D,O,k,P,F,Y]})}),t[32]=T,t[33]=E,t[34]=D,t[35]=O,t[36]=k,t[37]=P,t[38]=F,t[39]=Y,t[40]=l,t[41]=g,t[42]=Q):Q=t[42];let $;return t[43]!==Q||t[44]!==s?($=(0,R.jsx)(j,{children:(0,R.jsx)(d,{className:`size-full`,camera:a,gl:o,onCreated:s,children:Q})}),t[43]=Q,t[44]=s,t[45]=$):$=t[45],$}export{Q as PulseRushScene};