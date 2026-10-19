# <SLICE-ID> — hedefli yeniden inceleme (r<n>)

Ayrı oturum (ilk incelemeyi yapan oturum değil; geliştirici hiç değil). Kapsam YALNIZ önceki turun bulguları + düzeltme diff'i. Tam inceleme tekrarlanmaz; değişmeyen ve önceki turda temiz ağaçta kanıtlanmış aşamalar yeniden koşulmaz.

Karar: **PASS | REVISE**
Tarih: <YYYY-MM-DD> · Önceki inceleme: `<sha>` (`<SLICE-ID>-review.md`) · Aday: `<yeni sha>` · Worktree: `<yol>`, DB `<lane DB>`, port `<port>`

## Kontroller

1. **Diff kapsamı:** `git diff <önceki-sha> <yeni-sha> --stat` → <n> dosya; izinli liste dışı: <yok / liste>.
2. **Her bulgu:**

| Bulgu | Sonuç | Kanıt (kendi yeniden üretimin: komut, istek, ekran) |
|---|---|---|
| R1 | KAPANDI / AÇIK / KABUL | <…> |

3. **Düzeltmeyi sabitleyen test:** düzeltmeyi geri al (mutasyon) → hangi test kırmızı; geri al, `git status --short` boş.
4. **Gerileme:** düzeltmenin dokunduğu alanın testleri + kapı: `scripts/gate.sh <worktree>` → <son satır>.
5. **Geliştiricinin yeni iddiaları:** yalnız doğrula, düzeltme isteme; yeni iş backlog'a.

## Bulgular

- <yok | yeni bulgu: önem, bloklayıcı mı, öneri>

## Özet (≤4 satır)
