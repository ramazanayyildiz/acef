## Kapanış notu (koordinatör, <YYYY-MM-DD>)

<!-- Dilim dosyasının SONUNA eklenir. ≤10 satır (Dedektör satırı yalnız inceleme dilimlerinde; diğerlerinde silinir). Alan adları sabittir: scripts/metrics.py bunları okur. Ölçülmeyen değere sayı yazma, "ölçülmedi" yaz. Karar özeti kanonik review/r2'ye, kanıt özeti tek koşu kaydına atıftır; log/bulgular yeniden yazılmaz. Her zorunlu inceleyicinin güncel kararını bağla. -->
- Karar: <PASS | KAPANDI-İPTAL> (`<SLICE-ID>-review.md`<, `-review-r2.md` ve diğer zorunlu inceleyicilerin güncel kararları>; ilk bağımsız temiz koşu `<kanonik kayıt bağlantısı>`)
- Ürün commit'i: `<sha>` · İncelenen: `<sha>` · Merge: `<sha>` (`--no-ff`; <sahibin sözü / dal politikası>)
- Süre-geliştirme-dk: <n | ölçülmedi>
- Süre-inceleme-dk: <n | ölçülmedi>
- REVISE-turu: <n>
- Kaçan-hata: <yok | B<n> (<hangi dilim/turda bulundu>)>
- Etiket adayı: <evet | hayır | uygulanmaz> — <tek cümle gerekçe>
- ACEF-gözlem: <yok | merkezi günlük kimlikleri (dev raporu ve inceleme satırlarından, `acef-note add`)>
- Dedektör: <uygulanmaz | dedektör yolu (`.acef/detectors/<ad>.py` ya da `scripts/detectors/<ad>.py`) | yok — gerekçe> (yalnız inceleme dilimleri: "X neden yavaş / neden tekrarlıyor" bir dedektörle ya da gerekçeyle kapanır)
- Ertelenen: <B-kimlikleri | yok> · Kapı: `<GATE … son satır>` (`<kanonik merge/postmerge kanıt bağlantısı>`)
- Temizlik: `git worktree list` yalnız ana ağaç; geçici dizinler silindi; lane DB `<ad>` <bırakıldı/silindi>. Durum: KAPANDI.
