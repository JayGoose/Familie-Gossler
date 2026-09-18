#!/usr/bin/env python3
from pathlib import Path
import re, sys, json

root = Path(__file__).resolve().parents[1]
public = root / "public"
findings = []

required = {
  "auth": ["signIn(", "signUp(", "requestPasswordReset("],
  "guest": ["validateGuestCode", "guest_family_snapshot"],
  "views": ["renderTree", "renderRing", "renderGeneration", "renderTimeline"],
  "relationship": ["relationshipLabel", "commonAncestor", "shortestPath"],
  "profile": ["openProfile", "uploadProfilePicture", "saveVita"],
  "qr": ["showQrModal", "startQrScanner"],
  "admin": ["adminLoadUsers", "adminSetApproval", "adminSetFamilyCode"],
}

blob = "\n".join(
    p.read_text(encoding="utf-8", errors="ignore")
    for p in root.rglob("*")
    if p.is_file() and p.suffix in {".js",".sql",".ts",".html",".md"}
)

for group, needles in required.items():
    for n in needles:
        if n not in blob:
            findings.append(f"MISSING {group}: {n}")

danger_patterns = [
    (r"SUPABASE_SERVICE_ROLE_KEY.*public/", "service-role reference in public"),
    (r"service_role", "service_role token/reference"),
    (r"BEGIN (RSA|EC|OPENSSH) PRIVATE KEY", "private key"),
]
public_blob = "\n".join(
    p.read_text(encoding="utf-8", errors="ignore")
    for p in public.rglob("*") if p.is_file()
)
for pat, label in danger_patterns:
    if re.search(pat, public_blob, re.I):
        findings.append(f"SECURITY: {label}")

print("CLONE AUDIT")
print("============")
if findings:
    for f in findings: print("FAIL:", f)
    sys.exit(1)
print("PASS: required clone-control surfaces detected")
print("PASS: no obvious secret pattern in public/")
