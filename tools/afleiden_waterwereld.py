#!/usr/bin/env python3
"""Zet de lesbestanden van thema 1 Waterwereld (handleiding + Expeditieboek, JSON per week) om naar
data/waterwereld-inhoud.js: de echte doelen, de weekverhalen, de geheime codes en de toetsvragen per week
als oefeningen voor de webapp (js/missions/types.js).

Gebruik:  python3 tools/afleiden_waterwereld.py <map met week1.json .. week5.json en week1_doelen.json ..>

Vragen die niet automatisch om te zetten zijn, worden gemeld en overgeslagen.
"""
import json, re, sys, pathlib

STAD = 'Zwinvliet'
SRC = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '.')
OUT = pathlib.Path(__file__).resolve().parent.parent / 'data' / 'waterwereld-inhoud.js'

def domein(code, vak):
    if code.startswith('9-3'): return 'Hart'
    if code.startswith('3.7'): return 'Onderzoek'
    if code.startswith('3.6') or code.startswith('8.'): return 'Techniek'
    if code.startswith('3.'): return 'Wetenschap'
    if code.startswith('4.'): return 'Aardrijkskunde'
    if code.startswith('5.'): return 'Geschiedenis'
    return {'ICT': 'Techniek'}.get(vak, 'Wetenschap')

def stad(t):
    return re.sub(r'\bKlets\b', STAD, t) if isinstance(t, str) else t

def norm(t):
    return re.sub(r'[^a-z0-9]+', ' ', t.lower()).strip()

# kaartvragen: trefwoord in de vraag -> (nieuwe vraag of None, juiste regio)
KAART = [
    ('tyfonen', 'Duid de oceaan aan waar tyfonen ontstaan (bij de Filipijnen en Japan).', 'grote'),
    ('Atlantische Oceaan', None, 'atlantisch'),
    ('Australië', None, 'australie'),
    ('Kaap de Goede Hoop', None, 'kaap'),
    ('Brazilië, Argentinië', 'Duid Brazilië aan op de wereldkaart.', 'brazilie'),
    ('Nieuw-Zeeland', None, 'nieuwzeeland'),
    ('Amazone', None, 'amazone'),
]
# kaartvragen op een tekening van een plant worden meerkeuze
PLANT = [('wortel aan', ['wortel', 'stengel', 'blad', 'bloem'], 0), ('waterlelie', ['wortelstok', 'bladsteel', 'drijvend blad', 'bloem'], 3)]

gemeld = []

def match_optie(opties, ant):
    a = norm(ant)
    for i, o in enumerate(opties):
        if norm(o) == a: return i
    best = None
    for i, o in enumerate(opties):
        n = norm(o)
        if n and (a.startswith(n + ' ') or a == n):
            if best is None or len(n) > len(norm(opties[best])): best = i
    if best is not None: return best
    hits = [i for i, o in enumerate(opties) if norm(o) and norm(o) in a]
    if len(hits) == 1: return hits[0]
    hits = [i for i, o in enumerate(opties) if a and a in norm(o)]
    if len(hits) == 1: return hits[0]
    return None

def getal(t):
    m = re.search(r'-?\d+(?:[.,]\d+)?', t)
    return float(m.group(0).replace(',', '.')) if m else None

def paren_uit(q):
    a = q['antwoord']
    if isinstance(a, dict): return list(a.items())
    if isinstance(a, list): a = '; '.join(a)
    out = []
    for deel in [d.strip() for d in a.split(';') if d.strip()]:
        for sep in (' = ', ' - ', ': '):
            if sep in deel:
                l, r = deel.split(sep, 1); out.append((l.strip(), r.strip())); break
        else:
            return None
    return out

def zet_om(q, id_, week, route):
    t, vraag, opties, ant, doel = q['type'], stad(q['vraag']), q.get('opties') or [], q['antwoord'], q.get('doel')
    goals = [doel] if isinstance(doel, str) else list(doel or [])
    base = {'id': id_, 'vraag': vraag, 'goals': goals}
    if t in ('meerkeuze', 'waar/niet waar'):
        if not opties: opties = ['waar', 'niet waar']
        if isinstance(ant, list): ant = ant[0]
        i = match_optie(opties, str(ant))
        if i is None: return None
        return {**base, 'type': 'keuze', 'opties': [stad(o) for o in opties], 'juist': i, 'vast': t == 'waar/niet waar'}
    if t == 'slepen in volgorde':
        if isinstance(ant, list): delen = ant
        else:
            s = str(ant)
            if 'gegeven volgorde' in s: delen = list(opties)
            elif re.match(r'^\s*1[\s.)]', s): delen = re.split(r',\s*\d+[.)]?\s+', re.sub(r'^\s*1[.)]?\s+', '', s))
            elif ' > ' in s: delen = s.split(' > ')
            elif ';' in s: delen = s.split(';')
            else: delen = s.split(', ')
        idx = [match_optie(opties, d.strip().rstrip('.,')) for d in delen]
        if None in idx or len(set(idx)) != len(opties): return None
        return {**base, 'type': 'volgorde', 'items': [stad(opties[i]) for i in idx]}
    if t == 'koppelen':
        p = paren_uit(q)
        if not p or len(p) < 2: return None
        links = [l for l, _ in p]; rechts = [r for _, r in p]
        if len(set(rechts)) < len(rechts):
            bakken = list(dict.fromkeys(rechts))
            return {**base, 'type': 'sorteer', 'bakken': bakken, 'kaarten': [{'t': l, 'bak': bakken.index(r)} for l, r in p]}
        return {**base, 'type': 'koppel', 'paren': [[stad(l), stad(r)] for l, r in p]}
    if t == 'getal invullen':
        if 'toetsenbord' in vraag:
            zin = re.split(r':\s*', vraag, maxsplit=1)[-1].strip()
            return {**base, 'type': 'typ', 'antwoorden': [zin], 'hoofdletters': True}
        g = getal(str(ant))
        if g is None: return None
        x = {**base, 'type': 'getal', 'antwoord': int(g) if g == int(g) else g}
        m = re.search(r'\(([^)]*)\)', str(ant))
        if m and len(m.group(1)) < 8: x['eenheid'] = m.group(1)
        return x
    if t == 'op kaart aanduiden':
        for kw, opts, j in PLANT:
            if kw in vraag:
                return {**base, 'type': 'keuze', 'opties': opts, 'juist': j}
        for kw, nieuw, regio in KAART:
            if kw in vraag:
                return {**base, 'vraag': nieuw or vraag, 'type': 'kaart', 'kaart': {'soort': 'wereld', 'juist': regio}}
        return None
    return None

def main():
    doelen, weken, toetsen, codes = {}, [], {}, {}
    for w in range(1, 6):
        for g in json.loads((SRC / f'week{w}_doelen.json').read_text()):
            doelen.setdefault(g['code'], {'domein': domein(g['code'], g['vak']), 'route': g['route'], 'vak': g['vak'],
                                          'subdomein': g['subdomein'], 'doel': g['doel'], 'week': w})
        d = json.loads((SRC / f'week{w}.json').read_text())
        weken.append({'week': w, 'titel': stad(d['titel']), 'gebouw': stad(d['gebouw']), 'verhaal': stad(d['verhaal']), 'stad': stad(d['stad'])})
        e = d['expeditieboek']
        codes[e['code']] = {'week': w, 'geeft': stad(e['code_geeft'])}
        toetsen[w] = {}
        for r in ('kompas', 'telescoop'):
            lijst = []
            for n, q in enumerate(d['testvragen'][r], 1):
                it = zet_om(q, f'ww{w}-{r[0]}{n}', w, r)
                if it is None: gemeld.append(f'week {w} {r} {n} ({q["type"]}): {q["vraag"][:70]}')
                else: lijst.append(it)
            toetsen[w][r] = lijst
    for g in [g for t in toetsen.values() for r in t.values() for it in r for g in it['goals']]:
        if g not in doelen: gemeld.append(f'onbekende doelcode in een vraag: {g}')
    js = ['// AUTOMATISCH GEMAAKT door tools/afleiden_waterwereld.py uit de lesbestanden van thema 1 (handleiding en',
          '// Expeditieboek). Pas de lesbestanden aan en draai het script opnieuw; verander dit bestand niet met de hand.',
          '// DOELEN_WW: doelcode -> { domein, route (kompas | telescoop | brug | verdieping), vak, subdomein, doel, week }',
          '// WEKEN_WW:  het verhaal, het gebouw en wat er in de stad verandert, per week',
          '// CODES_WW:  de geheime code van elke week uit het Expeditieboek',
          '// TOETS_WW:  de digitale check van elke week (de Stadsmissie), per route, als oefeningen',
          f'export const DOELEN_WW = {json.dumps(doelen, ensure_ascii=False, indent=1)};',
          f'export const WEKEN_WW = {json.dumps(weken, ensure_ascii=False, indent=1)};',
          f'export const CODES_WW = {json.dumps(codes, ensure_ascii=False, indent=1)};',
          f'export const TOETS_WW = {json.dumps(toetsen, ensure_ascii=False, indent=1)};', '']
    OUT.write_text('\n'.join(js))
    n = sum(len(r) for t in toetsen.values() for r in t.values())
    print(f'{OUT}: {len(doelen)} doelen, {n} vragen, codes {list(codes)}')
    for m in gemeld: print('  overgeslagen:', m)

main()
