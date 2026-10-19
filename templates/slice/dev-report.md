# <SLICE-ID> — geliştirici raporu

Geliştirici PASS ilan etmez. Bu rapor kanıt değildir; inceleyici her iddiayı temiz ağaçta yeniden üretir.

Dal: `<dal>` · Taban: `<taban-sha>` · Aday: `<aday-sha>` · Yalnız-test commit'i: `<test-sha>`
Ortam: worktree `<yol>`, port `<port>`, test DB `<lane DB>`; ana önizlemeye ve paylaşılan DB'ye dokunulmadı.
Tarih / süre: <YYYY-MM-DD>, başlangıç <hh:mm>, bitiş <hh:mm>

## Yapılanlar

- <değişiklik → hangi K maddesi>

## Yapılmayanlar ve bilinen eksikler

- <neden; öneri; backlog adayı>

## Kabul maddeleri → kanıt

| K | Kanıt (test adı / komut) | Sonuç |
|---|---|---|
| K1 | `<…>` | <…> |

## Kırmızı-önce kanıtı

`git checkout <test-sha>` (yalnız testler, ürün kodu yok) üzerinde: `<komut>` → <n> test kırmızı (`<evidence>/red-first.txt`). Aday üzerinde aynı komut yeşil.

## Çalıştırılan komutlar

| Komut | Beklenen | Gerçek |
|---|---|---|
| `scripts/gate.sh <kendi worktree>` | `GATE PASS` | <son satır> |
| `scripts/standards-check.sh <kendi worktree>` | `STANDARDS PASS` | <son satır> |
| <dilim testi> | OK | <…> |

## Mutasyonlar (uygulandı, geri alındı)

| M | Bozulan kural | Kırmızı olan test | Kanıt dosyası |
|---|---|---|---|
| M1 | <…> | <…> | `<evidence>/mutations/M1.txt` |

## İnceleme öncesi öz-denetim

Kaynak: Jakomeet `docs/bmad/pre-review-selfcheck.md` (deterministik grep kuralları; FAIL çıkışı 1, WARN yalnız basılır). Projenin kendi öz-denetim komutu `slice-method.json` → `selfcheck` alanında; yoksa aşağıdaki satırlar elle doldurulur. FAIL varken inceleme istenmez.

| Kural | Önem | Kontrol (komut) | Sonuç |
|---|---|---|---|
| İş mantığı UI katmanında yok (transaction, mail, forceFill) | FAIL | `scripts/standards-check.sh <ağaç>` (GATE-LW1 ve benzeri) | <…> |
| Çift gönderim koruması (submit/complete eylemlerinde kilit/bayrak) | FAIL | `git grep -n` <proje kalıbı> | <…> |
| Doğrulama kuralı olan her bileşende mesajlar var | FAIL | <proje kalıbı> | <…> |
| Hata kodu çakışması (aynı kod >3 dosyada) | FAIL | <proje kalıbı> | <…> |
| Servis içinde doğrudan sorgu: depoya taşındı ya da gerekçesi yazıldı | WARN | standart kapısı sayaç satırı | <…> |
| Kiracı kapsamı atlatma (`withoutGlobalScope` vb.) yeni yerde yok; varsa güvenlik sınırı yazılı | WARN | `git grep -n withoutGlobalScope` | <…> |
| Yeni `route('…')` adları kayıtlı; yeni view'lar var | FAIL | `templates/review-checklist.md` C1, C8 komutları | <…> |
| İzinli liste dışında dosya yok | FAIL | `git diff --name-only <taban>..HEAD` | <…> |
| Migration `down()` var ve host tablosunu silmez (ya da neden güvenli olmadığı yazılı) | FAIL | `git grep -n "function down" -- database/migrations` | <…> |

## Bilinmeyenler ve koordinatöre sorular

- <izinli listeyi aşma ihtiyacı (dosya + neden) — geliştirici burada DURUR>
- <doğrulanamayan iddia: neden>
