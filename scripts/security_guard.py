#!/usr/bin/env python3
from pathlib import Path
import re, sys

public = Path("public")
bad = []
patterns = [
    re.compile(r"service_role", re.I),
    re.compile(r"SUPABASE_SERVICE_ROLE", re.I),
    re.compile(r"-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----"),
]
for f in public.rglob("*"):
    if not f.is_file(): continue
    try: text = f.read_text(encoding="utf-8", errors="ignore")
    except: continue
    for p in patterns:
        if p.search(text):
            bad.append((str(f), p.pattern))
if bad:
    print("SECURITY GUARD FAILED")
    for item in bad: print(item)
    sys.exit(1)
print("Security guard passed.")
