import{o as e}from"./rolldown-runtime-CMxvf4Kt.js";import{i as t,r as n}from"./motion-BN46AcYK.js";import{C as r,D as i,O as a,d as o,g as s,n as c,t as l,u,v as d,y as f}from"./three-kLyG47df.js";import{d as p}from"./utils-BIXjVjfA.js";var m=e(t(),1),h=p(),g=l,_=n(),v=`
varying vec2 vUv;
void main() {
  vUv = uv;
}
`,y=`
${g}

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
`;function b(e){let t=(0,h.c)(27),{featuresRef:n,theme:i}=e,a=(0,m.useRef)(null),o,l,u,d;t[0]===Symbol.for(`react.memo_cache_sentinel`)?(o={value:0},l={value:0},u={value:0},d={value:0},t[0]=o,t[1]=l,t[2]=u,t[3]=d):(o=t[0],l=t[1],u=t[2],d=t[3]);let p;t[4]===i.color1?p=t[5]:(p=new f(i.color1),t[4]=i.color1,t[5]=p);let g;t[6]===p?g=t[7]:(g={value:p},t[6]=p,t[7]=g);let b;t[8]===i.color2?b=t[9]:(b=new f(i.color2),t[8]=i.color2,t[9]=b);let x;t[10]===b?x=t[11]:(x={value:b},t[10]=b,t[11]=x);let S;t[12]===i.color3?S=t[13]:(S=new f(i.color3),t[12]=i.color3,t[13]=S);let C;t[14]===S?C=t[15]:(C={value:S},t[14]=S,t[15]=C);let w;t[16]!==C||t[17]!==g||t[18]!==x?(w={uTime:o,uEnergy:l,uMid:u,uTreble:d,uColor1:g,uColor2:x,uColor3:C},t[16]=C,t[17]=g,t[18]=x,t[19]=w):w=t[19];let T=w,E;t[20]===n?E=t[21]:(E=e=>{let t=a.current;if(!t)return;let r=n.current;t.uniforms.uTime.value=e.clock.elapsedTime,t.uniforms.uEnergy.value=r.rms,t.uniforms.uMid.value=r.mid,t.uniforms.uTreble.value=r.treble},t[20]=n,t[21]=E),s(E);let D,O,k;t[22]===Symbol.for(`react.memo_cache_sentinel`)?(D=[0,2,-35],O=[.1,0,0],k=(0,_.jsx)(`planeGeometry`,{args:[120,70]}),t[22]=D,t[23]=O,t[24]=k):(D=t[22],O=t[23],k=t[24]);let A;return t[25]===T?A=t[26]:(A=(0,_.jsxs)(`mesh`,{position:D,rotation:O,children:[k,(0,_.jsx)(c,{ref:a,baseMaterial:r,vertexShader:v,fragmentShader:y,uniforms:T,depthWrite:!1})]}),t[25]=T,t[26]=A),A}var x=5;function S(e){let t=(0,h.c)(14),{featuresRef:n,intensity:r,index:o,hue:c}=e,l=(0,m.useRef)(null),u;t[0]===o?u=t[1]:(u=new d(Array.from({length:24},(e,t)=>{let n=t/23;return new a(Math.sin(n*Math.PI*2+o)*6,(n-.5)*8,Math.cos(n*Math.PI*2+o*.7)*6)})),t[0]=o,t[1]=u);let f=u,p;t[2]===f?p=t[3]:(p=new i(f,64,.04,8,!1),t[2]=f,t[3]=p);let g=p,v;t[4]!==n||t[5]!==c||t[6]!==o||t[7]!==r?(v=e=>{let t=l.current;if(!t)return;let{rms:i,mid:a,bass:s}=n.current,u=e.clock.elapsedTime;t.rotation.y=u*(.08+o*.02)+s*.5,t.rotation.x=Math.sin(u*.3+o)*.3,t.scale.setScalar(1+i*r*.6);let d=t.material;d.opacity=.15+a*.35+Math.sin(u*1.5+o)*.08,d.color.setHSL(c/360,.85,.65)},t[4]=n,t[5]=c,t[6]=o,t[7]=r,t[8]=v):v=t[8],s(v);let y=`hsl(${c}, 85%, 65%)`,b;t[9]===y?b=t[10]:(b=(0,_.jsx)(`meshBasicMaterial`,{color:y,transparent:!0,opacity:.25,blending:2,depthWrite:!1}),t[9]=y,t[10]=b);let x;return t[11]!==g||t[12]!==b?(x=(0,_.jsx)(`mesh`,{ref:l,geometry:g,children:b}),t[11]=g,t[12]=b,t[13]=x):x=t[13],x}function C(e){let t=(0,h.c)(4),{featuresRef:n,intensity:r,baseHue:i}=e,a=i===void 0?260:i,o;return t[0]!==a||t[1]!==n||t[2]!==r?(o=(0,_.jsx)(`group`,{children:Array.from({length:x},(e,t)=>(0,_.jsx)(S,{index:t,featuresRef:n,intensity:r,hue:a+t*25},t))}),t[0]=a,t[1]=n,t[2]=r,t[3]=o):o=t[3],o}function w(e){let t=(0,h.c)(9),{featuresRef:n,color:r,count:i}=e,a=r===void 0?`#ffffff`:r,c=i===void 0?400:i,l=(0,m.useRef)(null),d;t[0]===n?d=t[1]:(d=e=>{let t=l.current;if(!t)return;t.rotation.y=e.clock.elapsedTime*.04;let r=1+n.current.rms*.5;t.scale.setScalar(r)},t[0]=n,t[1]=d),s(d);let f;t[2]===Symbol.for(`react.memo_cache_sentinel`)?(f=[30,18,30],t[2]=f):f=t[2];let p;t[3]!==a||t[4]!==c?(p=(0,_.jsx)(u,{count:c,scale:f,size:3,speed:.5,opacity:.6,color:a}),t[3]=a,t[4]=c,t[5]=p):p=t[5];let g;t[6]===Symbol.for(`react.memo_cache_sentinel`)?(g=(0,_.jsx)(o,{radius:50,depth:40,count:1200,factor:2,saturation:.4,fade:!0,speed:.5}),t[6]=g):g=t[6];let v;return t[7]===p?v=t[8]:(v=(0,_.jsxs)(`group`,{ref:l,children:[p,g]}),t[7]=p,t[8]=v),v}export{w as n,b as r,C as t};