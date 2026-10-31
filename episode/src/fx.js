// Particle systems: the ~500k-particle fireball (fire, smoke veins, embers, dust wall), bullet-time air, wake and muzzle gas.
import * as THREE from './three.module.js';
import { mulberry } from './models.js';

export const NOISE = /* glsl */`
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+10.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.5-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 105.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;
// fireball size law, shared with film.js (light position)
export const FBR = { R0: 22.0, k: 2.0, lin: 0.3, rise: 2.0, riseP: 1.1 };
const RGLSL = `float R=${FBR.R0.toFixed(2)}*(1.0-exp(-te*${FBR.k.toFixed(2)}))+${FBR.lin.toFixed(2)}*te;`;
const HGLSL = `float rise=max(te-1.6,0.0); float Hc=R*0.62+${FBR.rise.toFixed(2)}*pow(rise,${FBR.riseP.toFixed(2)});`;

function pointsGeo(n, seed) {
  const g = new THREE.BufferGeometry(); const r = mulberry(seed);
  const pos = new Float32Array(n * 3), a = new Float32Array(n * 4), b = new Float32Array(n * 4);
  for (let i = 0; i < n * 4; i++) { a[i] = r(); b[i] = r(); }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aR', new THREE.BufferAttribute(a, 4)); g.setAttribute('aS', new THREE.BufferAttribute(b, 4));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
  return g;
}
const SPRITE_FS = `varying vec4 vC; void main(){ vec2 d=gl_PointCoord-0.5; float r=dot(d,d)*4.0; if(r>1.0) discard; float f=exp(-r*2.6); gl_FragColor=vec4(vC.rgb, vC.a*f); }`;
const U = (WV) => ({ uTe: { value: 0 }, uC: { value: new THREE.Vector3(WV.x, 0, WV.z) }, uScale: { value: 1 }, uI: { value: 1 }, uT: { value: 0 } });
const pts = (scene, n, seed, m) => { const p = new THREE.Points(pointsGeo(n, seed), m); p.frustumCulled = false; scene.add(p); return p; };

export function buildFx(scene, WV, MV, DIR, HV, PATH_ALL) {
  const fx = {};
  // ---- fire: dome → rolling toroid with a stem; two octaves of billow, cooling from white-gold to orange to deep red
  fx.fireMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: U(WV),
    vertexShader: NOISE + `
    attribute vec4 aR; attribute vec4 aS; uniform float uTe; uniform vec3 uC; uniform float uScale; uniform float uI; varying vec4 vC;
    void main(){
      float te=uTe;
      float az=aR.x*6.2831853; float cy=mix(-0.10,1.0,pow(aR.y,0.8)); float sy=sqrt(max(0.0,1.0-cy*cy));
      vec3 dir=vec3(sy*cos(az),cy,sy*sin(az));
      float rf=pow(aR.z,0.55);
      ${RGLSL}
      float Rf=10.0*(1.0-exp(-te*10.0));
      vec3 pF=dir*Rf*rf; pF.y=abs(pF.y)+Rf*0.25;
      vec3 pD=dir*R*rf; pD.y=abs(pD.y)*1.05;
      vec3 p=mix(pF,pD,smoothstep(0.05,0.7,te));
      ${HGLSL}
      float Rt=R*0.42+0.05*rise; float rt=R*0.30*(0.25+0.75*rf);
      float th=aR.w*6.2831853-te*0.5;
      vec3 rad=vec3(cos(az),0.0,sin(az));
      vec3 pT=rad*(Rt+rt*cos(th))+vec3(0.0,Hc+rt*sin(th)*0.85,0.0);
      float isStem=step(aS.x,0.15);
      float yy=fract(aS.y+te*0.07);
      vec3 pS=rad*(1.4+2.2*aS.z*(0.5+0.7*yy))+vec3(0.0,yy*max(0.0,Hc-rt*0.6),0.0);
      float mt=smoothstep(1.4,6.5,te);
      p=mix(p,mix(pT,pS,isStem),mt);
      float Rn=max(R,1.0);
      vec3 q=p/Rn*2.2+vec3(0.0,-te*0.16,0.0);
      p+=(0.11+0.07*mt)*Rn*vec3(snoise(q),snoise(q+17.1),snoise(q+31.7));
      vec3 q2=q*2.7+vec3(4.0,te*0.3,1.0);
      p+=0.02*Rn*vec3(snoise(q2),snoise(q2+7.7),snoise(q2+13.3));
      p.y=max(p.y,0.05);
      float lob=snoise(q*1.9+5.0)*0.7+snoise(q2*1.3)*0.3;
      float tmp=(1.0-rf)*0.95+0.28*lob+0.15-te*0.035+0.6*exp(-te*3.0);
      tmp=clamp(tmp,0.0,1.4);
      vec3 cW=vec3(1.0,0.93,0.76), cG=vec3(1.0,0.604,0.314), cR=vec3(0.62,0.20,0.07), cD=vec3(0.10,0.04,0.025);
      vec3 col=tmp>0.62?mix(cG,cW,smoothstep(0.62,1.0,tmp)):(tmp>0.32?mix(cR,cG,smoothstep(0.32,0.62,tmp)):mix(cD,cR,smoothstep(0.05,0.32,tmp)));
      float br=(0.6+0.55*smoothstep(-0.5,0.7,lob))*(0.6+0.8*tmp);
      br*=1.0-0.35*isStem;
      float flash=exp(-te*8.0);
      col=mix(col,vec3(1.0,0.97,0.9),flash);
      vC=vec4(col*br*uI, 0.045*(1.0+3.0*flash));
      vec4 mv=modelViewMatrix*vec4(uC+p,1.0);
      float sz=1.45*mix(0.26,0.14+0.16*aS.z,smoothstep(0.0,1.0,te))*(Rn/${FBR.R0.toFixed(1)}*0.6+0.4);
      gl_PointSize=te<0.0?0.0:clamp(sz*uScale/-mv.z,1.5,64.0);
      gl_Position=projectionMatrix*mv;
    }`,
    fragmentShader: SPRITE_FS,
  });
  fx.fire = pts(scene, 400000, 101, fx.fireMat);

  // ---- smoke: thin veins and the top edge, under 15%
  fx.smokeMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: U(WV),
    vertexShader: NOISE + `
    attribute vec4 aR; attribute vec4 aS; uniform float uTe; uniform vec3 uC; uniform float uScale; uniform float uI; varying vec4 vC;
    void main(){
      float te=uTe;
      float az=aR.x*6.2831853; float cy=mix(0.25,1.0,aR.y); float sy=sqrt(1.0-cy*cy);
      vec3 dir=vec3(sy*cos(az),cy,sy*sin(az));
      float rf=1.0+0.06*aR.z;
      ${RGLSL}
      vec3 p=dir*R*rf; p.y*=1.05;
      ${HGLSL}
      float Rt=R*0.42+0.05*rise; float rt=R*0.30*1.02;
      float th=mix(0.35,2.6,aR.w)-te*0.5;
      vec3 rad=vec3(cos(az),0.0,sin(az));
      vec3 pT=rad*(Rt+rt*cos(th))+vec3(0.0,Hc+rt*sin(th)*0.85,0.0);
      float mt=smoothstep(1.4,6.5,te);
      p=mix(p,pT,mt);
      float Rn=max(R,1.0);
      vec3 q=p/Rn*2.2+vec3(0.0,-te*0.16,0.0);
      p+=(0.11+0.07*mt)*Rn*vec3(snoise(q),snoise(q+17.1),snoise(q+31.7));
      float v=abs(snoise(q*2.4+3.0));
      float top=smoothstep(0.55,0.95,(p.y-Hc*0.6)/max(Rn,1.0));
      float keep=max((1.0-smoothstep(0.015,0.04,v))*step(0.45,p.y/max(Hc+rt,1.0)), top*step(aS.x,0.6));
      vC=vec4(vec3(0.05,0.032,0.024)+vec3(0.30,0.14,0.05)*uI*0.12, 0.025*keep*smoothstep(0.8,2.5,te));
      vec4 mv=modelViewMatrix*vec4(uC+p,1.0);
      gl_PointSize=(keep<0.01||te<0.0)?0.0:clamp(0.45*(Rn/${FBR.R0.toFixed(1)}*0.6+0.4)*uScale/-mv.z,1.0,40.0);
      gl_Position=projectionMatrix*mv;
    }`,
    fragmentShader: SPRITE_FS,
  });
  fx.smoke = pts(scene, 30000, 202, fx.smokeMat);

  // ---- embers: few, orange, ballistic
  fx.embMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: U(WV),
    vertexShader: `attribute vec4 aR; attribute vec4 aS; uniform float uTe; uniform vec3 uC; uniform float uScale; varying vec4 vC;
    void main(){ float te=uTe; float az=aR.x*6.2831853; float el=mix(0.25,1.3,aR.y); float sp=mix(8.0,34.0,pow(aR.z,1.5));
      float k=1.4; float tt=(1.0-exp(-k*te))/k;
      vec3 v=vec3(cos(az)*cos(el),sin(el),sin(az)*cos(el))*sp;
      vec3 p=v*tt+vec3(0.0,-4.9*te*te*0.5,0.0); p.y=max(p.y,0.0)+1.0;
      float life=mix(1.2,3.5,aS.x); float a=te<0.0?0.0:smoothstep(life,life*0.4,te);
      vC=vec4(vec3(1.0,0.5,0.18)*(1.2+aS.y*1.5),a*0.8);
      vec4 mv=modelViewMatrix*vec4(uC+p,1.0);
      gl_PointSize=a<0.01?0.0:clamp(0.07*uScale/-mv.z,1.0,5.0);
      gl_Position=projectionMatrix*mv; }`,
    fragmentShader: SPRITE_FS,
  });
  fx.embers = pts(scene, 3500, 303, fx.embMat);

  // ---- dust wall (base surge), lit from behind: dark body, warm crest
  fx.dustMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: U(WV),
    vertexShader: NOISE + `attribute vec4 aR; attribute vec4 aS; uniform float uTe; uniform vec3 uC; uniform float uScale; uniform float uI; varying vec4 vC;
    void main(){ float te=uTe;
      float az=1.5708+(aR.x-0.5)*2.2;
      float Rd=20.2*pow(max(te-0.3,0.0),0.8);
      float back=pow(aR.y,1.6)*(2.0+0.15*Rd);
      float r=max(Rd-back,0.0);
      float hmax=2.5+0.08*Rd;
      float h=hmax*pow(aR.z,1.7)*(0.6+0.4*(1.0-aR.y));
      vec3 rad=vec3(cos(az),0.0,sin(az));
      vec3 p=rad*r+vec3(0.0,h,0.0);
      vec3 q=p*0.11+vec3(0.0,-te*0.35,te*0.2);
      p+=vec3(snoise(q),snoise(q+9.0)*0.6,snoise(q+19.0))*(1.0+0.1*Rd);
      p.y=max(p.y,0.05);
      float front=1.0-aR.y; float crest=smoothstep(0.35,1.0,h/hmax);
      vec3 col=vec3(0.075,0.06,0.05)*(0.7+0.6*front)+vec3(1.0,0.78,0.5)*uI*0.32*crest*(0.4+0.6*aR.w);
      float a=0.06*smoothstep(0.3,1.2,te)*(0.4+0.6*front);
      vec4 mv=modelViewMatrix*vec4(uC+p,1.0);
      float dcam=-mv.z; a*=smoothstep(0.6,3.0,dcam);
      vC=vec4(col,a);
      gl_PointSize=(te<0.3||a<0.002)?0.0:clamp(3.6*(0.5+0.9*aS.x)*(1.0+0.05*Rd)*uScale/dcam,3.0,110.0);
      gl_Position=projectionMatrix*mv; }`,
    fragmentShader: SPRITE_FS,
  });
  fx.dust = pts(scene, 26000, 404, fx.dustMat);

  // ---- bullet-time air: motes pushed out of the round's path, a Mach cone you can see
  fx.moteMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uS: { value: 0 }, uM: { value: MV.clone() }, uD: { value: DIR.clone() }, uScale: { value: 1 }, uT: { value: 0 }, uA: { value: 1 } },
    vertexShader: `attribute vec4 aR; attribute vec4 aS; uniform float uS; uniform vec3 uM; uniform vec3 uD; uniform float uScale; uniform float uT; uniform float uA; varying vec4 vC;
    void main(){
      vec3 up=vec3(0.0,1.0,0.0); vec3 e1=normalize(cross(uD,up)); vec3 e2=cross(e1,uD);
      // half the motes hug the line of flight (they make the cone), half fill the air around it
      float near=step(aS.z,0.5);
      float sa=near>0.5?uS+mix(-6.0,1.2,aR.x):mix(-1.0,${PATH_ALL.toFixed(1)},aR.x);
      float rr=near>0.5?(0.004+0.09*pow(aR.y,1.3)):(0.9*pow(aR.y,1.8)+0.004); float ang=aR.z*6.2831853;
      vec2 o=vec2(cos(ang),sin(ang))*rr;
      float since=uS-sa;
      // a shock front: the cone half-angle (Mach ~1.2) behind the tip, then a slow drift outward
      float cone=since>0.0?since*0.6:0.0;
      float pushed=since>0.0?1.0:0.0;
      float k=exp(-rr/0.12);
      vec2 o2=o+normalize(o+1e-6)*pushed*k*min(cone,0.05+0.02*since)+vec2(-o.y,o.x)*0.8*k*pushed*sin(since*5.0+aR.w*6.0)*0.3;
      vec3 p=uM+uD*sa+e1*o2.x+e2*o2.y+vec3(0.0,0.01*sin(uT*0.3+aR.w*6.3),0.0);
      float keepm=step(0.35,sa);
      vec4 mv=modelViewMatrix*vec4(p,1.0);
      float sz=mix(0.0005,0.0018,aS.x)*uScale/-mv.z;
      float shock=pushed*k*exp(-max(since,0.0)/0.6);
      float a=clamp(sz,0.0,1.0)*uA*(0.12+1.6*shock)*(near>0.5?1.0:0.6);
      float oof=smoothstep(4.0,14.0,sz); a*=1.0-0.85*oof; a*=smoothstep(0.06,0.25,-mv.z);
      vC=vec4(vec3(0.62,0.70,0.90)*(0.5+aS.y)+vec3(0.9,0.55,0.25)*shock,a*0.7);
      gl_PointSize=(uA<0.01||keepm<0.5)?0.0:clamp(sz,1.0,7.0);
      gl_Position=projectionMatrix*mv; }`,
    fragmentShader: SPRITE_FS,
  });
  fx.motes = pts(scene, 45000, 505, fx.moteMat);

  // ---- wake behind the round + muzzle flash cone + smoke ring
  fx.wakeMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uS: { value: 0 }, uM: { value: MV.clone() }, uD: { value: DIR.clone() }, uScale: { value: 1 }, uTf: { value: 0 }, uA: { value: 1 } },
    vertexShader: NOISE + `attribute vec4 aR; attribute vec4 aS; uniform float uS; uniform vec3 uM; uniform vec3 uD; uniform float uScale; uniform float uTf; uniform float uA; varying vec4 vC;
    void main(){
      vec3 up=vec3(0.0,1.0,0.0); vec3 e1=normalize(cross(uD,up)); vec3 e2=cross(e1,uD);
      vec3 p; vec4 c; float sz;
      if(aR.w<0.5){
        float sa=uS-pow(aR.x,1.6)*12.0; float since=uS-sa;
        float g=0.002+0.035*sqrt(max(since,0.0));
        float ang=aR.y*6.2831853+since*4.0;
        vec3 q=vec3(sa*1.3,aR.y*4.0,since*0.4);
        vec2 o=vec2(cos(ang),sin(ang))*g*pow(aR.z,0.5)+vec2(snoise(q),snoise(q+5.0))*g*0.8;
        p=uM+uD*max(sa,0.0)+e1*o.x+e2*o.y;
        float a=sa>0.0?exp(-since/4.0)*smoothstep(0.0,0.1,since):0.0;
        c=vec4(vec3(0.55,0.62,0.80),a*0.08); sz=0.003;
      } else if(aR.w<0.72){
        float tf=uTf; float u=aR.x;
        float d=(0.01+0.28*u)*smoothstep(0.0,0.35,tf+0.02);
        float spread=0.01+0.07*u*u; float ang=aR.y*6.2831853;
        p=uM+uD*d+(e1*cos(ang)+e2*sin(ang))*spread*pow(aR.z,0.5)*(0.5+tf);
        float a=tf<0.0?0.0:exp(-tf*2.4)*(1.0-u*0.7);
        c=vec4(mix(vec3(1.0,0.95,0.8),vec3(1.0,0.45,0.12),u)*3.0,a*0.14); sz=0.0025+0.005*u;
      } else {
        float tf=max(uTf,0.0); float ang=aR.y*6.2831853;
        float ringR=0.012+0.10*(1.0-exp(-tf*1.2)); float dz=0.04+0.22*(1.0-exp(-tf*0.9));
        vec3 q=vec3(aR.x*8.0,ang,tf*0.5); float minor=0.006+0.016*aR.z; float th=aR.x*6.2831853+tf*2.0;
        vec3 rad=e1*cos(ang)+e2*sin(ang);
        p=uM+uD*(dz+minor*sin(th))+rad*(ringR+minor*cos(th))+vec3(snoise(q),snoise(q+3.0),snoise(q+7.0))*0.012;
        float a=uTf<0.0?0.0:smoothstep(0.0,0.4,tf)*exp(-tf/6.0);
        c=vec4(vec3(0.35,0.36,0.42),a*0.06); sz=0.005;
      }
      vec4 mv=modelViewMatrix*vec4(p,1.0);
      c.a*=smoothstep(0.12,0.45,-mv.z);
      vC=c;
      gl_PointSize=(c.a<0.0005||uA<0.01)?0.0:clamp(sz*uScale/-mv.z,1.0,40.0);
      gl_Position=projectionMatrix*mv; }`,
    fragmentShader: SPRITE_FS,
  });
  fx.wake = pts(scene, 40000, 606, fx.wakeMat);

  // ---- wind-borne dust near the cowboy
  fx.airMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 }, uScale: { value: 1 }, uI: { value: 0 }, uFb: { value: new THREE.Vector3() } },
    vertexShader: `attribute vec4 aR; attribute vec4 aS; uniform float uT; uniform float uScale; uniform float uI; uniform vec3 uFb; varying vec4 vC;
    void main(){ vec3 p=vec3(mix(-14.0,14.0,aR.x),pow(aR.y,2.0)*5.0,mix(-12.0,14.0,aR.z));
      p.x=mod(p.x+uT*(0.6+aS.x)+14.0,28.0)-14.0; p.y+=0.15*sin(uT*0.7+aS.y*9.0);
      vec4 mv=modelViewMatrix*vec4(p,1.0);
      float sz=mix(0.003,0.012,aS.z)*uScale/-mv.z;
      float back=1.0/(1.0+pow(distance(p,uFb)/50.0,2.0));
      vC=vec4(vec3(0.5,0.58,0.8)*0.3+vec3(1.0,0.75,0.45)*uI*back*1.4,clamp(sz,0.0,1.0)*0.45*(1.0-0.8*smoothstep(4.0,12.0,sz)));
      gl_PointSize=clamp(sz,1.0,10.0); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: SPRITE_FS,
  });
  fx.air = pts(scene, 20000, 707, fx.airMat);

  // ---- felt torn from the brim
  fx.feltMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { uT: { value: 0 }, uScale: { value: 1 }, uP: { value: HV.clone() }, uD: { value: DIR.clone() } },
    vertexShader: `attribute vec4 aR; attribute vec4 aS; uniform float uT; uniform float uScale; uniform vec3 uP; uniform vec3 uD; varying vec4 vC;
    void main(){ float tt=uT; vec3 v=normalize(uD*1.5+vec3(aR.x-0.5,aR.y-0.3,aR.z-0.5))*mix(0.5,3.0,aS.x);
      vec3 p=uP+v*(1.0-exp(-tt*3.0))/3.0+vec3(0.0,-0.4*tt*tt,0.0);
      float a=tt<0.0?0.0:exp(-tt*0.8);
      vC=vec4(vec3(0.2,0.15,0.11),a*0.9);
      vec4 mv=modelViewMatrix*vec4(p,1.0);
      gl_PointSize=a<0.01?0.0:clamp(0.006*uScale/-mv.z,1.0,8.0); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: SPRITE_FS,
  });
  fx.felt = pts(scene, 1500, 808, fx.feltMat);
  return fx;
}
