/* =========================================================================
   5. 室内 — 同じ間取りから2部屋。roomB は左右反転（最終盤で使う）
   ========================================================================= */
function buildRoom(ox,oz,mirror){
  const S=scIn;
  const M=mirror?-1:1;
  const X=v=>ox+M*v, Z=v=>oz+v, RY=v=>M*(v||0);
  const list=SOLID.in;
  const g=new THREE.Group();S.add(g);
  const R={mirror:!!mirror,ox:ox,oz:oz,group:g,anim:[]};

  const put=o=>{o.x=X(o.x||0);o.z=Z(o.z||0);o.ry=RY(o.ry);o.to=o.to||g;
                if(o.solid){o.list=list;} return box(o);};
  const pl=o=>{o.x=X(o.x||0);o.z=Z(o.z||0);if(o.ry!=null)o.ry=RY(o.ry);o.to=o.to||g;return plane(o);};
  const cy=o=>{o.x=X(o.x||0);o.z=Z(o.z||0);o.to=o.to||g;return cyl(o);};

  const H=2.42;                       // 天井高
  /* ---- 床 ---- */
  pl({w:5.4,h:3.4,x:0,y:.06,z:-.9,mat:MAT.tatami,tile:.9});         // 6畳
  pl({w:5.4,h:2.2,x:0,y:.06,z:1.9,mat:MAT.wood,tile:1.1});          // 台所・廊下
  pl({w:2.0,h:.85,x:0,y:0,z:3.45,mat:MAT.gutter,tile:.8});          // 玄関土間
  /* ---- 天井 ---- */
  pl({w:6.2,h:6.8,x:0,y:H,z:.6,mat:plain(0xa39c90,{rough:.98}),tile:2,rx:Math.PI/2});
  /* ---- 壁 ---- */
  const wm=plain(0x9c958a,{rough:.97});
  put({w:.12,h:H,d:6.8,x:-2.76,y:0,z:.6,mat:wm,tile:2,solid:true});   // 西
  put({w:.12,h:H,d:6.8,x: 2.76,y:0,z:.6,mat:wm,tile:2,solid:true});   // 東
  put({w:5.7,h:H,d:.12,x:0,y:0,z:-2.66,mat:wm,tile:2,solid:true});    // 南（窓側）
  put({w:1.85,h:H,d:.12,x:-1.93,y:0,z:3.88,mat:wm,tile:2,solid:true});// 北（玄関脇）
  put({w:1.85,h:H,d:.12,x: 1.93,y:0,z:3.88,mat:wm,tile:2,solid:true});
  // 巾木
  put({w:5.6,h:.07,d:.04,x:0,y:0,z:-2.58,mat:MAT.dark,tile:1});

  /* ---- 窓（南） ---- */
  const win=new THREE.Mesh(new THREE.PlaneGeometry(2.5,1.25),
    plain(0x0c1220,{rough:.28,metal:.32}));
  win.position.set(X(0),1.35,Z(-2.59));g.add(win);
  const sash=plain(0x8d8a82,{rough:.7});
  put({w:2.7,h:.06,d:.06,x:0,y:.68,z:-2.58,mat:sash,tile:1});
  put({w:2.7,h:.06,d:.06,x:0,y:1.99,z:-2.58,mat:sash,tile:1});
  put({w:.05,h:1.31,d:.05,x:0,y:.7,z:-2.58,mat:sash,tile:1});
  // 外の月明かりが窓から
  const winGlow=glow({x:X(0),y:1.35,z:Z(-2.62),s:4.2,sy:2.6,color:0x9fb6dd,op:.16,to:g});
  const winLight=new THREE.PointLight(0x8ba4cc,.55,7,1.8);
  winLight.position.set(X(0),1.5,Z(-2.2));g.add(winLight);
  // カーテン（半分開き）
  put({w:.9,h:1.6,d:.05,x:-1.05,y:.62,z:-2.5,mat:MAT.curtain,tile:1});
  put({w:.9,h:1.6,d:.05,x: 1.05,y:.62,z:-2.5,mat:MAT.curtain,tile:1});

  /* ---- 押し入れ（西壁） ----
     間口 z:-2.25〜-0.35。襖は2枚を別の溝に入れて閉め切る（隙間を作らない）。
     開ける時は手前の1枚を奥の1枚に重ねて、片側だけを開ける。 */
  const closet=new THREE.Group();g.add(closet);
  const OP0=-2.27,OP1=-0.33,OPC=(OP0+OP1)/2;      // 間口
  const PW=1.01;                                   // 襖1枚の幅
  // 中の闇
  put({w:.48,h:1.86,d:OP1-OP0,x:-2.46,y:.06,z:OPC,mat:plain(0x07080a,{rough:1}),tile:1,to:closet});
  // 中段（押し入れの棚板）
  put({w:.46,h:.035,d:OP1-OP0-.04,x:-2.46,y:.90,z:OPC,mat:plain(0x0e1012,{rough:1}),tile:1,to:closet});
  // 鴨居と敷居
  put({w:.14,h:.09,d:OP1-OP0+.10,x:-2.16,y:1.90,z:OPC,mat:plain(0x4a3f31,{rough:.85}),tile:1,to:closet});
  put({w:.14,h:.035,d:OP1-OP0+.10,x:-2.16,y:.055,z:OPC,mat:plain(0x4a3f31,{rough:.85}),tile:1,to:closet});
  // 襖2枚
  const paperM=plain(0xc9c2b0,{rough:.97});
  const edgeM =plain(0x3b332a,{rough:.9});
  const pullM =plain(0x1b1d20,{rough:.6,metal:.3});
  const ringM =plain(0x8f7a4e,{rough:.42,metal:.75});
  const fus=[];
  // 手前の1枚（i=0＝roomBで見て左の襖）は開ける時に右へ滑る。引手が合わせ目にあると
  // 開いた後も残った襖の左端に来て、開口部と隣り合ってしまうので、こちらだけ左端(-1)へ寄せる。
  [[-2.128,OP0+PW/2,-1],[-2.196,OP1-PW/2,-1]].forEach((a,i)=>{
    const px=X(a[0]),pz=Z(a[1]),lead=a[2];        // lead: 引手を寄せる向き
    const f=new THREE.Group();
    f.position.set(px,0,pz);closet.add(f);
    // 紙面
    const pane=new THREE.Mesh(new THREE.BoxGeometry(.030,1.78,PW-.06),paperM);
    pane.position.set(0,.98,0);pane.castShadow=true;pane.receiveShadow=true;f.add(pane);
    // 縁（上下左右）
    const eg=(w,h,d,y,z)=>{
      const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),edgeM);
      m.position.set(0,y,z);m.castShadow=true;f.add(m);
    };
    eg(.038,.05,PW,1.865,0); eg(.038,.05,PW,.095,0);
    eg(.038,1.82,.05,.98,-PW/2+.025); eg(.038,1.82,.05,.98,PW/2-.025);
    // 引手（丸型の掘り込み＋金の縁）
    const pz2=lead>0?(PW/2-.13):(-PW/2+.13);
    const cup=new THREE.Mesh(new THREE.CylinderGeometry(.043,.043,.014,14),pullM);
    cup.position.set(M*.013,1.00,pz2);cup.rotation.z=Math.PI/2;f.add(cup);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(.046,.006,6,16),ringM);
    rim.position.set(M*.020,1.00,pz2);rim.rotation.y=Math.PI/2;f.add(rim);
    f.userData.baseZ=pz;
    fus.push(f);
  });
  addSolidRect(X(-2.70),Z(OP0-.10),X(-2.10),Z(OP1+.10),list);
  R.fusuma=fus;
  R.closetPos=new THREE.Vector3(X(-2.10),1.1,Z(OPC));
  R.closetOpenZ=Z(OP0+PW/2);        // 開けた時に現れる側の中心

  /* ---- 冷蔵庫 ----
     箱を1つ置くのではなく、外板5枚＋内張り（BackSideの箱＝内側の面だけが見える）で
     本当に空洞を作る。扉を開けると中の棚とドアポケットが見える。 */
  const fr=new THREE.Group();g.add(fr);
  const frx=-2.15,frz=1.55;
  const bodyM =plain(0xbfbcb4,{rough:.40,metal:.28});
  const linerM=plain(0xdedbd2,{rough:.62,side:THREE.BackSide});
  const shelfM=plain(0xd6d8d4,{rough:.30,metal:.05,op:.86});
  const hwM   =plain(0x8f8b82,{rough:.42,metal:.55});
  // 外板（前面だけ開けておく）
  put({w:.05,h:1.45,d:.62,x:frx-.285,y:.06,z:frz     ,mat:bodyM,tile:1,to:fr});   // 背
  put({w:.62,h:1.45,d:.05,x:frx     ,y:.06,z:frz-.285,mat:bodyM,tile:1,to:fr});   // 側
  put({w:.62,h:1.45,d:.05,x:frx     ,y:.06,z:frz+.285,mat:bodyM,tile:1,to:fr});   // 側
  put({w:.62,h:.05 ,d:.62,x:frx     ,y:1.46,z:frz    ,mat:bodyM,tile:1,to:fr});   // 天
  put({w:.62,h:.07 ,d:.62,x:frx     ,y:.06 ,z:frz    ,mat:bodyM,tile:1,to:fr});   // 底
  // 内張り（この箱の内面だけが見える＝空洞）
  put({w:.58,h:1.33,d:.54,x:frx+.04,y:.13,z:frz,mat:linerM,tile:1,cast:false,to:fr});
  addSolid(X(frx),Z(frz),.64,.64,0,list);
  // 棚と野菜室
  [.62,.95,1.24].forEach(sy=>
    put({w:.50,h:.016,d:.50,x:frx+.02,y:sy,z:frz,mat:shelfM,tile:1,to:fr}));
  put({w:.50,h:.34,d:.50,x:frx+.02,y:.16,z:frz,mat:plain(0xcfd2ce,{rough:.4,op:.9}),tile:1,to:fr});
  put({w:.02,h:.05,d:.22,x:frx+.28,y:.34,z:frz,mat:hwM,tile:1,to:fr});   // 引き出しの取っ手
  // 庫内灯
  put({w:.06,h:.05,d:.20,x:frx-.20,y:1.36,z:frz,mat:plain(0xf6f2e6,{rough:.6}),tile:1,to:fr});

  // 扉（ヒンジは前面の手前側の縁）
  const hinge=new THREE.Group();
  hinge.position.set(X(frx)+M*.32,0,Z(frz-.31));
  fr.add(hinge);
  const frDoor=new THREE.Mesh(new THREE.BoxGeometry(.055,1.34,.62),
    plain(0xc6c3ba,{rough:.38,metal:.28}));
  frDoor.position.set(0,.74,.31);frDoor.castShadow=true;hinge.add(frDoor);
  // 扉の内側：ドアポケット
  [.42,.78].forEach(py=>{
    const pk=new THREE.Mesh(new THREE.BoxGeometry(.085,.016,.52),shelfM);
    pk.position.set(-M*.068,py,.31);hinge.add(pk);
    const lip=new THREE.Mesh(new THREE.BoxGeometry(.012,.085,.52),shelfM);
    lip.position.set(-M*.108,py+.042,.31);hinge.add(lip);
  });
  // ぽつんと残った調味料
  const btl=new THREE.Mesh(new THREE.CylinderGeometry(.026,.026,.17,10),
    plain(0x3a2a16,{rough:.32}));
  btl.position.set(-M*.068,.51,.20);hinge.add(btl);
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(.017,.017,.03,10),
    plain(0x1e2a44,{rough:.5}));
  cap.position.set(-M*.068,.605,.20);hinge.add(cap);
  // 扉の取っ手（縦バー）
  const hb=new THREE.Mesh(new THREE.BoxGeometry(.045,.36,.042),hwM);
  hb.position.set(M*.052,.98,.555);hinge.add(hb);
  [.82,1.14].forEach(py=>{
    const st=new THREE.Mesh(new THREE.BoxGeometry(.032,.032,.042),hwM);
    st.position.set(M*.030,py,.555);hinge.add(st);
  });
  // 扉のメモ（マグネット留め）
  const memo=new THREE.Mesh(new THREE.PlaneGeometry(.11,.15),
    plain(0xe8e4d6,{rough:.9,side:THREE.DoubleSide}));
  memo.position.set(M*.030,1.16,.16);memo.rotation.y=M>0?Math.PI/2:-Math.PI/2;hinge.add(memo);

  const frLight=new THREE.PointLight(0xfff2d8,0,2.2,1.5);
  frLight.position.set(X(frx)+M*.06,1.28,Z(frz));g.add(frLight);
  const frGlow=glow({x:X(frx)+M*.44,y:1.00,z:Z(frz),s:1.7,color:0xfff0d2,op:0,to:g});
  R.fridge={group:fr,hinge:hinge,door:frDoor,light:frLight,glow:frGlow,open:0,dir:M,
    pos:new THREE.Vector3(X(frx)+M*.62,1.1,Z(frz))};

  /* ---- 流し台・コンロ ---- */
  put({w:.62,h:.85,d:1.7,x:2.4,y:.06,z:1.9,mat:plain(0xb4b0a6,{rough:.55,metal:.2}),tile:1,solid:true});
  put({w:.5,h:.04,d:.5,x:2.4,y:.91,z:1.5,mat:plain(0x9aa0a4,{rough:.3,metal:.7}),tile:1});
  cy({rt:.02,h:.28,x:2.6,y:.91,z:1.5,mat:plain(0x8d9298,{metal:.8,rough:.3}),seg:6});
  put({w:.62,h:1.0,d:1.7,x:2.4,y:1.42,z:1.9,mat:plain(0xa8a49a,{rough:.9}),tile:1});

  /* ---- ちゃぶ台 ---- */
  const tbl=new THREE.Group();g.add(tbl);
  const top=new THREE.Mesh(new THREE.CylinderGeometry(.46,.46,.045,20),
    plain(0x6b5540,{rough:.55}));
  top.position.set(X(-.85),.38,Z(-.5));top.castShadow=true;tbl.add(top);
  for(let i=0;i<4;i++){
    const a=i*Math.PI/2+.4;
    cy({rt:.024,h:.36,x:-.85+Math.cos(a)*.33,y:.06,z:-.5+Math.sin(a)*.33,
      mat:plain(0x5a4634,{rough:.7}),seg:6,to:tbl});
  }
  addSolid(X(-.85),Z(-.5),.9,.9,0,list);
  R.tablePos=new THREE.Vector3(X(-.85),.4,Z(-.5));
  // 湯呑みとリモコン
  cy({rt:.038,h:.075,x:-.68,y:.4,z:-.62,mat:plain(0xcfc9bb,{rough:.5}),seg:10,to:tbl});
  put({w:.05,h:.02,d:.16,x:-1.02,y:.4,z:-.4,mat:MAT.darker,tile:1,to:tbl});

  /* ---- 布団 ---- 角の丸い形にして、箱に見えないようにする */
  const fut=new THREE.Group();g.add(fut);
  const shikiM=plain(0x9c968a,{rough:.98});
  const kakeM =plain(0x515865,{rough:.99});
  const makuM =plain(0xc8c3b6,{rough:.98});
  // 敷布団はほぼ平ら、角だけ丸める
  roundedBox({w:1.06,h:.10,d:2.02,e:.22,seg:20,x:X(1.35),y:.06,z:Z(-1.20),mat:shikiM,to:fut});
  // 掛け布団（薄く、少しずれて掛かっている）
  const kake=roundedBox({w:1.04,h:.17,d:1.32,e:.30,seg:22,
    x:X(1.33),y:.14,z:Z(-1.55),mat:kakeM,to:fut});
  kake.rotation.y=RY(.03);
  // めくれた折り返し
  const turn=roundedBox({w:1.02,h:.07,d:.28,e:.36,seg:16,
    x:X(1.33),y:.28,z:Z(-.99),mat:makuM,to:fut});
  turn.rotation.x=-.14;
  // 枕
  roundedBox({w:.50,h:.13,d:.29,e:.50,seg:18,x:X(1.35),y:.15,z:Z(-.36),mat:makuM,to:fut});
  R.futonPos=new THREE.Vector3(X(1.35),.3,Z(-1.2));

  /* ---- テレビ台まわり ----
     テレビ本体・脚・台・ゲーム機・ルーター・電源タップ・配線まで置く。 */
  const boardM=plain(0x53483a,{rough:.72});
  const tvM   =plain(0x24272b,{rough:.55,metal:.25});
  // テレビ台（引き出し2つ）※押し入れと重ならないよう東の壁側に置く
  put({w:.42,h:.40,d:1.05,x:2.42,y:.06,z:-1.75,mat:boardM,tile:1,solid:true});
  put({w:.44,h:.035,d:1.09,x:2.42,y:.46,z:-1.75,mat:plain(0x6a5b48,{rough:.6}),tile:1});
  [-.27,.27].forEach(dz=>{
    put({w:.02,h:.24,d:.46,x:2.20,y:.11,z:-1.75+dz,mat:plain(0x463c30,{rough:.8}),tile:1});
    put({w:.03,h:.022,d:.16,x:2.19,y:.24,z:-1.75+dz,
      mat:plain(0x8f8b82,{rough:.4,metal:.6}),tile:1});          // 取っ手
  });
  // テレビ（枠・首・台座・画面）
  put({w:.055,h:.44,d:.76,x:2.40,y:.66,z:-1.75,mat:tvM,tile:1});
  put({w:.05 ,h:.06,d:.10,x:2.40,y:.50,z:-1.75,mat:tvM,tile:1});   // 首
  put({w:.30 ,h:.022,d:.34,x:2.36,y:.495,z:-1.75,mat:tvM,tile:1}); // 台座
  const tv=new THREE.Mesh(new THREE.PlaneGeometry(.70,.40),
    plain(0x0a0c10,{rough:.06,metal:.55}));
  tv.position.set(X(2.368),.665,Z(-1.75));tv.rotation.y=RY(-Math.PI/2);g.add(tv);
  // 待機ランプ
  put({w:.012,h:.012,d:.012,x:2.372,y:.455,z:-2.05,
    mat:plain(0x220806,{em:0x8a1208,ei:1.2,rough:.4}),tile:1});
  // ゲーム機とルーター
  put({w:.22,h:.045,d:.30,x:2.36,y:.495,z:-1.32,mat:plain(0x2b2f34,{rough:.5}),tile:1});
  put({w:.10,h:.16,d:.13,x:2.38,y:.495,z:-2.16,mat:plain(0x33383d,{rough:.6}),tile:1});
  [.53,.57].forEach(y=>put({w:.008,h:.01,d:.01,x:2.33,y:y,z:-2.16,
    mat:plain(0x0a2208,{em:0x3fa02a,ei:1.4,rough:.4}),tile:1}));
  // 電源タップと配線
  put({w:.07,h:.03,d:.24,x:2.52,y:.02,z:-2.10,mat:plain(0xd6d2c8,{rough:.7}),tile:1});
  cy({rt:.006,h:.55,x:2.52,y:.05,z:-1.96,mat:plain(0x1a1c20,{rough:.9}),seg:5,rx:1.35});

  /* ---- 時計・カレンダー ---- */
  const clock=new THREE.Mesh(new THREE.CircleGeometry(.19,24),
    unlit(0xffffff,{map:TEX.clockFace(mirror)}));
  clock.position.set(X(2.68),1.92,Z(.1));clock.rotation.y=RY(-Math.PI/2);g.add(clock);
  const cal=new THREE.Mesh(new THREE.PlaneGeometry(.4,.53),
    unlit(0xffffff,{map:TEX.calendar(mirror)}));
  // 吊戸棚（x2.09〜2.71 / y1.42〜2.42 / z1.05〜2.75）の中に埋まっていたので、時計の真下へ移した
  cal.position.set(X(2.68),1.35,Z(.1));cal.rotation.y=RY(-Math.PI/2);g.add(cal);
  R.clock=clock;

  /* ---- 玄関 ---- */
  const dHinge=new THREE.Group();
  dHinge.position.set(X(-.45),0,Z(3.88));g.add(dHinge);
  const door=new THREE.Mesh(new THREE.BoxGeometry(.9,2.0,.07),
    plain(0x3f4750,{rough:.7,metal:.25}));
  door.position.set(M*.45,1.0,0);door.castShadow=true;dHinge.add(door);
  cy({rt:.02,h:.11,x:.28,y:1.05,z:3.8,mat:plain(0x8a8578,{metal:.7,rough:.5}),rx:Math.PI/2});
  put({w:2.1,h:.1,d:.14,x:0,y:2.0,z:3.86,mat:MAT.dark,tile:1});
  R.door={hinge:dHinge,mesh:door,open:0,pos:new THREE.Vector3(X(0),1.1,Z(3.6))};
  // 靴
  put({w:.24,h:.09,d:.32,x:-.4,y:0,z:3.4,mat:plain(0x2e2a26,{rough:.95}),tile:1});
  put({w:.24,h:.09,d:.32,x:-.05,y:0,z:3.42,mat:plain(0x2e2a26,{rough:.95}),tile:1});
  // 上がり框
  put({w:2.0,h:.08,d:.06,x:0,y:0,z:3.02,mat:MAT.wood,tile:1});

  /* ---- 天井灯 ---- */
  const shade=new THREE.Mesh(new THREE.CylinderGeometry(.34,.42,.26,16,1,true),
    plain(0xd9d3c4,{rough:.9,side:THREE.DoubleSide}));
  shade.position.set(X(0),H-.22,Z(-.9));g.add(shade);
  cy({rt:.012,h:.2,x:0,y:H-.2,z:-.9,mat:MAT.dark,seg:5});
  const bulbP=new THREE.Mesh(new THREE.CircleGeometry(.33,16),unlit(0x3a3630));
  bulbP.rotation.x=Math.PI/2;bulbP.position.set(X(0),H-.35,Z(-.9));g.add(bulbP);
  const ceilL=new THREE.PointLight(0xffdcae,0,9,1.5);
  ceilL.position.set(X(0),H-.4,Z(-.9));g.add(ceilL);
  // 引き紐
  const cord=cy({rt:.006,h:.55,x:.22,y:H-.75,z:-.9,mat:plain(0xcfc8b8),seg:4});
  R.light={pt:ceilL,panel:bulbP,on:false,
    cordPos:new THREE.Vector3(X(.22),1.5,Z(-.9))};
  R.winLight=winLight;R.winGlow=winGlow;

  /* ---- roomB 専用の小道具 ---- */
  if(mirror){
    const wrap=new THREE.Mesh(new THREE.PlaneGeometry(.17,.12),
      plain(0xd8d4c6,{rough:.6,side:THREE.DoubleSide}));
    wrap.rotation.x=-Math.PI/2+.1;
    wrap.position.set(X(-.95),.405,Z(-.42));wrap.visible=true;g.add(wrap);
    const rec=new THREE.Mesh(new THREE.PlaneGeometry(.07,.19),
      plain(0xe6e3d8,{rough:.7,side:THREE.DoubleSide}));
    rec.rotation.x=-Math.PI/2;rec.rotation.z=.5;
    rec.position.set(X(-.72),.404,Z(-.34));g.add(rec);
    R.wrapper=wrap;
  }

  // 部屋の外周（念のため）
  addSolidRect(X(-3.0),Z(-2.8),X(-2.6),Z(4.0),list);
  addSolidRect(X(2.6),Z(-2.8),X(3.0),Z(4.0),list);
  addSolidRect(X(-3.0),Z(-2.85),X(3.0),Z(-2.6),list);
  addSolidRect(X(-3.0),Z(3.85),X(3.0),Z(4.05),list);
  return R;
}

function buildInteriors(){
  solidTarget=SOLID.in;
  scIn.add(new THREE.HemisphereLight(0x121a2a,0x05060a,.16));
  G.roomA=buildRoom(0,0,false);
  G.roomB=buildRoom(0,-40,true);
  G.roomB.group.visible=false;
  G.roomB.winLight.intensity=0;
  solidTarget=SOLID.out;
}

/* =========================================================================
   自販機の内側（最終カット）
   「いま自分が自販機の中にいる」と一目で分かるように、
   ・見本の缶を裏側から見た列
   ・裏返しになった「いつでも つめたい」の文字
   ・窓枠と取り出し口の内側
   を手前に置いて、外の夜道を四角い窓ごしに見せる。
   ========================================================================= */
function buildInsideVend(){
  const p=LOC.vend;
  const g=new THREE.Group();
  g.position.set(p.x+.30,0,p.z+1.0);
  g.visible=false;scOut.add(g);

  const frame=plain(0x0a0b0d,{rough:1});
  const inner=plain(0x191d22,{rough:.85,metal:.2});
  const canM =plain(0x05060a,{rough:.9});

  /* 箱の中にいる感じを出すため、左右・上下・背面を近くで囲む。
     外は正面の細い窓からしか見えない。 */
  box({w:.86,h:2.0,d:.10,x:.02,y:0   ,z:-.62,mat:inner,tile:1,to:g});   // 内側の左壁
  box({w:.86,h:2.0,d:.10,x:.02,y:0   ,z: .62,mat:inner,tile:1,to:g});   // 内側の右壁
  box({w:.86,h:.12,d:1.34,x:.02,y:1.86,z:0  ,mat:inner,tile:1,to:g});   // 天井
  box({w:.86,h:.10,d:1.34,x:.02,y:.02,z:0   ,mat:inner,tile:1,to:g});   // 床
  box({w:.10,h:2.0,d:1.34,x:-.36,y:0 ,z:0   ,mat:plain(0x101317,{rough:.95}),tile:1,to:g}); // 背面
  // 窓枠
  box({w:.07,h:2.0,d:.16,x:.40,y:0   ,z:-.60,mat:frame,tile:1,to:g});
  box({w:.07,h:2.0,d:.16,x:.40,y:0   ,z: .60,mat:frame,tile:1,to:g});
  box({w:.07,h:.46,d:1.30,x:.40,y:1.52,z:0  ,mat:frame,tile:1,to:g});
  box({w:.07,h:.44,d:1.30,x:.40,y:.30 ,z:0  ,mat:frame,tile:1,to:g});
  box({w:.16,h:.10,d:1.30,x:.30,y:1.50,z:0,mat:inner,tile:1,to:g});
  box({w:.16,h:.10,d:1.30,x:.30,y:.66 ,z:0,mat:inner,tile:1,to:g});
  // 内部の縦フレーム（商品コラムの仕切り）
  [-.44,.44].forEach(z=>
    box({w:.05,h:1.20,d:.05,x:.14,y:.60,z:z,mat:plain(0x1f242a,{rough:.8}),tile:1,to:g}));

  // ガラス（内側から見た曇り）
  const glass=new THREE.Mesh(new THREE.PlaneGeometry(1.60,1.00),
    new THREE.MeshStandardMaterial({color:0xaecbe0,transparent:true,opacity:.09,
      roughness:.26,metalness:.2,side:THREE.DoubleSide,depthWrite:false}));
  glass.position.set(.40,1.08,0);glass.rotation.y=-Math.PI/2;g.add(glass);

  /* 見本の缶を裏側から見た列。
     目線の高さ(y≈1.12)の前後は空けて、外の道が四角く見えるようにする。 */
  [.56,1.72].forEach(y=>{
    box({w:.26,h:.02,d:1.30,x:.26,y:y-.07,z:0,mat:canM,tile:1,to:g});   // 棚板
    for(let i=0;i<9;i++)
      cyl({rt:.033,h:.125,x:.26,y:y,z:-.52+i*.13,mat:canM,seg:9,rz:Math.PI/2,center:true,to:g});
    box({w:.02,h:.045,d:1.30,x:.30,y:y-.12,z:0,mat:plain(0x2a2f35,{rough:.8}),tile:1,to:g});
  });

  /* 裏返しになった上部の看板。これが一番はっきりした手がかりになる */
  const revTex=TEX.sign("いつでも つめたい",{size:52,bg:"#3a1416",fg:"#c4a0a2",w:1024,h:256});
  revTex.wrapS=THREE.RepeatWrapping;revTex.repeat.x=-1;revTex.offset.x=1;
  const revSign=new THREE.Mesh(new THREE.PlaneGeometry(1.22,.19),
    unlit(0xffffff,{map:revTex,side:THREE.DoubleSide}));
  revSign.position.set(.35,1.42,0);revSign.rotation.y=-Math.PI/2;g.add(revSign);

  /* 取り出し口の内側（足元の暗がり） */
  box({w:.30,h:.30,d:.70,x:.18,y:.02,z:-.06,mat:plain(0x030405,{rough:1}),tile:1,to:g});
  box({w:.05,h:.04,d:.72,x:.34,y:.30,z:-.06,mat:inner,tile:1,to:g});

  /* 硬貨機構の箱（横） */
  box({w:.22,h:.62,d:.20,x:.08,y:.72,z:.62,mat:inner,tile:1,to:g});
  box({w:.24,h:.06,d:.22,x:.08,y:1.34,z:.62,mat:plain(0x2d3238,{rough:.7}),tile:1,to:g});

  /* 内側のかすかな照明（機械は死んでいるので、ごく弱く） */
  const L=new THREE.PointLight(0x9fc4e0,1.05,2.6,1.6);
  L.position.set(.02,1.50,0);g.add(L);
  G.insideVend={group:g,light:L,
    camPos:new THREE.Vector3(p.x+.10,1.12,p.z+1.0)};

  /* -----------------------------------------------------------------
     最後に前を通り過ぎる人影。ただの通行人で、こちらには気づかない。
     膝と肘を持たせて、歩き方でそれと分かるようにする。
     ----------------------------------------------------------------- */
  const w=new THREE.Group();
  w.visible=false;scOut.add(w);
  /* 深夜にコンビニへ行くときの、ラフな格好。
     逆光でほぼ影になるが、光が当たったときに服だと分かる程度の色を持たせる。 */
  const hoodM =plain(0x2a2f36,{rough:.95});   // パーカー
  const pantM =plain(0x33373d,{rough:.95});   // スウェット
  const shoeM =plain(0x5d636b,{rough:.75});   // スニーカー
  const soleM =plain(0x8f959c,{rough:.7});
  const skinM =plain(0x6a5346,{rough:.85});   // 肌
  const hairM =plain(0x16171a,{rough:1});
  const bagM  =plain(0xb9bcb8,{rough:.72,op:.94});
  const rb=(ww,hh,dd,e,x,y,z,par,mat)=>{
    const m=new THREE.Mesh(roundedBoxGeo(ww,hh,dd,e,14),mat||hoodM);
    m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=false;
    par.add(m);return m;
  };
  const hips=new THREE.Group();hips.position.set(0,.88,0);w.add(hips);
  rb(.36,.22,.24,.5,0,.03,0,hips,hoodM);                  // 腰（パーカーの裾）
  const torso=rb(.40,.58,.26,.5,0,.33,0,hips,hoodM);      // 胴（少しゆったり）
  torso.rotation.x=.05;
  rb(.41,.05,.27,.5,0,.05,0,hips,plain(0x22262b,{rough:.95}));  // 裾のリブ
  const sh=new THREE.Group();sh.position.set(0,.56,0);hips.add(sh);
  rb(.44,.16,.25,.45,0,.03,0,sh,hoodM);                   // 肩
  rb(.32,.15,.20,.6,0,.09,-.10,sh,hoodM);                 // 首の後ろのフード
  rb(.10,.10,.10,.7,0,.12,.01,sh,skinM);                  // 首
  rb(.20,.245,.21,.7,0,.27,.005,sh,skinM);                // 頭
  rb(.215,.15,.20,.75,0,.335,-.015,sh,hairM);             // 髪
  const arms=[],legs=[];
  [-1,1].forEach(sd=>{
    const pv=new THREE.Group();pv.position.set(sd*.225,.02,0);sh.add(pv);
    rb(.115,.115,.12,.8,0,0,0,pv,hoodM);                  // 肩
    rb(.108,.31,.118,.55,0,-.155,0,pv,hoodM);             // 二の腕（袖）
    const el=new THREE.Group();el.position.set(0,-.30,0);pv.add(el);
    rb(.104,.104,.108,.8,0,0,0,el,hoodM);                 // 肘
    rb(.096,.26,.104,.55,0,-.13,0,el,hoodM);              // 前腕（袖）
    rb(.088,.05,.096,.7,0,-.255,0,el,plain(0x22262b,{rough:.95}));  // 袖口
    const hand=rb(.075,.11,.070,.75,0,-.325,.01,el,skinM);
    arms.push({pivot:pv,elbow:el,hand:hand});
  });
  [-1,1].forEach(sd=>{
    const pv=new THREE.Group();pv.position.set(sd*.102,-.02,0);hips.add(pv);
    rb(.16,.16,.175,.8,0,0,0,pv,pantM);                   // 股関節
    rb(.152,.47,.178,.5,0,-.235,0,pv,pantM);              // 太もも（ゆったり）
    const kn=new THREE.Group();kn.position.set(0,-.45,0);pv.add(kn);
    rb(.142,.142,.163,.8,0,0,0,kn,pantM);                 // 膝
    rb(.132,.42,.152,.5,0,-.21,0,kn,pantM);               // すね
    rb(.128,.06,.155,.6,0,-.40,0,kn,plain(0x22262b,{rough:.95})); // 裾のリブ
    rb(.115,.075,.26,.55,0,-.455,.050,kn,shoeM);          // スニーカー
    rb(.118,.028,.265,.5,0,-.492,.052,kn,soleM);          // ソール
    legs.push({pivot:pv,knee:kn});
  });
  // コンビニの袋（この人も、同じ道を帰るところ）
  const bag=new THREE.Group();bag.position.set(0,-.38,0);arms[1].elbow.add(bag);
  rb(.21,.28,.14,.45,0,-.16,0,bag,bagM);
  rb(.05,.11,.03,.7,-.055,-.02,0,bag,bagM);
  rb(.05,.11,.03,.7,.055,-.02,0,bag,bagM);
  G.walker={group:w,hips:hips,arms:arms,legs:legs,bag:bag,
            t:0,ph:0,on:false,
            z0:p.z-9,z1:p.z+8,x:p.x+3.0,dur:9.0,rate:4.76};
}
