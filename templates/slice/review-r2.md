# <SLICE-ID> — hedefli yeniden inceleme (r<n>)

Aynı inceleyici oturumu (bulguları yazan oturum bağlamıyla devam eder; geliştiricinin oturumu asla değil). O oturum kaybolduysa (bağlam sınırı, çökme) yeni inceleyici oturumu önceki raporu + düzeltme diff'ini okur ve bunu buraya yazar: <aynı oturum | yeni oturum: neden>. Kapsam YALNIZ önceki turun bulguları + düzeltme diff'i. Tam inceleme tekrarlanmaz; değişmeyen ve önceki turda temiz ağaçta kanıtlanmış aşamalar yeniden koşulmaz.

Karar: **PASS | REVISE**
Tarih: <YYYY-MM-DD> · Önceki inceleme: `<sha>` (`<SLICE-ID>-review.md`) · Aday: `<yeni sha>` · Worktree: `<yol>`, DB `<lane DB>`, port `<port>`

## Kontroller

1. **Diff kapsamı:** `git diff <önceki-sha> <yeni-sha> --stat` → <n> dosya; izinli liste dışı: <yok / liste>.
2. **Her bulgu:**

| Bulgu | Sonuç | Kanıt (kendi yeniden üretimin: komut, istek, ekran) |
|---|---|---|
| R1 | KAPANDI / AÇIK / KABUL | <…> |

3. **Düzeltmeyi sabitleyen test:** düzeltmeyi geri al (mutasyon) → hangi test kırmızı; geri al, `git status --short` boş. HAFİF'te davranış değişikliği başına bir mutasyon; yeni/değişen davranış yoksa "uygulanmaz: <neden>" gerekçesini doğrula. Düzeltme UI'a (rota, görünüm, bileşen) dokunmuyorsa tarayıcı da gerekçeli uygulanmaz; uygulanabilir kontroller ve TAM şartları korunur.
4. **Gerileme:** düzeltmenin dokunduğu alanın testleri + kapı: `scripts/gate.sh <worktree>` → <son satır>.
5. **Geliştiricinin yeni iddiaları:** yalnız doğrula, düzeltme isteme; yeni iş backlog'a.

## Bulgular

- <yok | yeni bulgu: önem, bloklayıcı mı, öneri>

## Özet (≤4 satır)
