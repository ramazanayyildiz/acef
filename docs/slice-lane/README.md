# slice-method (Slice lane, Türkçe kaynak metin)

Dilim yöntemi, dosya olarak. ACEF dondurulduktan sonra bir kaynak projede damıtılan, ikinci bir projenin benimsediği ve 2026-10-19 oturumunda koordinatörün uyguladığı geliştirme akışının sürümlü paketi (projeler ve commit'ler: `SOURCES.md`, kısa adlar REB, CRM, PLT). Çerçeve değil, çalışma zamanı bağımlılığı yok, orkestrasyon motoru yok: şablonlar, birkaç betik, belgeler. Yığından bağımsızdır: yığına özgü komutlar `{{test_command}}`, `{{static_analysis}}`, `{{boundary_check}}`, `{{standards_check}}` yer tutucularıdır ve `stacks/<yığın>/profile.json` doldurur. Amaç iki tane: her uygulama aynı akışı koşsun; akışın kendisi ölçülüp iyileştirilebilsin.

Sürüm: **v0.1.1** (2026-10-19), acef'te ACEF-NEUTRAL-01 ile yığından bağımsız çekirdek + yığın adaptörü olarak bölündü. Lisanslar: `LICENSES/` (security-audit türevi için Cloudflare MIT). Değişiklikler kök `CHANGELOG.md` (slice-method'un kendi geçmişi `archive/slice-lane/`), kaynaklar `SOURCES.md`, benimseme `adoption.md`, ölçülmeyenler `open-questions.md`.

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
3. **Temiz ağaçta yeniden koşu**: aday commit'in ayrı worktree'si, `git status --short` boş, dev raporundaki komutlar → beklenen → gerçek. Not: `scripts/gate.sh` yalnız izlenen dosyalardaki değişikliği kirli sayar (`--untracked-files=no`, kaynak projeyle aynı); izlenmeyen dosyaların yokluğunu `git status --short` ile ayrıca doğrula. ACEF'in yakaladığı tek gerçek hata (geliştiricide yeşil, temiz ağaçta kırmızı) böyle yakalandı.
4. **Bağımsız inceleme** ayrı oturumda (`templates/review-brief.md` + `templates/review-checklist.md`). İddiaları doğrula, raporu değil. Geliştiricinin mutasyonlarını yeniden uygula + kendi bir mutasyonun. Paket anahtarı değiştiyse hostlarda include taraması (B28). Rapor: PASS | REVISE.
5. **REVISE** → aynı izinli listede düzeltme → **hedefli yeniden inceleme ayrı bir oturumda** (`templates/review-r2.md`): yalnız önceki bulgular + düzeltme diff'i.
6. **Kapanış notu** (`templates/closing-note.md`): karar, commit'ler, süreler, REVISE turu, kaçan hata, açık "etiket adayı" yargısı, ertelenen backlog kimlikleri, temizlik. `scripts/metrics.py` bu alanları okur.
7. **Merge**: `git merge --no-ff`. `main`'e yalnız sahibin sözüyle; sahibin yazılı izin verdiği iş dallarına (ör. `<proje>` için yazılı dal politikasındaki entegrasyon dalı) koordinatör PASS + yeşil postmerge sonrası beklemeden. Postmerge: `scripts/gate.sh`, `{{standards_check}}`, etkilenen testler, projenin kritik seti (`slice-method.json` → `critical_postmerge`). Tam takım yalnız ortak altyapı değişiminde ve faz/grup kapanışında.
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

- En çok **5 geliştirme hattı**, en çok **2 ağır test/tarayıcı slotu** (tarayıcı E2E takımı gibi tek slotluk araçlar 1). Hat sayısı = o an bağımsız olan dilim sayısı; bağımlı dilimler sırayla.
- Her hat: ayrı worktree, ayrı port (`lanes.port_from–port_to`), **ayrı test DB'si** (`lanes.db_pattern`, ör. `{{project}}_testing_l<N>`; adı `testing` içerir), ayrı `TMPDIR`. Sahibin önizleme portu ve DB'si yalnız sahibindir.
- Sıcak dosyaya dalga başına tek yazıcı (`templates/locks.md`); diğer hatlar trait/partial/olay ile ekler; inceleme öncesi rebase; tek birleştirme kuyruğu.
- Ortak kayıt dosyaları dilim başınadır (rapor, standart notu `baseline-notes/<ID>.md`, sorular); paylaşılan sayaç tabanını ve CHANGELOG'u yalnız birleştirici yazar.
- 90 dakikayı aşan ajan kontrol edilir; ilerleme yoksa daraltılmış görevle yeniden başlatılır ve `interventions.json`'a yazılır.

## Asla

- Sahibin sözü olmadan `main`'e commit/merge; sahibin sözü olmadan push; force push.
- Paylaşılan DB (ör. `{{project}}_testing`) ya da sahibin önizleme portu/DB'si; başka hattın DB'si.
- `git stash` (worktree içinde), `git add -A` (yalnız adıyla ekle).
- Testi, zaman aşımını ya da assertion'ı gevşeterek yeşil yapmak; başarısız ya da koşulmamış aşamayı başarılı göstermek.
- Kendi kodunu PASS ilan etmek; dev raporunu kanıt saymak.
- Üretim verisini depoya, kanıta, sohbete ya da dış servise vermek.
- Yazılmamış istisna (standart sapması dilimin "Standart uyumu" tablosunda yoksa = REVISE).

## Paket içeriği (acef yerleşimi)

```
docs/slice-lane/
  README.md                      bu sayfa (Türkçe kaynak metin; İngilizce kanonik özet method/SLICE_LANE.md)
  SOURCES.md                     kaynak depolar, commit'ler, dosya → kaynak eşlemesi; proje adlarının TEK yeri
  adoption.md                    benimseme adımları; yeni yığında benimseme; yığın profilleri
  open-questions.md              henüz ölçülmeyenler
  examples/slice-method.example.json  proje bildirimi örneği ({{project}}, {{…}} yer tutucuları)
templates/slice/
  slice.md                       dilim (≤150 satır)
  dev-report.md                  geliştirici raporu + inceleme öncesi öz-denetim
  review-brief.md                inceleyici brief'i + TAM eki (bulgu disiplini)
  review-checklist.md            A–E katmanlı kontrol listesi, her madde komut/kanıt adıyla
  review-r2.md                   hedefli yeniden inceleme
  closing-note.md                kapanış notu (metrics.py alanları)
  invariants-skeleton.md         I<n> değişmezleri: Kural / Kaynak / Nasıl sınanır / Sabitleyen testler
  locks.md                       sıcak dosya kilitleri
  module-CLAUDE.md               modül ajan kuralları (yığından bağımsız iskelet)
  exploration-tour.md            faz kapanışı keşif turu brief'i
schemas/
  slice-method.schema.json       proje bildirimi (stack-profile alanı dahil)
  stack-profile.schema.json      yığın profili: {{test_command}}, {{static_analysis}}, {{boundary_check}}, {{standards_check}}
  slice-interventions.schema.json  müdahale kaydı
scripts/slice/                   çekirdek betikler (yığından bağımsız)
  gate.sh                        slice-method.json komut listesini koşar; {{…}} yer tutucularını profilden açar
  standards-check.sh             standart ratchet motoru; kurallar yığın adaptöründen
  metrics.py                     dilim/inceleme/git geçmişinden ölçüm tablosu; profilin metrics bölümünü okur
  selfcheck.sh                   kapı: çekirdek + her stacks/*/tests öz testi + çekirdek yığın-adı taraması
  tests/                         gate öz testi + metrics fikstürü
stacks/<yığın>/                  yığın adaptörü: profile.json, gate.sh sarmalayıcısı, sınır bekçisi, standart kuralları,
                                 inceleme çağrısı, checklist komutları, örnekler, öz testler
archive/slice-lane/              METHOD-01 incelemeleri, ölçüm demosu 2026-10-19, slice-method CHANGELOG (kaynak kaydı)
```

## Hızlı başlangıç

`adoption.md` → "Adopt in a new stack" (beş adım). Hazır bir yığın varsa:

```sh
ACEF=/path/to/acef; STACK=$ACEF/stacks/<yığın>
cp -R $ACEF/templates/slice <app>/docs/slices/_templates
cp $ACEF/docs/slice-lane/examples/slice-method.example.json <app>/slice-method.json   # {{project}}, yollar
cp $STACK/profile.json <app>/scripts/stack-profile.json
cp $ACEF/scripts/slice/{gate.sh,standards-check.sh,metrics.py} <app>/scripts/
<app>/scripts/gate.sh <kendi worktree yolu>
python3 -I <app>/scripts/metrics.py <app>/docs/slices --backlog <app>/docs/backlog.md --profile <app>/scripts/stack-profile.json
```

Paketin kendi kapısı: `scripts/selfcheck.sh`.

---

## acef yerleşimi (2026-10-20, METHOD-02; 2026-10-20, ACEF-NEUTRAL-01)

METHOD-02 bu dosyayı slice-method `2a3ba48` sürümünden satır satır aynen almıştı; o metin `v3.0.0-alpha` etiketinde
durur ve `archive/slice-lane/METHOD-01-review*.md` içindeki `dosya:satır` atıfları o etikete göredir. ACEF-NEUTRAL-01
proje ve yığın adlarını çıkardı (kaynaklar `SOURCES.md`'de), paket içeriğini acef yerleşimine göre yeniden yazdı.
Uygulamaya kopyalanan dosyalardaki `scripts/gate.sh`, `templates/review-checklist.md` gibi atıflar uygulama içi
yollardır ve değişmez.
