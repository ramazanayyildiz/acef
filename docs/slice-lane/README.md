# slice-method

Dilim yöntemi, dosya olarak. ACEF dondurulduktan sonra b2press-rebuild'de damıtılan, US-CRM'in benimsediği ve 2026-10-19 platform oturumunda koordinatörün uyguladığı geliştirme akışının sürümlü paketi. Çerçeve değil, çalışma zamanı bağımlılığı yok, orkestrasyon motoru yok: şablonlar, birkaç betik, belgeler. Amaç iki tane: her uygulama aynı akışı koşsun; akışın kendisi ölçülüp iyileştirilebilsin.

Sürüm: **v0.1.1** (2026-10-19). Lisanslar: `LICENSES/` (security-audit türevi için Cloudflare MIT). Değişiklikler `docs/CHANGELOG.md`, kaynaklar `SOURCES.md`, benimseme `docs/adoption.md`, ölçülmeyenler `docs/open-questions.md`.

## Akış (tek sayfa)

```
koordinatör                geliştirici (ayrı oturum)        koordinatör / inceleyici     inceleyici (ayrı oturum)
-----------                -------------------------        ------------------------     ------------------------
backlog → dilim dosyası →  kendi worktree + port + DB   →   temiz ağaçta yeniden    →    bağımsız inceleme
(K maddeleri, izinli       kırmızı test önce, izinli        koşu (git status boş;        (TAM: farklı model ailesi,
 liste + kullanım           listede kalır, dev raporu        dev raporu kanıt değil)      mutasyonlar, gerçek tarayıcı
 taraması, sınıf)           yazar, PASS ilan etmez                                        1280/390, checklist A–E)
                                                                                              │
                         ┌──────────────── REVISE ◄──────────────────────────────────────────┤
                         ▼                                                                    ▼ PASS
              aynı izinli listede düzeltme → hedefli yeniden inceleme (YENİ oturum, r2)  →  kapanış notu (koordinatör)
                                                                                         →  merge --no-ff: sahibin sözüyle
                                                                                            ya da yazılı dal politikasıyla
                                                                                         →  postmerge: kapı + kritik set
```

1. **Dilim** (`templates/slice.md`, ≤150 satır): görev, numaralı sınanabilir kabul maddeleri (K1…), kapsam dışı, izinli dosya listesi (`git grep` kullanım taramasıyla), "Standart uyumu", "Boyut ve derinlik", inceleme sınıfı. Belirsiz ürün sorusu varsa dilim yazılmaz; sahibe sorulur.
2. **Geliştirici** kendi worktree'sinde, kendi port ve DB'siyle çalışır. Davranış değişiyorsa önce kırmızı test (yalnız-test commit'i ayrı). İzinli listeyi aşmaz: durur, koordinatör listeyi dilimin "Ekler" bölümüne **tarihle** yazar. `templates/dev-report.md` (öz-denetim bölümü dahil). Kendini PASS ilan etmez.
2b. **Sadeleştirme geçişi** (koordinatör; dev raporundan sonra, temiz ağaç koşusundan önce; 2026-10-27'de CursorPanel pratiğinden eklendi). Dal diff'i üzerinde dört salt okunur gözle taze bağlamlı bir geçiş: yeniden kullanım (kod tabanında zaten olan yardımcının yeniden yazılması), sadeleştirme (gereksiz durum, kopyala-yapıştır, ölü dal, tekrar eden test), verimlilik (tekrarlanan G/Ç, N+1, kilit kapsamı), derinlik (mekanizma yerine semptomun yamanması). Sonra kabul edilen bulgular davranışı korumayan TEK commit'te uygulanır, atlananlar yazılır: kabul maddesini değiştiren, güvenlik kuralını gevşeten ya da diff dışına çıkan her şey atlanır (değerliyse backlog kimliği alır). Hata avı değildir, incelemenin yerine geçmez; hata çıkan bulgu incelemeden önce geliştiriciye düzeltme turu olarak döner. İzinli liste değişmez; dokunulan paketler yeniden koşar, bozulan sözleşme hash'leri yenilenir. Ölçülen taban: CursorPanel 2026-10-26/27, üç dilimde üç geçiş (#150, #155, #157): dilimin kaçırdığı iki gerçek kopya okuyucu, bir veri kaybı hatası (CSV dışa aktarım), geçiş başına ~10–15 dk.
3. **Temiz ağaçta yeniden koşu**: aday commit'in ayrı worktree'si, `git status --short` boş, dev raporundaki komutlar → beklenen → gerçek. Not: `scripts/gate.sh` yalnız izlenen dosyalardaki değişikliği kirli sayar (`--untracked-files=no`, rebuild ile aynı); izlenmeyen dosyaların yokluğunu `git status --short` ile ayrıca doğrula. ACEF'in yakaladığı tek gerçek hata (geliştiricide yeşil, temiz ağaçta kırmızı) böyle yakalandı.
4. **Bağımsız inceleme** ayrı oturumda (`templates/review-brief.md` + `templates/review-checklist.md`). İddiaları doğrula, raporu değil. Geliştiricinin mutasyonlarını yeniden uygula + kendi bir mutasyonun. Paket anahtarı değiştiyse hostlarda include taraması (B28). Rapor: PASS | REVISE.
5. **REVISE** → aynı izinli listede düzeltme → **hedefli yeniden inceleme ayrı bir oturumda** (`templates/review-r2.md`): yalnız önceki bulgular + düzeltme diff'i.
6. **Kapanış notu** (`templates/closing-note.md`): karar, commit'ler, süreler, REVISE turu, kaçan hata, açık "etiket adayı" yargısı, ertelenen backlog kimlikleri, temizlik. `scripts/metrics.py` bu alanları okur.
7. **Merge**: `git merge --no-ff`. `main`'e yalnız sahibin sözüyle; sahibin yazılı izin verdiği iş dallarına (ör. US-CRM `platform/bootstrap-sync`) koordinatör PASS + yeşil postmerge sonrası beklemeden. Postmerge: `scripts/gate.sh`, `scripts/standards-check.sh`, etkilenen testler, projenin kritik seti (`slice-method.json` → `critical_postmerge`). Tam takım yalnız ortak altyapı değişiminde ve faz/grup kapanışında.
8. **Faz/grup kapanışı**: keşif turu (`templates/exploration-tour.md`): farklı model ailesi, kullanıcı gibi, personalar × 1280/390. Engelleyici bulgu açıkken grup kapanmaz.

## Roller

| Rol | Yapar | Yapmaz |
|---|---|---|
| Sahip (Ram) | ürün kararı, `main`'e merge sözü, push sözü, canlı | — |
| Koordinatör | dilim yazar, hat açar, izinli listeyi tarihle genişletir, temiz ağaç koşusu, kapanış notu, merge (politika içinde), backlog/durum belgesi, sayaç tabanı | kendi yazdığı kodu incelemek; sahipsiz `main` commit'i |
| Geliştirici | kırmızı test → kod, dev raporu | izinli liste dışı dosya, PASS beyanı, merge |
| İnceleyici | temiz ağaç, K maddeleri, mutasyon, tarayıcı, checklist, karar | ürün kodu düzeltmek, merge |

Geliştirici ve inceleyici asla aynı oturum değildir. Ortamında alt ajan yoksa adımları sırayla yap ama inceleme için ayrı oturum ya da `scripts/codex-review.sh` kullan.

## İnceleme sınıfları (alana göre, satır sayısına göre değil)

| Sınıf | Ne zaman | Ne |
|---|---|---|
| **TAM** | para, yetki/kiracı, durum geçişi, göç, güvenlik; sıcak/paylaşılan dosya | ayrı oturum; farklı model ailesi (Codex) **para ve göç dilimlerinde zorunlu**, diğer TAM'da önerilir; tarayıcı ve mutasyon için ikinci inceleyici; yeni/değişen kural başına 3–5 mutasyon; gerçek tarayıcı 1280/390 ve hata yolları; checklist A–E; TAM eki (bulgu disiplini) |
| **HAFİF** | test-only, belge, araç, katalog ekranı, çeviri | tek bağımsız inceleme; kural değişiyorsa en az 3 mutasyon; ilgili tarayıcı akışı; checklist A (+ ilgiliyse B/C); benzer küçük dilimler birleştirilebilir |

İkisinde de zorunlu: numaralı K maddeleri, taranmış izinli liste, temiz ağaçta yeniden koşu, bağımsız inceleyici, yeni senaryonun gerçek kanıtı.

## Hatlar (lane)

- En çok **5 geliştirme hattı**, en çok **2 ağır test/tarayıcı slotu** (Dusk/E2E gibi tek slotluk araçlar 1). Hat sayısı = o an bağımsız olan dilim sayısı; bağımlı dilimler sırayla.
- Her hat: ayrı worktree, ayrı port (`lanes.port_from–port_to`), **ayrı test DB'si** (`lanes.db_pattern`, ör. `us_crm_testing_l<N>`; adı `testing` içerir), ayrı `TMPDIR`. Sahibin önizleme portu ve DB'si yalnız sahibindir.
- Sıcak dosyaya dalga başına tek yazıcı (`templates/locks.md`); diğer hatlar trait/partial/olay ile ekler; inceleme öncesi rebase; tek birleştirme kuyruğu.
- Ortak kayıt dosyaları dilim başınadır (rapor, standart notu `baseline-notes/<ID>.md`, sorular); paylaşılan sayaç tabanını ve CHANGELOG'u yalnız birleştirici yazar.
- 90 dakikayı aşan ajan kontrol edilir; ilerleme yoksa daraltılmış görevle yeniden başlatılır ve `interventions.json`'a yazılır.

## Asla

- Sahibin sözü olmadan `main`'e commit/merge; sahibin sözü olmadan push; force push.
- Paylaşılan DB (ör. `us_crm_testing`) ya da sahibin önizleme portu/DB'si; başka hattın DB'si.
- `git stash` (worktree içinde), `git add -A` (yalnız adıyla ekle).
- Testi, zaman aşımını ya da assertion'ı gevşeterek yeşil yapmak; başarısız ya da koşulmamış aşamayı başarılı göstermek.
- Kendi kodunu PASS ilan etmek; dev raporunu kanıt saymak.
- Üretim verisini depoya, kanıta, sohbete ya da dış servise vermek.
- Yazılmamış istisna (standart sapması dilimin "Standart uyumu" tablosunda yoksa = REVISE).

## Paket içeriği

```
README.md                        bu sayfa
LICENSES/security-audit-MIT.txt  TAM ekinin kaynağının MIT lisans metni
SOURCES.md                       kaynak depolar, commit'ler, dosya → kaynak eşlemesi
slice-method.example.json        proje bildirimi örneği; şema: schema/slice-method.schema.json
templates/
  slice.md                       dilim (≤150 satır)
  dev-report.md                  geliştirici raporu + inceleme öncesi öz-denetim
  review-brief.md                inceleyici brief'i + TAM eki (bulgu disiplini)
  review-checklist.md            A–E katmanlı kontrol listesi, her madde komut/kanıt adıyla
  review-r2.md                   hedefli yeniden inceleme
  closing-note.md                kapanış notu (metrics.py alanları)
  invariants-skeleton.md         I<n> değişmezleri: Kural / Kaynak / Nasıl sınanır / Sabitleyen testler
  locks.md                       sıcak dosya kilitleri
  interventions.schema.json      müdahale kaydı şeması
  module-CLAUDE.md               modül ajan kuralları (Jakomeet Events yapısı)
  exploration-tour.md            faz kapanışı keşif turu brief'i
scripts/
  gate.sh                        slice-method.json'daki komut listesini koşar, tek özet satırı
  standards-check.sh             standart ratchet'i; kurallar scripts/standards/rules.json'da
  standards/                     rules.example.json, baseline.example.txt, baseline-notes/
  check-module-boundaries.php    modüller arası bağımlılık ratchet'i (Jakomeet PR #94)
  codex-review.sh                farklı model ailesiyle salt okunur inceleme çağrısı
  metrics.py                     dilim/inceleme/git geçmişinden ölçüm tablosu
  metrics-demo.sh                docs/metrics-2026-10-19.md'yi yeniden üretir
  selfcheck.sh                   paketin kendi kapısı (sözdizimi, şablon yer tutucuları, öz testler)
  tests/                         gate, standards, boundaries öz testleri
examples/module-boundaries.json  Jakomeet'in kilitli grafiği (örnek)
docs/                            CHANGELOG, adoption, open-questions, metrics-2026-10-19
```

## Hızlı başlangıç

```sh
cp -R slice-method/templates <app>/docs/slices/_templates
cp slice-method/slice-method.example.json <app>/slice-method.json        # yolları ve komutları düzenle
cp slice-method/scripts/{gate.sh,standards-check.sh,codex-review.sh,metrics.py} <app>/scripts/
cp slice-method/scripts/standards/rules.example.json <app>/scripts/standards/rules.json
<app>/scripts/standards-check.sh --print-baseline <app> > <app>/scripts/standards/baseline.txt   # birleştirici, temiz main'de
<app>/scripts/gate.sh <kendi worktree yolu>
python3 -I <app>/scripts/metrics.py <app>/docs/slices --backlog <app>/docs/backlog.md
```

Paketin kendi kapısı: `scripts/selfcheck.sh`.

---

## acef yerleşimi (2026-10-20, METHOD-02)

Bu dosya slice-method `2a3ba48` (etiket `v0.1.1` = `3951843` + METHOD-01 inceleme kayıtları) sürümünden **satır satır aynen** alındı; METHOD-01 incelemelerindeki `dosya:satır` atıfları geçerli kalsın diye yukarıdaki metin değiştirilmedi, yalnız bu bölüm eklendi. Yukarıdaki yollar paket yollarıdır; acef içinde karşılıkları:

| slice-method | acef |
|---|---|
| `templates/*.md` | `templates/slice/*.md` |
| `templates/interventions.schema.json` | `schemas/slice-interventions.schema.json` |
| `schema/slice-method.schema.json` | `schemas/slice-method.schema.json` |
| `scripts/*` (gate, standards-check, check-module-boundaries, codex-review, metrics, metrics-demo, selfcheck, `standards/`, `tests/`) | `scripts/slice/*` |
| `README.md`, `SOURCES.md`, `docs/*.md` | `docs/slice-lane/*.md` |
| `slice-method.example.json`, `examples/module-boundaries.json` | `docs/slice-lane/examples/` |
| `LICENSES/security-audit-MIT.txt` | `LICENSES/security-audit-MIT.txt` |

Yöntemin İngilizce kanonik özeti ve acef v2 kulvarlarıyla ilişkisi: `method/SLICE_LANE.md`. Uygulamaya kopyalanan dosyalardaki `scripts/gate.sh`, `templates/review-checklist.md` gibi atıflar uygulama içi yollardır ve değişmez.
