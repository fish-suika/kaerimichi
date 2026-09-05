/* =========================================================================
   9. BOOT / MAIN LOOP
   ========================================================================= */
$("grain").style.backgroundImage="url("+TEX.grainCSS+")";

/* ---------- 逐次ビルド（タイトル画面を描かせながら） ---------- */
const BOOT=[
  ["世界を組み立てています",()=>{initMats();buildSky();buildPool();}],
  ["夜道を敷いています",   ()=>{buildWorld();}],
  ["部屋を用意しています", ()=>{buildInteriors();buildInsideVend();}],
  ["音を作っています",     ()=>{SND.init();}],
  ["仕上げています",       ()=>{
      registerInteractions();setupZones();
      renderer.compile(scOut,camera);
      renderer.compile(scIn,camera);
  }]
];
let bootStep=0;
// タブが裏にあると requestAnimationFrame が止まるので、必ず進むようにする
function nextFrame(fn){
  let done=false;
  const go=()=>{if(done)return;done=true;fn();};
  requestAnimationFrame(go);
  setTimeout(go,240);
}
function bootTick(){
  if(bootStep<BOOT.length){
    $("startBtn").textContent=BOOT[bootStep][0]+"…";
    nextFrame(()=>{
      try{BOOT[bootStep][1]();}
      catch(e){console.error("boot stage "+bootStep,e);$("startBtn").textContent="エラー";throw e;}
      bootStep++;
      bootTick();
    });
  }else{
    const b=$("startBtn");
    b.textContent="歩きはじめる";
    b.disabled=false;
    b.onclick=()=>{
      SND.resume();
      if(MOBILE)goFullscreen();          // タップの中でないと全画面に入れない
      const t=$("title");
      t.classList.add("hide");
      setTimeout(()=>t.classList.add("gone"),900);
      startGame();
    };
  }
}
nextFrame(bootTick);

/* ---------- 設定 ---------- */
bindSlider("sVol","oVol",v=>SND.setVolume(v/125));
bindSlider("sGam","oGam",v=>{renderer.toneMappingExposure=v/100;});
bindSlider("sBug","oBug",v=>setBugLevel(v/100));
bindSlider("sSens","oSens",v=>{mouseSens=v/100;});
$("againBtn").onclick=()=>location.reload();

/* ---------- 演出まわりの毎フレーム更新 ---------- */
function updateProps(dt){
  // 冷蔵庫の扉
  [G.roomA,G.roomB].forEach(R=>{
    if(!R)return;
    const f=R.fridge;
    const tgt=(f.open||0)*1.75*(R.mirror?-1:1);
    f.hinge.rotation.y=damp(f.hinge.rotation.y,tgt,4.5,dt);
    const lit=(f.open||0)*.9;
    f.light.intensity=damp(f.light.intensity,lit,5,dt);
    f.glow.material.opacity=damp(f.glow.material.opacity,lit*.5,5,dt);
    // 襖
    R.fusuma.forEach(fu=>{
      if(fu.userData.slide==null)return;
      fu.position.z=damp(fu.position.z,fu.userData.baseZ+fu.userData.slide,2.6,dt);
    });
  });
  // 通行人（膝と肘を曲げて歩かせる）
  const W=G.walker;
  if(W&&W.on){
    W.t+=dt;
    W.ph=W.t*W.rate;
    const p=clamp(W.t/W.dur,0,1),s=Math.sin(W.ph);
    W.group.visible=true;
    W.group.position.set(W.x,Math.abs(Math.cos(W.ph))*.021,lerp(W.z0,W.z1,p));
    W.legs[0].pivot.rotation.x= s*.42;
    W.legs[1].pivot.rotation.x=-s*.42;
    // 膝は後ろにしか曲がらない
    W.legs[0].knee.rotation.x=Math.max(0,-Math.sin(W.ph-.7))*.95;
    W.legs[1].knee.rotation.x=Math.max(0,-Math.sin(W.ph+Math.PI-.7))*.95;
    W.arms[0].pivot.rotation.x=-s*.30;
    W.arms[1].pivot.rotation.x= s*.24;
    W.arms[0].elbow.rotation.x=.24+Math.max(0, s)*.26;
    W.arms[1].elbow.rotation.x=.30+Math.max(0,-s)*.16;
    W.hips.rotation.y=Math.sin(W.ph)*.045;
    if(W.bag)W.bag.rotation.x=-W.arms[1].pivot.rotation.x-W.arms[1].elbow.rotation.x
                              +Math.sin(W.ph*2)*.06;
    if(p>=1){W.on=false;W.group.visible=false;}
  }
  // 星のゆるやかな回転
  if(G.stars)G.stars.rotation.y+=dt*.004;
  // フィルムグレイン
  const gr=$("grain");
  gr.style.backgroundPosition=(Math.random()*120|0)+"px "+(Math.random()*120|0)+"px";
}

/* ---------- メインループ ---------- */
const clock=new THREE.Clock();
let acc=0;
function loop(){
  requestAnimationFrame(loop);
  let dt=clock.getDelta();
  if(dt>.1)dt=.1;
  if(!paused){
    STORY.t+=dt;
    updateTimers(dt);
    if(STORY.started){
      updateZones();
      updateEvents(dt);
    }
    updatePlayer(dt);
    updateInteract();
    updateProps(dt);
  }
  updateSay(paused?0:dt);
  if(scene===scOut)updatePool(PL.pos.x,PL.pos.z);
  renderer.render(scene,camera);
}
loop();
