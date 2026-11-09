"""Tarayıcı testi: menü, yeni şehir, Valilik, yol, alanlar, zaman, paneller, kayıt.
Kullanım: python3 tests/smoke.py [ekran-görüntüsü-klasörü]   (önce: python3 tools/build.py)"""
import asyncio, os, sys, threading, http.server, functools
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = sys.argv[1] if len(sys.argv) > 1 else None

def serve():
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    h = functools.partial(Q, directory=os.path.join(ROOT, 'web'))
    s = http.server.ThreadingHTTPServer(('127.0.0.1', 0), h)
    threading.Thread(target=s.serve_forever, daemon=True).start()
    return s

async def main():
    srv = serve(); url = f'http://127.0.0.1:{srv.server_address[1]}/index.html'
    async with async_playwright() as p:
        kw = {'args': ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']}
        if os.environ.get('CHROME'): kw['executable_path'] = os.environ['CHROME']
        br = await p.chromium.launch(**kw)
        ctx = await br.new_context(viewport={'width': 844, 'height': 390}, device_scale_factor=2, has_touch=True)
        pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
        pg.on('console', lambda m: m.type == 'error' and errs.append('console: ' + m.text))
        async def shot(n):
            if SHOTS: os.makedirs(SHOTS, exist_ok=True); await pg.screenshot(path=os.path.join(SHOTS, n + '.png'))
        await pg.goto(url); await pg.wait_for_timeout(1500)
        await shot('01-menu')
        await pg.click('#mNew'); await pg.wait_for_timeout(200); await shot('02-setup')
        await pg.click('#mGo'); await pg.wait_for_timeout(800); await shot('03-start')
        assert await pg.evaluate('document.getElementById("menu").hidden'), 'menü kapanmalı'
        # Valilik dış yolun yakınına, ana cadde, alanlar
        info = await pg.evaluate('''()=>{
          const V=self.Vali, W=self.__vali, G=W.G(), N=G.N, ry=G.entry.y, I=(x,y)=>y*N+x;
          const ok=(x,y)=>[[x,y],[x+1,y],[x,y+1],[x+1,y+1]].every(([a,b])=>G.t[I(a,b)]===0||G.t[I(a,b)]===2);
          let gx=12; while(!ok(gx,ry-2)) gx++;
          const r1=W.paint('gov',[I(gx,ry-2)]);
          const road=[]; for(let x=5;x<gx+12;x++) road.push(I(x,ry));
          const r2=W.paint('road',road);
          const side=[]; for(let y=ry-6;y<=ry+6;y++) if(y!==ry) side.push(I(gx+4,y),I(gx-3,y));
          W.paint('road',side);
          const res=[],farm=[],com=[];
          for(let y=ry-5;y<=ry+5;y++){ if(y===ry) continue;
            for(const x of [gx+3,gx+5,gx-2,gx-4]) (Math.abs(y-ry)<=3?res:farm).push(I(x,y)); }
          for(let x=gx+5;x<gx+10;x++){ com.push(I(x,ry+1)); }
          W.paint('res',res); W.paint('farm',farm); W.paint('com',com);
          return {gov:r1.done, road:r2.done, outside:V.cache(G).outside, money:G.money};
        }''')
        print('kurulum', info)
        assert info['gov'] and info['road'] and info['outside'], 'Valilik ve dış yol bağlantısı kurulmalı'
        await pg.wait_for_timeout(400); await shot('04-plan')
        await pg.evaluate('()=>__vali.step(150)')
        st = await pg.evaluate('()=>{const G=__vali.G(),T=Vali.totals(G);return {P:T.P,money:Math.round(G.money),date:Vali.dateText(G)}}')
        print('5 ay sonra', st)
        assert st['P'] > 10, 'nüfus artmalı'
        W_ = await pg.evaluate('()=>{const W=__vali,G=W.G(),N=G.N,ry=G.entry.y; const c=Vali.cache(G); const h=c.zones[1].find(i=>G.lv[i]>0)||c.zones[1][0]; let done=false; for(let r=1;r<5&&!done;r++) for(let dy=-r;dy<=r&&!done;dy++) for(let dx=-r;dx<=r&&!done;dx++){ done=W.paint("fountain",[h+dy*N+dx]).done; } if(!done) throw new Error("çeşme kurulamadı"); W.step(240); return Vali.totals(G).P}')
        print('13 ay sonra nüfus', W_)
        await pg.wait_for_timeout(500); await shot('05-town')
        await pg.evaluate('()=>{const G=__vali.G(); __vali.view().focus(G.gov.y*G.N+G.gov.x+2, 9)}')
        await pg.wait_for_timeout(500); await shot('06-close')
        await pg.evaluate('()=>__vali.setTool("fountain")'); await pg.wait_for_timeout(300); await shot('06b-water-layer')
        await pg.evaluate('()=>__vali.setTool("pan")')
        # Hizmet ve üretim: alt menü, karakol, mektep, oduncu/taş ocağı, görev ve şantiye
        await pg.click('#tools .t-svc'); await pg.wait_for_timeout(200); await shot('06c-flyout')
        assert await pg.is_visible('#flyout'), 'hizmet alt menüsü açılmalı'
        await pg.click('#flyout [data-tool=police]'); await pg.wait_for_timeout(100)
        ext = await pg.evaluate('''()=>{
          const V=Vali,W=__vali,G=W.G(),N=G.N; G.money+=5000;
          const c=V.cache(G); const free=[]; for(let i=0;i<N*N;i++) if(c.served[i]&&!G.z[i]&&!G.sv[i]&&!G.r[i]&&(G.t[i]===0||G.t[i]===2)) free.push(i);
          const put=(k,ok)=>{ for(const i of free.filter(ok||(()=>true))) if(W.paint(k,[i]).done) return true; return false; };
          const r={police:put('police'),school:put('school'),square:false,lumber:put('lumber',i=>V.resourceFactor(G,i,'forest')>0)};
          for(const i of free){ if(W.paint('square',[i]).done){ r.square=true; break; } }
          W.step(30*24);
          const site=[]; for(const i of free) if(!G.sv[i]&&!G.z[i]) site.push(i);
          r.proj=!!G.proj; if(G.proj){ for(const i of site) if(W.paint('site',[i]).done){ r.site=true; break; } }
          G.res.tas=400; G.res.kereste=400; W.step(30*3);
          r.got=G.proj?JSON.stringify(G.proj.got):'bitti '+G.done.length; r.P=V.totals(G).P; r.hf=JSON.stringify(G.hf.i);
          return r;
        }''')
        print('hizmet/üretim', ext)
        assert ext['police'] and ext['school'] and ext['proj'], 'karakol, mektep ve görev'
        await pg.evaluate('()=>{const G=__vali.G(); __vali.view().focus(G.gov.y*G.N+G.gov.x+2, 16)}')
        await pg.wait_for_timeout(400); await shot('06d-services')
        await pg.click('#projb'); await pg.wait_for_timeout(200); await shot('06e-project')
        await pg.click('#panel .x')
        # 0.3: ulaşım alt menüsü, çapraz yol, büyük yapılar, afet, tren
        await pg.click('#tools .t-way'); await pg.wait_for_timeout(150); await shot('06f-way')
        assert await pg.is_disabled('#flyout [data-tool=rail]'), 'ray görevden önce kilitli'
        await pg.click('#flyout [data-tool=road]')
        big = await pg.evaluate('''()=>{
          const V=Vali,W=__vali,G=W.G(),N=G.N; G.money+=60000;
          // nüfusu büyük yapılar için zorla
          const c=V.cache(G); for(const i of c.zones[1]) if(G.lv[i]>0){ G.lv[i]=3; G.pg[i]=1; G.pop[i]=28; } G.grp.i+=600; V.touch(G);
          const P=V.totals(G).P;
          const tryAll=(k)=>{ for(let i=0;i<N*N;i++){ const q=V.quote(G,k,[i]); if(q.ok.length&&!q.bad.length&&q.ok.some(j=>V.cache(G).served[j])) return W.paint(k,[i]).done; } return false; };
          const r={P, bigsq:tryAll('bigsq'), hippo:tryAll('hippo'), fire:tryAll('fire'), mill:tryAll('mill'), smallsq:tryAll('smallsq')};
          V.disasters(G,V.totals(G),V.cache(G),'fire'); W.step(1);
          // demiryolu görevini bitir ve istasyonu ana hatta bağla
          G.done.push({id:'aqueduct',year:1855}); G.fx.aqueduct=1; G.proj=null; G.projNext=1; G.day=Math.max(G.day,360*11+5);
          for(const m of G.multi) if(m.k===V.S_SITE){ for(const j of V.multiTiles(G,m)) G.sv[j]=0; } G.multi=G.multi.filter(m=>m.k!==V.S_SITE);
          W.step(35); r.rail=!!G.proj;
          for(let i=0;i<N*N;i++){ const q=V.quote(G,'site',[i]); if(q.ok.length===4&&q.ok.some(j=>V.cache(G).served[j])){ W.paint('site',[i]); break; } }
          G.res.demir=600; G.res.kereste=600; G.res.komur=600; W.step(30*5); r.fx=!!G.fx.rail;
          const m=G.multi.find(q=>q.pid==='rail'); const goal=G.railEntry.y*N+G.railEntry.x+4;
          const prev=new Map(),q=[]; for(const t of V.multiTiles(G,m)) for(const j of V.neigh4(G,t)) if(!prev.has(j)&&!G.sv[j]){prev.set(j,-1);q.push(j);}
          let hit=-1; while(q.length){ const i=q.shift(); if(i===goal||V.neigh4(G,i).includes(goal)){hit=i;break;} for(const j of V.neigh4(G,i)) if(!prev.has(j)&&G.t[j]!==3&&!G.sv[j]&&!(G.z[j]&&G.lv[j]>0)&&!G.rl[j]){prev.set(j,i);q.push(j);} }
          const path=[]; for(let k=hit;k!==-1&&k!=null;k=prev.get(k)) path.push(k);
          r.railLaid=W.paint('rail',path.filter(i=>!G.rl[i])).done; r.out=V.cache(G).railOut;
          __vali.view().focus(m.y*N+m.x, 14);
          return r;
        }''')
        print('0.3', big)
        assert big['bigsq'] and big['hippo'] and big['fire'] and big['fx'] and big['railLaid'] and big['out'], big
        await pg.evaluate('()=>__vali.setSpeed(3)'); await pg.wait_for_timeout(2500); await shot('06g-train')
        await pg.evaluate('()=>{const G=__vali.G(),m=G.multi.find(q=>q.k===Vali.S_HIPPO); __vali.view().focus(m.y*G.N+m.x+1, 13)}'); await pg.wait_for_timeout(300); await shot('06h-hippo')
        await pg.evaluate('()=>{const G=__vali.G(),m=G.multi.find(q=>q.k===Vali.S_BIGSQ); __vali.view().focus(m.y*G.N+m.x+1, 11)}'); await pg.wait_for_timeout(300); await shot('06i-bigsq')
        await pg.evaluate('()=>__vali.setSpeed(0)')
        await pg.click('#popb'); await pg.wait_for_timeout(200)
        await pg.evaluate('()=>document.querySelector("#panel .body").scrollTop=9999'); await pg.wait_for_timeout(100); await shot('06j-risk')
        await pg.click('#panel .x')
        # çapraz yol önizlemesi
        await pg.evaluate('()=>{__vali.setTool("road"); const G=__vali.G(); __vali.view().focus(G.gov.y*G.N+G.gov.x, 22)}')
        await pg.mouse.move(380, 160); await pg.mouse.down(); await pg.mouse.move(520, 300, steps=8); await pg.mouse.up(); await pg.wait_for_timeout(150)
        await shot('06k-diag'); await pg.click('#plan .no')
        # Paneller
        await pg.click('#money'); await pg.wait_for_timeout(200); await shot('07-budget')
        assert await pg.is_visible('#tax')
        await pg.click('#menuBtn'); await pg.wait_for_timeout(200); await shot('07b-menu'); await pg.click('#menuBtn')
        await pg.click('#popb'); await pg.wait_for_timeout(200); await shot('08-city')
        await pg.click('#panel .x')
        # Gez aracıyla dokunarak bina bilgisi
        await pg.evaluate('()=>__vali.setTool("pan")')
        await pg.mouse.click(422, 200); await pg.wait_for_timeout(200); await shot('09-inspect')
        # Sürükleyerek yol önizlemesi
        await pg.evaluate('()=>__vali.setTool("road")')
        await pg.mouse.move(300, 300); await pg.mouse.down(); await pg.mouse.move(420, 300, steps=6)
        await pg.wait_for_timeout(150); await shot('10-drag-road')
        hint = await pg.inner_text('#hint'); print('ipucu:', hint)
        await pg.mouse.up(); await pg.wait_for_timeout(150)
        # Sürüklemek hemen yapmaz: plan ✓ bekler
        assert await pg.is_visible('#plan'), 'plan onay çubuğu görünmeli'
        await shot('10b-plan')
        await pg.click('#plan .no'); assert not await pg.is_visible('#plan')
        # Dokunmatik: tek parmakla sürüklemek yol çizmez, haritayı kaydırır
        cnt = await pg.evaluate('()=>__vali.G().r.filter(Boolean).length')
        cdp = await ctx.new_cdp_session(pg)
        async def touch(kind, pts):
            await cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': [{'x': x, 'y': y} for x, y in pts]})
        await touch('touchStart', [(500, 250)])
        for k in range(1, 8): await touch('touchMove', [(500 - k * 20, 250 + k * 6)])
        await touch('touchEnd', [])
        await pg.wait_for_timeout(150)
        assert await pg.evaluate('()=>__vali.G().r.filter(Boolean).length') == cnt, 'kaydırma yol yapmamalı'
        if await pg.is_visible('#plan'): await pg.click('#plan .no')   # yavaş makinede uzun basma sayılabilir, yine de onaysız yapılmaz
        # İki dokunuşla plan, ✓ ile inşa
        await touch('touchStart', [(430, 300)]); await touch('touchEnd', [])
        await pg.wait_for_timeout(120)
        await touch('touchStart', [(560, 300)]); await touch('touchEnd', [])
        await pg.wait_for_timeout(150); await shot('10c-tap-plan')
        assert await pg.is_visible('#plan'), 'iki dokunuştan sonra plan çıkmalı'
        m0 = await pg.evaluate('()=>__vali.G().money')
        if await pg.is_enabled('#plan .yes'):
            await pg.click('#plan .yes'); await pg.wait_for_timeout(150)
            assert await pg.evaluate('()=>__vali.G().money') < m0, 'onaydan sonra para harcanmalı'
        else:
            await pg.click('#plan .no')
        # Kayıt ve yeniden yükleme
        await pg.evaluate('()=>__vali.save()')
        before = await pg.evaluate('()=>Vali.totals(__vali.G()).P')
        await pg.reload(); await pg.wait_for_timeout(1200)
        assert await pg.is_visible('#mCont'), 'Devam et düğmesi görünmeli'
        await pg.click('#mCont'); await pg.wait_for_timeout(500)
        after = await pg.evaluate('()=>Vali.totals(__vali.G()).P')
        print('kayıt', before, '->', after); assert before == after, 'kayıt aynı nüfusla açılmalı'
        await shot('11-continue')
        # Eski (v1) kayıt yeni sürümde açılır ve görev başlar
        old = await pg.evaluate('''()=>{ const o=JSON.parse(Vali.serialize(__vali.G())); o.v=1; for(const k of ['dep','res','multi','proj','projNext','done','itibar','fx','made','sold']) delete o[k];
          for(let i=0;i<o.sv.length;i++) if(o.sv[i]>1&&o.sv[i]!==9) o.sv[i]=0; return JSON.stringify(o); }''')
        await pg.reload(); await pg.wait_for_timeout(1200)
        await pg.evaluate('(s)=>localStorage.setItem("vali.save.v1", s)', old)   # sayfa kapanırken yapılan kaydın üstüne
        await pg.click('#mCont'); await pg.wait_for_timeout(400)
        mig = await pg.evaluate('()=>{__vali.step(60); const G=__vali.G(); return {v:G.v, proj:!!G.proj, dep:G.dep.filter(Boolean).length}}')
        print('eski kayıt', mig); assert mig['v'] == 3 and mig['proj'] and mig['dep'] > 0
        # Dikey ekran uyarısı
        await pg.set_viewport_size({'width': 390, 'height': 844}); await pg.wait_for_timeout(200)
        assert await pg.is_visible('#rotate'), 'dikeyde yan çevir uyarısı'
        await shot('12-portrait')
        print('HATALAR', errs); assert not errs, errs
        await br.close()
    srv.shutdown()
asyncio.run(main())
