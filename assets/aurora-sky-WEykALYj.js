import{o as e}from"./rolldown-runtime-CMxvf4Kt.js";import{i as t,r as n}from"./motion-BN46AcYK.js";import{_ as r,b as i,h as a,w as o}from"./three-B1pzFvdJ.js";import{d as s}from"./utils-BIXjVjfA.js";import{t as c}from"./noise-chunks-IXkZrDTk.js";var l=s(),u=e(t(),1),d=n(),f=`
varying vec2 vUv;
void main() {
  vUv = uv;
}
`,p=`
${c}

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
`;function m(e){let t=(0,l.c)(27),{featuresRef:n,theme:s}=e,c=(0,u.useRef)(null),m,h,g,_;t[0]===Symbol.for(`react.memo_cache_sentinel`)?(m={value:0},h={value:0},g={value:0},_={value:0},t[0]=m,t[1]=h,t[2]=g,t[3]=_):(m=t[0],h=t[1],g=t[2],_=t[3]);let v;t[4]===s.color1?v=t[5]:(v=new i(s.color1),t[4]=s.color1,t[5]=v);let y;t[6]===v?y=t[7]:(y={value:v},t[6]=v,t[7]=y);let b;t[8]===s.color2?b=t[9]:(b=new i(s.color2),t[8]=s.color2,t[9]=b);let x;t[10]===b?x=t[11]:(x={value:b},t[10]=b,t[11]=x);let S;t[12]===s.color3?S=t[13]:(S=new i(s.color3),t[12]=s.color3,t[13]=S);let C;t[14]===S?C=t[15]:(C={value:S},t[14]=S,t[15]=C);let w;t[16]!==C||t[17]!==y||t[18]!==x?(w={uTime:m,uEnergy:h,uMid:g,uTreble:_,uColor1:y,uColor2:x,uColor3:C},t[16]=C,t[17]=y,t[18]=x,t[19]=w):w=t[19];let T=w,E;t[20]===n?E=t[21]:(E=e=>{let t=c.current;if(!t)return;let r=n.current;t.uniforms.uTime.value=e.clock.elapsedTime,t.uniforms.uEnergy.value=r.rms,t.uniforms.uMid.value=r.mid,t.uniforms.uTreble.value=r.treble},t[20]=n,t[21]=E),r(E);let D,O,k;t[22]===Symbol.for(`react.memo_cache_sentinel`)?(D=[0,2,-35],O=[.1,0,0],k=(0,d.jsx)(`planeGeometry`,{args:[120,70]}),t[22]=D,t[23]=O,t[24]=k):(D=t[22],O=t[23],k=t[24]);let A;return t[25]===T?A=t[26]:(A=(0,d.jsxs)(`mesh`,{position:D,rotation:O,children:[k,(0,d.jsx)(a,{ref:c,baseMaterial:o,vertexShader:f,fragmentShader:p,uniforms:T,depthWrite:!1})]}),t[25]=T,t[26]=A),A}export{m as t};