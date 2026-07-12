import{o as e}from"./rolldown-runtime-CMxvf4Kt.js";import{i as t,r as n}from"./motion-BN46AcYK.js";import{C as r,D as i,E as a,M as o,T as s,_ as c,j as l,k as u,m as d,v as f,w as p,x as m,y as h}from"./three-CKEoqEra.js";import{d as g}from"./utils-BIXjVjfA.js";import{n as _,r as v}from"./audio-response-BYIoVSmQ.js";import{n as y,r as b,t as ee}from"./scene-environment-ChjgSWre.js";import{t as x}from"./dreamy-postprocessing-2Ubf_pTv.js";import{n as te,t as S}from"./stage-compositor-CCveU24_.js";var C=g(),w=e(t(),1),T=n();function ne(e){let t=(0,C.c)(9),{top:n,bottom:i,horizon:a,radius:o}=e,s=n===void 0?`#05040f`:n,c=i===void 0?`#1a1230`:i,u=o===void 0?60:o,d;if(t[0]!==c||t[1]!==a||t[2]!==u||t[3]!==s){d=new l(u,32,24);let e=new r(s),n=new r(c),i=a?new r(a):null,o=d.attributes.position,f=new Float32Array(o.count*3),p=new r;for(let t=0;t<o.count;t++){let r=(o.getY(t)/u+1)/2;i?r<.5?p.copy(n).lerp(i,r/.5):p.copy(i).lerp(e,(r-.5)/.5):p.copy(n).lerp(e,r),f[t*3]=p.r,f[t*3+1]=p.g,f[t*3+2]=p.b}d.setAttribute(`color`,new m(f,3)),t[0]=c,t[1]=a,t[2]=u,t[3]=s,t[4]=d}else d=t[4];let f=d,p,h;t[5]===Symbol.for(`react.memo_cache_sentinel`)?(p=[1,1,1],h=(0,T.jsx)(`meshBasicMaterial`,{vertexColors:!0,side:1,depthWrite:!1,fog:!1,toneMapped:!1}),t[5]=p,t[6]=h):(p=t[5],h=t[6]);let g;return t[7]===f?g=t[8]:(g=(0,T.jsx)(`mesh`,{geometry:f,scale:p,children:h}),t[7]=f,t[8]=g),g}new r(`#0a0725`);var E=new r(`#3ee3c2`),D=new r(`#8a6bff`),O=new r(`#dff5ff`),k=`#050318`,A=`#1a1550`,re=`#0a0725`,j=`
  varying vec2 vUv;
  varying vec3 vPos;
  void main() {
    vUv = uv;
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,M=`
  precision highp float;
  varying vec2 vUv;
  varying vec3 vPos;

  uniform float uTime;
  uniform float uMid;
  uniform float uTreble;
  uniform float uRms;
  uniform float uIntensity;
  uniform vec3 uColorA; // teal
  uniform vec3 uColorB; // violet
  uniform vec3 uColorHi; // cool white
  uniform float uSeed;

  // 简单 2D value noise（无外部纹理，适合极光带的柔和纵向波动）
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p *= 2.03;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    // 纵向柔和衰减（顶部微亮的蒸发，底部彻底透明消失）
    float verticalFade = smoothstep(0.02, 0.35, vUv.y) * smoothstep(1.02, 0.55, vUv.y);

    // 水平波动：极慢的横向漂移，跟 mid（人声）呼吸
    float slowT = uTime * 0.06 + uSeed * 6.283;
    float breath = uMid * 0.35 + uRms * 0.15;
    float wave = fbm(vec2(vUv.x * 2.3 + slowT, vUv.y * 1.4 + slowT * 0.4 + uSeed));
    wave = mix(wave, wave * (1.0 + breath * 1.6), 0.65);

    // 垂直方向的丝带感（噪声轮廓 + 边缘羽化）
    float ribbon = smoothstep(0.35, 0.75, wave);
    // 上边缘更亮的高光带（treble 驱动的蒸发感）
    float topGlow = smoothstep(0.55, 0.98, vUv.y) * (0.35 + uTreble * 0.9);

    // 颜色：teal → violet 之间的锁色渐变，不做彩虹
    float mixK = 0.35 + wave * 0.5 + uMid * 0.2;
    vec3 col = mix(uColorA, uColorB, clamp(mixK, 0.0, 1.0));
    // 顶部亮边掺一点冷白高光
    col = mix(col, uColorHi, topGlow * 0.55);

    // 强度：主要靠 ribbon + verticalFade，rms 提亮
    float alpha = ribbon * verticalFade * (0.55 + uRms * 0.4) * uIntensity;
    alpha += topGlow * verticalFade * 0.35 * uIntensity;

    // 边缘水平衰减，避免硬边
    float edgeH = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
    alpha *= edgeH;

    if (alpha < 0.001) discard;
    gl_FragColor = vec4(col * (1.2 + uTreble * 0.6), alpha);
  }
`;function N({featuresRef:e,intensity:t,seed:n,position:r,rotation:i,scale:a}){let o=(0,w.useRef)(null),s=v(e),c=(0,w.useMemo)(()=>({uTime:{value:0},uMid:{value:0},uTreble:{value:0},uRms:{value:0},uIntensity:{value:t},uColorA:{value:E.clone()},uColorB:{value:D.clone()},uColorHi:{value:O.clone()},uSeed:{value:n}}),[n]),l=(0,w.useRef)(new _(.05)),u=(0,w.useRef)(new _(.08)),d=(0,w.useRef)(new _(.03));return f((e,a)=>{let f=o.current;if(!f)return;s.update(a),c.uTime.value=e.clock.elapsedTime,c.uMid.value=l.current.update(s.mid,a),c.uTreble.value=u.current.update(s.treble,a),c.uRms.value=d.current.update(s.rms,a),c.uIntensity.value=t;let p=e.clock.elapsedTime;f.position.x=r[0]+Math.sin(p*.05+n*3.1)*.35,f.rotation.z=i[2]+Math.sin(p*.04+n*2.4)*.03+s.mid*.02}),(0,T.jsxs)(`mesh`,{ref:o,position:r,rotation:i,scale:a,children:[(0,T.jsx)(`planeGeometry`,{args:[6,12,1,1]}),(0,T.jsx)(`shaderMaterial`,{transparent:!0,depthWrite:!1,blending:2,vertexShader:j,fragmentShader:M,uniforms:c,side:2,toneMapped:!1})]})}function ie(e){let t=(0,C.c)(7),{featuresRef:n,intensity:i}=e,a=(0,w.useRef)(null),o=v(n),s;t[0]===Symbol.for(`react.memo_cache_sentinel`)?(s=new _(.04),t[0]=s):s=t[0];let c=(0,w.useRef)(s),l;t[1]===Symbol.for(`react.memo_cache_sentinel`)?(l=new r,t[1]=l):l=t[1];let u=l,d;t[2]===Symbol.for(`react.memo_cache_sentinel`)?(d=[.32,.2,.12,.07,.04],t[2]=d):d=t[2];let p=d,m;t[3]!==o||t[4]!==i?(m=(e,t)=>{let n=a.current;if(!n)return;o.update(t);let r=e.clock.elapsedTime,s=(1+o.rms*.14+o.impact*.2)*i;n.scale.setScalar(c.current.update(s,t)),n.rotation.y=r*.04;let l=Math.min(1,o.mid*.9+o.impact*.4);u.copy(D).lerp(E,l);let d=.6+o.rms*.6+o.impact*.5;n.children.forEach((e,t)=>{let n=e.material;n.color.lerp(u,.05),n.opacity=p[t]*d})},t[3]=o,t[4]=i,t[5]=m):m=t[5],f(m);let h;return t[6]===Symbol.for(`react.memo_cache_sentinel`)?(h=(0,T.jsx)(`group`,{ref:a,children:p.map(P)}),t[6]=h):h=t[6],h}function P(e,t){return(0,T.jsxs)(`mesh`,{scale:.8+t*.55,children:[(0,T.jsx)(`sphereGeometry`,{args:[1,32,32]}),(0,T.jsx)(`meshBasicMaterial`,{color:D,transparent:!0,opacity:e,blending:2,depthWrite:!1})]},t)}function F(e){let t=(0,C.c)(11),{featuresRef:n,intensity:r}=e,i=(0,w.useRef)(null),a=v(n),o;t[0]===a?o=t[1]:(o=(e,t)=>{a.update(t);let n=i.current;n&&(n.rotation.y=n.rotation.y+t*(.02+a.rms*.05),n.rotation.x=n.rotation.x+t*.01)},t[0]=a,t[1]=o),f(o);let s;t[2]===Symbol.for(`react.memo_cache_sentinel`)?(s=[22,14,22],t[2]=s):s=t[2];let c=.55*r,l;t[3]===c?l=t[4]:(l=(0,T.jsx)(d,{count:220,scale:s,size:4,speed:.25,opacity:c,color:O,noise:.6}),t[3]=c,t[4]=l);let u;t[5]===Symbol.for(`react.memo_cache_sentinel`)?(u=[14,10,14],t[5]=u):u=t[5];let p=.45*r,m;t[6]===p?m=t[7]:(m=(0,T.jsx)(d,{count:120,scale:u,size:2.5,speed:.35,opacity:p,color:E,noise:.7}),t[6]=p,t[7]=m);let h;return t[8]!==l||t[9]!==m?(h=(0,T.jsxs)(`group`,{ref:i,children:[l,m]}),t[8]=l,t[9]=m,t[10]=h):h=t[10],h}function I({featuresRef:e,intensity:t}){let n=(0,w.useRef)(null),s=v(e),c=(0,w.useRef)([]),l=(0,w.useMemo)(()=>{let e=new o(1,.06,12,96);return Array.from({length:6},()=>{let t=new a(e,new i({color:E,transparent:!0,opacity:0,blending:2,depthWrite:!1}));return t.visible=!1,t})},[]);(0,w.useEffect)(()=>{let e=n.current;if(e){for(let t of l)e.add(t);return()=>{for(let t of l)e.remove(t),t.material.dispose();l[0]?.geometry.dispose()}}},[l]);let u=(0,w.useMemo)(()=>new r,[]);return f((e,r)=>{if(n.current){s.update(r),s.isBeatDrop&&c.current.length<6&&c.current.push({life:1,maxLife:1,tilt:new p((Math.random()-.5)*.6,Math.random()*Math.PI,(Math.random()-.5)*.4)}),c.current=c.current.filter(e=>(e.life-=r*.6,e.life>0));for(let e=0;e<6;e++){let n=l[e],r=c.current[e];if(r){n.visible=!0;let e=(1-r.life)*8*t+.4;n.scale.set(e,e,e*.6),n.rotation.copy(r.tilt);let i=n.material;i.opacity=r.life*r.life*.35,u.copy(E).lerp(D,1-r.life),i.color.copy(u)}else n.visible=!1}}}),(0,T.jsx)(`group`,{ref:n})}function L({featuresRef:e}){let{camera:t}=h(),n=v(e);return f((e,r)=>{n.update(r);let i=n.tension,a=n.release,o=n.impact,s=performance.now()/1e3,c=9.5-i*2+a*1+o*.4,l=.4+Math.sin(s*.35)*.15*(1-a*.4),d=55+o*10+a*3,f=o*(Math.random()-.5)*.2,p=o*(Math.random()-.5)*.15;t.position.z+=(c-t.position.z)*Math.min(1,r*3),t.position.y+=(l-t.position.y)*Math.min(1,r*2),t.position.x+=(f-t.position.x*.3)*Math.min(1,r*8),t.position.y+=p*Math.min(1,r*8),t instanceof u&&(t.fov+=(d-t.fov)*Math.min(1,r*4),t.updateProjectionMatrix())}),null}function R(e){let t=(0,C.c)(60),{featuresRef:n,intensity:r,onCanvasReady:i}=e,a,o;t[0]===Symbol.for(`react.memo_cache_sentinel`)?(a={position:[0,.4,9.5],fov:55},o={antialias:!0},t[0]=a,t[1]=o):(a=t[0],o=t[1]);let l;t[2]===i?l=t[3]:(l=e=>{let{gl:t,scene:n}=e;n.fog=new s(`#0a0725`,.038),i?.(t.domElement)},t[2]=i,t[3]=l);let u,d,f,p,m;t[4]===Symbol.for(`react.memo_cache_sentinel`)?(u=(0,T.jsx)(ee,{variant:`night`,intensity:.45}),d=(0,T.jsx)(ne,{top:k,horizon:A,bottom:re}),f=(0,T.jsx)(`ambientLight`,{intensity:.22,color:`#3a2a70`}),p=(0,T.jsx)(`pointLight`,{position:[0,3,4],intensity:2.2,color:`#4de5c2`,distance:22}),m=(0,T.jsx)(`pointLight`,{position:[-4,-1,-3],intensity:1.4,color:`#8a6bff`,distance:26}),t[4]=u,t[5]=d,t[6]=f,t[7]=p,t[8]=m):(u=t[4],d=t[5],f=t[6],p=t[7],m=t[8]);let h,g,_;t[9]===Symbol.for(`react.memo_cache_sentinel`)?(_=[-3.4,.6,-1.5],h=[0,.25,-.05],g=[1.15,1.05,1],t[9]=h,t[10]=g,t[11]=_):(h=t[9],g=t[10],_=t[11]);let v;t[12]!==n||t[13]!==r?(v=(0,T.jsx)(N,{featuresRef:n,intensity:r,seed:.11,position:_,rotation:h,scale:g}),t[12]=n,t[13]=r,t[14]=v):v=t[14];let E,D,O;t[15]===Symbol.for(`react.memo_cache_sentinel`)?(E=[3.2,.4,-2.2],D=[0,-.28,.04],O=[1.2,1.15,1],t[15]=E,t[16]=D,t[17]=O):(E=t[15],D=t[16],O=t[17]);let j;t[18]!==n||t[19]!==r?(j=(0,T.jsx)(N,{featuresRef:n,intensity:r,seed:.53,position:E,rotation:D,scale:O}),t[18]=n,t[19]=r,t[20]=j):j=t[20];let M,P,R;t[21]===Symbol.for(`react.memo_cache_sentinel`)?(M=[-1.2,1.2,-4.5],P=[0,.05,-.02],R=[1.35,1.25,1],t[21]=M,t[22]=P,t[23]=R):(M=t[21],P=t[22],R=t[23]);let z;t[24]!==n||t[25]!==r?(z=(0,T.jsx)(N,{featuresRef:n,intensity:r,seed:.82,position:M,rotation:P,scale:R}),t[24]=n,t[25]=r,t[26]=z):z=t[26];let B,V,H;t[27]===Symbol.for(`react.memo_cache_sentinel`)?(B=[1.8,.8,-3.6],V=[0,-.08,.03],H=[1.28,1.2,1],t[27]=B,t[28]=V,t[29]=H):(B=t[27],V=t[28],H=t[29]);let U,W;t[30]!==n||t[31]!==r?(U=(0,T.jsx)(N,{featuresRef:n,intensity:r,seed:.37,position:B,rotation:V,scale:H}),W=(0,T.jsx)(F,{featuresRef:n,intensity:r}),t[30]=n,t[31]=r,t[32]=U,t[33]=W):(U=t[32],W=t[33]);let G;t[34]===Symbol.for(`react.memo_cache_sentinel`)?(G=[0,-.2,0],t[34]=G):G=t[34];let K,q;t[35]!==n||t[36]!==r?(K=(0,T.jsx)(`group`,{position:G,children:(0,T.jsx)(ie,{featuresRef:n,intensity:r})}),q=(0,T.jsx)(I,{featuresRef:n,intensity:r}),t[35]=n,t[36]=r,t[37]=K,t[38]=q):(K=t[37],q=t[38]);let J,Y,X;t[39]===n?(J=t[40],Y=t[41],X=t[42]):(J=(0,T.jsx)(S,{featuresRef:n,color:`#0a1530`}),Y=(0,T.jsx)(L,{featuresRef:n}),X=(0,T.jsx)(te,{featuresRef:n}),t[39]=n,t[40]=J,t[41]=Y,t[42]=X);let Z;t[43]===r?Z=t[44]:(Z=(0,T.jsx)(x,{intensity:r}),t[43]=r,t[44]=Z);let Q;t[45]!==v||t[46]!==j||t[47]!==z||t[48]!==U||t[49]!==W||t[50]!==K||t[51]!==q||t[52]!==J||t[53]!==Y||t[54]!==X||t[55]!==Z?(Q=(0,T.jsx)(y,{children:(0,T.jsxs)(w.Suspense,{fallback:null,children:[u,d,f,p,m,v,j,z,U,W,K,q,J,Y,X,Z]})}),t[45]=v,t[46]=j,t[47]=z,t[48]=U,t[49]=W,t[50]=K,t[51]=q,t[52]=J,t[53]=Y,t[54]=X,t[55]=Z,t[56]=Q):Q=t[56];let $;return t[57]!==l||t[58]!==Q?($=(0,T.jsx)(b,{children:(0,T.jsx)(c,{className:`size-full`,camera:a,gl:o,onCreated:l,children:Q})}),t[57]=l,t[58]=Q,t[59]=$):$=t[59],$}export{R as EtherealGlowScene};