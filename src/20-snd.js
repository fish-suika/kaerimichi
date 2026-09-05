/* =========================================================================
   2. SOUND  — 全てその場で波形合成（外部音源ファイルなし）
   ========================================================================= */
const SND={ready:false,B:{},ctx:null};
(function(){
  let ctx,master,busAmb,busSfx,comp,duckGain;
  const B=SND.B;

  /* ---------- DSP helpers ---------- */
  function nz(){return Math.random()*2-1;}

  // 一極ローパスを通したノイズバースト。atk を渡すと立ち上がりが鈍る
  function nburst(d,sr,t0,dur,gain,cut,k,hp,atk){
    const i0=Math.floor(t0*sr),n=Math.floor(dur*sr);
    const c=Math.exp(-2*Math.PI*cut/sr);
    let lp=0,hs=0;
    for(let i=0;i<n;i++){
      const idx=i0+i; if(idx<0||idx>=d.length) continue;
      let x=nz();
      lp=x*(1-c)+lp*c; x=lp;
      if(hp){hs=hs*0.995+x*0.005;x=x-hs;}
      let e=Math.exp(-(i/n)*(k||6));
      if(atk){const a=Math.min(1,(i/n)/atk);e*=a*a*(3-2*a);}
      d[idx]+=gain*x*e;
    }
  }
  // 2極共振器。きしみ音の「胴鳴り」を作る
  function reso(f,bw,sr){
    const w=2*Math.PI*f/sr,r=Math.exp(-Math.PI*bw/sr);
    return {a1:2*r*Math.cos(w),a2:-r*r,y1:0,y2:0};
  }
  function resoStep(R,x){
    const y=x+R.a1*R.y1+R.a2*R.y2;
    R.y2=R.y1;R.y1=y;return y;
  }
  /* きしみ（スティックスリップ）
     金属が擦れる音は「引っかかっては滑る」の繰り返しで、不規則なパルス列になる。
     なめらかな正弦スイープで作ると鳴き声に聞こえてしまうので、必ずパルス列で作る。 */
  function creak(d,sr,t0,dur,rate0,rate1,gain,tone){
    tone=tone||1;
    const i0=Math.floor(t0*sr),n=Math.floor(dur*sr);
    const R=[reso(300*tone,175,sr),reso(742*tone,300,sr),reso(1655*tone,480,sr)];
    const amp=[1,.40,.16];
    let next=0;
    for(let i=0;i<n;i++){
      const idx=i0+i; if(idx<0||idx>=d.length)break;
      const p=i/n;
      const env=Math.pow(Math.sin(Math.PI*p),.55);
      let x=0;
      if(i>=next){                       // 引っかかりの瞬間
        x=.7+Math.random()*.6;
        const rate=(rate0+(rate1-rate0)*Math.sin(Math.PI*p))*(.68+Math.random()*.64);
        next=i+Math.max(2,Math.floor(sr/rate));
      }
      let y=0;
      for(let k=0;k<3;k++)y+=resoStep(R[k],x)*amp[k];
      d[idx]+=gain*env*y*.05;
    }
  }
  // 減衰する正弦の和（打撃音のモーダル合成）
  function modal(d,sr,t0,parts,gain){
    const i0=Math.floor(t0*sr);
    for(let p=0;p<parts.length;p++){
      const f=parts[p][0],dec=parts[p][1],a=parts[p][2];
      const n=Math.min(d.length-i0,Math.ceil(dec*6*sr));
      const ph=Math.random()*6.28;
      for(let i=0;i<n;i++){
        const idx=i0+i; if(idx<0) continue;
        const t=i/sr;
        d[idx]+=gain*a*Math.exp(-t/dec)*Math.sin(2*Math.PI*f*t+ph);
      }
    }
  }
  function norm(buf,peak){
    let mx=0;
    for(let c=0;c<buf.numberOfChannels;c++){
      const d=buf.getChannelData(c);
      for(let i=0;i<d.length;i++){const a=Math.abs(d[i]);if(a>mx)mx=a;}
    }
    if(mx<1e-6)return buf;
    const g=peak/mx;
    for(let c=0;c<buf.numberOfChannels;c++){
      const d=buf.getChannelData(c);
      for(let i=0;i<d.length;i++)d[i]*=g;
    }
    return buf;
  }
  function makeOne(sec,ch,fill,peak){
    const sr=ctx.sampleRate,N=Math.ceil(sec*sr);
    const tmp=[];for(let c=0;c<ch;c++)tmp.push(new Float32Array(N));
    fill(tmp,sr,N);
    const b=ctx.createBuffer(ch,N,sr);
    for(let c=0;c<ch;c++)b.getChannelData(c).set(tmp[c]);
    return peak?norm(b,peak):b;
  }
  // ループ用：末尾を先頭にクロスフェードして継ぎ目を消す
  function makeLoop(sec,ch,fill,fade,peak){
    const sr=ctx.sampleRate,N=Math.ceil(sec*sr),F=Math.ceil((fade||0)*sr);
    const tmp=[];for(let c=0;c<ch;c++)tmp.push(new Float32Array(N+F));
    fill(tmp,sr,N+F);
    const b=ctx.createBuffer(ch,N,sr);
    for(let c=0;c<ch;c++){
      const d=b.getChannelData(c),s=tmp[c];
      for(let i=0;i<N;i++)d[i]=s[i];
      for(let i=0;i<F;i++){const t=i/F;d[i]=d[i]*t+s[N+i]*(1-t);}
    }
    return peak?norm(b,peak):b;
  }

  /* ---------- 音の定義 ---------- */
  function build(){

    /* 虫の声（この作品の背骨になる音）
       純正弦を何本も重ねると、わずかにずれた周波数どうしがうなって不協和音になる。
       実際の虫は「翅のヤスリを弾く連打」なので、パルス列で共振器を鳴らして作る。
       声の数を絞り、鳴く間隔をばらけさせて、同時に重なりにくくする。 */
    function chirp(L,Rc,sr,N,t0,dur,f,bw,rate,amp,pan,shape){
      const pl=Math.sqrt((1-pan)/2),pr=Math.sqrt((1+pan)/2);
      const i0=Math.floor(t0*sr),n=Math.floor(dur*sr);
      const R1=reso(f,bw,sr),R2=reso(f*1.98,bw*2.2,sr);
      let next=0;
      for(let i=0;i<n;i++){
        const idx=i0+i; if(idx>=N)break;
        const p=i/n;
        const env=Math.pow(Math.sin(Math.PI*p),shape||1);
        let x=0;
        if(i>=next){
          x=.55+Math.random()*.9;
          next=i+Math.max(2,Math.floor(sr/(rate*(.9+Math.random()*.2))));
        }
        const s=amp*env*(resoStep(R1,x)+resoStep(R2,x)*.30)*.02;
        L[idx]+=s*pl;Rc[idx]+=s*pr;
      }
    }
    /* 虫の声。
       高い純音は耳に刺さるので使わない。音程を下げ（1.9〜2.6kHz）、共振を
       ゆるくして（帯域を広く）「音」ではなく「気配」に寄せる。
       鳴っている時間も短く、ほとんどは静か。 */
    B.crickets=makeLoop(12,2,(t,sr,N)=>{
      const L=t[0],Rc=t[1];
      [[1920,-.7],[2180,.65],[2410,-.25],[2620,.35]].forEach((a,k)=>{
        const f=a[0]*rr(.99,1.01),pan=a[1];
        let tt=k*1.9+rr(0,1.1);
        while(tt<N/sr){
          const rep=ri(2,3);
          for(let j=0;j<rep;j++){
            const st=tt+j*.15,dur=rr(.055,.085);
            if((st+dur)*sr<N)
              chirp(L,Rc,sr,N,st,dur,f,rr(760,1150),rr(52,72),rr(.30,.46),pan,.75);
          }
          tt+=rep*.15+rr(2.2,4.8);
        }
      });
      // ごく遠くで鳴いている一群（低い位置で、ゆっくり濃淡がつく）
      for(let c=0;c<2;c++){
        const d=c?Rc:L;
        const R1=reso(rr(1500,1750),1900,sr);
        for(let i=0;i<N;i++){
          const env=.5+.5*Math.sin(2*Math.PI*(i/sr)/9.1+c*2.3);
          d[i]+=resoStep(R1,nz())*.0009*env*env;
        }
      }
    },1.5,.26);

    /* 風（ごく低い唸り） */
    B.wind=makeLoop(14,2,(t,sr,N)=>{
      for(let c=0;c<2;c++){
        const d=t[c];let b=0,lp=0,lp2=0;
        for(let i=0;i<N;i++){
          b=(b+.03*nz())*.997;
          lp=lp*.992+b*.008; lp2=lp2*.97+lp*.03;
          d[i]=lp2*(.3+.7*(.5+.5*Math.sin(2*Math.PI*(i/sr)/8.5+c*1.9)));
        }
      }
    },2.5,.34);

    /* 自販機の唸り（100Hzを基音に） */
    B.vendHum=makeLoop(4,1,(t,sr,N)=>{
      const d=t[0];let lp=0;
      for(let i=0;i<N;i++){
        const tt=i/sr;
        let s=Math.sin(2*Math.PI*100*tt)*.5
             +Math.sin(2*Math.PI*200*tt)*.24
             +Math.sin(2*Math.PI*300*tt)*.11
             +Math.sin(2*Math.PI*50*tt)*.22;
        s*=1+.06*Math.sin(2*Math.PI*.9*tt);
        lp=lp*.986+nz()*.014;
        d[i]=s*.6+lp*.5;
      }
    },.5,.55);

    /* 蛍光灯のジー音 */
    B.fluor=makeLoop(2,1,(t,sr,N)=>{
      const d=t[0];let lp=0;
      for(let i=0;i<N;i++){
        const tt=i/sr;
        let s=Math.sin(2*Math.PI*120*tt)*.4+Math.sin(2*Math.PI*240*tt)*.22
             +Math.sin(2*Math.PI*360*tt)*.1;
        lp=lp*.7+nz()*.3;
        d[i]=s*.5+lp*.12;
      }
    },.25,.3);

    /* 冷蔵庫 */
    B.fridgeHum=makeLoop(3,1,(t,sr,N)=>{
      const d=t[0];let lp=0;
      for(let i=0;i<N;i++){
        const tt=i/sr;
        lp=lp*.99+nz()*.01;
        d[i]=(Math.sin(2*Math.PI*60*tt)*.5+Math.sin(2*Math.PI*120*tt)*.2)*.5+lp*1.4;
      }
    },.4,.42);

    /* 足音
       靴底が「ざり」と擦れて、そのあと踵の重みが低く落ちる。
       立ち上がりを少し鈍らせないと、カチッというクリック音になってしまう。 */
    B.step=[];
    for(let k=0;k<6;k++)B.step.push(makeOne(.34,1,(t,sr)=>{
      const d=t[0];
      nburst(d,sr,.002,.075,1.00,rr(1300,2400),9,true,.10);  // 靴底のこすれ
      nburst(d,sr,0   ,.130,.45,rr(380,650) ,6,false,.06);   // 踏み込みのボディ
      modal (d,sr,.001,[[rr(58,78),.055,.30],[rr(120,160),.030,.12]],.30);
    },.44));
    B.stepGravel=[];
    for(let k=0;k<4;k++)B.stepGravel.push(makeOne(.38,1,(t,sr)=>{
      const d=t[0];
      for(let j=0;j<11;j++)nburst(d,sr,rr(0,.11),.042,rr(.25,.7),rr(2000,5200),13,true,.18);
      nburst(d,sr,0,.14,.42,rr(420,760),6,false,.10);
      modal (d,sr,.003,[[rr(62,86),.045,.22]],.28);
    },.40));
    B.stepTatami=[];
    for(let k=0;k<4;k++)B.stepTatami.push(makeOne(.32,1,(t,sr)=>{
      const d=t[0];
      nburst(d,sr,.003,.095,1.00,rr(600,1050),9,false,.18);
      nburst(d,sr,0   ,.140,.34,rr(260,420) ,6,false,.10);
      modal (d,sr,.002,[[rr(54,74),.050,.26]],.30);
    },.33));
    B.stepWood=[];
    for(let k=0;k<4;k++)B.stepWood.push(makeOne(.38,1,(t,sr)=>{
      const d=t[0];
      nburst(d,sr,.002,.070,1.00,rr(1500,2600),10,true,.10);
      nburst(d,sr,0   ,.110,.40,rr(500,900)  ,6,false,.08);
      modal (d,sr,.002,[[rr(96,140),.060,.34],[rr(255,360),.035,.16]],.32); // 床鳴り
    },.40));

    /* ★ コンコン ★ — このゲームの主役の音 */
    function konAt(d,sr,t0,g,det){
      det=det||1;
      nburst(d,sr,t0,.012,.55*g,4200,10,true);
      modal(d,sr,t0,[
        [372*det,.085,1.0],[516*det,.062,.55],[905*det,.040,.30],
        [1410*det,.022,.16],[2260*det,.014,.08],[94,.13,.85]
      ],g);
    }
    B.knock2=makeOne(1.1,1,(t,sr)=>{const d=t[0];konAt(d,sr,.02,1,1);konAt(d,sr,.30,.86,1.012);},.72);
    B.knock3=makeOne(1.5,1,(t,sr)=>{const d=t[0];konAt(d,sr,.02,1,1);konAt(d,sr,.28,.9,1.01);konAt(d,sr,.55,.8,.994);},.75);
    B.knockNear=makeOne(1.2,1,(t,sr)=>{const d=t[0];konAt(d,sr,.02,1,.985);konAt(d,sr,.33,.95,1.005);},.95);
    B.knockSlow=makeOne(2.4,1,(t,sr)=>{const d=t[0];konAt(d,sr,.02,1,.97);konAt(d,sr,.62,.92,.975);},.8);

    /* ブランコの軋み（1周期ぶん）。往復の端でそれぞれ一度きしむ */
    B.swing=makeLoop(2.7,1,(t,sr,N)=>{
      const d=t[0];
      creak(d,sr,.05,.52,38,104,.60,1.00);
      creak(d,sr,1.36,.48,34,96,.52,.93);
      // 錆びた鎖のかちゃかちゃ
      for(let j=0;j<7;j++)nburst(d,sr,rr(.05,.55),.022,.085,5200,18,true);
      for(let j=0;j<7;j++)nburst(d,sr,rr(1.36,1.92),.022,.075,5000,18,true);
    },.35,.42);

    /* 粘っこい液体が落ちる音
       純正弦のスイープは「ピコッ」という電子音そのものになるので使わない。
       べちゃっという広帯域のノイズを主役にして、響きはごく短く添えるだけ。 */
    B.drip=[];
    for(let k=0;k<4;k++)B.drip.push(makeOne(.45,1,(t,sr)=>{
      const d=t[0];
      nburst(d,sr,0   ,.040,1.00,rr(1500,3000),13,true);   // 着弾
      nburst(d,sr,.002,.105,.60,rr(360,820)  ,8,false,.08); // 粘り
      // わずかな響き（倍音を非整数にして音程感を濁らせる）
      const n=Math.floor(.10*sr),f0=rr(230,330),f1=rr(400,560);
      let ph=0;
      for(let i=0;i<n;i++){
        const tt=i/sr;
        ph+=2*Math.PI*(f0+(f1-f0)*(1-Math.exp(-tt/.022)))/sr;
        d[i]+=.30*Math.exp(-tt/.028)
              *(Math.sin(ph)*.62+Math.sin(ph*2.73)*.26+Math.sin(ph*4.17)*.12)
              *(1+.07*(Math.random()-.5));
      }
    },.40));

    /* 袋の中で何かが動く */
    B.squelch=makeOne(1.4,1,(t,sr)=>{
      const d=t[0];
      for(let j=0;j<34;j++)                       // ぬちゃっとした擦れ
        nburst(d,sr,rr(0,.9),rr(.03,.14),rr(.12,.45),rr(260,1200),rr(4,9),false,.25);
      for(let j=0;j<14;j++)                       // ビニールのこすれ
        nburst(d,sr,rr(.05,.95),rr(.01,.04),rr(.08,.22),rr(2600,7000),14,true);
      modal(d,sr,.06,[[58,.09,.55],[86,.06,.30]],.42);   // 低い軋み（長く伸ばさない）
    },.5);

    /* 建具 */
    B.creak=makeOne(1.6,1,(t,sr)=>{      // 玄関ドアの蝶番
      const d=t[0];
      creak(d,sr,.05,1.15,17,42,.62,.50);
      nburst(d,sr,0,1.15,.05,420,3,false,.25);
    },.5);
    B.latch=makeOne(.35,1,(t,sr)=>{
      const d=t[0];
      modal(d,sr,0,[[1750,.012,1],[2900,.008,.5],[430,.03,.5]],.8);
      modal(d,sr,.11,[[1420,.016,.8],[380,.04,.6]],.7);
    },.62);
    B.keys=makeOne(1.4,1,(t,sr)=>{
      const d=t[0];
      for(let j=0;j<9;j++)modal(d,sr,rr(0,.8),[[rr(2200,4600),.05,1],[rr(4800,7200),.03,.5]],rr(.2,.5));
    },.45);
    B.slide=makeOne(1.6,1,(t,sr)=>{ // 襖・引戸
      const d=t[0],n=Math.floor(1.1*sr);
      let lp=0;
      for(let i=0;i<n;i++){
        const p=i/n;lp=lp*.9+nz()*.1;
        d[i]+=lp*Math.sin(Math.PI*p)*(.5+.5*Math.sin(2*Math.PI*33*(i/sr)))*.9;
      }
      modal(d,sr,1.08,[[140,.09,1],[300,.05,.4]],.6);
    },.48);
    B.fridge=makeOne(1.4,1,(t,sr)=>{
      const d=t[0];
      nburst(d,sr,0,.16,1,420,7);
      modal(d,sr,.02,[[64,.14,.9],[128,.08,.35]],.6);
      nburst(d,sr,.18,.9,.10,2400,2,true);
    },.55);
    B.chime=makeOne(1.6,1,(t,sr)=>{ // コンビニ入店音
      const d=t[0],mk=(t0,f)=>{
        const n=Math.floor(.55*sr);
        for(let i=0;i<n;i++){
          const idx=Math.floor(t0*sr)+i;if(idx>=d.length)break;
          const tt=i/sr,env=Math.min(1,tt/.012)*Math.exp(-tt/.19);
          d[idx]+=env*(Math.sin(2*Math.PI*f*tt)+.3*Math.sin(2*Math.PI*f*2*tt));
        }
      };
      mk(0,784);mk(.42,588);
    },.42);
    B.canDrop=makeOne(1.6,1,(t,sr)=>{
      const d=t[0];
      nburst(d,sr,0,.3,.3,1800,6,true);
      modal(d,sr,.30,[[210,.12,1],[520,.07,.4],[930,.04,.2]],.7);
      modal(d,sr,.52,[[240,.09,.6],[610,.05,.3]],.5);
      modal(d,sr,.70,[[200,.14,.8],[80,.16,.6]],.6);
    },.6);
    B.coin=makeOne(1.2,1,(t,sr)=>{
      const d=t[0];
      for(let j=0;j<5;j++)modal(d,sr,rr(0,.55),[[rr(3000,5200),.09,1],[rr(6000,8800),.05,.4]],rr(.2,.45));
    },.42);
    B.click=makeOne(.16,1,(t,sr)=>{
      const d=t[0];
      modal(d,sr,0,[[2400,.008,1],[900,.014,.6],[320,.02,.4]],.8);
    },.5);
    B.wrapper=makeOne(1.1,1,(t,sr)=>{
      const d=t[0];
      for(let j=0;j<40;j++)nburst(d,sr,rr(0,.85),rr(.008,.03),rr(.2,.8),rr(3000,9000),12,true);
    },.35);

    /* 遠くを通る車 */
    B.carPass=makeLoop(9,2,(t,sr,N)=>{
      const L=t[0],Rc=t[1];
      let lp=0,lp2=0,b=0;
      for(let i=0;i<N;i++){
        const tt=i/sr,p=tt/(N/sr);
        b=(b+.05*nz())*.996;
        lp=lp*.985+b*.015; lp2=lp2*.96+lp*.04;
        const env=Math.exp(-Math.pow((p-.5)/.19,2))*1.0;
        const pan=(p-.5)*1.9;
        const pl=Math.sqrt(clamp((1-pan)/2,0,1)),pr=Math.sqrt(clamp((1+pan)/2,0,1));
        const s=(lp2*2.4+Math.sin(2*Math.PI*(52+18*p)*tt)*.12)*env;
        L[i]+=s*pl;Rc[i]+=s*pr;
      }
    },0,.3);

    /* 低い持続音（最終盤） */
    B.sub=makeLoop(8,1,(t,sr,N)=>{
      const d=t[0];let lp=0;
      for(let i=0;i<N;i++){
        const tt=i/sr;
        lp=lp*.9975+nz()*.0025;
        d[i]=Math.sin(2*Math.PI*36*tt)*.6+Math.sin(2*Math.PI*54.3*tt)*.3
            +Math.sin(2*Math.PI*27*tt)*.35+lp*2.2;
      }
    },1.5,.5);

    /* 心音 */
    B.heart=makeLoop(1.35,1,(t,sr)=>{
      const d=t[0];
      modal(d,sr,.02,[[52,.10,1],[78,.06,.4]],.9);
      modal(d,sr,.30,[[48,.09,.75],[72,.05,.3]],.7);
    },.15,.55);

    /* 引き込まれる時の上昇音 */
    B.whoosh=makeOne(4,1,(t,sr,N)=>{
      const d=t[0];let lp=0,b=0;
      for(let i=0;i<N;i++){
        const p=i/N;
        b=(b+.05*nz())*.996;
        const c=Math.exp(-2*Math.PI*(80+2600*p*p)/sr);
        lp=b*(1-c)+lp*c;
        d[i]=lp*Math.pow(p,1.6)*6+Math.sin(2*Math.PI*(28+22*p)*(i/sr))*Math.pow(p,2)*.5;
      }
    },.65);

    /* 終幕の低い鐘 */
    B.endTone=makeOne(6,1,(t,sr)=>{
      const d=t[0];
      modal(d,sr,0,[[73,3.2,1],[110,2.4,.42],[164,1.6,.2],[221,1.1,.12],[42,3.6,.5]],.55);
    },.5);
  }

  /* ---------- 再生系 ---------- */
  function setPos(node,p){
    if(node.positionX){node.positionX.value=p.x;node.positionY.value=p.y;node.positionZ.value=p.z;}
    else node.setPosition(p.x,p.y,p.z);
  }
  function mkPanner(pos,opt){
    const p=ctx.createPanner();
    p.panningModel=opt.hrtf===false?"equalpower":"HRTF";
    p.distanceModel="exponential";
    p.refDistance=opt.ref||2.2;
    p.rolloffFactor=opt.roll||1.7;
    p.maxDistance=300;
    setPos(p,pos);
    return p;
  }

  SND.init=function(){
    ctx=THREE.AudioContext.getContext();
    SND.ctx=ctx;
    comp=ctx.createDynamicsCompressor();
    comp.threshold.value=-14;comp.knee.value=22;comp.ratio.value=3.2;
    comp.attack.value=.004;comp.release.value=.26;
    master=ctx.createGain();master.gain.value=.8;
    duckGain=ctx.createGain();duckGain.gain.value=1;
    busAmb=ctx.createGain();busAmb.gain.value=1;
    busSfx=ctx.createGain();busSfx.gain.value=1;
    busAmb.connect(duckGain);busSfx.connect(duckGain);
    duckGain.connect(master);master.connect(comp);comp.connect(ctx.destination);
    build();
    SND.ready=true;
  };

  SND.resume=function(){ if(ctx&&ctx.state!=="running")ctx.resume(); };
  SND.setVolume=function(v){ if(master)master.gain.value=v; };
  SND.duck=function(v,tm){
    if(!duckGain)return;
    const t=ctx.currentTime;
    duckGain.gain.cancelScheduledValues(t);
    duckGain.gain.setValueAtTime(duckGain.gain.value,t);
    duckGain.gain.linearRampToValueAtTime(v,t+(tm||.4));
  };

  // 単発
  SND.play=function(key,opt){
    if(!SND.ready)return null;
    opt=opt||{};
    let buf=B[key];
    if(Array.isArray(buf))buf=buf[Math.floor(Math.random()*buf.length)];
    if(!buf)return null;
    const src=ctx.createBufferSource();
    src.buffer=buf;
    src.playbackRate.value=opt.rate||1;
    const g=ctx.createGain();
    g.gain.value=opt.vol==null?1:opt.vol;
    src.connect(g);
    const bus=opt.amb?busAmb:busSfx;
    if(opt.pos){const p=mkPanner(opt.pos,opt);g.connect(p);p.connect(bus);}
    else if(opt.pan!=null&&ctx.createStereoPanner){
      const sp=ctx.createStereoPanner();
      sp.pan.value=clamp(opt.pan,-1,1);
      g.connect(sp);sp.connect(bus);
    }
    else g.connect(bus);
    src.start(ctx.currentTime+(opt.delay||0));
    return src;
  };

  // ループ（ハンドルを返す）
  SND.loop=function(key,opt){
    if(!SND.ready)return null;
    opt=opt||{};
    const buf=B[key];if(!buf)return null;
    const src=ctx.createBufferSource();
    src.buffer=buf;src.loop=true;src.playbackRate.value=opt.rate||1;
    const g=ctx.createGain();g.gain.value=opt.vol==null?1:opt.vol;
    let pan=null;
    src.connect(g);
    if(opt.pos){pan=mkPanner(opt.pos,opt);g.connect(pan);pan.connect(opt.amb?busAmb:busSfx);}
    else g.connect(opt.amb?busAmb:busSfx);
    src.start(0);
    const h={
      src:src,gain:g,panner:pan,
      vol:function(v,tm){
        const t=ctx.currentTime;
        g.gain.cancelScheduledValues(t);
        g.gain.setValueAtTime(g.gain.value,t);
        g.gain.linearRampToValueAtTime(v,t+(tm==null?.3:tm));
        return h;
      },
      rate:function(v,tm){
        const t=ctx.currentTime;
        src.playbackRate.cancelScheduledValues(t);
        src.playbackRate.setValueAtTime(src.playbackRate.value,t);
        src.playbackRate.linearRampToValueAtTime(v,t+(tm==null?.3:tm));
        return h;
      },
      move:function(p){if(pan)setPos(pan,p);return h;},
      stop:function(tm){
        h.vol(0,tm==null?.4:tm);
        setTimeout(()=>{try{src.stop();}catch(e){}},((tm==null?.4:tm)+.15)*1000);
      }
    };
    return h;
  };
})();
