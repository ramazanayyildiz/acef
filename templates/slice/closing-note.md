## Kapanış notu (koordinatör, <YYYY-MM-DD>)

<!-- Dilim dosyasının SONUNA eklenir. ≤12 satır (Dedektör satırı yalnız inceleme dilimlerinde; diğerlerinde silinir). Alan adları sabittir: scripts/metrics.py bunları okur. Ölçülmeyen değere sayı yazma, "ölçülmedi" yaz. Karar özeti kanonik review/r2'ye, kanıt özeti tek koşu kaydına atıftır; log/bulgular yeniden yazılmaz. Her zorunlu inceleyicinin güncel kararını bağla. -->
- Karar: <PASS | KAPANDI-İPTAL> (`<SLICE-ID>-review.md`<, `-review-r2.md` ve diğer zorunlu inceleyicilerin güncel kararları>; ilk bağımsız temiz koşu `<kanonik kayıt bağlantısı>`)
- Ürün commit'i: `<sha>` · İncelenen: `<sha>` · Merge: `<sha>` (`--no-ff`; <sahibin sözü / dal politikası>)
- Süre-geliştirme-dk: <n | ölçülmedi>
- Süre-inceleme-dk: <n | ölçülmedi>
- REVISE-turu: <n>
- Review scope: <uygulanmaz (REVISE yok) | r2 narrow — <gerekçe> | r2 full — <listedeki gerekçe>; her tur kendi `review-r<n>.md` satırından>
- Kaçan-hata: <yok | B<n> (<hangi dilim/turda bulundu>)>
- Etiket adayı: <evet | hayır | uygulanmaz> — <tek cümle gerekçe>
- Tour: <kanonik tur raporu yolu | not applicable: <inceleyicinin onayladığı gerekçe>> · Tur-dk: kurulum <n | ölçülmedi> · tur <n | ölçülmedi> · triyaj <n | ölçülmedi> [· Tour impact: <kapanıştaki HEAD sha'sı> — <tur adayından sonraki kod değişikliği turlanan adımları neden etkilemiyor; koordinatörün kapanış değerlendirmesi>] (`scripts/slice/tour.py check <dilim>` kapanışta HEAD üzerinde yeniden koşar)
- ACEF-gözlem: <yok | merkezi günlük kimlikleri (dev raporu ve inceleme satırlarından, `acef-note add`)>
- Dedektör: <uygulanmaz | dedektör yolu (`.acef/detectors/<ad>.py` ya da `scripts/detectors/<ad>.py`) | yok — gerekçe> (yalnız inceleme dilimleri: "X neden yavaş / neden tekrarlıyor" bir dedektörle ya da gerekçeyle kapanır)
- Ertelenen: <B-kimlikleri | yok> · Kapı: `<GATE … son satır>` (`<kanonik merge/postmerge kanıt bağlantısı>`)
- Temizlik: `git worktree list` yalnız ana ağaç; geçici dizinler silindi; lane DB `<ad>` <bırakıldı/silindi>. Durum: KAPANDI.
