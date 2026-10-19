# Bağımsız inceleme brief'i — <SLICE-ID>

Rol: bağımsız inceleyici. Geliştiriciyle aynı oturum değilsin. **Farklı model ailesi (Codex, `scripts/codex-review.sh`) para ve göç dilimlerinde ZORUNLU, diğer TAM dilimlerinde önerilir**; salt okunur Codex mutasyon ve tarayıcı koşamadığı için bunları ikinci bir inceleyici (ayrı Claude oturumu) yapar. Geliştiricinin raporu kanıt değildir: **raporu değil iddiaları doğrula.** Kendi kodunu PASS ilan eden yoktur; PASS'i yalnız sen verirsin.

## Girdiler

- Dilim: `<slices-dizini>/<SLICE-ID>.md` · Dev raporu: `<slices-dizini>/<SLICE-ID>-dev-report.md`
- Taban `<taban-sha>` · Aday `<aday-sha>` · Yalnız-test commit'i `<test-sha>`
- Sınıf: TAM | HAFİF · Ortam: kendi worktree `<yol>`, port `<port>`, DB `<lane DB>` (paylaşılan DB ve ana önizleme portu YASAK)
- Değişmezler: `<invariants-dosyası>` · Kontrol listesi: `templates/review-checklist.md`

## Adımlar

1. **Temiz ağaç:** ayrı worktree, `git status --short` boş. Dev raporundaki komutları yeniden koş → komut / beklenen / gerçek tablosu (checklist A1). Fark varsa ilk bulgu odur.
2. **İzinli liste:** `git diff --name-only <taban>..<aday>` (A2). Liste dışı dosya = REVISE, ancak dilimin "Ekler" bölümünde tarihli koordinatör eki varsa geçerli.
3. **Kırmızı-önce:** `<test-sha>`'yı checkout et, testler kırmızı (A3).
4. **K maddeleri:** K1..Kn tek tek PASS / FAIL + kanıt (komut çıktısı özeti veya dosya:satır).
5. **Mutasyon:** yeni/değişen **her kural için 3–5 mutasyon** (kuralı boz → hangi test kırmızı); geliştiricinin her mutasyonunu kendin yeniden uygula + en az bir kendi mutasyonun; her biri için kanıt dosyası; sonunda geri al ve `git status --short` boş (A4). Kuralı bozup test yeşil kalıyorsa bu bir test boşluğu bulgusudur.
6. **Kontrol listesi:** A her zaman; B paket view/lang/config değişince (**hostlarda `<paket-öneki>::` include taraması — B28**); C UI/rota/config/migration dokunuşunda; D TAM sınıfında; E paylaşılan sözleşmede. Uygulanmayan madde "uygulanmaz: <neden>".
7. **Gerçek tarayıcı:** dilimin senaryolarını giriş noktasından (URL/menü) kullanıcı gibi, 1280 ve 390 px; ekran görüntüsü. Betik yeşili tek başına yetmez.
8. **Karar:** PASS | REVISE. REVISE ise bulgular tablosu (≤10 satır); bloklamayan bulgu backlog adayı olarak işaretlenir.
9. **Etiket adayı** (paket/sürüm dilimlerinde): "evet / hayır" ve tek cümle neden. Bu açık bir yargıdır; boş bırakılmaz.

## Rapor biçimi

Dosya: `<slices-dizini>/<SLICE-ID>-review.md` (inceleyici yazamıyorsa metin olarak döndürür, koordinatör kaydeder). ≤120 satır, ilk satırlar:

```
# <SLICE-ID> bağımsız inceleme
Karar: **PASS | REVISE**
Tarih: <YYYY-MM-DD> · Aday `<sha>` · Taban `<sha>` · Model: <ad> · Süre: <dk> · Ortam: <worktree, DB, port>
```

Bulgu tablosu: `| # | Önem | Blok | Dosya:satır | Yeniden üretim ve kanıt | Öneri |`. Ürün koduna dokunma; mutasyonlar geri alınır. Depolara rapor dışında yazma yok.

## Yasaklar

Paylaşılan DB, ana ağacın önizleme portu, `git stash`, push, merge, başka depoya yazma, testi/zaman aşımını gevşeterek yeşil yapma.

---

## TAM eki — yetki, kiracı, para, durum, güvenlik

Kaynak: Jakomeet `.claude/skills/security-audit/` — bu ek o metnin Türkçe çevirisi/türevidir. Lisans: MIT, Copyright (c) 2025-2026 Cloudflare, Inc.; tam metin `LICENSES/security-audit-MIT.txt` (bu bildirim kopyalarla birlikte taşınır). Tam denetim iş akışı DEĞİL; yalnız bulgu disiplini.

**Bulgu ancak şunların hepsi adlandırılırsa geçerlidir:** düşük güvenli ilke (aktör), kabul edilen girdi/eylem, amaçlanan kontrol, aşılan sınır, etkilenen ilke/kaynak, somut gözlenen sonuç. "En iyi uygulama eksik", tahmin edilen dağıtım davranışı, kendine etki → bulgu değil.

**Durum sınıfları:**
- `confirmed` — tam kaynak izi + sınırlı yerel kanıt (sahte kiracı, yerel test). Yalnız bunlar önem alır.
- `needs_validation` — kaynakta görünmeyen bir olguya bağlı (proxy, kuyruk sürücüsü, dağıtım config'i); eksik olgu ve güvenli doğrulama adımı yazılır. Önem verilmez.
- `rejected` — iddia edildi, kaynak çürüttü; neden yazılır.

**Önem (yalnız confirmed):** critical (kimliksiz kod yürütme / tüm veri), high (açık bir kontrolü tamamen aşar: kimlik atlatma, kiracılar arası okuma/yazma), medium (sınırlı etki ya da nadir önkoşul), low, informational. Gösterilen etkiden yüksek olamaz.

**Her confirmed bulguda alanlar** (`report-schema.json` zorunlu alanlarından): başlık · kök neden · amaçlanan davranış · iz (dosya:satır adımları) · kanıt (dosya:satır) · koşullar · güvenli yeniden üretim (yalnız yerel, sahte veri) · gözlenen sonuç · **en küçük etkili düzeltme** (son güvenilir karar noktasında, dosya adıyla) + regresyon testi · önem (olasılık + etki + gerekçe) · güven.

**Kiracı ve yaşam döngüsü:** kayıttaki kiracı alanı yalıtım değildir; her okuma/yazma yolunda bağlayan sorgu/politika bulunur. Türev kopyalar (cache, arama, dışa aktarma, kuyruk, log) ayrıca izlenir. Silme/iptal: mevcut, cache'li, kuyruktaki kopyalar.
**Kimlik ve HTTP:** her kimlik bilgisi için imza/doğrulama ve gerekli bağlar (oturum, ilke, kaynak, süre). Aynı hassas eyleme giden her yol sayılır; etkin politika en zayıf paralel yoldur.
**Canlı/paylaşılan ortam yok:** yalnız yerel, sahte ilkelerle; dış servis, gerçek kullanıcı verisi, paylaşılan DB yok.
