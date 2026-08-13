# Legacy assurance süre analizi — P0-legacy-r2

## Teknik özet

Legacy koşunun story-assurance bölümü **118,07 dakika** sürdü. Bunun **108,93 dakikası (%92,26)** gözlenen araç çağrılarının dışında kaldı. Bu süreyi yalnız “model düşünüyor” diye yorumlamak doğru değildir; model üretimi, araçlar arası karar/kompozisyon, harness veya queue gecikmesi ve loglarda ayrı bir araç olayı olarak görünmeyen beklemeler aynı kalemdedir.

Gözlenen araç duvar süresi yalnız **9,13 dakika** idi. Bunun **5,31 dakikası nested reviewer beklemesi**, **3,83 dakikası diğer bütün araç çalışmaları** ve **0,41 dakikası gerçek test çalıştırmasıydı.** Buna karşılık 18 aktör **524 model çevrimi** üretti. Dolayısıyla bu koşuda ana darboğaz testlerin kendisi değil, yüksek-effort modelin geniş ve tekrarlanan bağlamla yüzlerce kez yeniden çağrılmasıdır.

Ölçüm 18 top-level aktör turunu, 500 araç olayını, 14 reviewer dispatch denemesini ve bulunan 12 nested reviewer oturumunu kapsar. Top-level kalemler birbirini dışlar ve tam olarak 118,07 dakikaya uzlaşır. Nested reviewer aktif süreleri paralel çalıştığı için ayrıca gösterilir ve toplama eklenmez.

## Ana bulgular

### Story test review en pahalı kontroldü

| Kontrol | Toplam dk | Araç dışı dk | Reviewer bekleme dk | Bekleme dışı araç dk | Test dk | Pay |
|---|---:|---:|---:|---:|---:|---:|
| Story test review | 41,01 | 37,38 | 2,32 | 1,31 | 0,11 | %34,74 |
| Code review | 34,49 | 30,63 | 2,98 | 0,88 | 0,11 | %29,21 |
| Process judge | 27,93 | 26,79 | 0,00 | 1,14 | 0,10 | %23,66 |
| Verify patch | 14,63 | 14,13 | 0,00 | 0,50 | 0,09 | %12,39 |
| **Toplam** | **118,07** | **108,93** | **5,31** | **3,83** | **0,41** | **%100** |

Buradaki “test dk” bekleme dışı araç süresinin alt kümesidir. Yuvarlama nedeniyle satır toplamları ±0,02 dakika oynayabilir.

### Story bazında S4 ve S2 toplam sürenin %60,2'sini oluşturdu

| Story | Assurance dk | Pay |
|---|---:|---:|
| S4 | 36,42 | %30,85 |
| S2 | 34,69 | %29,38 |
| S1 | 24,54 | %20,79 |
| S3 | 22,42 | %18,99 |

### Test çalışması toplamın yalnız %0,34'üydü

| Duvar-süresi kalemi | Olay | Saniye | Dakika | Assurance payı |
|---|---:|---:|---:|---:|
| Araç dışı / ölçülemeyen gap | — | 6.535,874 | 108,93 | %92,26 |
| Nested reviewer bekleme | 14 | 318,309 | 5,31 | %4,49 |
| Workflow/skill yükleme | 139 | 53,109 | 0,89 | %0,75 |
| Diğer araç | 85 | 45,314 | 0,76 | %0,64 |
| Repo/diff/evidence inceleme | 82 | 34,184 | 0,57 | %0,48 |
| Test çalıştırma | 15 | 24,406 | 0,41 | %0,34 |
| Artifact düzenleme | 52 | 18,490 | 0,31 | %0,26 |
| Git add/commit | 35 | 16,835 | 0,28 | %0,24 |
| Git lineage/status | 33 | 15,704 | 0,26 | %0,22 |
| Validator/evidence/selfcheck | 22 | 12,484 | 0,21 | %0,18 |
| Nested reviewer dispatch | 14 | 4,130 | 0,07 | %0,06 |
| Product-done audit | 2 | 3,716 | 0,06 | %0,05 |
| Nested reviewer koordinasyonu | 7 | 1,375 | 0,02 | %0,02 |

## 108,93 dakikalık araç-dışı sürenin konumu

| Konum | Dakika | Assurance payı |
|---|---:|---:|
| Araç çağrıları arasında | 102,58 | %86,89 |
| Son araç sonucu ile aktör tamamlanması arasında | 3,22 | %2,73 |
| Aktör başlangıcı ile ilk araç çağrısı arasında | 3,13 | %2,65 |
| **Toplam araç dışı** | **108,93** | **%92,26** |

Bu ayrım ana sorunu daha net gösterir: süre başlangıç veya final cevap yazımında değil, çok sayıdaki araç çağrısı arasındaki karar/okuma/üretim döngülerinde birikmiştir.

## 18 assurance aktörünün tam dökümü

“Before / Between / After” araç-dışı zamanın aktör içindeki konumudur. “Tool wall” gözlenen bütün araçların birleşik duvar süresidir; Wait ve Tests bunun alt kümeleridir.

| Story | Kontrol / tur | Toplam dk | Before | Between | After | Tool wall | Wait | Tests | Araç olayı | Nested |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| S4 | Story test review | 12,99 | 0,15 | 9,98 | 0,24 | 2,63 | 2,32 | 0,00 | 49 | 4 |
| S4 | Code review | 12,45 | 0,15 | 10,43 | 0,10 | 1,77 | 1,55 | 0,00 | 39 | 3 |
| S2 | Story test review | 12,32 | 0,16 | 11,54 | 0,13 | 0,49 | 0,00 | 0,04 | 61 | 0 |
| S1 | Story test review | 9,44 | 0,15 | 8,77 | 0,23 | 0,30 | 0,00 | 0,05 | 42 | 0 |
| S3 | Process judge | 7,92 | 0,24 | 7,24 | 0,15 | 0,29 | 0,00 | 0,00 | 35 | 0 |
| S2 | Process judge | 6,95 | 0,15 | 6,32 | 0,23 | 0,26 | 0,00 | 0,00 | 32 | 0 |
| S4 | Process judge | 6,92 | 0,20 | 6,04 | 0,35 | 0,33 | 0,00 | 0,07 | 27 | 0 |
| S1 | Code review | 6,87 | 0,26 | 6,17 | 0,27 | 0,17 | 0,00 | 0,00 | 27 | 0 |
| S2 | Code review retry 1 | 6,30 | 0,21 | 4,46 | 0,15 | 1,49 | 1,31 | 0,04 | 30 | 3 |
| S3 | Story test review | 6,27 | 0,15 | 5,78 | 0,12 | 0,22 | 0,00 | 0,02 | 32 | 0 |
| S1 | Process judge | 6,14 | 0,19 | 5,52 | 0,17 | 0,26 | 0,00 | 0,03 | 32 | 0 |
| S3 | Code review | 4,86 | 0,14 | 4,27 | 0,15 | 0,30 | 0,11 | 0,04 | 25 | 0 |
| S4 | Verify patch | 4,06 | 0,19 | 3,59 | 0,16 | 0,12 | 0,00 | 0,03 | 14 | 2 |
| S2 | Code review initial | 4,01 | 0,16 | 3,56 | 0,16 | 0,13 | 0,00 | 0,03 | 16 | 0 |
| S3 | Verify patch | 3,37 | 0,16 | 2,98 | 0,13 | 0,10 | 0,00 | 0,02 | 10 | 0 |
| S2 | Verify patch retry 1 | 2,89 | 0,19 | 2,43 | 0,18 | 0,09 | 0,00 | 0,00 | 11 | 0 |
| S2 | Verify patch initial | 2,21 | 0,14 | 1,86 | 0,12 | 0,09 | 0,00 | 0,04 | 10 | 0 |
| S1 | Verify patch | 2,09 | 0,15 | 1,66 | 0,18 | 0,10 | 0,00 | 0,00 | 8 | 0 |

## En uzun araç-dışı aralıklar

Saatler UTC'dir. Bunlar iki gözlenen araç olayı arasındaki boşluklardır; log tek başına model üretimi ile harness/queue gecikmesini ayıramaz.

| Story | Kontrol | Başlangıç (UTC) | Saniye | Dakika |
|---|---|---|---:|---:|
| S4 | Code review | 14:28:28 | 164,090 | 2,73 |
| S2 | Story test review | 12:17:44 | 136,418 | 2,27 |
| S1 | Story test review | 11:11:11 | 111,773 | 1,86 |
| S4 | Story test review | 14:51:45 | 107,981 | 1,80 |
| S2 | Process judge | 12:30:23 | 103,023 | 1,72 |
| S3 | Story test review | 13:12:58 | 102,750 | 1,71 |
| S4 | Process judge | 15:10:48 | 73,498 | 1,22 |
| S4 | Code review | 14:22:03 | 63,182 | 1,05 |
| S4 | Story test review | 14:45:54 | 62,820 | 1,05 |
| S1 | Process judge | 11:21:33 | 57,335 | 0,96 |

## Nested reviewer süreleri — toplama eklenmez

14 dispatch denemesinin 12'si ayrı reviewer session'ı olarak bulundu. Aşağıdaki aktif süreler parent aktörün wait/coordination penceresi içinde ve çoğu paraleldir; assurance toplamına eklenmemiştir.

| Parent kontrol | Reviewer | Aktif dk | Turn |
|---|---|---:|---:|
| S4 code review | edge_case_hunter | 2,87 | 1 |
| S4 code review | acceptance_auditor | 2,08 | 1 |
| S4 story test review | maintainability_worker | 1,50 | 1 |
| S4 story test review | determinism_worker | 1,41 | 1 |
| S4 story test review | isolation_worker | 1,39 | 1 |
| S4 code review | blind_hunter | 1,38 | 1 |
| S4 story test review | performance_worker | 1,33 | 1 |
| S2 code review retry 1 | edge_hunter | 1,18 | 1 |
| S2 code review retry 1 | blind_hunter | 1,03 | 2 |
| S4 verify patch | verify_p1_controller | 0,48 | 1 |
| S2 code review retry 1 | acceptance_auditor | 0,45 | 2 |
| S4 verify patch | verify_p2_job | 0,39 | 1 |
| **Non-additive aktif toplam** |  | **15,48** |  |

## Neden uzun sürdü: 524 yüksek-effort model çevrimi

Bütün 18 top-level assurance aktörü `gpt-5.6-sol` ve `high` reasoning effort ile çalıştı. Nested reviewer spawn'ları model ve effort'u parent'tan devraldı. Aktör süresi ile model çevrimi sayısı arasındaki Pearson korelasyonu **r=0,943**; aktör süresi ile kümülatif token hacmi arasındaki korelasyon **r=0,866** oldu (`n=18`, betimsel ilişki; nedensellik kanıtı değildir).

| Kontrol | Aktör | Model çevrimi | Input token | Cached input | Output token | Reasoning output | Süre |
|---|---:|---:|---:|---:|---:|---:|---:|
| Story test review | 4 | 192 | 17,70M | 17,07M | 78.763 | 20.618 | 41,01 dk |
| Process Judge | 4 | 130 | 8,98M | 8,56M | 57.652 | 18.993 | 27,93 dk |
| Code review | 5 | 143 | 5,62M | 5,24M | 58.665 | 23.450 | 34,49 dk |
| Verify patch | 5 | 59 | 2,13M | 1,94M | 31.924 | 9.888 | 14,63 dk |
| **Toplam** | **18** | **524** | **34,43M** | **32,80M** | **227.004** | **72.949** | **118,07 dk** |

`Cached input`, input token'ın alt kümesidir; `reasoning output` da output token'ın alt kümesidir ve toplama yeniden eklenmez. Token sayıları maliyet değil, modelin her çevrimde işlediği kümülatif bağlam hacmidir.

### Yavaşlık birkaç büyük donmadan değil, round-trip vergisinden geldi

Araç-dışı **518 interval** bulundu. Median interval **8,33 saniye**, ortalama **12,62 saniye**, p90 **23,30 saniye** idi. En uzun 10 interval araç-dışı sürenin yalnız **%15,0'ını**, en uzun 100 interval **%49,8'ini** açıklıyor. Yani toplam süreyi tek bir conductor takılması değil, yüzlerce küçük model→tool→model çevrimi büyüttü.

### Her aktör workflow'u ve kanıtları yeniden yorumladı

- Mutually-exclusive ölçümde **139 workflow/skill yükleme olayı** ve raw path analizinde **58 farklı skill/workflow dosyası** bulundu.
- Yalnız dört story test-review aktörü **192 model çevrimi** ve **17,70M input token** üretti.
- Araç-dışı sürenin **31,28 dakikası workflow dosyası okunduktan sonra**, **18,50 dakikası repo/evidence incelemesinden sonra** geldi.
- **28,62 dakika**, bir sonraki olay artifact düzenleme iken geçti; bu, okunan bulguların formal rapor/JSON/evidence biçimine dönüştürülmesiyle uyumludur.
- 18 aktörde **52 artifact-edit** ve **35 git add/commit** olayı vardı. Bunların shell süresi kısa olsa da her biri yeni bir high-effort model çevrimi doğurdu.

### En uzun aralıkların çevresi de aynı deseni gösteriyor

- S4 code review'daki **164,09 saniye**, geniş kod incelemesinden sonra reviewer'a bulgu mesajı yazılmadan önce geçti.
- S2 test review'daki **136,42 saniye**, checklist'in son bölümü okunduktan sonra rapor patch'i üretilmeden önce geçti.
- S1 test review'daki **111,77 saniye**, focused test bittikten sonra rapor patch'i üretilmeden önce geçti.
- S4 test review'daki **107,98 saniye**, report-generation workflow'u okunduktan sonra artifact yazılmadan önce geçti.

Bu timestamp komşuluğu uzun aralıkların çoğunun workflow yorumlama, bulgu sentezleme ve formal evidence yazımıyla uyumlu olduğunu gösterir. Ancak mevcut telemetry model inference, scheduler queue ve harness gecikmesini birbirinden kesin olarak ayıramaz.

## Kapsam, veri ve metrik tanımları

- Koşu: `P0-legacy-r2`.
- Popülasyon: yalnız ilk aktif turu bulunan top-level `Code review`, `Verify patch`, `Story test review` ve `Process judge` aktörleri.
- Toplam süre: aktörün `task_started` ile `task_complete` timestamp'leri arasındaki wall-clock süre.
- Araç süresi: tool-call response item timestamp'i ile eşleşen tool-output timestamp'i arasındaki gözlenen süre.
- Overlap: aynı anda canlı birden çok araç olayı varsa ortak interval eşit paylaştırılır; böylece top-level bucket'lar çift sayılmaz.
- Araç-dışı süre: top-level turn içinde hiçbir gözlenen araç çağrısının canlı olmadığı interval.
- Nested aktif süre: nested reviewer'ın kendi child-turn aktif süreleri; parent kritik yoluna eklenmez.
- Zaman dilimi: kaynak log timestamp'leri UTC; süre hesapları timezone'dan bağımsızdır.

## Metodoloji ve doğrulama

1. Legacy attempt kaydından parent collaboration session yolu çözüldü.
2. Parent session'daki top-level aktör thread kimlikleri eşlendi.
3. Her assurance aktörünün ilk aktif turn başlangıç/bitişi çıkarıldı.
4. 500 tool call, `call_id` üzerinden ilgili output ile eşlendi; eksik output sayısı **0**.
5. Line-sweep ile araç overlap'ları ayrıştırıldı; kalan intervaller araç-dışı olarak sınıflandı.
6. Her aktörün bucket toplamı kendi elapsed süresine, tüm aktörler de 7.083,930 saniyelik assurance toplamına yeniden uzlaştırıldı.
7. Araç-dışı süre before/between/after olarak ikinci kez uzlaştırıldı.
8. İlk aktif turn içindeki son `token_count` snapshot'ı ve `turn_context` kaydı kullanılarak model, effort, model çevrimi ve kümülatif token hacmi çıkarıldı. Sonradan yeniden kullanılan session turn'leri dışarıda bırakıldı.

Doğrulama sonucu: **18/18 aktör**, **500/500 araç olayı**, genel bucket toplamı ve residual alt toplamları tolerans içinde birebir uzlaştı.

## Sınırlamalar ve belirsizlik

- Araç-dışı süre semantik olarak “saf model düşünme süresi” değildir. Harness scheduling, queue gecikmesi, model üretimi, okumadan sonraki değerlendirme ve final kompozisyonu ayıracak bağımsız telemetry yoktur.
- Model çevrimi ve token hacmi süreyle güçlü korelasyon gösterir, ancak gözlemsel `n=18` örneklem nedensellik veya bağımsız etki büyüklüğü sağlamaz.
- Bir `functions.exec` olayı birden fazla nested komut içerebilir. Wrapper'ın tamamı baskın komut türüne atanır; wrapper içindeki paralel alt komutların ayrı timestamp'i yoksa daha ince split yapılamaz.
- Test bucket'ı doğrudan veya tanınan wrapper test komutlarını kapsar. Karma bir wrapper başka baskın kategoriye atanmışsa birkaç saniyelik test süresi başka araç bucket'ında kalabilir. Bu, 108,93 dakikalık ana sonuca maddi etki etmez.
- 14 dispatch denemesinden yalnız 12 ayrı nested session bulundu. İki deneme ayrı session üretmemiştir; dispatch ve wait maliyetleri top-level olaylarda yine sayılmıştır.
- Bu analiz legacy koşuyu açıklar; yeni candidate için aynı telemetry ile karşılaştırmalı ölçüm yapılmadan hızlanma oranı iddia edilmemelidir.

## Önerilen sonraki ölçüm

Candidate koşuda aynı script ile şu dört metriği hedefleyin:

1. Assurance toplamı: **118,07 dk → ≤35 dk**.
2. Araç-dışı between-tools oranı: **%86,89 → ≤%50**.
3. Top-level assurance aktörü: **18 → seçilen profile göre ≤8**.
4. Verify-patch: yalnız gerçek review patch'i varsa çalışmalı; temiz PASS story'lerinde **0 dk**.

## Tekrar üretim

Özet ve aktör dökümü:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 \
  docs/experiments/execution-assurance-v2/legacy_assurance_timing.py
```

500 araç olayını ve tüm araç-dışı aralıkları timestamp seviyesinde almak için:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 \
  docs/experiments/execution-assurance-v2/legacy_assurance_timing.py --events
```

Kaynak analiz notebook'u: `docs/experiments/execution-assurance-v2/LEGACY_PHASE_ANALYSIS.ipynb`.

## İleri sorular

- Between-tools gap'in ne kadarı model inference, ne kadarı harness/queue scheduling?
- Aynı aktörü daha az tool round-trip ile çalıştırmak kaliteyi korurken ne kadar süre kazandırır?
- Story test review ve Process Judge'ın ortak okuma/evidence üretimi tek kontrolde birleştirilebilir mi?
- Candidate'ın aynı story setindeki yeni assurance süreleri bu legacy baseline'a göre nasıl değişiyor?
