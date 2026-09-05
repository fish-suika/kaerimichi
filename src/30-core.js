/* =========================================================================
   3. CORE — レンダラ / シーン / マテリアル / ライトプール / 当たり判定
   ========================================================================= */

/* ---------- 端末の判定 ----------
   指で操作する端末は、影・解像度・描画距離を落とさないと動かない。
   pointer:coarse だけでは取りこぼす端末があるので3通りで見る。
   3つ目は iPadOS 対策（UAが Macintosh を名乗るが maxTouchPoints は5）。 */
const MOBILE=matchMedia("(pointer: coarse)").matches
  ||/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
  ||(navigator.maxTouchPoints>1&&!matchMedia("(pointer: fine)").matches);
if(MOBILE)document.body.classList.add("touch");
const G={};                       // グローバル状態

/* ---------- レンダラ ---------- */
const canvas=$("c");
const renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:!MOBILE,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,MOBILE?1.2:1.75));
renderer.setSize(innerWidth,innerHeight);
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.0;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;

const camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.06,MOBILE?210:420);
const listener=new THREE.AudioListener();
camera.add(listener);

/* 画面に合わせる。縦持ちは横の視野が狭くなりすぎるので、縦FOVを広げて補う
   （縦FOV70°・アスペクト0.46 だと横は約35°しかなく、道が見えない） */
function fitCamera(){
  const a=innerWidth/innerHeight;
  let fov=70;
  if(a<1.25){
    const hMin=72*Math.PI/180;                       // 確保したい横FOV
    fov=Math.min(86,2*Math.atan(Math.tan(hMin/2)/a)*180/Math.PI);
  }
  camera.fov=Math.max(70,fov);
  camera.aspect=a;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
}
addEventListener("resize",fitCamera);
// 回転直後は innerHeight がまだ古いことがあるので、少し待ってもう一度
addEventListener("orientationchange",()=>setTimeout(fitCamera,320));
fitCamera();

/* ---------- シーン ---------- */
const NIGHT=0x070a11;
const scOut=new THREE.Scene();
scOut.fog=new THREE.FogExp2(NIGHT,.0215);
scOut.background=new THREE.Color(NIGHT);
scOut.add(camera);

const scIn=new THREE.Scene();
scIn.fog=new THREE.FogExp2(0x04050a,.075);
scIn.background=new THREE.Color(0x030407);

let scene=scOut;                 // 現在のシーン
function useScene(s){
  if(scene===s)return;
  scene=s;
  s.add(camera);
}

/* ---------- マテリアル ---------- */
const MAT={};
function stdMap(key,o){
  o=o||{};
  const t=TEX[key];
  return new THREE.MeshStandardMaterial({
    map:t,
    color:o.color==null?0xffffff:o.color,
    roughness:o.rough==null?.93:o.rough,
    metalness:o.metal==null?0:o.metal,
    bumpMap:o.bump?t:null,
    bumpScale:o.bump||0
  });
}
function plain(color,o){
  o=o||{};
  return new THREE.MeshStandardMaterial({
    color:color,
    roughness:o.rough==null?.9:o.rough,
    metalness:o.metal==null?0:o.metal,
    transparent:!!o.op,opacity:o.op==null?1:o.op,
    emissive:o.em==null?0x000000:o.em,
    emissiveIntensity:o.ei==null?1:o.ei,
    side:o.side||THREE.FrontSide
  });
}
function unlit(color,o){
  o=o||{};
  return new THREE.MeshBasicMaterial({
    color:color,map:o.map||null,
    transparent:!!o.op||!!o.trans,opacity:o.op==null?1:o.op,
    side:o.side||THREE.FrontSide,fog:o.fog===false?false:true,
    depthWrite:o.dw===false?false:true,
    blending:o.add?THREE.AdditiveBlending:THREE.NormalBlending
  });
}
function initMats(){
  MAT.asphalt =stdMap("asphalt",{color:0x9a9a9a,bump:.03});
  MAT.gutter  =stdMap("gutter" ,{color:0x9a9a9a,bump:.02});
  MAT.block   =stdMap("block"  ,{color:0x8f8f8f,bump:.04});
  MAT.mortar  =stdMap("mortar" ,{color:0x8a8a8a});
  MAT.siding  =stdMap("siding" ,{color:0x8f8f8f});
  MAT.tin     =stdMap("tin"    ,{color:0x8f8f8f,rough:.62,metal:.35});
  MAT.roof    =stdMap("roof"   ,{color:0x9a9a9a,rough:.86});
  MAT.tatami  =stdMap("tatami" ,{color:0xbdbdbd});
  MAT.wood    =stdMap("wood"   ,{color:0xb0b0b0});
  MAT.gravel  =stdMap("gravel" ,{color:0xaaaaaa,bump:.03});
  MAT.dirt    =stdMap("dirt"   ,{color:0xaaaaaa,bump:.03});
  MAT.sfloor  =stdMap("storefloor",{color:0xd2cfc7,rough:.42});

  MAT.dark    =plain(0x1b1d21,{rough:.95});
  MAT.darker  =plain(0x0d0e11,{rough:.98});
  MAT.metal   =plain(0x3d4046,{rough:.5,metal:.7});
  MAT.metalD  =plain(0x22252a,{rough:.62,metal:.6});
  MAT.white   =plain(0xd8d5cd,{rough:.8});
  MAT.paint   =plain(0x7d8a92,{rough:.72});
  MAT.rust    =plain(0x5c4630,{rough:.95});
  MAT.glass   =plain(0x0a0e14,{rough:.12,metal:.25,op:.72});
  MAT.curtain =stdMap("curtain",{color:0x9a9a9a,rough:.98});
  MAT.green   =plain(0x1e3226,{rough:.95});
  MAT.leaf    =plain(0x080d09,{rough:1});
  MAT.trunk   =plain(0x2b2418,{rough:1});
  MAT.blue    =plain(0x2a3f6b,{rough:.85});
  MAT.red     =plain(0x6e2320,{rough:.8});
  MAT.bagWhite=plain(0x9aa0a2,{rough:.68,op:.97});
  MAT.bagBlue =plain(0x54707e,{rough:.7});
  MAT.goo     =plain(0x1c0d0b,{rough:.76,metal:.05}); // どす黒い赤茶。粗さを下げすぎると街灯を映して白く飛ぶ
  MAT.lampOn  =unlit(0xfff0cf);
  MAT.lampCyan=unlit(0xe9f6ff);
  MAT.lampWarm=unlit(0xffd9a0);
  MAT.winLit  =unlit(0xffe0a8);
  MAT.winDark =plain(0x090b10,{rough:.16,metal:.35});
  MAT.storeLit=unlit(0xb2bfcc);
}

/* ---------- ジオメトリ生成（UVを実寸でタイリング） ---------- */
const _boxCache={};
function uvBox(geo,w,h,d,tile){
  const uv=geo.attributes.uv;
  const dims=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];
  for(let f=0;f<6;f++){
    const su=dims[f][0]/tile,sv=dims[f][1]/tile;
    for(let i=0;i<4;i++){
      const k=f*4+i;
      uv.setXY(k,uv.getX(k)*su,uv.getY(k)*sv);
    }
  }
  uv.needsUpdate=true;
  return geo;
}
/**
 * box({w,h,d,x,y,z,ry,mat,to,tile,solid,cast,recv,name})
 *  y は「底面」の高さ。solid:true で当たり判定を追加。
 */
function box(o){
  const w=o.w,h=o.h,d=o.d,tile=o.tile||2;
  const key=w.toFixed(3)+"_"+h.toFixed(3)+"_"+d.toFixed(3)+"_"+tile;
  let geo=_boxCache[key];
  if(!geo){geo=uvBox(new THREE.BoxGeometry(w,h,d),w,h,d,tile);_boxCache[key]=geo;}
  const m=new THREE.Mesh(geo,o.mat||MAT.dark);
  m.position.set(o.x||0,(o.y||0)+h/2,o.z||0);
  if(o.ry)m.rotation.y=o.ry;
  m.castShadow=o.cast!==false;
  m.receiveShadow=o.recv!==false;
  (o.to||scene).add(m);
  if(o.solid)addSolid(o.x||0,o.z||0,w,d,o.ry||0,o.list);
  if(o.name)m.name=o.name;
  return m;
}
const _planeCache={};
function plane(o){
  const w=o.w,h=o.h,tile=o.tile||2;
  const key=w.toFixed(3)+"_"+h.toFixed(3)+"_"+tile;
  let geo=_planeCache[key];
  if(!geo){
    geo=new THREE.PlaneGeometry(w,h);
    const uv=geo.attributes.uv;
    for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*w/tile,uv.getY(i)*h/tile);
    uv.needsUpdate=true;_planeCache[key]=geo;
  }
  const m=new THREE.Mesh(geo,o.mat||MAT.dark);
  m.position.set(o.x||0,o.y||0,o.z||0);
  m.rotation.set(o.rx==null?-Math.PI/2:o.rx,o.ry2||0,o.rz||0);
  if(o.ry)m.rotation.y=o.ry;
  m.receiveShadow=o.recv!==false;
  m.castShadow=!!o.cast;
  (o.to||scene).add(m);
  return m;
}
function cyl(o){
  const g=new THREE.CylinderGeometry(o.rt,o.rb==null?o.rt:o.rb,o.h,o.seg||10,1,!!o.open);
  const m=new THREE.Mesh(g,o.mat||MAT.metal);
  m.position.set(o.x||0,(o.y||0)+(o.center?0:o.h/2),o.z||0);
  if(o.rx)m.rotation.x=o.rx;
  if(o.rz)m.rotation.z=o.rz;
  if(o.ry)m.rotation.y=o.ry;
  m.castShadow=o.cast!==false;m.receiveShadow=o.recv!==false;
  (o.to||scene).add(m);
  return m;
}
function glow(o){
  const s=new THREE.Sprite(new THREE.SpriteMaterial({
    map:TEX.glow,color:o.color==null?0xffe3b0:o.color,
    transparent:true,opacity:o.op==null?.55:o.op,
    blending:THREE.AdditiveBlending,depthWrite:false,fog:false
  }));
  s.scale.set(o.s||3,(o.sy||o.s||3),1);
  s.position.set(o.x||0,o.y||0,o.z||0);
  (o.to||scene).add(s);
  return s;
}

/* ---------- 有機的な形をつくる ---------- */
/* 球の各成分を sign(v)|v|^e で押し広げると、角の丸い箱になる。
   e=0.4 でほぼ箱、e=0.8 でかなり丸い。布団・枕・人体に使う。 */
const _rbCache={};
function roundedBoxGeo(w,h,d,e,seg){
  const key=[w,h,d,e,seg].join("_");
  if(_rbCache[key])return _rbCache[key];
  const g=new THREE.SphereGeometry(1,seg||16,Math.max(8,Math.round((seg||16)*.6)));
  const p=g.attributes.position;
  const f=v=>(v<0?-1:1)*Math.pow(Math.abs(v),e==null?.5:e);
  for(let i=0;i<p.count;i++){
    p.setXYZ(i,f(p.getX(i))*w/2,f(p.getY(i))*h/2,f(p.getZ(i))*d/2);
  }
  g.computeVertexNormals();
  _rbCache[key]=g;
  return g;
}
function roundedBox(o){
  const m=new THREE.Mesh(roundedBoxGeo(o.w,o.h,o.d,o.e,o.seg),o.mat||MAT.dark);
  m.position.set(o.x||0,(o.y||0)+(o.center?0:o.h/2),o.z||0);
  if(o.rx)m.rotation.x=o.rx;
  if(o.ry)m.rotation.y=o.ry;
  if(o.rz)m.rotation.z=o.rz;
  m.castShadow=o.cast!==false;m.receiveShadow=o.recv!==false;
  (o.to||scene).add(m);
  return m;
}
/* くしゃっとしたゴミ袋。球を潰して底を平らにし、上を絞って結び目を作り、
   面ごとにランダムな凹凸を付けてフラットシェーディングでしわに見せる。 */
function bagGeo(rnd){
  const g=new THREE.SphereGeometry(.42,11,9);
  const p=g.attributes.position;
  const h=(a,b,c)=>{const s=Math.sin(a*12.9898+b*78.233+c*37.719)*43758.5453;return s-Math.floor(s);};
  for(let i=0;i<p.count;i++){
    let x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    const t=(y+.42)/.84;                       // 0=底 1=頂
    // 底は潰れて広がり、上はすぼまる
    const rad=.72+.62*Math.sin(Math.PI*Math.min(1,t*1.12))-(t>.72?(t-.72)*1.9:0);
    x*=Math.max(.12,rad); z*=Math.max(.12,rad);
    y=y*.86+.05;
    if(y<-.30)y=-.30-(y+.30)*.25;              // 接地面を平らに
    // しわ
    const n=h(x+rnd,y*1.7,z-rnd)-.5;
    const len=Math.hypot(x,y,z)||1;
    x+=x/len*n*.085; y+=y/len*n*.055; z+=z/len*n*.085;
    p.setXYZ(i,x,y,z);
  }
  g.computeVertexNormals();
  return g;
}

/* ---------- 当たり判定（XZ平面のAABB） ---------- */
const SOLID={out:[],in:[]};
let solidTarget=SOLID.out;
function addSolid(cx,cz,w,d,ry,list){
  // 回転した箱は外接AABBで近似（45度以下の回転が主なので実用上問題なし）
  let hw=w/2,hd=d/2;
  if(ry){
    const c=Math.abs(Math.cos(ry)),s=Math.abs(Math.sin(ry));
    const nw=hw*c+hd*s,nd=hw*s+hd*c;hw=nw;hd=nd;
  }
  (list||solidTarget).push({x0:cx-hw,x1:cx+hw,z0:cz-hd,z1:cz+hd});
}
function addSolidRect(x0,z0,x1,z1,list){
  (list||solidTarget).push({x0:Math.min(x0,x1),x1:Math.max(x0,x1),
                            z0:Math.min(z0,z1),z1:Math.max(z0,z1)});
}

/* ---------- インタラクト ---------- */
const INTERACT=[];
function addInt(o){ // {pos,r,label,fn,on,face}
  o.r=o.r||2.3;
  o.pos=o.pos.isVector3?o.pos:new THREE.Vector3(o.pos[0],o.pos[1],o.pos[2]);
  INTERACT.push(o);
  return o;
}

/* ---------- ライトプール ----------
   街灯や自販機は「光源スペック」として登録しておき、
   毎フレーム、プレイヤーに近い順に実ライトへ割り当てる。
   ライト個数が変わらないのでシェーダ再コンパイルが起きない。          */
const LIGHTSPEC={spot:[],point:[]};
const POOL={spot:[],point:[]};
function addSpotSpec(x,y,z,o){
  o=o||{};
  const s={x:x,y:y,z:z,color:o.color==null?0xffdca8:o.color,
    inten:o.inten==null?3.2:o.inten,dist:o.dist||24,ang:o.ang||.72,
    pen:o.pen==null?.55:o.pen,on:true,ref:null};
  LIGHTSPEC.spot.push(s);return s;
}
function addPointSpec(x,y,z,o){
  o=o||{};
  const s={x:x,y:y,z:z,color:o.color==null?0xcfe8ff:o.color,
    inten:o.inten==null?2.2:o.inten,dist:o.dist||14,on:true,ref:null};
  LIGHTSPEC.point.push(s);return s;
}
function buildPool(){
  for(let i=0;i<3;i++){
    const L=new THREE.SpotLight(0xffdca8,0,24,.72,.55,1.6);
    L.castShadow=i<(MOBILE?1:2);
    if(L.castShadow){
      L.shadow.mapSize.set(MOBILE?512:1024,MOBILE?512:1024);
      L.shadow.camera.near=.6;L.shadow.camera.far=26;
      L.shadow.bias=-.0016;L.shadow.normalBias=.03;
    }
    L.target.position.set(0,0,0);
    scOut.add(L);scOut.add(L.target);
    POOL.spot.push(L);
  }
  for(let i=0;i<3;i++){
    const L=new THREE.PointLight(0xcfe8ff,0,14,1.7);
    scOut.add(L);POOL.point.push(L);
  }
}
const _tmpSort=[];
function updatePool(px,pz){
  ["spot","point"].forEach(kind=>{
    const specs=LIGHTSPEC[kind],pool=POOL[kind];
    _tmpSort.length=0;
    for(let i=0;i<specs.length;i++){
      const s=specs[i];
      if(!s.on||s.inten<=0)continue;
      const dx=s.x-px,dz=s.z-pz;
      s._d=dx*dx+dz*dz;
      if(s._d<40000)_tmpSort.push(s);
    }
    _tmpSort.sort((a,b)=>a._d-b._d);
    for(let i=0;i<pool.length;i++){
      const L=pool[i],s=_tmpSort[i];
      if(!s){L.intensity=0;continue;}
      L.position.set(s.x,s.y,s.z);
      L.color.setHex(s.color);
      L.intensity=s.inten;
      L.distance=s.dist;
      if(kind==="spot"){
        L.angle=s.ang;L.penumbra=s.pen;
        L.target.position.set(s.x,0,s.z);
        L.target.updateMatrixWorld();
      }
    }
  });
}

/* ---------- 空・月 ---------- */
function buildSky(){
  const hemi=new THREE.HemisphereLight(0x1b2740,0x05060a,.42);
  scOut.add(hemi);
  const moon=new THREE.DirectionalLight(0x93a9d6,.22);
  moon.position.set(-70,90,55);
  scOut.add(moon);
  G.hemi=hemi;G.moon=moon;

  // 星（点群）
  const N=900,pos=new Float32Array(N*3);
  for(let i=0;i<N;i++){
    const th=RND()*Math.PI*2,ph=Math.acos(rr(.08,1));
    const r=350;
    pos[i*3]=Math.sin(ph)*Math.cos(th)*r;
    pos[i*3+1]=Math.cos(ph)*r*.85+40;
    pos[i*3+2]=Math.sin(ph)*Math.sin(th)*r;
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute("position",new THREE.BufferAttribute(pos,3));
  const stars=new THREE.Points(g,new THREE.PointsMaterial({
    color:0xb9c8e6,size:1.5,sizeAttenuation:false,transparent:true,opacity:.62,fog:false}));
  scOut.add(stars);
  G.stars=stars;

  // 月本体
  const m=glow({x:-70,y:120,z:75,s:26,color:0xdfe8ff,op:.5,to:scOut});
  m.material.depthTest=false;m.renderOrder=-1;
}
