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
h = h.replace('href="../demos/', 'href="https://demo.dolcessi.com/')
h = h.replace('https://samirsamatar.github.io/alfred-30a1b7/studio/img/og.jpg', "{{ 'og.jpg' | asset_url | prepend: 'https:' }}")
shutil.copy(R + '/img/og.jpg', O + '/assets/og.jpg')
for _f in ['favicon-192.png','favicon-48.png','apple-touch-icon.png']:
    h = h.replace('img/' + _f, "{{ '" + _f + "' | asset_url }}")
    shutil.copy(R + '/img/' + _f, O + '/assets/' + _f)
h = h.replace('<meta name="robots" content="noindex, nofollow">\n', '')
desc = re.search(r'<meta name="description"[^>]*>', h).group(0)
h = h.replace(desc, desc + '\n<link rel="canonical" href="{{ canonical_url }}">\n<meta property="og:title" content="Dolcessi — websites for Amsterdam restaurants">\n<meta property="og:description" content="Hungry people Google first. We build the website that makes them come in.">\n<meta property="og:type" content="website">\n<meta property="og:url" content="{{ canonical_url }}">')
assert '{%' not in h.replace("{{ 'og.jpg'", '')
open_tag = '<form class="ask-form" id="ask-form" data-mode="mailto" novalidate>'
assert h.count(open_tag) == 1 and h.count('</form>') == 1
h = h.replace(open_tag, "{% form 'contact', id: 'ask-form', class: 'ask-form', data-mode: 'shopify', novalidate: 'novalidate' %}{% if form.posted_successfully? %}<i hidden data-sent></i>{% endif %}{% if form.errors %}<i hidden data-err>{{ form.errors | default_errors | strip_html | escape }}</i>{% endif %}")
h = h.replace('</form>', '{% endform %}')
assert h.count('</head>') == 1
h = h.replace('</head>', '{{ content_for_header }}\n</head>')
open(O + '/templates/index.liquid', 'w').write('{% layout none %}' + h)
print('ok', h.count('asset_url'))
