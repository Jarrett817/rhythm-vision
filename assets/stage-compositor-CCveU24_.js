import{o as e}from"./rolldown-runtime-CMxvf4Kt.js";import{i as t,r as n}from"./motion-BN46AcYK.js";import{C as r,v as i}from"./three-CKEoqEra.js";import{d as a}from"./utils-BIXjVjfA.js";import{r as o}from"./audio-response-BYIoVSmQ.js";a();var s=e(t(),1),c=n();function l({featuresRef:e}){let t=(0,s.useRef)(null),n=o(e),r=(0,s.useMemo)(()=>({uTime:{value:0},uBrightness:{value:0}}),[]);return i((e,i)=>{if(n.update(i),!t.current)return;r.uTime.value+=i;let a=.55-n.release*.15+n.rms*.05;r.uBrightness.value+=(a-r.uBrightness.value)*Math.min(1,i*2),t.current.uniforms.uTime.value=r.uTime.value,t.current.uniforms.uBrightness.value=r.uBrightness.value}),(0,c.jsxs)(`mesh`,{position:[0,0,-.2],renderOrder:999,children:[(0,c.jsx)(`planeGeometry`,{args:[200,200]}),(0,c.jsx)(`shaderMaterial`,{ref:t,transparent:!0,depthTest:!1,depthWrite:!1,uniforms:{uTime:r.uTime,uBrightness:r.uBrightness},vertexShader:`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,fragmentShader:`
          uniform float uTime;
          uniform float uBrightness;
          varying vec2 vUv;
          void main() {
            vec2 p = vUv - 0.5;
            // 垂直椭圆 vignette：更宽的横向衰减（歌手站立区暗）
            float r = length(p * vec2(1.0, 1.6));
            float vig = smoothstep(0.25, 1.0, r);
            // 中央歌手区域暗化（垂直椭圆）
            float center = length(p * vec2(2.2, 1.2));
            float centerDark = smoothstep(0.12, 0.45, center);
            float alpha = vig * 0.85 * uBrightness + (1.0 - centerDark) * 0.25;
            gl_FragColor = vec4(0.0, 0.0, 0.0, alpha * 0.6);
          }
        `})]})}function u({featuresRef:e,color:t=`#1a1030`}){let n=(0,s.useRef)(null),a=o(e),l=(0,s.useMemo)(()=>new r(t),[t]),u=(0,s.useMemo)(()=>({uColor:{value:new r(t)},uIntensity:{value:0}}),[t]);return i((e,t)=>{if(a.update(t),!n.current)return;let r=.3+a.release*.4+a.rms*.2;u.uIntensity.value+=(r-u.uIntensity.value)*Math.min(1,t*2),n.current.uniforms.uColor.value.lerp(l,.02),n.current.uniforms.uIntensity.value=u.uIntensity.value}),(0,c.jsxs)(`mesh`,{position:[0,-3.5,0],rotation:[-Math.PI/2,0,0],renderOrder:10,children:[(0,c.jsx)(`planeGeometry`,{args:[60,40]}),(0,c.jsx)(`shaderMaterial`,{ref:n,transparent:!0,depthWrite:!1,blending:2,toneMapped:!1,uniforms:{uColor:u.uColor,uIntensity:u.uIntensity},vertexShader:`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,fragmentShader:`
          uniform vec3 uColor;
          uniform float uIntensity;
          varying vec2 vUv;
          void main() {
            // 从画面底部向上渐变衰减
            float grad = smoothstep(0.0, 0.7, vUv.y);
            float center = smoothstep(0.2, 0.5, abs(vUv.x - 0.5));
            float alpha = (1.0 - grad) * (1.0 - center * 0.6) * uIntensity * 0.25;
            gl_FragColor = vec4(uColor, alpha);
          }
        `})]})}export{l as n,u as t};