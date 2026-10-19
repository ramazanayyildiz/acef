## Kapanış notu (koordinatör, <YYYY-MM-DD>)

<!-- Dilim dosyasının SONUNA eklenir. ≤10 satır. Alan adları sabittir: scripts/metrics.py bunları okur. Ölçülmeyen değere sayı yazma, "ölçülmedi" yaz. -->
- Karar: <PASS | KAPANDI-İPTAL> (`<SLICE-ID>-review.md`<, `-review-r2.md`>; temiz ağaç `<komut>` → <sonuç>)
- Ürün commit'i: `<sha>` · İncelenen: `<sha>` · Merge: `<sha>` (`--no-ff`; <sahibin sözü / dal politikası>)
- Süre-geliştirme-dk: <n | ölçülmedi>
- Süre-inceleme-dk: <n | ölçülmedi>
- REVISE-turu: <n>
- Kaçan-hata: <yok | B<n> (<hangi dilim/turda bulundu>)>
- Etiket adayı: <evet | hayır | uygulanmaz> — <tek cümle gerekçe>
- Ertelenen: <B-kimlikleri | yok> · Kapı: `<GATE … son satır>`
- Temizlik: `git worktree list` yalnız ana ağaç; geçici dizinler silindi; lane DB `<ad>` <bırakıldı/silindi>. Durum: KAPANDI.
