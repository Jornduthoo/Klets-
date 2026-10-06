"""Leidt data/queste1.js af uit de lesbestanden van de handleiding.

Gebruik:  python3 tools/afleiden_queste1.py <map-met-week1.json..week6.json> data/queste1.js
De map moet week1.json ... week6.json en week1_doelen.json ... week6_doelen.json bevatten.
"""
import json, re, sys
src = sys.argv[1]; out = sys.argv[2]
POWER = {'Nederlands':'Taal','Nederlands en communicatie':'Taal','Wiskunde':'Getal','Wereldoriëntatie':'Wereld','Mediawijsheid':'Wereld',
 'Sociaal en emotioneel leren':'Hart','Rooms-katholieke godsdienst':'Hart','Muzische vorming':'Maker','ICT':'Maker','Leren leren':'Brein',
 'Lichamelijke opvoeding':'Maker','Frans':'Taal','Geschiedenis':'Wereld','Aardrijkskunde':'Wereld',
 'Godsdienst':'Hart','Godsdienst / levensbeschouwing':'Hart','Wetenschap en techniek':'Wereld'}
GUIDE = {'Taal':'woordje','Getal':'tella','Wereld':'atlas','Hart':'bram','Maker':'byte','Brein':'kroniek'}
DAGEN = ['maandag','dinsdag','woensdag','donderdag','vrijdag']
code_re = re.compile(r'[Gg]eheime codes?:?\s*(?:zit in de Kluis-map\s*\()?([A-Z0-9][A-Z0-9\-]{2,}[A-Z0-9])')
code2_re = re.compile(r'\b[Cc]odes? ([A-Z][A-Z0-9\-]{3,})(?: en ([A-Z][A-Z0-9\-]{3,}))?')
weken, lessen, doelen, unknown = [], [], {}, set()
for w in range(1,7):
    d = json.load(open(f'{src}/week{w}.json'))
    weken.append({'week': w, 'titel': d['titel'], 'verhaal': d['verhaal']})
    dl = json.load(open(f'{src}/week{w}_doelen.json'))
    for vak, lst in dl.items():
        for g in lst:
            doelen.setdefault(g['code'], {'vak': vak, 'route': g.get('route',''), 'doel': g['doel']})
    n = {}
    for l in d['lessen']:
        dag = l['dag'].lower()
        n[dag] = n.get(dag, 0) + 1
        vakken = l.get('vakken', [])
        powers = []
        for v in vakken:
            p = POWER.get(v)
            if not p: unknown.add(v)
            elif p not in powers: powers.append(p)
        blok = l['blok']
        if 'Getal' in blok and 'Getal' not in powers: powers.insert(0,'Getal')
        if 'Taal' in blok and 'Taal' not in powers: powers.insert(0,'Taal')
        if not powers: powers = ['Brein']
        if 'Tijdlijn' in l['titel'] or 'Kroniek' in (l.get('webapp') or '') : gid = 'kroniek'
        else: gid = GUIDE[powers[0]]
        if blok in ('Kampvuur','Stilteplek'): gid = 'bram'
        if blok == 'Uitkijkpost': gid = 'kroniek'
        txt = (l.get('logboek') or '') + ' ' + (l.get('webapp') or '')
        codes = []
        found = code_re.findall(txt)
        for m in code2_re.finditer(txt):
            found += [g for g in m.groups() if g]
        for c in found:
            if c not in codes and c != 'QR': codes.append(c)
        dg = l.get('doelen') or {}
        lessen.append({
            'id': f'w{w}-{dag[:2]}{n[dag]}', 'week': w, 'dag': dag, 'blok': blok, 'titel': l['titel'],
            'macht': powers[0], 'machten': powers, 'gids': gid, 'duur': l.get('duur'),
            'doelen': {'taalsleutels': dg.get('taalsleutels', []), 'kompas': dg.get('kompas', []), 'telescoop': dg.get('telescoop', [])},
            'webapp': l.get('webapp') or '', 'logboek': l.get('logboek') or '', 'check': l.get('check') or '',
            'codes': codes})
# goals referenced but missing description
for l in lessen:
    for r in l['doelen'].values():
        for c in r:
            doelen.setdefault(c, {'vak': '', 'route': '', 'doel': ''})
data = {'queste': 1, 'naam': 'Aankomst', 'weken': weken, 'lessen': lessen, 'doelen': doelen}
with open(out, 'w') as f:
    f.write('// Automatisch afgeleid uit de handleiding (week1.json ... week6.json). Niet met de hand bewerken.\n')
    f.write('export const QUESTE1 = ')
    json.dump(data, f, ensure_ascii=False, separators=(',',':'))
    f.write(';\n')
print('unknown vakken', unknown, file=sys.stderr)
print(len(lessen), 'lessen', sum(len(l['codes']) for l in lessen), 'codes', len(doelen), 'doelen', file=sys.stderr)
for l in lessen:
    if l['codes']: print(l['id'], l['codes'], file=sys.stderr)
