# Açık sorular: henüz ölçülmeyenler

## ACEF değerlendirmesinin duran sonucu

Rebuild `observations/ACEF_EVAL_REPORT.md` "Nihai yargı" (2026-10-08; 7 ACEF dilimi + 2 native karşılaştırma + P03-LIST-01):

- Ürün kalitesi eşdeğer: 7/7 ACEF dilimi PASS (biri bir REVISE turuyla); native adaylar da PASS.
- ACEF'in yakaladığı gerçek hata 7 dilimde 1 (EDIT-03: temiz ağaçta tipli kanıt kararsız bir yarış testini gösterdi). Bu yakalamanın kuralı ("kanıt temiz ağaçta kayıtlı komutla yeniden koşulur") ACEF'siz düzende korundu.
- Hataları bulan mekanizmalar: bağımsız inceleyici, mutasyon testleri (her dilimde test boşluğu), gerçek tarayıcı matrisi, kullanıcı checkpoint testi.
- Maliyet: ACEF dilim başına admission + kapanış ~10–20 dk ve ~0,3M token; 162 sürtünme maddesi, 70+ elle müdahale; native kola göre 1,72× geliştirici token'ı.
- Sınırlar: tek ürün, tek ekip (aynı model ailesi), küçük örneklem; süre ölçümlerinde oturum kesintileri var. **Kaçan hata** o raporda da "henüz ölçülmedi".

Bu paket o sonucu değiştirmez; yalnız ölçülebilir hale getirmeye çalışır.

## v0.2 için planlı işler

Bu üçü ölçüm demosunun gösterdiği boşluklardan çıktı (`docs/metrics-2026-10-19.md`); v0.1.1'de yapılmadı.

1. **Kapanış notu kapısı.** Rebuild'de 25 kapanış başlığının yalnız 3'ü dolu ve `Durum:` satırı kapanışta güncellenmiyor. Merge öncesi koşan bir kontrol (`scripts/closing-check.sh <slice>`): `closing-note.md` alanları (Karar, Ürün commit'i, Süre-*, REVISE-turu, Kaçan-hata, Etiket adayı) dolu ve yer tutucusuz, `Durum: KAPANDI`; değilse merge yok.
2. **REVISE neden kümesi.** 175 REVISE raporunun nedeni okunamıyor. İnceleme bulgu tablosuna sabit kümeli `neden` sütunu: `ürün-hatası | test-boşluğu | spec-metni | izinli-liste | ortam | standart`; `metrics.py` dağılımı basar.
3. **Süre/token başlık satırı.** Yalnız Codex incelemeleri süre/token yazıyor. Her inceleme raporunun 3. satırı `Süre: <dk> · Token: <girdi>/<çıktı> | ölçülmedi` olur (review-brief'te başlık var, alan biçimi sabitlenir); `metrics.py` okur ve git vekilinin yerine koyar.

## Ölçülmeyenler

1. **İnceleme maliyeti.** Dakika ve token, inceleme başına. Rebuild'de yalnız Codex incelemeleri raporlarına süre/token yazdı (ör. P04-ASSIGN-01: 762 sn, 2,85M girdi token'ı); Opus/Sonnet incelemeleri ve bu oturumun incelemeleri yazmadı. `metrics.py`'nin süreleri git commit damgası vekilidir, oturum süresi değildir. Gerekli: inceleme raporu başlığında `Süre:` ve `Token:` alanı (review-brief rapor biçiminde var) ve kapanış notunda `Süre-inceleme-dk`.
2. **REVISE nedenleri.** Demo, rebuild'de 361 inceleme raporunun 175'inin REVISE olduğunu ve 77 dilimin en az bir REVISE aldığını gösteriyor; ama nedenin dağılımı (ürün hatası / test boşluğu / spec metni hatası / izinli liste / ortam) okunmuyor. Fable notu (2026-10-08) REVISE'ların önemli kısmının ürün değil metin hatasından çıktığını gözlemledi; ölçülmedi. Gerekli: bulgu tablosuna `neden` sütunu (sabit küme).
3. **Koordinatör token maliyeti.** ACEF raporu yalnız geliştirici token'ını ölçtü; koordinatör "pencere deltası, kola atfedilmemiş" kaldı. Dilim yazma, temiz ağaç koşusu, kapanış ve durum belgesi koordinatör bağlamında; bu oturum ölçmedi.
4. **Kaçan hata.** Hiçbir demo deposunda kapanış notu `Kaçan-hata` alanı taşımıyor. Tek somut örnek platform B27/B28 (01D'nin kaçırdığı host include'u, PLAT-PILOT-01'de bulundu); metrics.py bunu yalnız "aday" olarak gösterebiliyor.
5. **Farklı model ailesinin katkısı.** Rebuild'de Codex + Opus aynı turda ayrı rapor yazdı; hangisinin hangi bulguyu tek başına bulduğu sayılmadı. Astra notu da "daha hızlı ya da ucuz olduğu henüz ölçülmedi" diyor.
6. **Hat sayısının getirisi.** 3 → 5 hat kararının (2026-10-14) haftalık kapanan dilim, rebase çakışması ve `main`'de kırmızı süre üzerindeki etkisi ölçülmedi.
7. **Kontrol listesinin maliyeti ve getirisi.** `review-checklist.md` A–E bu sürümde yeni; hangi maddenin kaç bulgu yakaladığı ve inceleme süresine kaç dakika eklediği bilinmiyor.
8. **Live Learning'in inceleme kaydı.** Depo var (`~/CODE/Ram/live-learning`), ama inceleme kararları dilim dosyalarının içinde serbest metin; REVISE sayısı, tur ve süre bugün okunamıyor. Ayrıca merge sonrası push'un sahibin sözü olmadan yapılması bu paketin kuralıyla çelişiyor: proje istisnası mı, düzeltilecek mi, sahibe sorulacak.
