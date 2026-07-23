/* ==========================================
   DUCO-VISION FULL SHATTER ANIMATION LOGIC
   ========================================== */

(function(){
    const canvas = document.getElementById('login-canvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    let W,H,DPR;

    function resize(){
      DPR = Math.min(window.devicePixelRatio||1, 2);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W*DPR; canvas.height = H*DPR;
      canvas.style.width = W+'px'; canvas.style.height = H+'px';
      ctx.setTransform(1,0,0,1,0,0);
      ctx.scale(DPR,DPR);
    }
    resize();
    window.addEventListener('resize', resize);

    // ── AUDIO ENGINE ──────────────────────────────────────────────────────────
    let audioCtx = null;
    function ensureAudio(){
      if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
      if(audioCtx.state === 'suspended') audioCtx.resume();
      return audioCtx;
    }
    function playBass(freq=60, dur=0.6, gain=0.9){
      const ac = ensureAudio();
      const o = ac.createOscillator();
      const g = ac.createGain();
      const dist = ac.createWaveShaper();
      const curve = new Float32Array(256);
      for(let i=0;i<256;i++){const x=i*2/256-1; curve[i]=x*(3+20*Math.abs(x))/(3+20*Math.abs(x)*Math.abs(x));}
      dist.curve = curve;
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(freq, ac.currentTime);
      o.frequency.exponentialRampToValueAtTime(freq*0.3, ac.currentTime+dur);
      g.gain.setValueAtTime(gain, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+dur);
      o.connect(dist); dist.connect(g); g.connect(ac.destination);
      o.start(); o.stop(ac.currentTime+dur);
    }
    function playCrack(){
      const ac = ensureAudio();
      const buf = ac.createBuffer(1, ac.sampleRate*0.15, ac.sampleRate);
      const data = buf.getChannelData(0);
      for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*Math.exp(-i/(ac.sampleRate*0.04));
      const src = ac.createBufferSource();
      const g = ac.createGain();
      const filt = ac.createBiquadFilter();
      filt.type='bandpass'; filt.frequency.value=3000; filt.Q.value=0.5;
      src.buffer = buf;
      g.gain.setValueAtTime(0.6, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+0.15);
      src.connect(filt); filt.connect(g); g.connect(ac.destination);
      src.start();
    }
    function playExplosion(){
      const ac = ensureAudio();
      playBass(45, 1.2, 1.0);
      setTimeout(()=>playBass(30, 0.8, 0.7), 20);
      const buf = ac.createBuffer(1, ac.sampleRate*0.4, ac.sampleRate);
      const data = buf.getChannelData(0);
      for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*Math.exp(-i/(ac.sampleRate*0.08));
      const src = ac.createBufferSource();
      const g = ac.createGain();
      const hi = ac.createBiquadFilter();
      hi.type='highpass'; hi.frequency.value=4000;
      g.gain.setValueAtTime(0.8, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+0.4);
      src.buffer=buf; src.connect(hi); hi.connect(g); g.connect(ac.destination);
      src.start();
    }
    function playLightFlash(){
      const ac = ensureAudio();
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type='sine'; o.frequency.setValueAtTime(1200,ac.currentTime);
      o.frequency.exponentialRampToValueAtTime(200,ac.currentTime+0.3);
      g.gain.setValueAtTime(0.4,ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+0.3);
      o.connect(g); g.connect(ac.destination);
      o.start(); o.stop(ac.currentTime+0.3);
    }

    // ── STATE ─────────────────────────────────────────────────────────────────
    let phase='idle', lastTS=0;
    let userName='';
    let appearT=0, holdT=0, shakeT=0, crackT=0, flashT=0, shatterT=0;
    let CX,CY,R;
    let shakeX=0,shakeY=0;
    let crackSoundPlayed=false, flashPlayed=false;

    // ── AMBIENT STARS ─────────────────────────────────────────────────────────
    const stars=Array.from({length:300},()=>({
      x:Math.random(),y:Math.random(),
      r:Math.random()*1.4+.2,
      a:Math.random(),da:(Math.random()-.5)*.007,
      vx:(Math.random()-.5)*.12,vy:(Math.random()-.5)*.12
    }));

    // ── CRACK NETWORK ────────────────────────────────────────────────────────
    const CRACKS=[];
    const N1=20;
    for(let i=0;i<N1;i++){
      const angle=(i/N1)*Math.PI*2+(Math.random()-.5)*.2;
      let a=angle;
      const segs=[];
      const steps=7+Math.floor(Math.random()*5);
      const len=0.7+Math.random()*.28;
      for(let s=0;s<steps;s++){
        a+=(Math.random()-.5)*.14;
        const t=(s+1)/steps*len;
        segs.push({x:Math.cos(a)*t,y:Math.sin(a)*t});
      }
      CRACKS.push({segs,delay:i*0.025,w:2.2+Math.random()*.8,tier:1});
    }
    for(let i=0;i<N1;i++){
      const parent=CRACKS[i];
      const numBranches=2+Math.floor(Math.random()*2);
      for(let b=0;b<numBranches;b++){
        const fromIdx=Math.floor(parent.segs.length*.2+Math.random()*parent.segs.length*.6);
        const from=parent.segs[fromIdx]||parent.segs[0];
        const pAngle=Math.atan2(parent.segs[Math.min(fromIdx+1,parent.segs.length-1)].y-from.y,
                                parent.segs[Math.min(fromIdx+1,parent.segs.length-1)].x-from.x);
        const branchA=pAngle+(Math.random()>.5?1:-1)*(.25+Math.random()*.5);
        let ba=branchA;
        const bsegs=[];
        const blen=.15+Math.random()*.25;
        const bsteps=3+Math.floor(Math.random()*3);
        for(let s=0;s<bsteps;s++){
          ba+=(Math.random()-.5)*.18;
          const t=(s+1)/bsteps*blen;
          bsegs.push({x:from.x+Math.cos(ba)*t,y:from.y+Math.sin(ba)*t});
        }
        CRACKS.push({segs:bsegs,delay:CRACKS[i].delay+.08+Math.random()*.05,w:.8+Math.random()*.5,tier:2});
      }
    }
    for(let i=0;i<60;i++){
      const angle=Math.random()*Math.PI*2;
      const startDist=.05+Math.random()*.7;
      const sx=Math.cos(angle)*startDist, sy=Math.sin(angle)*startDist;
      const miclen=.04+Math.random()*.12;
      const micA=Math.random()*Math.PI*2;
      const segs=[
        {x:sx+Math.cos(micA)*miclen*.5, y:sy+Math.sin(micA)*miclen*.5},
        {x:sx+Math.cos(micA)*miclen, y:sy+Math.sin(micA)*miclen},
      ];
      CRACKS.push({segs,delay:.1+Math.random()*.6,w:.4+Math.random()*.35,tier:3});
    }

    // ── FRAGMENTS ─────────────────────────────────────────────────────────────
    let FRAGS=[];
    function buildFrags(cx,cy,r){
      FRAGS=[];
      const mainCracks=CRACKS.filter(c=>c.tier===1);
      const N=mainCracks.length;
      for(let i=0;i<N;i++){
        const cA=mainCracks[i];
        const cB=mainCracks[(i+1)%N];
        const aSegs=cA.segs; const bSegs=cB.segs;
        const aEnd=aSegs[aSegs.length-1]; const bEnd=bSegs[bSegs.length-1];
        const layers=[.3,.6,1.0];
        for(let li=0;li<layers.length;li++){
          const aFrac0=li===0?0:layers[li-1], aFrac1=layers[li];
          const aIdxRange=[Math.floor(aFrac0*aSegs.length),Math.floor(aFrac1*aSegs.length)];
          const bIdxRange=[Math.floor(aFrac0*bSegs.length),Math.floor(aFrac1*bSegs.length)];

          const aSlice=aSegs.slice(aIdxRange[0],Math.max(aIdxRange[0]+1,aIdxRange[1]));
          const bSlice=bSegs.slice(bIdxRange[0],Math.max(bIdxRange[0]+1,bIdxRange[1]));

          const poly=[
            li===0?{x:0,y:0}:null,
            ...aSlice.map(s=>({x:s.x*r,y:s.y*r})),
            {x:Math.cos(Math.atan2(aEnd.y,aEnd.x)+.05)*(aFrac1*r*.95),y:Math.sin(Math.atan2(aEnd.y,aEnd.x)+.05)*(aFrac1*r*.95)},
            {x:Math.cos(Math.atan2(bEnd.y,bEnd.x)-.05)*(aFrac1*r*.95),y:Math.sin(Math.atan2(bEnd.y,bEnd.x)-.05)*(aFrac1*r*.95)},
            ...bSlice.slice().reverse().map(s=>({x:s.x*r,y:s.y*r})),
          ].filter(Boolean);

          let fcx=0,fcy=0;
          poly.forEach(p=>{fcx+=p.x;fcy+=p.y});
          fcx/=poly.length; fcy/=poly.length;
          const explA=Math.atan2(fcy,fcx);
          const explD=Math.sqrt(fcx*fcx+fcy*fcy);
          const speed=(4+Math.random()*8)*(1+explD/(r+1)*.5);
          const isInner=explD<r*.35;
          const isMid=explD<r*.65;

          FRAGS.push({
            poly,cx:cx,cy:cy,
            fcx,fcy,
            vx:Math.cos(explA)*speed+(Math.random()-.5)*2,
            vy:Math.sin(explA)*speed-1-Math.random()*4+(Math.random()-.5)*2,
            rot:0,drot:(Math.random()-.5)*.3,
            isInner,isMid,
            alpha:1,
            glintX:poly[0]?poly[0].x*.25:0, glintY:poly[0]?poly[0].y*.25:0,
          });
        }
      }
    }

    // ── GLASS SHARDS ──────────────────────────────────────────────────────────
    let SHARDS=[];
    function spawnShards(cx,cy,r){
      SHARDS=[];
      for(let i=0;i<90;i++){
        const angle=Math.random()*Math.PI*2;
        const speed=6+Math.random()*16;
        const len=14+Math.random()*50;
        const wid=1.5+Math.random()*7;
        const numVerts=3+Math.floor(Math.random()*3);
        const verts=[];
        for(let v=0;v<numVerts;v++){
          const va=(v/numVerts)*Math.PI*2+(Math.random()-.5)*.6;
          const vr=v%2===0?len*(0.7+Math.random()*.3):len*(0.2+Math.random()*.4);
          verts.push({x:Math.cos(va)*vr*(wid/len*2+.3),y:Math.sin(va)*vr});
        }
        SHARDS.push({
          x:cx+Math.cos(angle)*r*(Math.random()*.4),
          y:cy+Math.sin(angle)*r*(Math.random()*.4),
          vx:Math.cos(angle)*speed*(0.7+Math.random()),
          vy:Math.sin(angle)*speed*(0.5+Math.random())-3-Math.random()*8,
          verts, len, wid,
          rot:angle+(Math.random()-.5)*.8,
          drot:(Math.random()-.5)*.18,
          baseAlpha:.15+Math.random()*.25,
          life:1, decay:.00015+Math.random()*.00025,
          type:'glass',
          gravity:.05+Math.random()*.05,
          tint: Math.random()>.6 ? [255,200,80] : [220,240,255],
        });
      }
      for(let i=0;i<200;i++){
        const angle=Math.random()*Math.PI*2;
        const speed=3+Math.random()*10;
        const len=4+Math.random()*22;
        const wid=0.8+Math.random()*3.5;
        SHARDS.push({
          x:cx+Math.cos(angle)*r*(Math.random()*.9),
          y:cy+Math.sin(angle)*r*(Math.random()*.9),
          vx:Math.cos(angle)*speed*(0.5+Math.random()),
          vy:Math.sin(angle)*speed*(0.4+Math.random())-1.5-Math.random()*5,
          verts:null, len, wid,
          rot:Math.random()*Math.PI*2,
          drot:(Math.random()-.5)*.22,
          baseAlpha:.12+Math.random()*.2,
          life:1, decay:.0002+Math.random()*.0005,
          type:'splinter',
          gravity:.03+Math.random()*.04,
          tint: Math.random()>.5 ? [255,210,100] : [200,230,255],
        });
      }
      for(let i=0;i<350;i++){
        const angle=Math.random()*Math.PI*2;
        const speed=1+Math.random()*9;
        const sz=0.5+Math.random()*3.5;
        SHARDS.push({
          x:cx+(Math.random()-.5)*r*2.5,
          y:cy+(Math.random()-.5)*r*2.5,
          vx:Math.cos(angle)*speed,
          vy:Math.sin(angle)*speed-0.5,
          verts:null, len:sz, wid:sz*.4,
          rot:Math.random()*Math.PI*2,
          drot:(Math.random()-.5)*.3,
          baseAlpha:.5+Math.random()*.5,
          life:1, decay:.0004+Math.random()*.0012,
          type:'dust',
          gravity:.018,
          tint: Math.random()>.4 ? [255,220,80] : [255,255,255],
        });
      }
    }

    function drawShard(s){
      const a=s.life*s.baseAlpha; if(a<=.005)return;
      ctx.save();
      ctx.translate(s.x,s.y);
      ctx.rotate(s.rot);

      if(s.type==='dust'){
        ctx.globalAlpha=s.life*s.baseAlpha;
        ctx.beginPath();
        ctx.arc(0,0,s.len,0,Math.PI*2);
        ctx.fillStyle=`rgba(${s.tint[0]},${s.tint[1]},${s.tint[2]},1)`;
        ctx.fill();
        if(s.len>2){
          ctx.globalAlpha=s.life*s.baseAlpha*.5;
          ctx.beginPath();
          ctx.moveTo(-s.len*2,0); ctx.lineTo(s.len*2,0);
          ctx.moveTo(0,-s.len*2); ctx.lineTo(0,s.len*2);
          ctx.strokeStyle=`rgba(255,255,255,0.8)`;
          ctx.lineWidth=.5; ctx.stroke();
        }
      } else if(s.type==='splinter'){
        ctx.beginPath();
        ctx.moveTo(0,-s.len*.5);
        ctx.lineTo(s.wid*.5,s.len*.1);
        ctx.lineTo(s.wid*.3,s.len*.5);
        ctx.lineTo(-s.wid*.3,s.len*.5);
        ctx.lineTo(-s.wid*.5,s.len*.1);
        ctx.closePath();

        ctx.globalAlpha=s.life*s.baseAlpha;
        ctx.fillStyle=`rgba(${s.tint[0]},${s.tint[1]},${s.tint[2]},0.08)`;
        ctx.fill();

        ctx.globalAlpha=s.life*(s.baseAlpha*3+.1);
        ctx.strokeStyle=`rgba(${s.tint[0]},${s.tint[1]},${s.tint[2]},0.9)`;
        ctx.lineWidth=.7;
        ctx.stroke();

        ctx.globalAlpha=s.life*(s.baseAlpha*2+.2);
        ctx.beginPath();
        ctx.moveTo(s.wid*.05,-s.len*.42);
        ctx.lineTo(s.wid*.28,s.len*.05);
        ctx.strokeStyle='rgba(255,255,255,0.85)';
        ctx.lineWidth=.5; ctx.stroke();
      } else {
        if(!s.verts||s.verts.length<3){ctx.restore();return;}
        ctx.beginPath();
        s.verts.forEach((v,i)=>i===0?ctx.moveTo(v.x,v.y):ctx.lineTo(v.x,v.y));
        ctx.closePath();

        ctx.globalAlpha=s.life*s.baseAlpha;
        const gfill=ctx.createLinearGradient(s.verts[0].x,s.verts[0].y,
                                              s.verts[Math.floor(s.verts.length/2)].x,
                                              s.verts[Math.floor(s.verts.length/2)].y);
        gfill.addColorStop(0,`rgba(${s.tint[0]},${s.tint[1]},${s.tint[2]},0.06)`);
        gfill.addColorStop(.5,'rgba(255,255,255,0.04)');
        gfill.addColorStop(1,`rgba(${s.tint[0]},${s.tint[1]},${s.tint[2]},0.1)`);
        ctx.fillStyle=gfill;
        ctx.fill();

        ctx.globalAlpha=s.life*(s.baseAlpha*4+.15);
        ctx.strokeStyle=`rgba(${s.tint[0]},${s.tint[1]},${s.tint[2]},0.95)`;
        ctx.lineWidth=1.1; ctx.stroke();

        ctx.globalAlpha=s.life*(s.baseAlpha*3);
        ctx.beginPath();
        const v0=s.verts[0], v1=s.verts[1]||s.verts[0];
        ctx.moveTo(v0.x*.2,v0.y*.2);
        ctx.lineTo(v0.x*.6+v1.x*.2, v0.y*.6+v1.y*.2);
        ctx.strokeStyle='rgba(255,255,255,0.9)';
        ctx.lineWidth=.8; ctx.stroke();
      }
      ctx.restore();
    }

    // ── DRAW COIN ─────────────────────────────────────────────────────────────
    function drawCoin(cx,cy,r,crackP,alpha,spinA){
      ctx.save();
      ctx.translate(cx,cy);
      if(spinA) ctx.rotate(spinA);
      ctx.globalAlpha=alpha;

      const outerGlow=ctx.createRadialGradient(0,0,r*.6,0,0,r*2.2);
      outerGlow.addColorStop(0,'rgba(255,130,0,.18)');
      outerGlow.addColorStop(.5,'rgba(255,80,0,.06)');
      outerGlow.addColorStop(1,'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(0,0,r*2.2,0,Math.PI*2);
      ctx.fillStyle=outerGlow; ctx.fill();

      const rimGrad=ctx.createLinearGradient(-r,-r,r,r);
      rimGrad.addColorStop(0,'#fff8c0');
      rimGrad.addColorStop(.25,'#ffd040');
      rimGrad.addColorStop(.5,'#ff7700');
      rimGrad.addColorStop(.75,'#cc4400');
      rimGrad.addColorStop(1,'#ff9900');
      ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2);
      ctx.fillStyle=rimGrad; ctx.fill();

      const bevel=ctx.createRadialGradient(0,0,r*.6,0,0,r*.98);
      bevel.addColorStop(0,'rgba(255,220,80,.0)');
      bevel.addColorStop(.7,'rgba(255,180,20,.1)');
      bevel.addColorStop(1,'rgba(255,255,180,.35)');
      ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2);
      ctx.fillStyle=bevel; ctx.fill();

      const innerGrad=ctx.createRadialGradient(-r*.15,-r*.15,0,0,0,r*.75);
      innerGrad.addColorStop(0,'rgba(255,255,255,1)');
      innerGrad.addColorStop(.18,'rgba(255,250,220,1)');
      innerGrad.addColorStop(.45,'rgba(255,230,100,.95)');
      innerGrad.addColorStop(.75,'rgba(255,150,10,.8)');
      innerGrad.addColorStop(1,'rgba(200,70,0,.4)');
      ctx.beginPath(); ctx.arc(0,0,r*.78,0,Math.PI*2);
      ctx.fillStyle=innerGrad; ctx.fill();

      ctx.font=`900 ${r*.62}px Orbitron,monospace`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle='rgba(140,55,0,.7)';
      ctx.fillText('D',r*.02,r*.025);
      ctx.fillStyle='rgba(255,255,255,.92)';
      ctx.fillText('D',0,0);
      ctx.fillStyle='rgba(255,255,220,.35)';
      ctx.font=`900 ${r*.61}px Orbitron,monospace`;
      ctx.fillText('D',-r*.012,-r*.012);

      ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2);
      ctx.strokeStyle='rgba(255,220,80,.5)';
      ctx.lineWidth=r*.022; ctx.stroke();

      ctx.beginPath(); ctx.arc(0,0,r*.8,0,Math.PI*2);
      ctx.strokeStyle='rgba(255,200,60,.3)';
      ctx.lineWidth=r*.012; ctx.stroke();

      const hl1=ctx.createRadialGradient(-r*.3,-r*.35,0,-r*.28,-r*.32,r*.45);
      hl1.addColorStop(0,'rgba(255,255,255,.55)');
      hl1.addColorStop(.6,'rgba(255,255,255,.08)');
      hl1.addColorStop(1,'rgba(255,255,255,0)');
      ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2);
      ctx.fillStyle=hl1; ctx.fill();

      const hl2=ctx.createRadialGradient(r*.3,r*.3,0,r*.28,r*.28,r*.38);
      hl2.addColorStop(0,'rgba(255,200,100,.2)');
      hl2.addColorStop(1,'rgba(255,200,100,0)');
      ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2);
      ctx.fillStyle=hl2; ctx.fill();

      ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.clip();

      if(crackP>0){
        CRACKS.forEach((crack)=>{
          const localP=Math.max(0,Math.min(1,(crackP-crack.delay)*3.5));
          if(localP<=0) return;

          const baseWidth=crack.w*(crack.tier===1?1:crack.tier===2?.55:.3);
          const segs=crack.segs;

          ctx.beginPath();
          ctx.moveTo(0,0);

          const visSegs=Math.ceil(localP*segs.length);
          for(let si=0;si<visSegs;si++){
            const seg=segs[si];
            const segFrac=Math.min(1,localP*segs.length-si);
            const prevX=si===0?0:segs[si-1].x*r;
            const prevY=si===0?0:segs[si-1].y*r;
            const tx=prevX+(seg.x*r-prevX)*segFrac;
            const ty=prevY+(seg.y*r-prevY)*segFrac;
            ctx.lineTo(tx,ty);
          }

          ctx.strokeStyle=`rgba(0,0,0,${crack.tier===1?.85:crack.tier===2?.7:.5})`;
          ctx.lineWidth=baseWidth*1.5;
          ctx.lineCap='round';
          ctx.stroke();

          ctx.strokeStyle=crack.tier===1
            ?`rgba(200,235,255,${.7*localP})`
            :`rgba(220,245,255,${.5*localP})`;
          ctx.lineWidth=baseWidth*(crack.tier===1?.7:.4);
          ctx.stroke();

          if(localP>.7 && crack.tier<3){
            const last=segs[segs.length-1];
            const gl=ctx.createRadialGradient(last.x*r,last.y*r,0,last.x*r,last.y*r,r*(crack.tier===1?.06:.035));
            gl.addColorStop(0,'rgba(255,255,255,.95)');
            gl.addColorStop(.4,'rgba(180,230,255,.5)');
            gl.addColorStop(1,'rgba(0,0,0,0)');
            ctx.beginPath(); ctx.arc(last.x*r,last.y*r,r*(crack.tier===1?.06:.035),0,Math.PI*2);
            ctx.fillStyle=gl; ctx.fill();
          }
        });

        if(crackP>.35){
          const darkA=Math.min(.45,(crackP-.35)*.9);
          ctx.fillStyle=`rgba(5,10,20,${darkA})`;
          ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();

          const prism=ctx.createRadialGradient(-r*.1,r*.05,0,0,0,r);
          prism.addColorStop(0,`rgba(160,210,255,${darkA*.35})`);
          prism.addColorStop(.4,`rgba(255,220,80,${darkA*.2})`);
          prism.addColorStop(.8,`rgba(200,80,255,${darkA*.12})`);
          prism.addColorStop(1,'rgba(0,0,0,0)');
          ctx.fillStyle=prism;
          ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
        }

        if(crackP>.5){
          const innerLight=(crackP-.5)*2;
          const il=ctx.createRadialGradient(0,0,0,0,0,r*.7);
          il.addColorStop(0,`rgba(255,255,240,${Math.min(.9,innerLight*.8)})`);
          il.addColorStop(.3,`rgba(255,220,100,${Math.min(.5,innerLight*.4)})`);
          il.addColorStop(1,'rgba(0,0,0,0)');
          ctx.fillStyle=il;
          ctx.beginPath(); ctx.arc(0,0,r*.7,0,Math.PI*2); ctx.fill();
        }
      }

      ctx.restore();
    }

    // ── DRAW FRAGS ────────────────────────────────────────────────────────────
    function drawFrags(t){
      const ease=t*t*(3-2*t);
      FRAGS.forEach(f=>{
        const a=Math.max(0,1-t*1.2); if(a<=.01)return;
        const px=f.cx+f.fcx+f.vx*ease*180;
        const py=f.cy+f.fcy+f.vy*ease*180+ease*ease*60;
        const rot=f.rot+f.drot*ease*25;
        ctx.save();
        ctx.translate(px,py);
        ctx.rotate(rot);
        ctx.globalAlpha=a;

        ctx.beginPath();
        f.poly.forEach((pt,i)=>i===0?ctx.moveTo(pt.x,pt.y):ctx.lineTo(pt.x,pt.y));
        ctx.closePath();

        if(f.isInner){
          const g=ctx.createLinearGradient(0,-20,20,20);
          g.addColorStop(0,'rgba(255,255,255,1)');
          g.addColorStop(.3,'rgba(240,250,255,.95)');
          g.addColorStop(.7,'rgba(200,230,255,.85)');
          g.addColorStop(1,'rgba(150,200,255,.6)');
          ctx.fillStyle=g;
        } else if(f.isMid){
          const g=ctx.createLinearGradient(0,-15,15,15);
          g.addColorStop(0,'rgba(255,230,100,1)');
          g.addColorStop(.4,'rgba(255,160,30,.9)');
          g.addColorStop(1,'rgba(200,80,0,.7)');
          ctx.fillStyle=g;
        } else {
          const g=ctx.createLinearGradient(-10,-10,10,10);
          g.addColorStop(0,'rgba(255,180,50,1)');
          g.addColorStop(.5,'rgba(200,80,0,.85)');
          g.addColorStop(1,'rgba(100,30,0,.6)');
          ctx.fillStyle=g;
        }
        ctx.fill();

        ctx.strokeStyle=f.isInner?'rgba(220,240,255,.8)':'rgba(255,220,80,.6)';
        ctx.lineWidth=.9; ctx.stroke();

        ctx.beginPath();
        ctx.arc(f.glintX,f.glintY,Math.max(2,Math.abs(f.fcx)*.08),0,Math.PI*2);
        ctx.fillStyle=`rgba(255,255,255,${a*.6})`;
        ctx.fill();

        ctx.restore();
      });
    }

    // ── FLASH ─────────────────────────────────────────────────────────────────
    let flashAlpha=0;
    function drawFlash(t){
      const peak=Math.max(0,1-Math.abs(t-.15)/.15);
      flashAlpha=peak*.98;
      if(flashAlpha<.01)return;
      const fl=ctx.createRadialGradient(CX,CY,0,CX,CY,R*2.5);
      fl.addColorStop(0,`rgba(255,255,255,${flashAlpha})`);
      fl.addColorStop(.15,`rgba(255,240,200,${flashAlpha*.85})`);
      fl.addColorStop(.4,`rgba(255,200,80,${flashAlpha*.4})`);
      fl.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=fl;
      ctx.fillRect(0,0,W,H);
    }

    // ── SHOCKWAVE ─────────────────────────────────────────────────────────────
    function drawShockwave(t){
      [0, .15, .3].forEach((offset,i)=>{
        const st=Math.max(0,t-offset);
        if(st<=0||st>=1)return;
        const sr=R*(1+st*3.5);
        const sa=Math.max(0,.5-st*.55);
        ctx.beginPath(); ctx.arc(CX,CY,sr,0,Math.PI*2);
        ctx.strokeStyle=i===0?`rgba(255,230,100,${sa})`
                      :i===1?`rgba(255,200,80,${sa*.7})`
                      :`rgba(200,240,255,${sa*.5})`;
        ctx.lineWidth=Math.max(.5,3*(1-st)*(i===0?1:.6));
        ctx.stroke();
      });
    }

    // ── VIBRATION SEQUENCER ───────────────────────────────────────────────────
    function computeShake(t){
      const freq=35+t*50;
      const envelope=t*t;
      const mag=envelope*18;
      const sx=(Math.sin(t*freq*Math.PI*2)*mag + (Math.random()-.5)*mag*.5);
      const sy=(Math.cos(t*freq*Math.PI*2)*mag*.8 + (Math.random()-.5)*mag*.5);
      return {sx,sy};
    }

    // ── LOGIN ABSCHLIESSEN ────────────────────────────────────────────────────
    let handedOff=false;
    function handOffToDashboard(){
      if(handedOff)return;
      handedOff=true;
      const overlay=document.getElementById('login-overlay');
      const origInput=document.getElementById('username-input');
      const origBtn=document.getElementById('login-btn');
      
      if(origInput) origInput.value=userName;
      if(origBtn) origBtn.click();

      setTimeout(()=>{
        if(overlay) overlay.classList.add('bg-mode');
      }, 900);
    }

    // ── MAIN LOOP ─────────────────────────────────────────────────────────────
    function loop(ts){
      requestAnimationFrame(loop);
      const dt=Math.min((ts-lastTS)/1000,.05); lastTS=ts;
      CX=W/2; CY=H/2; R=Math.min(W,H)*.28;

      ctx.clearRect(0,0,W,H);
      const overlay = document.getElementById('login-overlay');
      const bgMode = overlay ? overlay.classList.contains('bg-mode') : false;
      
      if(!bgMode){
        ctx.fillStyle='#000'; ctx.fillRect(0,0,W,H);
        stars.forEach(s=>{
          s.x+=s.vx/W; s.y+=s.vy/H; s.a+=s.da;
          if(s.x<0)s.x=1;if(s.x>1)s.x=0;
          if(s.y<0)s.y=1;if(s.y>1)s.y=0;
          if(s.a<0||s.a>1)s.da*=-1;
          ctx.beginPath(); ctx.arc(s.x*W,s.y*H,s.r,0,Math.PI*2);
          ctx.fillStyle=`rgba(255,150,50,${s.a*.35})`; ctx.fill();
        });
      }

      if(phase==='flash'||phase==='shatter'||phase==='drift'||phase==='done'){
        SHARDS.forEach(s=>{
          s.x+=s.vx; s.y+=s.vy;
          s.vy+=s.gravity*.1;
          s.vx*=.9992; s.vy*=.9988;
          s.rot+=s.drot;
          s.life-=s.decay;
          if(s.life<0)s.life=0;
          if(s.x<-80)s.x=W+80; if(s.x>W+80)s.x=-80;
          if(s.y>H+80){s.y=-80; s.x=Math.random()*W;}
          drawShard(s);
        });
      }

      if(phase==='idle')return;

      if(phase==='appear'){
        appearT+=dt*1.2;
        const ep=1-(1-Math.min(1,appearT))*(1-Math.min(1,appearT))*(1-Math.min(1,appearT));
        const scale=.1+ep*.9;
        const spinA=(1-ep)*Math.PI*3;
        ctx.save();
        ctx.translate(CX,CY); ctx.scale(scale,scale); ctx.translate(-CX,-CY);
        drawCoin(CX,CY,R,0,Math.min(1,appearT*1.8),spinA);
        ctx.restore();
        if(appearT>=1.1){phase='hold';holdT=0;}
      }

      if(phase==='hold'){
        holdT+=dt;
        drawCoin(CX,CY,R,0,1,0);
        if(holdT>.5){phase='vibrate';shakeT=0;crackSoundPlayed=false;
          playBass(55,0.9,0.95);
        }
      }

      if(phase==='vibrate'){
        shakeT+=dt;
        const vt=Math.min(1,shakeT/.8);
        const sh=computeShake(vt);
        if(shakeT>.1 && !crackSoundPlayed){
          crackSoundPlayed=true;
          playBass(38,1.5,0.8);
        }
        ctx.save();
        ctx.translate(sh.sx,sh.sy);
        drawCoin(CX,CY,R,0,1,0);
        ctx.restore();
        if(shakeT>=.85){
          phase='crack'; crackT=0;
          playCrack();
        }
      }

      if(phase==='crack'){
        crackT+=dt*.7;
        const shakeEnv=Math.min(1,crackT*.8)*(1-Math.max(0,(crackT-.6)*2));
        const sh=computeShake(shakeEnv*.7+.3);
        shakeX=sh.sx*shakeEnv; shakeY=sh.sy*shakeEnv;

        if(crackT>.15&&!flashPlayed){
          flashPlayed=true;
          playCrack();
        }

        ctx.save();
        ctx.translate(shakeX,shakeY);
        drawCoin(CX,CY,R,crackT,1,0);
        ctx.restore();

        if(crackT>.3){
          const bleedA=Math.min(.3,(crackT-.3)*1.2);
          const bl=ctx.createRadialGradient(CX+shakeX,CY+shakeY,0,CX+shakeX,CY+shakeY,R*1.8);
          bl.addColorStop(0,`rgba(255,255,200,${bleedA})`);
          bl.addColorStop(.5,`rgba(255,200,80,${bleedA*.4})`);
          bl.addColorStop(1,'rgba(0,0,0,0)');
          ctx.fillStyle=bl; ctx.fillRect(0,0,W,H);
        }

        if(crackT>=1.4){
          phase='flash'; flashT=0;
          playLightFlash();
        }
      }

      if(phase==='flash'){
        flashT+=dt*3.5;

        if(flashT<=dt*3.5+0.01 && SHARDS.length===0){
          spawnShards(CX,CY,R);
        }

        ctx.save();
        ctx.translate((Math.random()-.5)*5,(Math.random()-.5)*5);
        drawCoin(CX,CY,R,1.4,1,0);
        ctx.restore();

        drawFlash(flashT);

        if(flashT>=.42){
          phase='shatter'; shatterT=0;
          buildFrags(CX,CY,R);
          playExplosion();
          const g=document.getElementById('login-greet');
          if(g){
            g.textContent=`Hey, ${userName}!`;
            setTimeout(()=>g.style.opacity='1',400);
          }
        }
      }

      if(phase==='shatter'){
        shatterT+=dt*.65;

        if(shatterT<.12){
          const fb=Math.max(0,.12-shatterT)/.12;
          ctx.fillStyle=`rgba(255,250,220,${fb*.6})`; ctx.fillRect(0,0,W,H);
        }

        drawShockwave(shatterT);
        drawFrags(shatterT);

        if(shatterT>=1.6){
          phase='drift';
          SHARDS.forEach(s=>{s.life=Math.min(s.life,0.85);});
          const g=document.getElementById('login-greet');
          if(g) g.style.opacity='0';
          handOffToDashboard();
        }
      }
    }

    requestAnimationFrame(loop);

    document.addEventListener("DOMContentLoaded", () => {
      const input = document.getElementById('login-name-input');
      if(!input) return;

      input.addEventListener('keydown', e => {
        if(e.key!=='Enter')return;
        const v=e.target.value.trim();
        if(!v||phase!=='idle')return;
        userName=v;
        const ui = document.getElementById('login-ui');
        if(ui) {
            ui.style.opacity='0';
            ui.style.pointerEvents='none';
        }
        phase='appear'; appearT=0;
      });
    });
})();