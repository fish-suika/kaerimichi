/* =========================================================================
   4. WORLD — 夜の住宅街
   道はほぼ一本道。行きと帰りで必ず同じ景色を通る。
      アパート(z=0) → ゴミ捨て場(z=-11) → 自販機(z=-46) → 公園(z=-84)
      → 曲がり角(z=-124.5) → 西へ → コンビニ(x=-32)
   ========================================================================= */
const LOC={
  aptDoor:new THREE.Vector3(3.55,0,2.2),
  aptOut :new THREE.Vector3(1.5,0,2.2),
  trash  :new THREE.Vector3(4.5,0,-11),
  vend   :new THREE.Vector3(-3.45,0,-46),
  park   :new THREE.Vector3(-12,0,-84),
  swing  :new THREE.Vector3(-13.5,0,-83),
  corner :new THREE.Vector3(0,0,-124.5),
  store  :new THREE.Vector3(-32,0,-115.4),
  storeIn:new THREE.Vector3(-32,0,-111)
};

function buildWorld(){
  solidTarget=SOLID.out;
  const S=scOut;

  /* ---------------- 地面 ---------------- */
  plane({w:200,h:200,x:-30,y:0,z:-55,mat:MAT.dirt,tile:6,to:S});

  /* ---------------- 道路 ---------------- */
  function road(x,z,w,d,ry){
    plane({w:w,h:d,x:x,y:.02,z:z,mat:MAT.asphalt,tile:7,ry:ry,to:S});
  }
  road(0,-56.5,5.0,142);        // 縦の道 z:+14 → -127
  road(-21.0,-124.5,48,5.0);    // 横の道 x:+3 → -45（幅48がX、幅5がZ。回転させない）

  // 側溝
  function gut(x,z,w,d){
    plane({w:w,h:d,x:x,y:.028,z:z,mat:MAT.gutter,tile:2,to:S});
  }
  gut(-2.72,-54.35,.45,135.7); gut(2.72,-54.35,.45,135.7);
  plane({w:48,h:.45,x:-21.0,y:.028,z:-127.22,mat:MAT.gutter,tile:2,to:S});
  plane({w:48,h:.45,x:-21.0,y:.028,z:-121.78,mat:MAT.gutter,tile:2,to:S});

  // 白い外側線
  const lineM=plain(0xb9b6ac,{rough:.7});
  function line(x,z,w,d){plane({w:w,h:d,x:x,y:.032,z:z,mat:lineM,tile:99,to:S});}
  /* 外側の線（東＋北）は角でそのまま繋がり、
     内側の線（西＋南）は角を曲線で回り込む。 */
  line(2.35,-56.83,.11,140.05);                                    // 縦の道・東（角まで）
  plane({w:45.35,h:.11,x:-20.33,y:.032,z:-126.85,mat:lineM,tile:99,to:S}); // 横の道・北
  line(-2.35,-53.90,.11,134.20);                                   // 縦の道・西（曲線の手前まで）
  plane({w:39.50,h:.11,x:-23.25,y:.032,z:-122.15,mat:lineM,tile:99,to:S}); // 横の道・南
  // 内側の曲線（半径1.15mで四半円）
  (function(){
    const ccx=-3.5,ccz=-121.0,r=1.15,N=10;
    for(let i=0;i<N;i++){
      const t0=-(Math.PI/2)*(i/N),t1=-(Math.PI/2)*((i+1)/N);
      const x0=ccx+Math.cos(t0)*r,z0=ccz+Math.sin(t0)*r;
      const x1=ccx+Math.cos(t1)*r,z1=ccz+Math.sin(t1)*r;
      const dx=x1-x0,dz=z1-z0,L=Math.hypot(dx,dz);
      box({w:L+.03,h:.006,d:.11,x:(x0+x1)/2,y:.030,z:(z0+z1)/2,
        mat:lineM,tile:99,ry:Math.atan2(-dz,dx),to:S});
    }
  })();
  // 角の集水桝
  [[2.72,-121.9],[-2.72,-121.9]].forEach(a=>
    box({w:.42,h:.02,d:.42,x:a[0],y:.030,z:a[1],mat:MAT.metalD,tile:1,to:S}));

  /* ---------------- ブロック塀（連続） ---------------- */
  function wallRun(side,z0,z1,gaps){
    // side: +1=東(x=3.2) / -1=西(x=-3.2)
    const x=3.2*side;
    let z=z0;
    const segs=[];
    const gs=(gaps||[]).slice().sort((a,b)=>a[0]-b[0]);
    for(let i=0;i<gs.length;i++){
      if(gs[i][0]>z)segs.push([z,gs[i][0]]);
      z=Math.max(z,gs[i][1]);
    }
    if(z<z1)segs.push([z,z1]);
    segs.forEach(sg=>{
      const len=sg[1]-sg[0];
      if(len<.6)return;
      const h=rr(1.5,1.95);
      box({w:.22,h:h,d:len,x:x,y:0,z:(sg[0]+sg[1])/2,mat:MAT.block,tile:1.2,solid:true,to:S});
      // 笠木
      box({w:.34,h:.07,d:len,x:x,y:h,z:(sg[0]+sg[1])/2,mat:MAT.dark,tile:1,to:S});
    });
  }
  // z軸は南(+)→北(-)。範囲は [北端, 南端] の順で扱う
  wallRun(+1,-127,14,[[-13.6,-8.4],[-3.5,7.5]]);
  // 西側の塀は曲がり角の手前で止める（横の道の入口を塞がないように）
  wallRun(-1,-121.6,14,[[-50,-42],[-99,-69]]);

  // 横の道の両側にも塀を立てる（見えない壁で塞がないため）
  function sideWall(cx,cz,len){
    box({w:len,h:1.72,d:.22,x:cx,y:0,z:cz,mat:MAT.block,tile:1.2,solid:true,to:S});
    box({w:len,h:.07,d:.34,x:cx,y:1.72,z:cz,mat:MAT.dark,tile:1,to:S});
  }
  sideWall(-12.9,-121.35,19.4); // 北側 x:-22.6〜-3.2（コンビニ駐車場の手前まで）
  sideWall(-21.0,-127.65,48);   // 南側 x:-45〜+3

  /* ---------------- 家 ---------------- */
  const wallMats=[MAT.siding,MAT.mortar,MAT.tin,MAT.siding,MAT.mortar];
  G.litWindows=[];G.bikes=[];
  function house(cx,cz,w,d,story,ry){
    const g=new THREE.Group();S.add(g);
    const h=story===2?5.5:3.2;
    const wm=pick(wallMats);
    box({w:w,h:h,d:d,x:cx,y:0,z:cz,mat:wm,tile:2.2,ry:ry,solid:true,to:S});
    // 屋根（寄棟）
    const rg=new THREE.ConeGeometry(1,1,4);
    const roof=new THREE.Mesh(rg,MAT.roof);
    roof.scale.set(Math.hypot(w,d)*.52,rr(1.5,2.2),Math.hypot(w,d)*.52);
    roof.rotation.y=Math.PI/4+(ry||0);
    roof.position.set(cx,h+roof.scale.y/2,cz);
    roof.castShadow=true;roof.receiveShadow=true;S.add(roof);
    // 軒
    box({w:w+.7,h:.16,d:d+.7,x:cx,y:h-.06,z:cz,mat:MAT.dark,tile:2,ry:ry,to:S});
    // 窓
    const nx=ry?0:1;
    const fw=nx?w:d;
    const nWin=Math.max(2,Math.floor(fw/2.6));
    for(let f=0;f<story;f++){
      for(let i=0;i<nWin;i++){
        const off=(i-(nWin-1)/2)*(fw/nWin);
        const lit=RND()<.055;
        const wy=1.05+f*2.5;
        const m=new THREE.Mesh(new THREE.PlaneGeometry(1.02,1.24),lit?MAT.winLit:MAT.winDark);
        if(nx){m.position.set(cx+off,wy,cz-d/2-.02);m.rotation.y=Math.PI;}
        else  {m.position.set(cx-w/2-.02,wy,cz+off);m.rotation.y=-Math.PI/2;}
        S.add(m);
        if(lit){
          const gw=glow({x:m.position.x,y:wy,z:m.position.z,s:2.4,color:0xffca82,op:.24,to:S});
          G.litWindows.push({mesh:m,glow:gw});
        }
      }
    }
    // 室外機
    if(RND()<.7)box({w:.8,h:.6,d:.35,x:cx+(nx?w/2-.8:-w/2-.2),y:.15,z:cz+(nx?d/2+.2:d/2-1),
      mat:MAT.metalD,tile:1,to:S});
    return g;
  }
  // 縦の道の両側。曲がり角(z=-124.5)より手前で必ず打ち切る
  const CORNER_STOP=-117;
  // 東側
  let z=11;
  while(z>-116){
    const d=rr(7,9.5);
    if(z-d<CORNER_STOP)break;
    const skip=(z-d/2<7.5&&z+d/2>-13.6);
    if(!skip)house(rr(8.5,10.5),z-d/2,rr(7.5,10),d,RND()<.42?2:1,0);
    z-=d+rr(1.4,3.4);
  }
  // 西側
  z=11;
  while(z>-116){
    const d=rr(7,9.5);
    if(z-d<CORNER_STOP)break;
    const skip=(z-d/2<-69&&z+d/2>-99)||(z-d/2<-42&&z+d/2>-50);
    if(!skip)house(-rr(8.5,10.5),z-d/2,rr(7.5,10),d,RND()<.4?2:1,0);
    z-=d+rr(1.4,3.4);
  }
  // 横の道の南側
  for(let x=-4;x>-45;x-=rr(9,12)){
    house(x,-133.5,rr(7.5,10),rr(7,9),RND()<.35?2:1,0);
  }
  // 横の道の北側（縦の道にはみ出さないよう x=-10 から）
  for(let x=-10;x>-20;x-=rr(9,12)){
    house(x,-115.5,rr(7.5,10),rr(7,9),RND()<.35?2:1,0);
  }
  addSolidRect(-50,-140,3,-128,SOLID.out);   // 南側まとめて封鎖
  addSolidRect(-22.5,-121.2,-3.2,-112,SOLID.out); // 北側（コンビニ東どなり）
  addSolidRect(-48,-121,-41.5,-104,SOLID.out); // コンビニ西
  addSolidRect(-3.4,10,3.4,16,SOLID.out);    // 北の行き止まり
  box({w:7,h:1.6,d:.2,x:0,y:0,z:13.6,mat:MAT.block,tile:1.2,to:S});

  /* ---------------- 電柱と電線 ---------------- */
  const poles=[];
  function pole(x,z){
    const h=9.2;
    cyl({rt:.13,rb:.17,h:h,x:x,y:0,z:z,mat:plain(0x53514c,{rough:.96}),seg:8,to:S});
    box({w:1.9,h:.09,d:.09,x:x,y:h-1.2,z:z,mat:MAT.metalD,tile:1,to:S});
    box({w:1.5,h:.09,d:.09,x:x,y:h-2.0,z:z,mat:MAT.metalD,tile:1,to:S});
    cyl({rt:.34,h:.85,x:x-.55,y:h-3.4,z:z,mat:MAT.metalD,seg:10,to:S});  // 変圧器
    addSolid(x,z,.4,.4,0,SOLID.out);
    poles.push(new THREE.Vector3(x,h,z));
    return h;
  }
  [8,-16,-40,-64,-88,-112].forEach(zz=>pole(3.0,zz));
  const cornerPole=poles[poles.length-1];
  const polesB=[];
  [-8,-19].forEach(xx=>{
    pole(xx,-120.5);polesB.push(poles[poles.length-1]);
  });
  // 電線
  const wpts=[];
  function wire(a,b,sag,dy){
    const N=10;
    for(let i=0;i<N;i++){
      const t0=i/N,t1=(i+1)/N;
      const p=(t)=>{
        const x=lerp(a.x,b.x,t),z=lerp(a.z,b.z,t);
        const y=lerp(a.y,b.y,t)+dy-Math.sin(Math.PI*t)*sag;
        return [x,y,z];
      };
      wpts.push.apply(wpts,p(t0));wpts.push.apply(wpts,p(t1));
    }
  }
  for(let i=0;i<5;i++)for(let k=0;k<4;k++)
    wire(poles[i],poles[i+1],.55,-1.1-k*.42);
  wire(poles[5],polesB[0],.5,-1.1);
  wire(poles[5],polesB[0],.5,-1.6);
  for(let i=0;i<polesB.length-1;i++)for(let k=0;k<3;k++)
    wire(polesB[i],polesB[i+1],.5,-1.1-k*.45);
  const wg=new THREE.BufferGeometry();
  wg.setAttribute("position",new THREE.BufferAttribute(new Float32Array(wpts),3));
  S.add(new THREE.LineSegments(wg,new THREE.LineBasicMaterial({color:0x14161c,fog:true})));

  /* ---------------- 街灯 ---------------- */
  function streetLamp(x,z,dir){
    const h=4.6;
    cyl({rt:.075,h:h,x:x,y:0,z:z,mat:plain(0x4a4a46,{rough:.9}),seg:8,to:S});
    box({w:1.15,h:.08,d:.08,x:x+.55*dir,y:h-.1,z:z,mat:plain(0x4a4a46),tile:1,to:S});
    const hx=x+1.05*dir;
    box({w:.52,h:.14,d:.3,x:hx,y:h-.28,z:z,mat:MAT.metalD,tile:1,to:S});
    const bulb=new THREE.Mesh(new THREE.PlaneGeometry(.46,.26),MAT.lampOn);
    bulb.rotation.x=Math.PI/2;bulb.position.set(hx,h-.3,z);S.add(bulb);
    glow({x:hx,y:h-.34,z:z,s:3.4,color:0xffd9a2,op:.5,to:S});
    addSolid(x,z,.32,.32,0,SOLID.out);
    return addSpotSpec(hx,h-.32,z,{color:0xffd7a0,inten:4.0,dist:27,ang:.95,pen:.62});
  }
  // dir は「アームを伸ばす向き」。灯りが道路の上に来るように、
  // 西側(x=-3)の灯は +1、東側(x=+3)の灯は -1。
  G.lamps=[];
  G.lamps.push(streetLamp(-3.0,6,1));
  G.lamps.push(streetLamp(3.0,-6,-1));    // アパート手前（液体の筋が見えるように）
  G.lamps.push(streetLamp(3.0,-20,-1));
  G.lamps.push(streetLamp(3.0,-44,-1));   // 自販機の真向かい（最後のカットの逆光になる）
  G.lamps.push(streetLamp(-3.0,-68,1));
  G.lamps.push(streetLamp(3.0,-92,-1));
  G.lamps.push(streetLamp(-3.0,-116,1));
  G.lamps.push(streetLamp(-12,-127.9,0));
  G.lamps.push(streetLamp(-28,-127.9,0));


  buildTrash();
  buildVending();
  buildPark();
  buildStore();
  buildApartmentExterior();
  scatterProps();
}

/* ============================ ゴミ捨て場 ============================ */
function buildTrash(){
  const S=scOut,p=LOC.trash;
  const g=new THREE.Group();g.position.copy(p);S.add(g);
  // コンクリの土間
  plane({w:3.4,h:3.0,x:0,y:.03,z:0,mat:MAT.gutter,tile:1.6,to:g});
  // 三方の低い囲い＋支柱
  box({w:.12,h:1.0,d:3.0,x:1.6,y:0,z:0,mat:MAT.block,tile:1,to:g});
  box({w:3.4,h:1.0,d:.12,x:0,y:0,z:1.5,mat:MAT.block,tile:1,to:g});
  box({w:3.4,h:1.0,d:.12,x:0,y:0,z:-1.5,mat:MAT.block,tile:1,to:g});
  addSolidRect(p.x-1.4,p.z-1.7,p.x+1.9,p.z+1.7,SOLID.out);
  [[-1.6,-1.4],[-1.6,1.4],[1.6,-1.4],[1.6,1.4]].forEach(c=>
    cyl({rt:.045,h:2.0,x:c[0],y:0,z:c[1],mat:MAT.metalD,seg:6,to:g}));
  // カラス除けネット
  const net=new THREE.Mesh(new THREE.BoxGeometry(3.3,1.5,2.9),
    new THREE.MeshStandardMaterial({color:0x2d4a3a,roughness:1,transparent:true,opacity:.34,
      side:THREE.DoubleSide,depthWrite:false}));
  net.position.set(0,.9,0);g.add(net);
  // 看板
  const sg=new THREE.Mesh(new THREE.PlaneGeometry(1.1,.55),
    unlit(0xffffff,{map:TEX.sign("ゴミ出しは\n朝8時までに",{size:40,bg:"#eeeadf",fg:"#3a3d42",border:"#3a3d42",bw:6,w:512,h:256})}));
  sg.position.set(1.62,1.5,0);sg.rotation.y=-Math.PI/2;g.add(sg);

  /* ゴミ袋。球ではなく、潰れて口を絞った袋の形。しわはフラットシェーディングで出す */
  const bags=[];
  const bagMats=[
    new THREE.MeshStandardMaterial({color:0x9aa0a2,roughness:.62,metalness:.02,
      flatShading:true,transparent:true,opacity:.96}),
    new THREE.MeshStandardMaterial({color:0x8e968f,roughness:.66,metalness:.02,flatShading:true}),
    new THREE.MeshStandardMaterial({color:0x54707e,roughness:.66,metalness:.02,flatShading:true})
  ];
  for(let i=0;i<10;i++){
    const bg=new THREE.Group();
    bg.position.set(rr(-1.15,1.15),0,rr(-1.0,1.0));
    bg.rotation.y=rr(0,6.28);
    bg.rotation.z=rr(-.16,.16);
    g.add(bg);
    const mat=bagMats[RND()<.62?0:(RND()<.5?1:2)];
    const s=rr(.82,1.18);
    const body=new THREE.Mesh(bagGeo(rr(0,99)),mat);
    body.scale.set(s*rr(.92,1.1),s*rr(.78,1.0),s*rr(.92,1.1));
    body.position.y=.30*s;
    body.castShadow=true;body.receiveShadow=true;bg.add(body);
    // 口を縛った結び目
    const kn=new THREE.Mesh(roundedBoxGeo(.10,.09,.10,.7,10),mat);
    kn.position.y=.30*s+.30*s;kn.rotation.y=rr(0,3);bg.add(kn);
    const ear=new THREE.Mesh(roundedBoxGeo(.19,.035,.07,.6,8),mat);
    ear.position.y=.30*s+.34*s;ear.rotation.set(rr(-.4,.4),rr(0,3),rr(-.5,.5));bg.add(ear);
    bags.push(bg);
  }
  // 帰り道でだけ現れる「液体」（最初は非表示）
  const pool=new THREE.Mesh(new THREE.CircleGeometry(1,26),MAT.goo);
  pool.rotation.x=-Math.PI/2;pool.position.set(-.3,.045,.2);
  pool.scale.set(.01,.01,.01);pool.visible=false;g.add(pool);
  /* 自宅へ続く筋。
     塀の裏を通ると見えないので、切れ目から道路側へ出して側溝を伝わせ、
     最後に玄関へ折れる。短冊を伸ばすと「棒が伸びる」ように見えるので、
     少し蛇行する帯を1枚のメッシュで作り、描画範囲を伸ばして流れを出す。 */
  const tpts=[[3.66,p.z+.22],[3.34,p.z+.26],[3.06,p.z+.38],[2.88,p.z+.54]];
  for(let z=p.z+.85;z<=1.65;z+=.26)
    tpts.push([2.72+Math.sin(z*.85)*.048+Math.sin(z*2.4)*.022,z]);
  tpts.push([2.79,1.90],[2.98,2.06],[3.28,2.16],[3.62,2.20],[3.92,2.21]);
  const TN=tpts.length;
  const tpos=new Float32Array(TN*6),tidx=[];
  for(let i=0;i<TN;i++){
    const a=tpts[Math.max(0,i-1)],b=tpts[Math.min(TN-1,i+1)];
    let dx=b[0]-a[0],dz=b[1]-a[1];
    const L=Math.hypot(dx,dz)||1;dx/=L;dz/=L;
    const wdt=(i<4?.30:lerp(.25,.165,Math.min(1,(i-4)/16)))*(1+.13*Math.sin(i*1.63));
    tpos[i*6  ]=tpts[i][0]-dz*wdt/2; tpos[i*6+1]=.042; tpos[i*6+2]=tpts[i][1]+dx*wdt/2;
    tpos[i*6+3]=tpts[i][0]+dz*wdt/2; tpos[i*6+4]=.042; tpos[i*6+5]=tpts[i][1]-dx*wdt/2;
    if(i<TN-1)tidx.push(i*2,i*2+2,i*2+1, i*2+1,i*2+2,i*2+3);
  }
  const tgeo=new THREE.BufferGeometry();
  tgeo.setAttribute("position",new THREE.BufferAttribute(tpos,3));
  tgeo.setIndex(tidx);tgeo.computeVertexNormals();
  tgeo.setDrawRange(0,0);
  const tmesh=new THREE.Mesh(tgeo,
    new THREE.MeshStandardMaterial({color:MAT.goo.color,roughness:MAT.goo.roughness,
      metalness:MAT.goo.metalness,side:THREE.DoubleSide}));
  tmesh.visible=false;S.add(tmesh);
  // 先端のふくらみ（流れの頭）
  const thead=new THREE.Mesh(new THREE.CircleGeometry(.13,16),tmesh.material);
  thead.rotation.x=-Math.PI/2;thead.visible=false;S.add(thead);
  const trail={mesh:tmesh,head:thead,pts:tpts,N:TN,t:0};

  G.trash={group:g,bags:bags,pool:pool,trail:trail,drips:[]};
}

/* ============================ 自動販売機 ============================ */
function buildVending(){
  const S=scOut,p=LOC.vend;
  const g=new THREE.Group();g.position.copy(p);S.add(g);
  plane({w:4.6,h:2.6,x:.5,y:.035,z:0,mat:MAT.gutter,tile:1.6,to:g});
  // 背後の閉まった店
  box({w:.3,h:3.4,d:7,x:-1.5,y:0,z:0,mat:MAT.tin,tile:1.6,solid:false,to:g});
  addSolidRect(p.x-2.2,p.z-4.6,p.x-1.2,p.z+4.6,SOLID.out);
  /* 酒・たばこの袖看板（箱型・枠付き・腕木で壁から出す） */
  (function(){
    const sg=new THREE.Group();sg.position.set(-1.30,0,2.2);g.add(sg);
    const fr=plain(0x2a2f36,{rough:.6,metal:.4});
    // 腕木
    box({w:.30,h:.06,d:.06,x:-.02,y:3.72,z:0,mat:fr,tile:1,to:sg});
    box({w:.30,h:.06,d:.06,x:-.02,y:1.30,z:0,mat:fr,tile:1,to:sg});
    // 看板の箱
    box({w:.13,h:2.55,d:.62,x:.20,y:1.25,z:0,mat:fr,tile:1,to:sg});
    // 表示面（両面）
    const face=TEX.vsign("酒・たばこ",{size:76,bg:"#f2ede0",fg:"#20242a",w:160,h:640});
    [[.275,Math.PI/2],[.125,-Math.PI/2]].forEach(a=>{
      const pl=new THREE.Mesh(new THREE.PlaneGeometry(.54,2.42),unlit(0xffffff,{map:face}));
      pl.position.set(a[0],2.52,0);pl.rotation.y=a[1];sg.add(pl);
    });
  })();

  /* 自動販売機。前面は「枠に落とし込んだ見本窓＋選択ボタン列＋硬貨と紙幣の投入口
     ＋返却レバー＋取り出し口」まで作る。X+ が正面。 */
  function machine(zoff,lit){
    const m=new THREE.Group();m.position.set(0,0,zoff);g.add(m);
    const bodyM=plain(0x2a2e34,{rough:.52,metal:.55});   // 側面・背面
    const frontM=plain(0x6f7981,{rough:.45,metal:.5});   // 前面パネル
    const drkM =plain(0x0c0e11,{rough:.9});              // 開口の闇
    const chrM =plain(0x9a958a,{rough:.32,metal:.9});    // 金物
    const W=.78,H=1.83,D=1.12;                            // 奥行 / 高さ / 幅
    box({w:W,h:H,d:D,x:0,y:0,z:0,mat:bodyM,tile:1.4,to:m});
    addSolid(p.x,p.z+zoff,.9,1.22,0,SOLID.out);
    // 前面パネル（本体よりわずかに出す）
    box({w:.05,h:H-.02,d:D,x:W/2,y:.01,z:0,mat:frontM,tile:1.2,to:m});

    // ── 商品見本の窓（枠に落とし込む） ──
    const wy0=.70,wy1=1.62,wz=.50;
    const face=new THREE.Mesh(new THREE.PlaneGeometry(wz*2,wy1-wy0),
      unlit(0xffffff,{map:TEX.vendFront(!lit)}));
    face.position.set(W/2+.026,(wy0+wy1)/2,0);face.rotation.y=Math.PI/2;m.add(face);
    // 窓枠
    box({w:.045,h:.055,d:wz*2+.10,x:W/2+.030,y:wy1,z:0,mat:frontM,tile:1,to:m});
    box({w:.045,h:.055,d:wz*2+.10,x:W/2+.030,y:wy0-.055,z:0,mat:frontM,tile:1,to:m});
    box({w:.045,h:wy1-wy0+.11,d:.05,x:W/2+.030,y:wy0-.055,z:-wz-.025,mat:frontM,tile:1,to:m});
    box({w:.045,h:wy1-wy0+.11,d:.05,x:W/2+.030,y:wy0-.055,z: wz+.025,mat:frontM,tile:1,to:m});
    // ガラスの映り込み
    const gls=new THREE.Mesh(new THREE.PlaneGeometry(wz*2,wy1-wy0),
      new THREE.MeshStandardMaterial({color:0xaecbe0,transparent:true,opacity:.07,
        roughness:.34,metalness:.24,depthWrite:false}));
    gls.position.set(W/2+.032,(wy0+wy1)/2,0);gls.rotation.y=Math.PI/2;m.add(gls);

    // ── 選択ボタン列（見本の真下） ──
    box({w:.05,h:.14,d:wz*2,x:W/2+.028,y:wy0-.20,z:0,mat:plain(0x1d2126,{rough:.7}),tile:1,to:m});
    for(let i=0;i<5;i++){
      const bz=-.40+i*.20;
      box({w:.035,h:.055,d:.13,x:W/2+.052,y:wy0-.165,z:bz,
        mat:lit?plain(0xc0392b,{rough:.5,em:0x2a0a06,ei:1}):plain(0x33231f,{rough:.8}),tile:1,to:m});
      // 値段の札
      box({w:.03,h:.035,d:.15,x:W/2+.050,y:wy0-.095,z:bz,
        mat:plain(lit?0xbfb9a8:0x2b2b28,{rough:.85}),tile:1,to:m});
    }

    // ── 硬貨・紙幣・返却 ──
    box({w:.05,h:.30,d:.22,x:W/2+.028,y:.86,z:.36,mat:plain(0x20242a,{rough:.7}),tile:1,to:m}); // 投入部の台座
    box({w:.03,h:.012,d:.115,x:W/2+.052,y:1.10,z:.36,mat:drkM,tile:1,to:m});                   // 紙幣挿入口
    cyl({rt:.017,h:.03,x:W/2+.052,y:1.02,z:.36,mat:drkM,seg:8,rz:Math.PI/2,center:true,to:m});  // 硬貨投入口
    box({w:.035,h:.05,d:.05,x:W/2+.055,y:.93,z:.36,mat:chrM,tile:1,to:m});                      // 返却レバー
    box({w:.04,h:.09,d:.16,x:W/2+.040,y:.74,z:.36,mat:drkM,tile:1,to:m});                       // 釣銭口
    // 金額表示
    box({w:.03,h:.05,d:.16,x:W/2+.052,y:1.20,z:.36,
      mat:lit?plain(0x101a12,{em:0x1e5a2a,ei:1.4,rough:.4}):plain(0x101210,{rough:.8}),tile:1,to:m});

    // ── 取り出し口（フラップ付き） ──
    box({w:.10,h:.34,d:.64,x:W/2-.02,y:.16,z:-.06,mat:drkM,tile:1,to:m});
    const flap=box({w:.028,h:.28,d:.60,x:W/2+.030,y:.24,z:-.06,
      mat:plain(0x23282d,{rough:.55,metal:.45}),tile:1,to:m});
    flap.rotation.x=-.13;
    box({w:.035,h:.028,d:.62,x:W/2+.040,y:.50,z:-.06,mat:chrM,tile:1,to:m});   // 上の縁

    // ── 上部の看板 ──
    box({w:.05,h:.19,d:D,x:W/2+.002,y:H-.20,z:0,mat:frontM,tile:1,to:m});
    const top=new THREE.Mesh(new THREE.PlaneGeometry(D-.10,.17),
      unlit(lit?0xffffff:0x1a1d22,{map:TEX.sign("いつでも つめたい",
        {size:52,bg:lit?"#c8202a":"#1a1d22",fg:lit?"#ffffff":"#33363c"})}));
    top.position.set(W/2+.030,H-.115,0);top.rotation.y=Math.PI/2;m.add(top);
    // 脚（床から少し浮かせる）
    [-.42,.42].forEach(bz=>box({w:.5,h:.05,d:.10,x:0,y:-.05,z:bz,mat:drkM,tile:1,to:m}));

    const gl=glow({x:1.0,y:1.15,z:zoff,s:lit?5.2:0,color:0xd8ecff,op:lit?.42:0,to:g});
    return {group:m,face:face,top:top,glow:gl};
  }
  const A=machine(1.0,true);    // 光っている方（怪異はこちら）
  const B=machine(-1.0,false);  // 切れている方
  const spec=addPointSpec(p.x+1.1,1.3,p.z+1.0,{color:0xcfe6ff,inten:3.6,dist:13});
  G.vend={group:g,A:A,B:B,spec:spec,lit:true,knockPos:new THREE.Vector3(p.x+.5,1.1,p.z+1.0)};
}

/* ============================ 公園 ============================ */
function buildPark(){
  const S=scOut,p=LOC.park;
  const g=new THREE.Group();g.position.copy(p);S.add(g);
  plane({w:22,h:24,x:-6,y:.03,z:0,mat:MAT.gravel,tile:5,to:g});
  // フェンス
  const fm=plain(0x35383c,{rough:.9,metal:.3});
  function fence(x,z,len,ry){
    box({w:len,h:.08,d:.05,x:x,y:1.15,z:z,mat:fm,tile:1,ry:ry,to:g});
    box({w:len,h:.08,d:.05,x:x,y:.5,z:z,mat:fm,tile:1,ry:ry,to:g});
    const n=Math.floor(len/1.6);
    for(let i=0;i<=n;i++){
      const t=(i/n-.5)*len;
      cyl({rt:.035,h:1.25,x:x+(ry?0:t),y:0,z:z+(ry?t:0),mat:fm,seg:6,to:g});
    }
  }
  fence(-6,-11.5,22,0);  fence(-6,11.5,22,0);
  fence(-17,3,20,Math.PI/2); fence(5.0,-6.5,10,Math.PI/2); fence(5.0,7.6,8,Math.PI/2);
  addSolidRect(p.x-18,p.z-12,p.x+5.2,p.z-11,SOLID.out);
  addSolidRect(p.x-18,p.z+11,p.x+5.2,p.z+12,SOLID.out);
  addSolidRect(p.x-18,p.z-12,p.x-17,p.z+12,SOLID.out);
  addSolidRect(p.x+4.8,p.z-12,p.x+5.2,p.z-1.5,SOLID.out);   // 入口(z:-1.5〜+3)を残す
  addSolidRect(p.x+4.8,p.z+3,p.x+5.2,p.z+12,SOLID.out);

  // 公園灯（ブランコが「見える」程度にだけ照らす）
  cyl({rt:.07,h:3.6,x:1.5,y:0,z:-3,mat:plain(0x44443f),seg:8,to:g});
  const pl=new THREE.Mesh(new THREE.SphereGeometry(.24,10,8),unlit(0xf3e3c0));
  pl.position.set(1.5,3.62,-3);g.add(pl);
  glow({x:1.5,y:3.62,z:-3,s:3.0,color:0xf3d9ab,op:.42,to:g});
  addSolid(p.x+1.5,p.z-3,.3,.3,0,SOLID.out);
  addPointSpec(p.x+1.5,3.6,p.z-3,{color:0xf3d9ab,inten:1.7,dist:11.5});

  // 木（夜なので、ほとんど黒い塊）
  for(let i=0;i<6;i++){
    const tx=rr(-15,-6),tz=rr(-9.5,9.5);
    if(Math.abs(tx+3.5)<3.4&&Math.abs(tz-1)<4)continue;
    cyl({rt:.16,rb:.22,h:rr(2.2,3.2),x:tx,y:0,z:tz,mat:MAT.trunk,seg:6,to:g});
    const c=new THREE.Mesh(new THREE.SphereGeometry(rr(1.5,2.3),7,5),MAT.leaf);
    c.position.set(tx,rr(3.6,4.6),tz);c.scale.set(1.1,.78,1.0);c.castShadow=true;g.add(c);
    addSolid(p.x+tx,p.z+tz,.5,.5,0,SOLID.out);
  }
  // ベンチ
  box({w:1.6,h:.08,d:.42,x:-2,y:.42,z:7.5,mat:MAT.wood,tile:.6,to:g});
  box({w:.1,h:.42,d:.4,x:-2.7,y:0,z:7.5,mat:MAT.metalD,tile:1,to:g});
  box({w:.1,h:.42,d:.4,x:-1.3,y:0,z:7.5,mat:MAT.metalD,tile:1,to:g});
  // 砂場
  plane({w:4,h:4,x:-9,y:.05,z:6,mat:MAT.dirt,tile:2,to:g});
  box({w:4.2,h:.22,d:.2,x:-9,y:0,z:4,mat:MAT.wood,tile:1,to:g});
  box({w:4.2,h:.22,d:.2,x:-9,y:0,z:8,mat:MAT.wood,tile:1,to:g});
  // 滑り台
  (function(){
    const s=new THREE.Group();s.position.set(-4.5,0,-6);s.rotation.y=.5;g.add(s);
    box({w:.7,h:1.8,d:.7,x:0,y:0,z:0,mat:MAT.metalD,tile:1,to:s});
    const sl=box({w:.72,h:.07,d:3.0,x:0,y:1.0,z:1.6,mat:MAT.metal,tile:1,to:s});
    sl.rotation.x=.52;
    addSolid(LOC.park.x-4.5,LOC.park.z-6,1.4,3.4,.5,SOLID.out);
  })();

  /* --- ブランコ --- */
  const sw=new THREE.Group();
  sw.position.set(-3.5,0,1);g.add(sw);
  const fmm=plain(0x5a5750,{rough:.62,metal:.45});
  /* A字フレーム：脚の下端を地面(y=0)、上端を横棒(y=2.78,z=0)で合わせる。
     脚の長さ L と傾き th は  (L/2)cos(th)=1.39, (L/2)sin(th)=0.75  から決める。 */
  const LEG=3.16, TH=.495, LEGY=1.39;
  [[-1.5],[1.5]].forEach(a=>{
    const x=a[0];
    const l1=cyl({rt:.055,h:LEG,x:x,y:LEGY,z:-.75,mat:fmm,seg:6,center:true,to:sw});
    l1.rotation.x=TH;                      // 上が内側（z=0）へ寄る
    const l2=cyl({rt:.055,h:LEG,x:x,y:LEGY,z:.75,mat:fmm,seg:6,center:true,to:sw});
    l2.rotation.x=-TH;
    addSolid(LOC.park.x-3.5+x,LOC.park.z+1,.34,3.2,0,SOLID.out);
  });
  const bar=cyl({rt:.05,h:3.4,x:0,y:2.78,z:0,mat:fmm,seg:8,rz:Math.PI/2,center:true,to:sw});
  const seats=[];
  [-.72,.72].forEach(sx=>{
    const piv=new THREE.Group();
    piv.position.set(sx,2.76,0);sw.add(piv);
    [-.2,.2].forEach(cx=>{
      cyl({rt:.014,h:2.32,x:cx,y:-1.16,z:0,mat:plain(0x2e3136,{metal:.8,rough:.5}),
        seg:5,center:true,to:piv});
    });
    const seat=box({w:.46,h:.05,d:.22,x:0,y:-2.35,z:0,mat:plain(0x3a3d43,{rough:.8}),tile:1,to:piv});
    seats.push({pivot:piv,seat:seat});
  });
  G.park={group:g,swing:sw,seats:seats,
    swingPos:new THREE.Vector3(LOC.park.x-3.5,1.2,LOC.park.z+1)};
}

/* ============================ コンビニ ============================ */
/* ============================ コンビニ ============================ */
/* 建物の中心 (cx,cz)。道路Bは z=-124.5、駐車場はその北側 z≈-119.5、
   店の正面（ガラスと入口）は駐車場に面する z = cz-5.5 側。          */
function buildStore(){
  const S=scOut;
  const cx=-32,cz=-110.5;
  const g=new THREE.Group();S.add(g);

  // 駐車場
  plane({w:19,h:7.5,x:cx,y:.025,z:-119.7,mat:MAT.asphalt,tile:7,to:g});
  const lm=plain(0xc9c6bc,{rough:.7});
  for(let i=0;i<6;i++)plane({w:.1,h:5.0,x:cx-7.5+i*3.0,y:.035,z:-120.4,mat:lm,tile:99,to:g});

  // 床・壁・天井
  plane({w:14,h:11,x:cx,y:.05,z:cz,mat:MAT.sfloor,tile:1.2,to:g});
  const ext=plain(0xa8a49b,{rough:.85});
  box({w:14.6,h:4.2,d:.3,x:cx,y:0,z:cz+5.6,mat:ext,tile:2,solid:true,to:g});   // 奥（北）
  box({w:.3,h:4.2,d:11.4,x:cx-7.15,y:0,z:cz,mat:ext,tile:2,solid:true,to:g});  // 西
  box({w:.3,h:4.2,d:11.4,x:cx+7.15,y:0,z:cz,mat:ext,tile:2,solid:true,to:g});  // 東
  // 正面ガラス（入口 x:cx±2.2 は開けておく）
  const glassM=plain(0x2a3840,{rough:.28,metal:.24,op:.26});
  box({w:4.6,h:3.2,d:.12,x:cx-4.5,y:.05,z:cz-5.5,mat:glassM,tile:2,solid:true,to:g});
  box({w:4.6,h:3.2,d:.12,x:cx+4.5,y:.05,z:cz-5.5,mat:glassM,tile:2,solid:true,to:g});
  box({w:14.6,h:1.0,d:.4,x:cx,y:3.2,z:cz-5.5,mat:ext,tile:2,to:g});
  // 天井
  plane({w:14,h:11,x:cx,y:3.2,z:cz,mat:MAT.storeLit,tile:99,rx:Math.PI/2,to:g});
  // 庇と看板
  box({w:15.4,h:.5,d:1.2,x:cx,y:3.9,z:cz-5.4,mat:plain(0xdad6cc,{rough:.7}),tile:2,to:g});
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(7.6,1.5),
    unlit(0xffffff,{map:TEX.sign("ひかりストア",{size:96,bg:"#f7f5ef",fg:"#1d6b4e",w:1024,h:256})}));
  sign.position.set(cx,4.35,cz-6.05);sign.rotation.y=Math.PI;g.add(sign);
  glow({x:cx,y:4.35,z:cz-6.4,s:12,sy:5,color:0xdff3ff,op:.30,to:g});
  glow({x:cx,y:1.8,z:cz-5.9,s:16,sy:7,color:0xeaf6ff,op:.34,to:g});

  // 店内照明
  addPointSpec(cx-3.4,2.9,cz+1,{color:0xf2f8ff,inten:2.35,dist:16});
  addPointSpec(cx+3.4,2.9,cz-2,{color:0xf2f8ff,inten:2.05,dist:16});

  /* ---- 什器 ----
     商品は1個ずつ置くとメッシュが数百になるので、インスタンス描画にまとめる。
     何百個並べてもドローコールは1つ。 */
  const PROD=[0xd7473a,0xe08a1e,0x2f7d4f,0x2b58a0,0xe6d24a,0xc23b7a,0xefe8d8,
              0x8a5a2b,0x4aa0b5,0x7a3f9c,0xdedad0,0x2e2e33];
  const prodSpecs=[];
  function putProd(x,y,z,w,h,d,ry,col){prodSpecs.push([x,y,z,w,h,d,ry,col]);}
  const shelfM=plain(0xdad7cf,{rough:.5,metal:.15});
  const frameM=plain(0xb9b6ae,{rough:.55,metal:.3});

  /* ゴンドラ棚（両面陳列） */
  function gondola(x,z,len){
    box({w:len,h:1.52,d:.10,x:x,y:.05,z:z,mat:frameM,tile:1,to:g});            // 背板
    const posts=Math.round(len/1.15);
    for(let i=0;i<=posts;i++)
      box({w:.05,h:1.52,d:.84,x:x-len/2+i*(len/posts),y:.05,z:z,mat:frameM,tile:1,to:g});
    box({w:len,h:.10,d:.86,x:x,y:.05,z:z,mat:frameM,tile:1,to:g});             // 台輪
    [-1,1].forEach(side=>{
      [.40,.76,1.12,1.44].forEach((sy,li)=>{
        box({w:len-.08,h:.028,d:.38,x:x,y:sy,z:z+side*.23,mat:shelfM,tile:1,to:g});
        // プライスレール
        box({w:len-.08,h:.045,d:.02,x:x,y:sy-.05,z:z+side*.42,
          mat:plain(0xf0ece0,{rough:.8}),tile:1,to:g});
        if(li===3)return;                                                       // 最上段は空
        const n=Math.floor((len-.24)/.15);
        for(let k=0;k<n;k++){
          const w2=rr(.085,.125),h2=rr(.13,.23);
          putProd(x-len/2+.16+k*.15+rr(-.008,.008),sy+.028+h2/2,
                  z+side*(.20+rr(-.02,.02)),w2,h2,rr(.09,.13),rr(-.12,.12),pick(PROD));
        }
      });
    });
    addSolid(x,z,len,.94,0,SOLID.out);
  }
  gondola(cx-1.6,cz+1.6,7.2);
  gondola(cx-1.6,cz-1.3,7.2);

  /* 冷蔵ケース（奥の壁一面） */
  (function(){
    const w=12,z0=cz+5.05;
    box({w:w,h:2.65,d:.78,x:cx,y:.05,z:z0,mat:plain(0x2b3138,{rough:.6,metal:.35}),tile:1.5,to:g});
    box({w:w-.24,h:2.30,d:.60,x:cx,y:.20,z:z0-.06,mat:plain(0xb9c6cf,{rough:.55}),tile:1,to:g}); // 庫内（発光板にすると巨大なモニターに見えるので普通の面にする）
    // 棚と飲料
    [.42,.86,1.30,1.74,2.14].forEach(sy=>{
      box({w:w-.30,h:.025,d:.52,x:cx,y:sy,z:z0-.08,mat:shelfM,tile:1,to:g});
      const n=Math.floor((w-.5)/.115);
      for(let k=0;k<n;k++)
        putProd(cx-w/2+.28+k*.115,sy+.11,z0-.20+rr(-.03,.03),
                .085,rr(.17,.23),.085,0,pick(PROD));
    });
    // ガラス扉と枠
    for(let i=0;i<5;i++){
      const dx=cx-w/2+.35+i*((w-.7)/4);
      box({w:.07,h:2.30,d:.05,x:dx,y:.20,z:z0-.40,mat:frameM,tile:1,to:g});
      const gl=new THREE.Mesh(new THREE.PlaneGeometry((w-.7)/4-.10,2.24),
        new THREE.MeshStandardMaterial({color:0xcfe4f2,transparent:true,opacity:.14,
          roughness:.12,metalness:.4,depthWrite:false}));
      gl.position.set(dx+((w-.7)/4)/2,1.35,z0-.42);gl.rotation.y=Math.PI;g.add(gl);
    }
    box({w:w,h:.10,d:.06,x:cx,y:2.55,z:z0-.40,mat:frameM,tile:1,to:g});
    addSolid(cx,z0,w,.8,0,SOLID.out);
    glow({x:cx,y:1.5,z:z0-.6,s:11,sy:4,color:0xcfe8ff,op:.26,to:g});
  })();

  /* おにぎり什器。他の棚と同じように、西の壁に沿った1列にする（通路側を向く）。
     看板は板1枚だと浮くので、厚みのある箱に文字を載せる。 */
  (function(){
    const ox=cx-6.55,z0=cz-3.6,z1=cz+2.2,oz=(z0+z1)/2,len=z1-z0;
    box({w:.60,h:.72,d:len,x:ox,y:.13,z:oz,mat:plain(0xcbc7bd,{rough:.55}),tile:1.2,to:g});
    box({w:.56,h:.13,d:len,x:ox-.02,y:0,z:oz,mat:plain(0x8f8b82,{rough:.7}),tile:1,to:g}); // 台輪
    box({w:.03,h:.04,d:len,x:ox+.30,y:.52,z:oz,mat:frameM,tile:1,to:g});                   // 見切り
    box({w:.66,h:.05,d:len,x:ox,y:.85,z:oz,mat:frameM,tile:1,to:g});                       // 天板
    box({w:.10,h:1.62,d:len,x:ox-.28,y:.05,z:oz,mat:frameM,tile:1,to:g});                  // 背板
    for(let t=0;t<3;t++){
      // 上の段ほど奥(-X)へ下げる＝通路側から中身が見える傾斜棚
      const sy=.92+t*.19,sx=ox+.16-t*.13;
      const sh=box({w:.30,h:.025,d:len-.08,x:sx,y:sy,z:oz,mat:shelfM,tile:1,to:g});
      sh.rotation.z=-.22;                                     // 通路側を低く
      box({w:.02,h:.05,d:len-.08,x:sx+.15,y:sy-.02,z:oz,
        mat:plain(0xf0ece0,{rough:.8}),tile:1,to:g});
      for(let k=0;k<11;k++)
        putProd(sx+.02,sy+.09,z0+.28+k*.50,.15,.085,.20,rr(-.1,.1),
                RND()<.5?0xefe9dc:0x2f3338);
    }
    // 厚みのある看板（箱＋前面の文字）
    box({w:.12,h:.30,d:len-.10,x:ox+.02,y:1.44,z:oz,mat:plain(0x14513c,{rough:.7}),tile:1,to:g});
    const oniSign=new THREE.Mesh(new THREE.PlaneGeometry(len-.24,.25),
      unlit(0xffffff,{map:TEX.sign("お に ぎ り",{size:78,bg:"#1d6b4e",fg:"#ffffff",w:1024,h:192})}));
    oniSign.position.set(ox+.085,1.59,oz);oniSign.rotation.y=Math.PI/2;g.add(oniSign);
    box({w:.16,h:.05,d:len-.06,x:ox+.01,y:1.74,z:oz,mat:frameM,tile:1,to:g});   // 看板の笠
    addSolid(ox,oz,.72,len,0,SOLID.out);
  })();

  /* レジカウンター */
  (function(){
    const rx=cx+4.7,rz=cz-2.6;
    box({w:3.4,h:.92,d:.78,x:rx,y:.05,z:rz,mat:plain(0xdcd8ce,{rough:.6}),tile:1.5,to:g});
    box({w:3.5,h:.06,d:.86,x:rx,y:.97,z:rz,mat:plain(0x4a4f56,{rough:.4,metal:.3}),tile:1,to:g});
    // レジ本体（浮いた板ではなく、箱として置く）
    box({w:.52,h:.26,d:.44,x:rx+.9,y:1.03,z:rz,mat:plain(0x3a4046,{rough:.6}),tile:1,to:g});
    box({w:.30,h:.16,d:.26,x:rx+.9,y:1.29,z:rz+.06,mat:plain(0x2b3036,{rough:.7}),tile:1,to:g});
    box({w:.42,h:.03,d:.30,x:rx+.9,y:1.29,z:rz-.14,mat:plain(0x53595f,{rough:.5}),tile:1,to:g});
    // 中華まんの保温ケース
    box({w:.62,h:.10,d:.44,x:rx-1.0,y:.98,z:rz,mat:frameM,tile:1,to:g});
    const cs=new THREE.Mesh(new THREE.BoxGeometry(.58,.34,.40),
      new THREE.MeshStandardMaterial({color:0xdfe6ea,transparent:true,opacity:.20,
        roughness:.15,metalness:.3,depthWrite:false}));
    cs.position.set(rx-1.0,1.25,rz);g.add(cs);
    for(let k=0;k<6;k++)
      putProd(rx-1.2+(k%3)*.20,1.12,rz-.10+Math.floor(k/3)*.16,.13,.09,.13,0,0xe8e0cc);
    // 背後のタバコ棚
    box({w:3.0,h:1.3,d:.24,x:rx,y:1.35,z:rz+.62,mat:frameM,tile:1,to:g});
    for(let r=0;r<4;r++){
      box({w:2.9,h:.02,d:.22,x:rx,y:1.42+r*.30,z:rz+.60,mat:shelfM,tile:1,to:g});
      for(let k=0;k<26;k++)
        putProd(rx-1.4+k*.108,1.47+r*.30,rz+.60,.075,.095,.16,0,pick(PROD));
    }
    addSolid(rx,rz,3.5,.9,0,SOLID.out);
    addSolid(rx,rz+.62,3.0,.3,0,SOLID.out);
  })();

  /* セルフレジ */
  (function(){
    const sx=cx+2.5,sz=cz-3.5;
    const cabM=plain(0x3d444b,{rough:.55,metal:.25});
    box({w:.66,h:.88,d:.56,x:sx,y:.05,z:sz,mat:cabM,tile:1,to:g});          // 下箱
    box({w:.72,h:.06,d:.62,x:sx,y:.93,z:sz,mat:plain(0x8d949b,{rough:.4,metal:.4}),tile:1,to:g});
    box({w:.30,h:.36,d:.30,x:sx+.16,y:.99,z:sz+.12,mat:cabM,tile:1,to:g});  // 画面の支柱
    /* タッチ画面。筐体と画面をひとつの入れ物に入れて、まとめて後ろへ倒す。
       立った客が見下ろす角度になるよう、上端を奥へ20度ほど。 */
    (function(){
      const sg=new THREE.Group();
      sg.position.set(sx+.02,1.28,sz-.06);
      sg.rotation.x=.34;                      // 上端が奥、画面はやや上を向く
      g.add(sg);
      const hs=new THREE.Mesh(new THREE.BoxGeometry(.50,.38,.055),
        plain(0x23282d,{rough:.6}));
      hs.castShadow=true;sg.add(hs);
      const scr=new THREE.Mesh(new THREE.PlaneGeometry(.43,.32),
        unlit(0xffffff,{map:TEX.sign("お会計は\nこちらから",
          {size:54,bg:"#12303f",fg:"#8fe6ff",w:512,h:384})}));
      scr.position.set(0,0,-.030);scr.rotation.y=Math.PI;sg.add(scr);
    })();
    // スキャナ面
    box({w:.26,h:.02,d:.20,x:sx-.18,y:.98,z:sz-.10,mat:plain(0x1a1f24,{rough:.2,metal:.5}),tile:1,to:g});
    // 硬貨・紙幣ユニット
    box({w:.20,h:.30,d:.16,x:sx-.20,y:1.00,z:sz+.14,mat:plain(0x2b3036,{rough:.6}),tile:1,to:g});
    box({w:.12,h:.012,d:.05,x:sx-.20,y:1.24,z:sz+.06,mat:plain(0x0d0f12,{rough:.9}),tile:1,to:g});
    // レシート口
    box({w:.11,h:.014,d:.04,x:sx+.20,y:1.02,z:sz-.16,mat:plain(0x0d0f12,{rough:.9}),tile:1,to:g});
    // 袋詰め台とフック
    box({w:.40,h:.04,d:.34,x:sx-.52,y:.90,z:sz,mat:plain(0x8d949b,{rough:.45,metal:.4}),tile:1,to:g});
    cyl({rt:.012,h:.26,x:sx-.66,y:.94,z:sz-.10,mat:plain(0x8d949b,{metal:.6,rough:.4}),seg:6,to:g});
    cyl({rt:.012,h:.26,x:sx-.66,y:.94,z:sz+.10,mat:plain(0x8d949b,{metal:.6,rough:.4}),seg:6,to:g});
    // 表示灯（3色）
    cyl({rt:.022,h:.55,x:sx+.30,y:1.20,z:sz+.16,mat:plain(0x6a7078,{metal:.5,rough:.5}),seg:6,to:g});
    [[0x2e7d32,1.78],[0xd9a520,1.86],[0xc0392b,1.94]].forEach(a=>{
      const b=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,.075,10),
        unlit(a[1]===1.78?0x6ee08a:0x2a2622));
      b.position.set(sx+.30,a[1],sz+.16);g.add(b);
    });
    addSolid(sx,sz,.8,.7,0,SOLID.out);
    addSolid(sx-.52,sz,.5,.4,0,SOLID.out);
  })();

  // 並べた商品をまとめて1つのインスタンスメッシュに
  (function(){
    const im=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),
      plain(0xffffff,{rough:.55}),prodSpecs.length);
    const mtx=new THREE.Matrix4(),q=new THREE.Quaternion(),
          v=new THREE.Vector3(),s=new THREE.Vector3(),col=new THREE.Color();
    const up=new THREE.Vector3(0,1,0);
    prodSpecs.forEach((sp,i)=>{
      v.set(sp[0],sp[1],sp[2]);s.set(sp[3],sp[4],sp[5]);
      q.setFromAxisAngle(up,sp[6]||0);
      mtx.compose(v,q,s);
      im.setMatrixAt(i,mtx);
      im.setColorAt(i,col.setHex(sp[7]));
    });
    im.instanceMatrix.needsUpdate=true;
    if(im.instanceColor)im.instanceColor.needsUpdate=true;
    g.add(im);
    G.storeProducts=im;
  })();
  // 入口枠
  box({w:.18,h:3.2,d:.3,x:cx-2.2,y:.05,z:cz-5.5,mat:MAT.metalD,tile:1,to:g});
  box({w:.18,h:3.2,d:.3,x:cx+2.2,y:.05,z:cz-5.5,mat:MAT.metalD,tile:1,to:g});

  G.store={group:g,cx:cx,cz:cz,
    lightSpecs:LIGHTSPEC.point.slice(-2),
    lit:true,
    door:new THREE.Vector3(cx,0,cz-5.5),
    onigiri:new THREE.Vector3(cx-6.0,1.05,cz-1.0),
    reg:new THREE.Vector3(cx+2.6,1.1,cz-3.4)};
}

/* ============================ アパート（外観） ============================ */
function buildApartmentExterior(){
  const S=scOut;
  const g=new THREE.Group();S.add(g);
  const bx=8.6,bz=2.0;
  // 本体2階建て
  box({w:9.0,h:5.9,d:9.0,x:bx,y:0,z:bz,mat:MAT.mortar,tile:2.4,solid:true,to:g});
  box({w:9.6,h:.3,d:9.6,x:bx,y:5.9,z:bz,mat:MAT.dark,tile:2,to:g});
  // 外廊下（西面）
  box({w:1.5,h:.2,d:9.0,x:3.9,y:2.85,z:bz,mat:MAT.gutter,tile:1.5,to:g});
  for(let i=0;i<6;i++)
    cyl({rt:.035,h:1.0,x:3.2,y:3.05,z:bz-4+i*1.6,mat:MAT.metalD,seg:5,to:g});
  box({w:.06,h:.06,d:9.0,x:3.20,y:4.00,z:bz,mat:MAT.metalD,tile:1,to:g});  // 手すり
  /* 外階段：建物の南端に置き、上りきると2階の外廊下(y=3.05, z=6.5)につながる。
     塀(x=3.2)より東に収める。 */
  (function(){
    const N=14,topY=3.05,topZ=6.50,run=.27,rise=topY/N;
    const botZ=topZ+(N-1)*run;
    const st=new THREE.Group();st.position.set(4.15,0,0);g.add(st);
    const stM=plain(0x3a3d42,{rough:.6,metal:.5});
    for(let i=0;i<N;i++){
      const z=botZ-i*run;
      box({w:1.30,h:.05,d:.30,x:0,y:rise*(i+1)-.05,z:z,mat:MAT.metalD,tile:1,to:st});
      box({w:1.26,h:rise-.05,d:.03,x:0,y:rise*i,z:z-.145,
        mat:plain(0x1a1c20,{rough:.95}),tile:1,to:st});   // 蹴込み
    }
    const L=Math.hypot((N-1)*run,topY-rise),ang=Math.atan2(topY-rise,(N-1)*run);
    const midY=(rise+topY)/2,midZ=(botZ+topZ)/2;
    [-.68,.68].forEach(dx=>{
      const beam=new THREE.Mesh(new THREE.BoxGeometry(.08,.26,L),stM);
      beam.position.set(dx,midY-.11,midZ);beam.rotation.x=ang;
      beam.castShadow=true;beam.receiveShadow=true;st.add(beam);
      const rail=new THREE.Mesh(new THREE.BoxGeometry(.05,.05,L),stM);
      rail.position.set(dx,midY+.86,midZ);rail.rotation.x=ang;st.add(rail);
      for(let k=0;k<4;k++){
        const t=k/3;
        cyl({rt:.022,h:.96,x:dx,y:rise+(topY-rise)*t-.06,z:botZ+(topZ-botZ)*t,
          mat:MAT.metalD,seg:5,to:st});
      }
    });
    // 上り口の踏み台
    box({w:1.40,h:.06,d:.6,x:0,y:0,z:botZ+.42,mat:MAT.gutter,tile:1,to:st});
    addSolidRect(3.45,6.30,4.85,10.35,SOLID.out);
  })();
  /* ---- 玄関ドア ----
     建物の西面(x=4.1)に落とし込む。三方枠・レバーハンドル・シリンダー錠・
     ドアスコープ・郵便受け・下部の換気ガラリまで作る。 */
  const DOOR_X=4.06;                                   // 扉の表面
  const doorM =plain(0x46515b,{rough:.52,metal:.42});  // 扉
  const doorIn=plain(0x3c4650,{rough:.58,metal:.40});  // 落とし込みパネル
  const frameM=plain(0x2c3138,{rough:.62,metal:.38});  // 枠
  const hwM   =plain(0x9a958a,{rough:.34,metal:.85});  // 金物
  const slotM =plain(0x14171b,{rough:.85});            // 開口部の闇
  function aptDoor(z,y0,num){
    // 三方枠（縦2本＋上枠）
    box({w:.16,h:2.14,d:.09,x:DOOR_X+.03,y:y0,z:z-.495,mat:frameM,tile:1,to:g});
    box({w:.16,h:2.14,d:.09,x:DOOR_X+.03,y:y0,z:z+.495,mat:frameM,tile:1,to:g});
    box({w:.16,h:.10 ,d:1.08,x:DOOR_X+.03,y:y0+2.07,z:z,mat:frameM,tile:1,to:g});
    // 扉本体（枠より少し奥に引っ込める）
    const d=box({w:.055,h:2.04,d:.90,x:DOOR_X,y:y0+.02,z:z,mat:doorM,tile:1,to:g});
    // 落とし込みパネル（面に段差を作って平板に見えないようにする）
    box({w:.014,h:1.60,d:.72,x:DOOR_X-.032,y:y0+.30,z:z,mat:doorIn,tile:1,to:g});
    box({w:.008,h:1.66,d:.78,x:DOOR_X-.030,y:y0+.27,z:z,mat:frameM,tile:1,to:g});
    // レバーハンドル（座＋レバー）
    cyl({rt:.038,h:.022,x:DOOR_X-.038,y:y0+1.02,z:z+.31,mat:hwM,seg:12,rz:Math.PI/2,center:true,to:g});
    cyl({rt:.017,h:.075,x:DOOR_X-.068,y:y0+1.02,z:z+.31,mat:hwM,seg:8,rz:Math.PI/2,center:true,to:g});
    box({w:.030,h:.030,d:.155,x:DOOR_X-.100,y:y0+1.005,z:z+.245,mat:hwM,tile:1,to:g});
    // シリンダー錠（2ロック）
    [1.29,1.44].forEach(h=>{
      cyl({rt:.026,h:.018,x:DOOR_X-.036,y:y0+h,z:z+.31,mat:hwM,seg:10,rz:Math.PI/2,center:true,to:g});
      cyl({rt:.010,h:.022,x:DOOR_X-.040,y:y0+h,z:z+.31,mat:slotM,seg:6,rz:Math.PI/2,center:true,to:g});
    });
    // ドアスコープ
    cyl({rt:.013,h:.020,x:DOOR_X-.036,y:y0+1.58,z:z,mat:slotM,seg:8,rz:Math.PI/2,center:true,to:g});
    // 郵便受け（扉に付いた投入口）
    box({w:.018,h:.085,d:.30,x:DOOR_X-.036,y:y0+.66,z:z,mat:slotM,tile:1,to:g});
    box({w:.026,h:.022,d:.34,x:DOOR_X-.040,y:y0+.745,z:z,mat:hwM,tile:1,to:g});
    // 下部の換気ガラリ
    for(let i=0;i<4;i++)
      box({w:.018,h:.020,d:.46,x:DOOR_X-.034,y:y0+.14+i*.045,z:z,mat:slotM,tile:1,to:g});
    // 部屋番号（上枠の脇）
    if(num){
      const pl=new THREE.Mesh(new THREE.PlaneGeometry(.30,.15),
        unlit(0xffffff,{map:TEX.sign(num,{size:88,bg:"#23272c",fg:"#d8d4c8",w:512,h:256})}));
      pl.position.set(DOOR_X-.06,y0+1.86,z-.36);pl.rotation.y=-Math.PI/2;g.add(pl);
    }
    return d;
  }
  const d101=aptDoor(2.2,0,"101");
  aptDoor(-.4,0,"102");
  aptDoor(4.4,3.05,"201");
  aptDoor(1.8,3.05,"202");
  // メーターボックス（各戸の脇）
  [2.2,-.4].forEach(z=>box({w:.16,h:.42,d:.30,x:4.02,y:1.30,z:z+.68,mat:MAT.metalD,tile:1,to:g}));
  // 廊下の常夜灯
  [0.2,4.4].forEach(z=>{
    const b=new THREE.Mesh(new THREE.SphereGeometry(.12,8,6),unlit(0xffe6bd));
    b.position.set(3.75,2.55,z);g.add(b);
    glow({x:3.75,y:2.55,z:z,s:1.9,color:0xffdca8,op:.4,to:g});
    addPointSpec(3.9,2.5,z,{color:0xffdca8,inten:1.5,dist:8});
  });
  // 集合ポスト（外廊下の下）＆自転車
  box({w:.3,h:1.1,d:1.4,x:3.78,y:0,z:-1.7,mat:MAT.metalD,tile:1,to:g});
  bicycle(2.98,6.0,-.15);
  // アパート名の板
  const nm=new THREE.Mesh(new THREE.PlaneGeometry(2.2,.5),
    unlit(0xffffff,{map:TEX.sign("コーポひなた",{size:72,bg:"#3b3f45",fg:"#cfcabc",w:512,h:128})}));
  nm.position.set(4.07,5.28,2.0);nm.rotation.y=-Math.PI/2;g.add(nm);

  G.apt={group:g,door:d101,doorPos:new THREE.Vector3(3.98,1.10,2.2)};
}

/* ============================ 小物 ============================ */
function bicycle(x,z,ry){
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=ry||0;scOut.add(g);
  const m=plain(0x2b2e33,{rough:.7,metal:.4});
  [[-.5],[.5]].forEach(a=>{
    const w=new THREE.Mesh(new THREE.TorusGeometry(.32,.022,5,16),m);
    w.position.set(0,.33,a[0]);w.rotation.y=Math.PI/2;g.add(w);
  });
  box({w:.05,h:.05,d:.95,x:0,y:.55,z:0,mat:m,tile:1,to:g});
  box({w:.04,h:.4,d:.04,x:0,y:.55,z:-.42,mat:m,tile:1,to:g});
  box({w:.4,h:.04,d:.04,x:0,y:.95,z:-.42,mat:m,tile:1,to:g});
  box({w:.16,h:.05,d:.26,x:0,y:.78,z:.36,mat:MAT.darker,tile:1,to:g});
  addSolid(x,z,.6,1.2,ry||0,SOLID.out);
  if(G.bikes)G.bikes.push(g);
  return g;
}
function keiCar(x,z,ry,col){
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=ry||0;scOut.add(g);
  const body=plain(col||0x5c6168,{rough:.42,metal:.5});
  box({w:1.5,h:.85,d:3.3,x:0,y:.32,z:0,mat:body,tile:2,to:g});
  box({w:1.42,h:.72,d:1.9,x:0,y:1.17,z:-.15,mat:MAT.winDark,tile:2,to:g});
  const wm=plain(0x121316,{rough:.95});
  [[-.72,1.1],[.72,1.1],[-.72,-1.1],[.72,-1.1]].forEach(w=>{
    cyl({rt:.29,h:.18,x:w[0],y:.29,z:w[1],mat:wm,seg:10,rz:Math.PI/2,center:true,to:g});
  });
  // テールランプ
  [[-.5],[.5]].forEach(a=>box({w:.22,h:.12,d:.05,x:a[0],y:.85,z:1.66,mat:unlit(0x5a1512),tile:1,to:g}));
  addSolid(x,z,1.7,3.5,ry||0,SOLID.out);
  return g;
}
function scatterProps(){
  keiCar(6.2,-24,0,0x4a5560);
  keiCar(-6.6,-58,.06,0x6a6255);
  keiCar(6.4,-96,.02,0x3f4348);
  // コンビニ前の駐車場は空にしておく（深夜2時、客はいない）
  bicycle(-3.35,-31,.3);
  bicycle(3.05,-77,-.2);
  bicycle(-3.1,-104,.15);
  // ブロック塀の上の物
  box({w:.4,h:.5,d:.4,x:3.0,y:1.7,z:-52,mat:plain(0x4e5a4a,{rough:1}),tile:1,to:scOut});
  // 青いシートを被せた何か
  box({w:1.6,h:1.0,d:2.4,x:-5.4,y:0,z:-38,mat:MAT.blue,tile:1.4,to:scOut});
  // 物置
  box({w:1.8,h:2.0,d:1.2,x:6.0,y:0,z:-46,mat:MAT.tin,tile:1.2,solid:true,to:scOut});
  /* 飛び出し注意の立て看板。板は両面、支柱2本と控えの足を付ける */
  (function(){
    const sg=new THREE.Group();
    sg.position.set(-3.02,0,-64);sg.rotation.y=Math.PI/2;scOut.add(sg);
    const postM=plain(0x5b5f63,{rough:.7,metal:.35});
    [-.21,.21].forEach(dx=>{
      cyl({rt:.022,h:1.44,x:dx,y:0,z:0,mat:postM,seg:6,to:sg});
      cyl({rt:.05,rb:.06,h:.06,x:dx,y:0,z:0,mat:plain(0x4a4a46,{rough:.95}),seg:8,to:sg});
    });
    // 板（枠付き・両面）
    box({w:.56,h:.78,d:.035,x:0,y:.66,z:0,mat:plain(0x2a2c30,{rough:.8}),tile:1,to:sg});
    const tex=TEX.kidsSign();
    [[.026,0],[-.026,Math.PI]].forEach(a=>{
      const pl=new THREE.Mesh(new THREE.PlaneGeometry(.52,.74),unlit(0xffffff,{map:tex}));
      pl.position.set(0,1.05,a[0]);pl.rotation.y=a[1];sg.add(pl);
    });
    // 上下の桟
    box({w:.60,h:.035,d:.06,x:0,y:1.43,z:0,mat:postM,tile:1,to:sg});
    box({w:.60,h:.035,d:.06,x:0,y:.65,z:0,mat:postM,tile:1,to:sg});
    addSolid(-3.02,-64,.16,.62,0,SOLID.out);
  })();
}
