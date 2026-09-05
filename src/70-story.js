/* =========================================================================
   7. STORY — 進行と怪異
   ========================================================================= */
const STORY={started:false,ended:false,phase:"",flags:{},timers:[],t:0};
const AMB={};
const EV={
  park:{state:0,t:0,amp:0,per:2.6,creak:null,seen:false},
  vend:{armed:false,t:0,stage:0,flick:0},
  trash:{shown:false,t:0,grow:0,trail:0},
  fin:{}
};
function after(sec,fn){STORY.timers.push({t:sec,fn:fn});}
function updateTimers(dt){
  for(let i=STORY.timers.length-1;i>=0;i--){
    const T=STORY.timers[i];
    T.t-=dt;
    if(T.t<=0){STORY.timers.splice(i,1);T.fn();}
  }
}
const ZONES=[];
function zone(x,z,r,fn,cond){ZONES.push({x:x,z:z,r2:r*r,fn:fn,cond:cond,done:false});}
function updateZones(){
  for(let i=0;i<ZONES.length;i++){
    const Zz=ZONES[i];
    if(Zz.done)continue;
    if(Zz.cond&&!Zz.cond())continue;
    const dx=PL.pos.x-Zz.x,dz=PL.pos.z-Zz.z;
    if(dx*dx+dz*dz<Zz.r2){Zz.done=true;Zz.fn();}
  }
}
function dist2D(v){return Math.hypot(PL.pos.x-v.x,PL.pos.z-v.z);}
function lookingAt(v,th){
  camera.getWorldDirection(_v1);
  _v2.subVectors(v,camera.position).normalize();
  return _v1.dot(_v2)>(th==null?.72:th);
}

/* ---------------- 環境音 ---------------- */
/* 虫の声は人によって耳につくので、中断メニューから音量を変えられるようにする。
   BUG.level が実際に掛かる倍率、BUG.want がその場面で鳴らしたい大きさ。 */
const BUG={level:.35,want:0};
function bugVol(v,tm){
  BUG.want=v;
  if(AMB.crickets)AMB.crickets.vol(v*BUG.level,tm==null?2.5:tm);
}
function setBugLevel(v){
  BUG.level=v;
  if(AMB.crickets)AMB.crickets.vol(BUG.want*BUG.level,.25);
}
function ambienceOutdoor(on,fast){
  const tm=fast?.4:2.5;
  if(on){
    if(!AMB.crickets)AMB.crickets=SND.loop("crickets",{vol:0,amb:true});
    if(!AMB.wind)AMB.wind=SND.loop("wind",{vol:0,amb:true});
    bugVol(1.0,tm);AMB.wind.vol(.34,tm);
    if(!AMB.vend&&G.vend)
      AMB.vend=SND.loop("vendHum",{vol:.7,amb:true,pos:G.vend.knockPos,ref:2.6,roll:1.9});
    scheduleCar();
  }else{
    bugVol(0,tm);
    if(AMB.wind)AMB.wind.vol(0,tm);
    if(AMB.vend)AMB.vend.vol(0,tm);
  }
}
function scheduleCar(){
  if(STORY.ended)return;
  after(rr(28,70),()=>{
    if(scene===scOut&&!STORY.ended&&STORY.phase!=="vend")
      SND.play("carPass",{vol:rr(.16,.3),amb:true});
    scheduleCar();
  });
}

/* ---------------- インタラクト登録 ---------------- */
function registerInteractions(){
  const A=G.roomA,B=G.roomB,F=STORY.flags;

  /* --- 自室（冒頭） --- */
  addInt({pos:A.fridge.pos,r:2.0,label:"冷蔵庫を開ける",
    on:()=>STORY.phase==="room1"&&!F.sawFridge,
    fn:()=>{
      F.sawFridge=true;
      SND.play("fridge",{vol:.6});
      A.fridge.open=1;
      if(!AMB.fridge)AMB.fridge=SND.loop("fridgeHum",{vol:.22,pos:A.fridge.pos,ref:1.6});
      say("……何もない。");
      say("卵も、昨日の残りも。");
      after(4.2,()=>{
        say("コンビニ、行くか。");
        setObjective("財布と鍵を持って出る");
      });
    }});
  addInt({pos:A.tablePos,r:1.9,label:"財布と鍵を取る",
    on:()=>F.sawFridge&&!F.hasKeys,
    fn:()=>{
      F.hasKeys=true;
      SND.play("keys",{vol:.55});
      say("財布と鍵を持った。");
      setObjective("玄関から外に出る");
    }});
  addInt({pos:A.door.pos,r:2.0,label:"外に出る",
    on:()=>STORY.phase==="room1"&&F.hasKeys,
    fn:()=>{
      PL.canMove=false;
      SND.play("latch",{vol:.6});
      after(.55,()=>SND.play("creak",{vol:.4}));
      fadeTo(1,1.4);
      after(1.9,goOutside);
    }});
  addInt({pos:A.door.pos,r:2.0,label:"外に出る",
    on:()=>STORY.phase==="room1"&&!F.hasKeys&&F.sawFridge,
    fn:()=>{say("財布と鍵を持っていこう。");}});

  /* --- コンビニ --- */
  addInt({pos:G.store.onigiri,r:2.2,label:"おにぎりを取る",
    on:()=>STORY.phase==="store"&&!F.hasOnigiri,
    fn:()=>{
      F.hasOnigiri=true;
      SND.play("wrapper",{vol:.4});
      say("鮭おにぎり。ひとつでいいか。");
      setObjective("セルフレジで会計する");
    }});
  addInt({pos:G.store.reg,r:2.2,label:"会計する",
    on:()=>STORY.phase==="store"&&F.hasOnigiri&&!F.paid,
    fn:()=>{
      F.paid=true;
      SND.play("coin",{vol:.5});
      after(.9,()=>SND.play("click",{vol:.5}));
      say("……ごちそうさま、と。");
      setObjective("アパートへ帰る");
      after(2.6,()=>{
        STORY.phase="back";
        armReturn();
      });
    }});
  addInt({pos:G.store.reg,r:2.2,label:"会計する",
    on:()=>STORY.phase==="store"&&!F.hasOnigiri,
    fn:()=>say("……何も持ってない。")});

  /* --- ブランコ --- */
  addInt({pos:G.park.swingPos,r:2.6,label:"ブランコを見る",
    on:()=>STORY.phase==="back"&&EV.park.state>=2&&!F.swingLooked,
    fn:()=>{
      F.swingLooked=true;
      say("……誰も、いない。");
      after(2.6,()=>say("風も、ないのに。"));
    }});

  /* --- 自動販売機 --- */
  addInt({pos:G.vend.knockPos,r:2.7,label:"自動販売機を調べる",
    on:()=>STORY.phase==="back"&&EV.vend.stage===1,
    fn:()=>{
      EV.vend.stage=2;
      PL.lookAt={v:G.vend.knockPos,k:3};
      after(1.2,()=>{PL.lookAt=null;});
      say("……中から、聞こえる。");
      after(3.0,()=>{
        say("缶しか、入ってない。");
        EV.vend.flick=1;
      });
      after(6.4,()=>{
        say("人が入れる隙間なんて、ない。");
        EV.vend.stage=3;
      });
    }});
  addInt({pos:G.vend.knockPos,r:2.7,label:"叩いてみる",
    on:()=>STORY.phase==="back"&&EV.vend.stage===3,
    fn:()=>{
      EV.vend.stage=4;
      SND.play("knock2",{vol:.75,pos:G.vend.knockPos,ref:1.4});
      PL.lookAt={v:G.vend.knockPos,k:3};
      after(1.4,()=>{PL.lookAt=null;});
      after(2.4,()=>{
        // 返ってくる
        SND.play("knock3",{vol:1.0,pos:G.vend.knockPos,ref:1.2,roll:1.2});
        SND.duck(.35,.15);
      });
      after(4.4,()=>{
        vendLightsOut();
        SND.duck(.15,.5);
        say("　");
      });
      after(7.0,()=>{
        SND.duck(1,2.6);
        say("……帰ろう。");
        EV.vend.stage=5;
      });
    }});

  /* --- ゴミ捨て場 --- */
  addInt({pos:new THREE.Vector3(LOC.trash.x-1.3,.8,LOC.trash.z),r:2.6,label:"ゴミ袋を見る",
    on:()=>STORY.phase==="back"&&EV.trash.shown&&!F.trashLooked,
    fn:()=>{
      F.trashLooked=true;
      say("……何の、液体だ。");
      after(1.8,()=>{
        SND.play("squelch",{vol:.7,pos:G.trash.group.position,ref:1.6});
        EV.trash.grow=1;
      });
      after(4.6,()=>say("袋の中で、何か動いた気がした。"));
      after(8.2,()=>{
        EV.trash.trail=1;
        say("……うちの方に、続いてる。");
        setObjective("部屋に戻る");
      });
    }});

  /* --- アパートのドア（帰宅） --- */
  addInt({pos:G.apt.doorPos,r:2.2,label:"鍵を開ける",
    on:()=>STORY.phase==="back"&&EV.trash.shown,
    fn:()=>{
      PL.canMove=false;PL.canLook=false;
      setObjective(null);
      SND.play("keys",{vol:.6});
      after(1.1,()=>SND.play("latch",{vol:.7}));
      after(1.9,()=>SND.play("creak",{vol:.5}));
      fadeTo(1,2.0);
      after(3.4,goFinalRoom);
    }});

  /* --- 最終盤：部屋B --- */
  addInt({pos:B.light.cordPos,r:1.8,label:"電気をつける",
    on:()=>STORY.phase==="final"&&!F.lightOn&&!F.ate,
    fn:()=>{
      F.lightOn=true;
      SND.play("click",{vol:.6});
      B.light.on=true;
      B.light.pt.intensity=1.55;
      B.light.panel.material.color.setHex(0xfff0d0);
      say("……");
      after(3.0,()=>setObjective("おにぎりを食べる"));
      after(11,()=>{if(!STORY.flags.ate)say("……なんだ、これ。");});
    }});
  addInt({pos:B.tablePos,r:2.0,label:"ちゃぶ台",
    on:()=>STORY.phase==="final"&&F.lightOn&&!F.ate,
    fn:()=>{
      F.ate=true;
      setObjective(null);
      say("……袋が、もう開いてる。");
      after(3.2,()=>{
        say("食べた覚えは、ない。");
        PL.sit=.72;
      });
      after(6.6,finalDark);
    }});
  addInt({pos:B.closetPos,r:2.2,label:"押し入れを開ける",
    on:()=>STORY.phase==="final"&&F.knockHeard&&!F.opened,
    fn:openCloset});

  /* --- 最終カット：自販機の中 --- */
  addInt({pos:new THREE.Vector3(LOC.vend.x+.8,1.05,LOC.vend.z+1.0),r:3.0,label:"叩く",
    always:true,
    on:()=>STORY.phase==="vend"&&!STORY.flags.finalKnock,
    fn:()=>{
      STORY.flags.finalKnock=true;
      SND.play("knockNear",{vol:1.0});
      after(3.4,()=>{
        say("……誰も、通らない。");
        passerby();
      });
    }});
}

/* ---------------- 場面転換 ---------------- */
function goOutside(){
  useScene(scOut);
  G.roomA.group.visible=true;
  PL.pos.set(1.9,0,2.2);
  PL.yaw=Math.PI*.5;PL.pitch=0;
  PL.canMove=true;PL.canLook=true;
  STORY.phase="out";
  if(AMB.fridge){AMB.fridge.stop(.6);AMB.fridge=null;}
  if(AMB.night){AMB.night.stop(1.2);AMB.night=null;}
  ambienceOutdoor(true,true);
  fadeTo(0,2.2);
  setObjective("コンビニへ行く");
  after(1.4,()=>say("……静かだな。"));
}

function armReturn(){
  // 帰り道用の「小さな違和感」を仕込む
  // カーブミラーが壁を向いている
  // （カーブミラーは撤去）
  // 倒れた自転車
  if(G.bikes&&G.bikes[1]){
    G.bikes[1].rotation.z=Math.PI*.42;
    G.bikes[1].position.y=.3;
  }
  // ついていた窓の明かりが消えている
  if(G.litWindows)G.litWindows.forEach((w,i)=>{
    if(i%2===0){w.mesh.material=MAT.winDark;w.glow.material.opacity=0;}
  });
  // コンビニの灯りは、少し離れたところで落ちる（振り返ると暗い）
  zone(-13,-124.5,9,()=>{
    after(1.0,storeLightsOut);
  },()=>STORY.phase==="back");
}
function storeLightsOut(){
  if(!G.store||!G.store.lit)return;
  G.store.lit=false;
  G.store.lightSpecs.forEach(s=>{s.inten=0;s.on=false;});
  G.store.group.traverse(o=>{
    if(o.isMesh&&o.material&&o.material.isMeshBasicMaterial)o.material.color.multiplyScalar(.05);
    if(o.isSprite)o.material.opacity*=.06;
  });
  if(AMB.fluor){AMB.fluor.stop(1.2);AMB.fluor=null;}
  SND.play("click",{vol:.25,pos:LOC.store,ref:9,roll:.9});
}
function vendLightsOut(){
  if(!G.vend.lit)return;
  G.vend.lit=false;
  G.vend.spec.inten=0;G.vend.spec.on=false;
  G.vend.A.glow.material.opacity=0;
  G.vend.A.face.material.map=TEX.vendFront(true);
  G.vend.A.face.material.needsUpdate=true;
  G.vend.A.top.material.color.setHex(0x1a1d22);
  if(AMB.vend)AMB.vend.vol(0,1.4);
  bugVol(0,.6);
  after(2.6,()=>bugVol(1.0,3.5));
}

function goFinalRoom(){
  useScene(scIn);
  STORY.phase="final";
  G.roomA.group.visible=false;
  G.roomB.group.visible=true;
  G.roomB.winLight.intensity=.42;
  PL.pos.set(0,0,-40+3.4);
  PL.yaw=0;PL.pitch=0;
  PL.canMove=true;PL.canLook=true;PL.sit=0;
  // 外の音が、消える
  ambienceOutdoor(false,true);
  if(AMB.crickets){AMB.crickets.stop(.2);AMB.crickets=null;}
  if(AMB.wind){AMB.wind.stop(.2);AMB.wind=null;}
  if(AMB.vend){AMB.vend.stop(.2);AMB.vend=null;}
  AMB.sub=SND.loop("sub",{vol:0,amb:true});
  AMB.sub.vol(.16,6);
  fadeTo(0,3.0);
  after(1.6,()=>{
    say("ただいま。");
    setObjective("電気をつける");
  });
}

function finalDark(){
  const B=G.roomB;
  SND.play("click",{vol:.5});
  B.light.pt.intensity=0;
  B.light.panel.material.color.setHex(0x14120f);
  B.light.on=false;
  STORY.flags.lightOn=false;
  say("　");
  // 屋内なのに、外の音が入ってくる
  after(1.4,()=>{
    AMB.crickets=SND.loop("crickets",{vol:0,amb:true});
    bugVol(1.1,4);
    AMB.vend=SND.loop("vendHum",{vol:0,amb:true});
    AMB.vend.vol(.28,4);
    SND.play("carPass",{vol:.26,amb:true,delay:2.5});
  });
  after(4.2,()=>say("……外の音が、近い。"));
  after(8.0,()=>{
    PL.sit=0;
    STORY.flags.knockHeard=true;
    knockLoop();
    setObjective("押し入れを開ける");
  });
}
function knockLoop(){
  if(STORY.flags.opened||STORY.ended)return;
  SND.play("knockSlow",{vol:.85,pos:G.roomB.closetPos,ref:1.8,roll:1.2});
  after(rr(4.5,6.5),knockLoop);
}

function openCloset(){
  const B=G.roomB;
  STORY.flags.opened=true;
  PL.canMove=false;
  SND.play("slide",{vol:.7,pos:B.closetPos,ref:2});
  // 手前の1枚を奥の1枚に重ねて、片側だけを開ける（襖はこうしか開かない）
  B.fusuma.forEach((f,i)=>{f.userData.slide=i===0?.93:0;});
  PL.lookAt={v:B.closetPos,k:2.6};
  if(AMB.sub)AMB.sub.vol(.5,3);
  after(1.6,()=>{
    say("　");
    SND.play("whoosh",{vol:.7});
    bugVol(.35,3);
    if(AMB.vend)AMB.vend.vol(.9,3);
    // 引き込まれるように押し入れの中へ（壁抜けを許可）
    PL.noClip=true;
    const into=B.mirror?1:-1;
    PL.force={to:new THREE.Vector3(B.closetPos.x+into*.85,0,B.closetOpenZ),spd:.62,done:null};
    document.getElementById("vig").style.transition="background 3s";
    document.getElementById("vig").style.background=
      "radial-gradient(ellipse 40% 34% at 50% 50%,rgba(0,0,0,0) 5%,rgba(0,0,0,.85) 55%,rgba(0,0,0,1) 100%)";
  });
  after(3.4,()=>fadeTo(1,2.2));
  after(6.2,goInsideVend);
}

/* ---------------- 最終カット：自販機の中 ---------------- */
function goInsideVend(){
  useScene(scOut);
  STORY.phase="vend";
  G.roomB.group.visible=false;
  G.insideVend.group.visible=true;
  G.vend.A.group.visible=false;   // 本体の前面パネルが視界を塞ぐので隠す
  PL.force=null;PL.lookAt=null;PL.sit=0;PL.noClip=true;
  PL.pos.copy(G.insideVend.camPos);
  PL.height=G.insideVend.camPos.y;
  PL.eye=G.insideVend.camPos.y;
  PL.pos.y=0;
  PL.yaw=-1.5708;PL.pitch=-.09;
  PL.canMove=false;PL.canLook=true;
  $("vig").style.background=
    "radial-gradient(ellipse 62% 54% at 50% 50%,rgba(0,0,0,0) 20%,rgba(0,0,0,.72) 66%,rgba(0,0,0,.97) 100%)";
  // 自販機の灯りは消えたまま／外は元通り
  if(AMB.sub)AMB.sub.vol(.10,4);
  if(!AMB.crickets)AMB.crickets=SND.loop("crickets",{vol:0,amb:true});
  bugVol(.95,5);
  if(!AMB.wind)AMB.wind=SND.loop("wind",{vol:0,amb:true});
  AMB.wind.vol(.3,5);
  fadeTo(0,4.5);
  after(3.2,()=>say("……ガラス越しに、道が見える。"));
  after(8.0,()=>say("……ここに、いたのか。"));
  after(12,()=>{if(!STORY.flags.finalKnock)hint("E ／ 叩く");});
  after(26,()=>{if(!STORY.flags.finalKnock){STORY.flags.finalKnock=true;passerby();}});
}
function passerby(){
  // 誰かが、ただ前を通り過ぎていく
  const p=LOC.vend;
  after(1.2,()=>{if(G.walker){G.walker.t=0;G.walker.ph=0;G.walker.on=true;}});
  for(let i=0;i<14;i++){
    const zz=p.z-9+i*1.31;
    after(1.30+i*.66,()=>{
      SND.play("step",{vol:.42,rate:rr(.95,1.05),
        pos:new THREE.Vector3(p.x+3.0,0,zz),ref:2.4,roll:1.4});
    });
  }
  after(12.5,()=>{
    say("　");
    fadeTo(1,5);
    SND.play("endTone",{vol:.5,delay:1.2});
    bugVol(.38,6);
    if(AMB.wind)AMB.wind.vol(.1,6);
    if(AMB.vend)AMB.vend.vol(0,4);
  });
  after(19.5,showEnd);
}
function showEnd(){
  STORY.ended=true;
  if(document.exitPointerLock)document.exitPointerLock();
  const e=$("end");
  e.classList.remove("gone");
  requestAnimationFrame(()=>e.classList.remove("hide"));
  setObjective(null);clearSay();
}

/* ---------------- 帰り道の怪異：毎フレーム処理 ---------------- */
function updateEvents(dt){
  if(STORY.phase!=="back"&&STORY.phase!=="out")return;

  /* ---- 公園のブランコ ---- */
  const P=EV.park,sw=G.park;
  if(STORY.phase==="back"){
    const d=dist2D(sw.swingPos);
    if(P.state===0&&d<30){
      P.state=1;P.amp=0;P.t=0;P.per=2.55;
      P.creak=SND.loop("swing",{vol:0,amb:true,pos:sw.swingPos,ref:4,roll:1.5});
      P.creak.vol(.36,3);
    }
    if(P.state===1){
      P.amp=damp(P.amp,.52,.7,dt);
      if(d<7.5){                          // 近づくと、ぴたりと止まる
        P.state=2;P.t=0;
        if(P.creak)P.creak.vol(0,.35);
        SND.duck(.4,.6);
        after(1.0,()=>SND.duck(1,2.2));
        after(1.4,()=>{if(!STORY.flags.swingLooked)say("……止まった。");});
        setObjective("アパートへ帰る");
      }
    }
    if(P.state===2){
      P.amp=damp(P.amp,0,9,dt);           // 惰性ではなく、押さえつけられたように止まる
      P.t+=dt;
      if(P.t>3&&d>17){                    // 離れると、また揺れ出す
        P.state=3;P.t=0;P.per=1.95;
        if(P.creak)P.creak.vol(.46,1.2).rate(1.28,1.2);
      }
    }
    if(P.state===3){
      P.amp=damp(P.amp,.86,1.1,dt);
      P.t+=dt;
      if(!P.seen&&lookingAt(sw.swingPos,.86)&&d<40){
        P.seen=true;
        say("……また、揺れてる。");
        after(4.0,()=>{P.state=4;P.t=0;});
      }
      if(P.t>14){P.state=4;P.t=0;}
    }
    if(P.state===4){
      // ゆっくり止まっていく（ここで state を進めてしまうと減衰が止まる）
      P.amp=damp(P.amp,0,1.15,dt);
      if(P.creak&&!P.fading){
        P.fading=true;
        P.creak.vol(0,2.2);
        after(2.6,()=>{if(P.creak){P.creak.stop(.2);P.creak=null;}});
      }
      if(P.amp<.004){P.amp=0;P.state=5;}
    }
    if(P.state===5&&P.amp!==0){P.amp=0;}
  }
  if(P.amp>.0005){
    P.t+=dt;
    const a=Math.sin(P.t*Math.PI*2/P.per)*P.amp;
    sw.seats[0].pivot.rotation.x=a;
    sw.seats[1].pivot.rotation.x=a*.12;   // 隣は、ほとんど動かない
  }

  /* ---- 自動販売機 ---- */
  const V=EV.vend;
  if(STORY.phase==="back"&&G.vend.lit){
    const d=dist2D(G.vend.knockPos);
    if(!V.armed&&d<26&&EV.park.state>=2){
      V.armed=true;V.t=2.0;V.stage=1;
    }
    if(V.armed&&V.stage<4){
      V.t-=dt;
      if(V.t<=0){
        V.t=rr(3.6,5.4);
        SND.play(RND()<.3?"knock3":"knock2",
          {vol:.85,pos:G.vend.knockPos,ref:1.8,roll:1.5,rate:rr(.97,1.03)});
      }
      if(d<6&&!STORY.flags.vendHint){
        STORY.flags.vendHint=true;
        setObjective("音の正体を確かめる");
        say("……中から？");
      }
    }
  }
  // 調べたあとの明滅
  if(V.flick>0){
    V.flick-=dt;
    const on=Math.random()>.45;
    G.vend.spec.inten=on?3.6:.6;
    G.vend.A.glow.material.opacity=on?.42:.08;
    if(V.flick<=0){G.vend.spec.inten=3.6;G.vend.A.glow.material.opacity=.42;}
  }

  /* ---- ゴミ捨て場 ---- */
  const T=EV.trash;
  if(STORY.phase==="back"&&!T.shown&&dist2D(LOC.trash)<19){
    T.shown=true;
    G.trash.pool.visible=true;
    T.dripT=1.2;
    if(EV.vend.stage>=1)setObjective("アパートへ帰る");
  }
  if(T.shown){
    const target=T.grow?2.6:1.05;
    const s=damp(G.trash.pool.scale.x,target,T.grow?.9:1.6,dt);
    G.trash.pool.scale.set(s,s,s);
    T.dripT-=dt;
    if(T.dripT<=0){
      T.dripT=rr(1.6,3.8);
      SND.play("drip",{vol:.5,pos:G.trash.group.position,ref:2.2,roll:1.6,rate:rr(.9,1.1)});
    }
    if(T.grow&&!T.bagMoved){
      T.bagMoved=true;
      const b=G.trash.bags[2];
      let k=0;
      const iv=setInterval(()=>{
        k++;b.rotation.z+=.02;b.position.y-=.004;
        if(k>26)clearInterval(iv);
      },33);
    }
    if(T.trail){
      // 帯の描画範囲を少しずつ伸ばし、先端にふくらみを置いて「流れ」に見せる
      const tr=G.trash.trail;
      tr.mesh.visible=true;
      tr.t=Math.min(1,tr.t+dt*.155);
      const fi=tr.t*(tr.N-1);
      tr.mesh.geometry.setDrawRange(0,Math.max(1,Math.floor(fi))*6);
      const i0=Math.min(tr.N-2,Math.floor(fi)),f=fi-i0;
      tr.head.visible=tr.t<1;
      tr.head.position.set(lerp(tr.pts[i0][0],tr.pts[i0+1][0],f),.0425,
                           lerp(tr.pts[i0][1],tr.pts[i0+1][1],f));
      const hs=.7+.5*Math.sin(STORY.t*3.1);
      tr.head.scale.set(hs,1.15,1);
    }
  }
}

/* ---------------- 行き道のゾーン ---------------- */
function setupZones(){
  const out=()=>STORY.phase==="out";
  zone(LOC.trash.x,LOC.trash.z,7,()=>say("……明日、燃えるゴミだったか。"),out);
  zone(LOC.vend.x+2,LOC.vend.z,7,()=>say("いつ通っても、唸ってるな。"),out);
  zone(0,LOC.park.z,9,()=>say("……この公園、まだあるんだ。"),out);
  zone(0,-120,8,()=>say("角を曲がれば、すぐだ。"),out);
  // コンビニ到着
  zone(LOC.store.x,LOC.store.z+1.5,3.4,()=>{
    STORY.phase="store";
    SND.play("chime",{vol:.5});
    if(!AMB.fluor)AMB.fluor=SND.loop("fluor",{vol:.3,amb:true,pos:LOC.storeIn,ref:5,roll:1.2});
    setObjective("何か買う");
    after(1.6,()=>say("……いらっしゃいませ、も無しか。"));
  },()=>STORY.phase==="out");
  // 店を出る
  zone(LOC.store.x,LOC.store.z+1.5,3.6,()=>{
    SND.play("chime",{vol:.45,rate:.94});
  },()=>STORY.phase==="back"&&!STORY.flags.leftStore&&(STORY.flags.leftStore=true));
  // 道に迷いかけたら
  zone(0,20,6,()=>hint("道は南（アパート側）と北（コンビニ側）だけ"),()=>true);
}

/* ---------------- ゲーム開始 ---------------- */
function startGame(){
  STORY.started=true;
  STORY.phase="intro";
  useScene(scIn);
  G.roomA.group.visible=true;
  G.roomB.group.visible=false;
  PL.pos.set(1.35,0,-.55);
  PL.yaw=Math.PI*.02;PL.pitch=1.02;
  PL.height=1.60;PL.eye=.42;PL.sit=1.18;
  PL.canMove=false;PL.canLook=false;
  G.roomA.winLight.intensity=.5;
  SND.resume();
  AMB.night=SND.loop("wind",{vol:.10,amb:true});
  fadeTo(0,4.0);
  after(2.0,()=>say("……２時か。"));
  after(6.0,()=>say("腹、減った。"));
  after(9.4,()=>{
    PL.sit=0;PL.canLook=true;
    PL.lookAt={v:new THREE.Vector3(G.roomA.fridge.pos.x,1.4,G.roomA.fridge.pos.z),k:1.1};
    after(2.2,()=>{PL.lookAt=null;});
  });
  after(11.6,()=>{
    PL.canMove=true;
    STORY.phase="room1";
    setObjective("冷蔵庫を確認する");
    if(canvas.requestPointerLock)canvas.requestPointerLock();
  });
}
