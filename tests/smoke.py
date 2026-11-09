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
        # Dikey ekran uyarısı
        await pg.set_viewport_size({'width': 390, 'height': 844}); await pg.wait_for_timeout(200)
        assert await pg.is_visible('#rotate'), 'dikeyde yan çevir uyarısı'
        await shot('12-portrait')
        print('HATALAR', errs); assert not errs, errs
        await br.close()
    srv.shutdown()
asyncio.run(main())
