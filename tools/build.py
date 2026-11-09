"""Vali'yi derler: src/* -> web/index.html (+ Three.js, PWA dosyaları). web/ derleme çıktısıdır."""
import os, shutil, hashlib
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
rd = lambda p: open(os.path.join(R, p), encoding='utf-8').read()
t = rd('src/index.html')
for k, v in [('/*CSS*/', rd('src/style.css')), ('/*ENGINE*/', rd('src/engine.js')), ('/*APP*/', rd('src/view.js') + '\n' + rd('src/ui.js'))]:
    assert t.count(k) == 1, k
    t = t.replace(k, v)
head = ('<!doctype html>\n<html lang="tr">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">\n'
        '<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="mobile-web-app-capable" content="yes">\n'
        '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n<meta name="apple-mobile-web-app-title" content="Vali">\n'
        '<meta name="theme-color" content="#171d20">\n'
        '<meta name="description" content="Telefonda yatay ekranda oynanan, 1850\'den başlayan şehir kurma oyunu.">\n'
        '<link rel="manifest" href="manifest.webmanifest">\n<link rel="icon" href="icons/icon-192.png">\n<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">\n')
i = t.index('<div id="app">')
web = head + t[:i] + '\n<script>if("serviceWorker" in navigator&&location.protocol==="https:")addEventListener("load",function(){navigator.serviceWorker.register("sw.js").catch(function(){})});</script>\n</head>\n<body>\n' + t[i:] + '\n</body>\n</html>\n'
W = os.path.join(R, 'web')
os.makedirs(os.path.join(W, 'vendor'), exist_ok=True)
open(os.path.join(W, 'index.html'), 'w', encoding='utf-8').write(web)
for f in ['three.module.js', 'three.core.js', 'LICENSE']:
    shutil.copy(os.path.join(R, 'vendor', 'three', f), os.path.join(W, 'vendor', f))
shutil.copy(os.path.join(R, 'public', 'manifest.webmanifest'), os.path.join(W, 'manifest.webmanifest'))
shutil.copytree(os.path.join(R, 'public', 'icons'), os.path.join(W, 'icons'), dirs_exist_ok=True)
h = hashlib.sha1(web.encode()).hexdigest()[:10]
open(os.path.join(W, 'sw.js'), 'w').write(rd('public/sw.js').replace('__BUILD__', h))
print('web/index.html', len(web), 'bayt, sürüm', h)
