"""Seal or open Alfred's data.json so the public GitHub Pages copy is unreadable without the key.

    ALFRED_KEY=... python3 tools/seal.py open  data.json plain.json   # sealed -> plain (works on plain input too)
    ALFRED_KEY=... python3 tools/seal.py seal  plain.json data.json   # plain  -> sealed

Format: {"v":2,"updated":..., "enc":{"salt","iv","ct"}}  (PBKDF2-SHA256 250k -> AES-256-GCM, base64).
The dashboard decrypts in the browser with the same key (asked once, kept in localStorage).
Needs: pip install cryptography --break-system-packages
"""
import base64, json, os, sys
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

ITER = 250_000
b64 = lambda b: base64.b64encode(b).decode()


def key_from(passphrase, salt):
    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=ITER)
    return kdf.derive(passphrase.encode())


def seal(plain, passphrase):
    salt, iv = os.urandom(16), os.urandom(12)
    ct = AESGCM(key_from(passphrase, salt)).encrypt(iv, json.dumps(plain, ensure_ascii=False).encode(), None)
    return {"v": 2, "updated": plain.get("updated"), "enc": {"salt": b64(salt), "iv": b64(iv), "ct": b64(ct), "iter": ITER}}


def unseal(doc, passphrase):
    if "enc" not in doc:
        return doc  # already plain
    e = doc["enc"]
    salt, iv, ct = (base64.b64decode(e[k]) for k in ("salt", "iv", "ct"))
    return json.loads(AESGCM(key_from(passphrase, salt)).decrypt(iv, ct, None))


if __name__ == "__main__":
    mode, src, dst = sys.argv[1:4]
    pw = os.environ.get("ALFRED_KEY")
    if not pw:
        sys.exit("ALFRED_KEY is not set")
    doc = json.load(open(src, encoding="utf-8"))
    out = seal(doc, pw) if mode == "seal" else unseal(doc, pw)
    json.dump(out, open(dst, "w", encoding="utf-8"), ensure_ascii=False, indent=None if mode == "seal" else 1)
    print(mode, "ok ->", dst)
