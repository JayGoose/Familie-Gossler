#!/usr/bin/env python3
"""
Convert the private Gossler seed JSON into SQL inserts.
Run locally. Do not commit the resulting SQL if it contains private details.
"""
import json, uuid, pathlib, sys

src = pathlib.Path(sys.argv[1] if len(sys.argv)>1 else "private_seed/gossler.seed.json")
data = json.loads(src.read_text(encoding="utf-8"))

idmap = {}
def esc(s):
    if s is None: return "null"
    return "'" + str(s).replace("'","''") + "'"

def date_sql(s):
    # Only exact ISO dates are imported as dates. A year-only source is kept
    # out of the date field rather than silently inventing 1 January.
    if isinstance(s, str) and len(s) == 10 and s[4] == '-' and s[7] == '-':
        return esc(s) + "::date"
    return "null"

for p in data["people"]:
    idmap[p["id"]] = str(uuid.uuid4())

print("begin;")
for p in data["people"]:
    first, *rest = p["name"].split(" ",1)
    last = rest[0] if rest else ""
    gender = p.get("gender") if p.get("gender") in ("m","f") else "u"
    print(
        "insert into public.people(id,first_name,last_name,gender,birth_date,death_date,branch,is_placeholder,vita_markdown) values("
        f"{esc(idmap[p['id']])}::uuid,{esc(first)},{esc(last)},{esc(gender)}::public.gender_code,"
        f"{date_sql(p.get('birth'))},{date_sql(p.get('death'))},{esc(p.get('branch','Gossler'))},true,{esc(p.get('note',''))});"
    )
for r in data["relations"]:
    typ = r["type"]
    print(
        "insert into public.relations(person_a,person_b,relation_type,former) values("
        f"{esc(idmap[r['a']])}::uuid,{esc(idmap[r['b']])}::uuid,{esc(typ)}::public.relation_kind,"
        f"{str(bool(r.get('former'))).lower()});"
    )
print("commit;")
