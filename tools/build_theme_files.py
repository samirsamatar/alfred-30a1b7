"""Convert studio/ (GitHub Pages version) into Shopify theme files in studio/theme/."""
import re, os, shutil
R = os.path.join(os.path.dirname(__file__), '..', 'studio')
O = os.path.join(R, 'theme')
os.makedirs(O + '/templates', exist_ok=True); os.makedirs(O + '/assets', exist_ok=True)
css = open(R + '/style.css').read().replace('url(fonts/', 'url(')
open(O + '/assets/style.css', 'w').write(css)
shutil.copy(R + '/app.js', O + '/assets/app.js')
h = open(R + '/index.html').read()
au = lambda f: "{{ '" + f + "' | asset_url }}"
h = re.sub(r'(href|src)="(?:fonts/|img/|vendor/)?([\w.\-]+\.(?:woff2|webp|js|css))"', lambda m: f'{m.group(1)}="{au(m.group(2))}"', h)
h = h.replace('href="../demos/', 'href="https://samirsamatar.github.io/alfred-30a1b7/demos/')
h = h.replace('<meta name="robots" content="noindex, nofollow">\n', '')
desc = re.search(r'<meta name="description"[^>]*>', h).group(0)
h = h.replace(desc, desc + '\n<link rel="canonical" href="{{ canonical_url }}">\n<meta property="og:title" content="Dolcessi — websites for Amsterdam restaurants">\n<meta property="og:description" content="Hungry people Google first. We build the website that makes them come in.">\n<meta property="og:type" content="website">\n<meta property="og:url" content="{{ canonical_url }}">')
assert '{%' not in h
open(O + '/templates/index.liquid', 'w').write('{% layout none %}' + h)
print('ok', h.count('asset_url'))
